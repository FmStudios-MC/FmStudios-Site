/* Pure simulation. No DOM, no canvas, no storage. step(state, dt) advances the
   run by a fixed delta; the player actions mutate state directly. Combat order
   each step: damper fields -> firing -> projectiles -> resolve kills -> move +
   leak -> compact -> effects -> wave/lull bookkeeping. */

import {
  CORE,
  ENEMIES,
  PATH_LENGTH,
  TOWER_BY_ID,
  TUNING,
  isOpenCell,
  posAt,
  waveBountyMult,
  waveDef,
  waveHpMult,
} from "./config";
import type {
  Effect,
  Enemy,
  GameState,
  Projectile,
  Tower,
  TowerId,
  TowerStats,
} from "./types";

const dist = (ax: number, ay: number, bx: number, by: number) =>
  Math.hypot(ax - bx, ay - by);

// --- Tower stats / economy ----------------------------------------------

/** Effective combat profile of a tower type at a given upgrade tier. */
export function towerStats(defId: TowerId, tier: number): TowerStats {
  const def = TOWER_BY_ID[defId];
  let dmg = def.dmg;
  let range = def.range;
  let rate = def.rate;
  const special: TowerStats["special"] = { ...def.special };
  for (let i = 0; i < tier; i++) {
    const m = def.upgrades[i].mods;
    if (m.dmgMul) dmg *= m.dmgMul;
    if (m.rateMul) rate *= m.rateMul;
    if (m.rangeMul) range *= m.rangeMul;
    if (special.kind === "chain" && m.chainsAdd) special.chains += m.chainsAdd;
    if (special.kind === "pierce" && m.pierceAdd)
      special.pierce = Math.min(0.95, special.pierce + m.pierceAdd);
    if (special.kind === "slow") {
      if (m.slowFactor != null) special.slowFactor = m.slowFactor;
      if (m.dpsMul) special.dps *= m.dpsMul;
    }
  }
  return { dmg, range, rate, special };
}

export const towerStatsOf = (t: Tower) => towerStats(t.defId, t.tier);

/** Total cash sunk into a tower (build + upgrades bought so far). */
function towerSpend(defId: TowerId, tier: number): number {
  const def = TOWER_BY_ID[defId];
  let total = def.cost;
  for (let i = 0; i < tier; i++) total += def.upgrades[i].cost;
  return total;
}

export const sellValue = (t: Tower) =>
  Math.floor(towerSpend(t.defId, t.tier) * TUNING.sellRefund);

export const upgradeCost = (t: Tower) =>
  t.tier < 2 ? TOWER_BY_ID[t.defId].upgrades[t.tier].cost : Infinity;

export const towerAt = (s: GameState, c: number, r: number) =>
  s.towers.find((t) => t.c === c && t.r === r) ?? null;

// --- Player actions ------------------------------------------------------

export function placeTower(
  s: GameState,
  defId: TowerId,
  c: number,
  r: number,
): boolean {
  if (s.status === "over") return false;
  if (!isOpenCell(c, r) || towerAt(s, c, r)) return false;
  const cost = TOWER_BY_ID[defId].cost;
  if (s.cash < cost) return false;
  s.cash -= cost;
  s.towers.push({
    id: s.nextId++,
    defId,
    c,
    r,
    tier: 0,
    cooldown: 0,
    fireFlash: 0,
    angle: 0,
  });
  return true;
}

export function upgradeTower(s: GameState, id: number): boolean {
  const t = s.towers.find((x) => x.id === id);
  if (!t || t.tier >= 2) return false;
  const cost = upgradeCost(t);
  if (s.cash < cost) return false;
  s.cash -= cost;
  t.tier += 1;
  return true;
}

export function sellTower(s: GameState, id: number): boolean {
  const i = s.towers.findIndex((x) => x.id === id);
  if (i < 0) return false;
  s.cash += sellValue(s.towers[i]);
  s.towers.splice(i, 1);
  if (s.selected === id) s.selected = null;
  return true;
}

/** Begin the next wave. Returns the early-call bonus (0 if called at the buzzer,
    -1 if a wave is already running). */
export function startWave(s: GameState): number {
  if (s.status !== "lull") return -1;
  s.wave += 1;
  s.status = "wave";
  s.waveTime = 0;
  s.spawnIdx = 0;
  s.hpMult = waveHpMult(s.wave);
  s.bountyMult = waveBountyMult(s.wave);

  const spawns: { kind: Enemy["kind"]; at: number }[] = [];
  for (const g of waveDef(s.wave).groups) {
    for (let i = 0; i < g.count; i++) spawns.push({ kind: g.kind, at: g.delay + i * g.gap });
  }
  spawns.sort((a, b) => a.at - b.at);
  s.spawns = spawns;

  let bonus = 0;
  if (s.lullTimer > 0) {
    bonus = Math.round(s.lullTimer * TUNING.earlyCallRate);
    s.cash += bonus;
    s.lullTimer = 0;
  }
  return bonus;
}

// --- Projectile pool -----------------------------------------------------

const projPool: Projectile[] = [];
function acquireProj(): Projectile {
  return (
    projPool.pop() ?? {
      id: 0,
      x: 0,
      y: 0,
      target: null,
      tx: 0,
      ty: 0,
      dmg: 0,
      pierce: 0,
      speed: TUNING.projectileSpeed,
      kind: "bolt",
      alive: true,
    }
  );
}
function releaseProj(p: Projectile) {
  p.target = null;
  p.alive = false;
  projPool.push(p);
}

// --- Combat helpers ------------------------------------------------------

function applyDamage(e: Enemy, dmg: number, pierce: number) {
  const armorEff = e.armor * (1 - pierce);
  e.hp -= Math.max(1, dmg - armorEff);
  e.hitFlash = 0.09;
}

function spawnEnemy(s: GameState, kind: Enemy["kind"]) {
  const def = ENEMIES[kind];
  const p = posAt(0);
  s.enemies.push({
    id: s.nextId++,
    kind,
    hp: def.hp * s.hpMult,
    maxHp: def.hp * s.hpMult,
    armor: def.armor,
    speed: def.speed,
    bounty: Math.round(def.bounty * s.bountyMult),
    score: def.score,
    leak: def.leak,
    size: def.size,
    dist: 0,
    x: p.x,
    y: p.y,
    slowMul: 1,
    hitFlash: 0,
    alive: true,
  });
}

/** Highest-progress enemy within range of a point (the "first" target). */
function pickTarget(s: GameState, cx: number, cy: number, range: number): Enemy | null {
  let best: Enemy | null = null;
  for (const e of s.enemies) {
    if (!e.alive) continue;
    if (dist(cx, cy, e.x, e.y) <= range && (!best || e.dist > best.dist)) best = e;
  }
  return best;
}

// --- Simulation step -----------------------------------------------------

export function step(s: GameState, dt: number) {
  if (s.status === "over" || dt <= 0) return;

  // 1. Spawn anything due this step (only while a wave is live).
  if (s.status === "wave") {
    s.waveTime += dt;
    while (s.spawnIdx < s.spawns.length && s.spawns[s.spawnIdx].at <= s.waveTime) {
      spawnEnemy(s, s.spawns[s.spawnIdx].kind);
      s.spawnIdx++;
    }
  }

  // 2. Reset per-step slow + decay hit flashes.
  for (const e of s.enemies) {
    e.slowMul = 1;
    if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
  }

  // 3. Towers: damper fields apply slow + DoT, firing towers shoot.
  for (const t of s.towers) {
    if (t.fireFlash > 0) t.fireFlash = Math.max(0, t.fireFlash - dt);
    const st = towerStatsOf(t);
    const cx = t.c;
    const cy = t.r;

    if (st.special.kind === "slow") {
      const { slowFactor, dps } = st.special;
      for (const e of s.enemies) {
        if (!e.alive) continue;
        if (dist(cx, cy, e.x, e.y) <= st.range) {
          if (slowFactor < e.slowMul) e.slowMul = slowFactor;
          if (dps > 0) {
            e.hp -= dps * dt;
            e.hitFlash = Math.max(e.hitFlash, 0.05);
          }
        }
      }
      continue;
    }

    if (t.cooldown > 0) {
      t.cooldown -= dt;
      continue;
    }
    const target = pickTarget(s, cx, cy, st.range);
    if (!target) continue;
    t.cooldown = st.rate > 0 ? 1 / st.rate : 1;
    t.fireFlash = 0.12;
    t.angle = Math.atan2(target.y - cy, target.x - cx);

    if (st.special.kind === "chain") {
      // Instant lightning: hit the primary, then arc to the nearest unhit
      // neighbours, damage falling off per jump. Drawn as one polyline beam.
      const { chains, chainRange, falloff } = st.special;
      const hits: Enemy[] = [target];
      let curDmg = st.dmg;
      applyDamage(target, curDmg, 0);
      const pts: number[] = [cx, cy, target.x, target.y];
      let cur = target;
      for (let j = 0; j < chains; j++) {
        let next: Enemy | null = null;
        let nd = chainRange;
        for (const e of s.enemies) {
          if (!e.alive || hits.includes(e)) continue;
          const d = dist(cur.x, cur.y, e.x, e.y);
          if (d <= nd) {
            nd = d;
            next = e;
          }
        }
        if (!next) break;
        curDmg *= falloff;
        applyDamage(next, curDmg, 0);
        pts.push(next.x, next.y);
        hits.push(next);
        cur = next;
      }
      s.effects.push({ kind: "beam", ttl: 0.12, life: 0.12, x: cx, y: cy, pts });
    } else {
      // single / pierce: a homing shot.
      const p = acquireProj();
      p.id = s.nextId++;
      p.x = cx;
      p.y = cy;
      p.target = target;
      p.tx = target.x;
      p.ty = target.y;
      p.dmg = st.dmg;
      p.pierce = st.special.kind === "pierce" ? st.special.pierce : 0;
      p.speed = TUNING.projectileSpeed;
      p.kind = t.defId;
      p.alive = true;
      s.projectiles.push(p);
    }
  }

  // 4. Projectiles home in and deliver their hit.
  for (const p of s.projectiles) {
    if (!p.alive) continue;
    if (p.target && p.target.alive) {
      p.tx = p.target.x;
      p.ty = p.target.y;
    } else {
      p.target = null; // target gone: fly to its last spot and fizzle
    }
    const d = dist(p.x, p.y, p.tx, p.ty);
    const move = p.speed * dt;
    if (d <= Math.max(0.3, move)) {
      if (p.target && p.target.alive) applyDamage(p.target, p.dmg, p.pierce);
      p.alive = false;
    } else {
      p.x += ((p.tx - p.x) / d) * move;
      p.y += ((p.ty - p.y) / d) * move;
    }
  }

  // 5. Resolve kills (anything that dropped to 0 hp this step).
  for (const e of s.enemies) {
    if (e.alive && e.hp <= 0) {
      e.alive = false;
      s.kills++;
      s.cash += e.bounty;
      s.score += e.score;
      // render.ts skips bursts under prefers-reduced-motion; the engine always
      // records them so headless/offline ticks stay deterministic.
      s.effects.push({ kind: "burst", ttl: 0.32, life: 0.32, x: e.x, y: e.y });
    }
  }

  // 6. Move survivors; anything reaching the core leaks.
  for (const e of s.enemies) {
    if (!e.alive) continue;
    e.dist += e.speed * e.slowMul * dt;
    if (e.dist >= PATH_LENGTH) {
      e.alive = false;
      s.lives -= e.leak;
      s.leaked++;
      s.shake = Math.min(1.4, s.shake + 0.25 + e.leak * 0.05);
      s.effects.push({ kind: "leak", ttl: 0.5, life: 0.5, x: CORE.c, y: CORE.r });
    } else {
      const p = posAt(e.dist);
      e.x = p.x;
      e.y = p.y;
    }
  }

  // 7. Compact entity arrays (swap-free filter keeps it simple and correct).
  s.enemies = s.enemies.filter((e) => e.alive);
  s.projectiles = s.projectiles.filter((p) => {
    if (p.alive) return true;
    releaseProj(p);
    return false;
  });

  // 8. Effects + shake decay.
  for (const f of s.effects) f.ttl -= dt;
  s.effects = s.effects.filter((f) => f.ttl > 0);
  if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 2.2);

  // 9. Lose condition.
  if (s.lives <= 0) {
    s.lives = 0;
    s.status = "over";
    return;
  }

  // 10. Wave clear: every spawn out and the board empty. Cash bonus is flat;
  // the score bonus also rewards surviving lives, so a clean clear outscores a
  // barely-survived one at the same wave.
  if (s.status === "wave" && s.spawnIdx >= s.spawns.length && s.enemies.length === 0) {
    const bonus = TUNING.waveClearBase + s.wave * TUNING.waveClearPer;
    s.cash += bonus;
    s.score += bonus + s.lives * TUNING.scoreLifeWeight;
    s.status = "lull";
    s.lullTimer = TUNING.lullSec;
  }

  // 11. Lull countdown -> auto-start (only between waves, not before wave 1).
  if (s.status === "lull" && s.wave >= 1 && s.lullTimer > 0) {
    s.lullTimer -= dt;
    if (s.lullTimer <= 0) {
      s.lullTimer = 0;
      startWave(s);
    }
  }
}

/** Final score once the run is over (live score already folds in life bonus at
    game-over; this is the value compared against the local best). */
export const finalScore = (s: GameState) => s.score;
