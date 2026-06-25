/* Pure simulation. No DOM, no canvas, no storage. step(state, dt) advances the
   run by a fixed delta; the player actions mutate state directly. Map geometry
   is read off state.map, so the sim stays free of module globals. Combat order
   each step: heals -> damper fields -> firing -> projectiles -> resolve kills
   (+ splits) -> move + leak -> compact -> effects/abilities bookkeeping. */

import {
  ENEMIES,
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
  EnemyKind,
  GameState,
  Projectile,
  TargetMode,
  Tower,
  TowerId,
  TowerStats,
} from "./types";
import { TARGET_MODES } from "./types";

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
    if (special.kind === "generator" && m.dividendMul)
      special.dividend *= m.dividendMul;
  }
  return { dmg, range, rate, special };
}

export const towerStatsOf = (t: Tower) => towerStats(t.defId, t.tier);

/** Representative DPS of a tower profile, ignoring armour. */
export function rawDps(st: TowerStats): number {
  const sp = st.special;
  if (sp.kind === "slow") return sp.dps;
  if (sp.kind === "generator") return 0;
  if (sp.kind === "chain") {
    let total = st.dmg;
    let d = st.dmg;
    for (let i = 0; i < sp.chains; i++) {
      d *= sp.falloff;
      total += d;
    }
    return total * st.rate;
  }
  return st.dmg * st.rate; // single / pierce (per-line approx)
}

/** DPS against a single enemy of the given armour (post-mitigation). */
export function effDps(st: TowerStats, armor: number): number {
  const sp = st.special;
  if (sp.kind === "slow") return sp.dps; // field DoT, armour-independent
  if (sp.kind === "generator") return 0;
  if (sp.kind === "chain") {
    let total = Math.max(1, st.dmg - armor);
    let d = st.dmg;
    for (let i = 0; i < sp.chains; i++) {
      d *= sp.falloff;
      total += Math.max(1, d - armor);
    }
    return total * st.rate;
  }
  const pierce = sp.kind === "pierce" ? sp.pierce : 0;
  return Math.max(1, st.dmg - armor * (1 - pierce)) * st.rate;
}

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

/** Whether a tower type chooses targets (false for the damper field + generator). */
export const canTarget = (id: TowerId) => id !== "damper" && id !== "generator";

// --- Player actions ------------------------------------------------------

export function placeTower(
  s: GameState,
  defId: TowerId,
  c: number,
  r: number,
): boolean {
  if (s.status === "over" || s.status === "setup") return false;
  if (!isOpenCell(s.map, c, r) || towerAt(s, c, r)) return false;
  const cost = TOWER_BY_ID[defId].cost;
  if (s.cash < cost) return false;
  s.cash -= cost;
  s.built += 1;
  s.towers.push({
    id: s.nextId++,
    defId,
    c,
    r,
    tier: 0,
    cooldown: 0,
    fireFlash: 0,
    angle: 0,
    target: "first",
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

/** Cycle a tower's targeting priority. No-op for damper/generator. */
export function cycleTarget(s: GameState, id: number): TargetMode | null {
  const t = s.towers.find((x) => x.id === id);
  if (!t || !canTarget(t.defId)) return null;
  const i = TARGET_MODES.indexOf(t.target);
  t.target = TARGET_MODES[(i + 1) % TARGET_MODES.length];
  return t.target;
}

/** Fire Overclock: every tower fires/bleeds faster for a few seconds. */
export function activateOverclock(s: GameState): boolean {
  if (s.status !== "wave" || s.overclockCd > 0) return false;
  s.overclock = TUNING.overclockDur;
  s.overclockCd = TUNING.overclockCd;
  return true;
}

/** Arm Surge — the next tapped cell becomes the pulse centre. */
export function armSurge(s: GameState): boolean {
  if (s.surgeCd > 0) return false;
  s.surgeArm = !s.surgeArm;
  return s.surgeArm;
}

/** Detonate Surge at a cell: AoE damage + a brief freeze. Returns hits. */
export function triggerSurge(s: GameState, c: number, r: number): number {
  s.surgeArm = false;
  if (s.surgeCd > 0) return 0;
  let hit = 0;
  for (const e of s.enemies) {
    if (!e.alive) continue;
    if (dist(c, r, e.x, e.y) <= TUNING.surgeRadius) {
      applyDamage(s, e, TUNING.surgeDmg, 1); // EMP ignores armour
      e.stun = Math.max(e.stun, TUNING.surgeStun);
      hit++;
    }
  }
  s.surgeCd = TUNING.surgeCd;
  s.shake = Math.min(1.2, s.shake + 0.3);
  s.effects.push({
    kind: "surge",
    ttl: 0.5,
    life: 0.5,
    x: c,
    y: r,
    radius: TUNING.surgeRadius,
  });
  return hit;
}

/** Begin the next wave. Returns the early-call bonus (0 if called at the buzzer,
    -1 if a wave is already running / not in a build lull). */
export function startWave(s: GameState): number {
  if (s.status !== "lull") return -1;
  s.wave += 1;
  s.status = "wave";
  s.waveTime = 0;
  s.spawnIdx = 0;
  s.waveLeaks = 0;
  s.hpMult = waveHpMult(s.wave) * s.hpScale;
  s.bountyMult = waveBountyMult(s.wave);

  const spawns: { kind: EnemyKind; at: number }[] = [];
  for (const g of waveDef(s.wave).groups) {
    for (let i = 0; i < g.count; i++) spawns.push({ kind: g.kind, at: g.delay + i * g.gap });
  }
  spawns.sort((a, b) => a.at - b.at);
  s.spawns = spawns;

  let bonus = 0;
  if (s.lullTimer > 0) {
    bonus = Math.round(s.lullTimer * TUNING.earlyCallRate);
    s.cash += bonus;
    s.cashEarned += bonus;
    s.lullTimer = 0;
  }
  return bonus;
}

// --- Projectile pool (bolt only; chain/driver are instant) ---------------

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

/** Apply one hit: armour first, then shield, then HP. Attributes the dealt
    damage to the source tower type for the run summary. */
function applyDamage(
  s: GameState,
  e: Enemy,
  dmg: number,
  pierce: number,
  src?: TowerId,
) {
  const armorEff = e.armor * (1 - pierce);
  let eff = Math.max(1, dmg - armorEff);
  let dealt = 0;
  if (e.shield > 0) {
    const absorbed = Math.min(e.shield, eff);
    e.shield -= absorbed;
    eff -= absorbed;
    dealt += absorbed;
  }
  if (eff > 0) {
    e.hp -= eff;
    dealt += eff;
  }
  e.hitFlash = 0.09;
  if (src) s.dmgByType[src] += dealt;
}

function spawnEnemy(s: GameState, kind: EnemyKind, atDist = 0) {
  const def = ENEMIES[kind];
  const p = posAt(s.map, atDist);
  const shield = (def.shield ?? 0) * s.hpMult;
  s.enemies.push({
    id: s.nextId++,
    kind,
    hp: def.hp * s.hpMult,
    maxHp: def.hp * s.hpMult,
    shield,
    maxShield: shield,
    armor: def.armor,
    speed: def.speed,
    bounty: Math.round(def.bounty * s.bountyMult),
    score: def.score,
    leak: def.leak,
    size: def.size,
    dist: atDist,
    x: p.x,
    y: p.y,
    slowMul: 1,
    hitFlash: 0,
    stun: 0,
    age: 0,
    rushing: false,
    alive: true,
  });
}

/** Pick a target inside range per the tower's priority mode. */
function pickTarget(
  s: GameState,
  cx: number,
  cy: number,
  range: number,
  mode: TargetMode,
): Enemy | null {
  let best: Enemy | null = null;
  let bestKey = -Infinity;
  for (const e of s.enemies) {
    if (!e.alive) continue;
    const d = dist(cx, cy, e.x, e.y);
    if (d > range) continue;
    let key: number;
    switch (mode) {
      case "last":
        key = -e.dist;
        break;
      case "strong":
        key = e.hp + e.shield;
        break;
      case "weak":
        key = -(e.hp + e.shield);
        break;
      case "near":
        key = -d;
        break;
      default: // "first"
        key = e.dist;
    }
    if (key > bestKey) {
      bestKey = key;
      best = e;
    }
  }
  return best;
}

// --- Simulation step -----------------------------------------------------

export function step(s: GameState, dt: number) {
  if (s.status === "over" || s.status === "setup" || dt <= 0) return;

  const rateMul = s.overclock > 0 ? TUNING.overclockRate : 1;

  // Ability timers always cool down.
  if (s.overclock > 0) s.overclock = Math.max(0, s.overclock - dt);
  if (s.overclockCd > 0) s.overclockCd = Math.max(0, s.overclockCd - dt);
  if (s.surgeCd > 0) s.surgeCd = Math.max(0, s.surgeCd - dt);

  // 1. Spawn anything due this step (only while a wave is live).
  if (s.status === "wave") {
    s.waveTime += dt;
    while (s.spawnIdx < s.spawns.length && s.spawns[s.spawnIdx].at <= s.waveTime) {
      spawnEnemy(s, s.spawns[s.spawnIdx].kind);
      s.spawnIdx++;
    }
  }

  // 2. Per-enemy upkeep: reset slow, age, decay flashes + stun.
  for (const e of s.enemies) {
    e.slowMul = 1;
    e.age += dt;
    if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
    if (e.stun > 0) e.stun = Math.max(0, e.stun - dt);
  }

  // 2b. Menders top up nearby allies (before damage, so hits can still kill).
  for (const h of s.enemies) {
    if (!h.alive) continue;
    const hd = ENEMIES[h.kind];
    if (!hd.regen || !hd.healRadius) continue;
    for (const e of s.enemies) {
      if (!e.alive || e.hp >= e.maxHp) continue;
      if (dist(h.x, h.y, e.x, e.y) <= hd.healRadius)
        e.hp = Math.min(e.maxHp, e.hp + hd.regen * dt);
    }
  }

  // 3. Towers: damper fields slow + bleed, firing towers shoot. Generator idles.
  for (const t of s.towers) {
    if (t.fireFlash > 0) t.fireFlash = Math.max(0, t.fireFlash - dt);
    const st = towerStatsOf(t);
    const cx = t.c;
    const cy = t.r;

    if (st.special.kind === "generator") continue; // pays out on wave clear

    if (st.special.kind === "slow") {
      const { slowFactor, dps } = st.special;
      const bleed = dps * rateMul;
      for (const e of s.enemies) {
        if (!e.alive) continue;
        if (dist(cx, cy, e.x, e.y) <= st.range) {
          if (slowFactor < e.slowMul) e.slowMul = slowFactor;
          if (bleed > 0) {
            e.hp -= bleed * dt;
            s.dmgByType.damper += bleed * dt;
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
    const target = pickTarget(s, cx, cy, st.range, t.target);
    if (!target) continue;
    t.cooldown = (st.rate > 0 ? 1 / st.rate : 1) / rateMul;
    t.fireFlash = 0.12;
    t.angle = Math.atan2(target.y - cy, target.x - cx);

    if (st.special.kind === "chain") {
      // Instant lightning: hit the primary, then arc to the nearest unhit
      // neighbours, damage falling off per jump. Drawn as one polyline beam.
      const { chains, chainRange, falloff } = st.special;
      const hits: Enemy[] = [target];
      let curDmg = st.dmg;
      applyDamage(s, target, curDmg, 0, "arc");
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
        applyDamage(s, next, curDmg, 0, "arc");
        pts.push(next.x, next.y);
        hits.push(next);
        cur = next;
      }
      s.effects.push({ kind: "beam", ttl: 0.12, life: 0.12, x: cx, y: cy, pts });
    } else if (st.special.kind === "pierce") {
      // True line-pierce railgun: an instant shot that strikes every enemy on
      // its line out to range, ignoring a fraction of armour on each.
      const { pierce } = st.special;
      const dirX = Math.cos(t.angle);
      const dirY = Math.sin(t.angle);
      const reach = st.range;
      const corridor = 0.42;
      let farAlong = reach;
      for (const e of s.enemies) {
        if (!e.alive) continue;
        const rx = e.x - cx;
        const ry = e.y - cy;
        const along = rx * dirX + ry * dirY;
        if (along < -0.2 || along > reach + 0.5) continue;
        const perp = Math.abs(rx * dirY - ry * dirX);
        if (perp <= corridor + e.size * 0.5) {
          applyDamage(s, e, st.dmg, pierce, "driver");
          farAlong = Math.max(farAlong, Math.min(reach, along + 0.4));
        }
      }
      s.effects.push({
        kind: "rail",
        ttl: 0.16,
        life: 0.16,
        x: cx,
        y: cy,
        pts: [cx, cy, cx + dirX * farAlong, cy + dirY * farAlong],
      });
    } else {
      // single (bolt): a homing shot.
      const p = acquireProj();
      p.id = s.nextId++;
      p.x = cx;
      p.y = cy;
      p.target = target;
      p.tx = target.x;
      p.ty = target.y;
      p.dmg = st.dmg;
      p.pierce = 0;
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
      if (p.target && p.target.alive) applyDamage(s, p.target, p.dmg, p.pierce, p.kind);
      p.alive = false;
    } else {
      p.x += ((p.tx - p.x) / d) * move;
      p.y += ((p.ty - p.y) / d) * move;
    }
  }

  // 5. Resolve kills (anything that dropped to 0 hp this step). Splitters seed
  // children at their death point — collected first, spawned after the loop.
  const splits: { kind: EnemyKind; at: number }[] = [];
  for (const e of s.enemies) {
    if (e.alive && e.hp <= 0) {
      e.alive = false;
      s.kills++;
      s.cash += e.bounty;
      s.cashEarned += e.bounty;
      s.score += e.score;
      const def = ENEMIES[e.kind];
      if (def.splitInto) {
        for (let i = 0; i < def.splitInto.count; i++)
          splits.push({ kind: def.splitInto.kind, at: Math.max(0, e.dist - 0.3 - i * 0.15) });
      }
      // render.ts skips bursts under prefers-reduced-motion; the engine always
      // records them so headless/offline ticks stay deterministic.
      s.effects.push({ kind: "burst", ttl: 0.32, life: 0.32, x: e.x, y: e.y });
    }
  }
  for (const sp of splits) spawnEnemy(s, sp.kind, sp.at);

  // 6. Move survivors; anything reaching the core leaks. Rushers burst; stunned
  // enemies hold position.
  for (const e of s.enemies) {
    if (!e.alive) continue;
    let burst = 1;
    const rd = ENEMIES[e.kind].rush;
    if (rd) {
      e.rushing = e.age % rd.interval < rd.duration;
      if (e.rushing) burst = rd.mult;
    }
    const v = e.stun > 0 ? 0 : e.speed * e.slowMul * burst;
    e.dist += v * dt;
    if (e.dist >= s.map.pathLength) {
      e.alive = false;
      s.lives -= e.leak;
      s.leaked++;
      s.waveLeaks++;
      s.streak = 0;
      s.shake = Math.min(1.4, s.shake + 0.25 + e.leak * 0.05);
      s.effects.push({ kind: "leak", ttl: 0.5, life: 0.5, x: s.map.core.c, y: s.map.core.r });
    } else {
      const p = posAt(s.map, e.dist);
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
  // generators pay a dividend; the score bonus folds in surviving lives and a
  // flawless-streak multiplier, so a clean clear outscores a barely-survived one.
  if (s.status === "wave" && s.spawnIdx >= s.spawns.length && s.enemies.length === 0) {
    const bonus = TUNING.waveClearBase + s.wave * TUNING.waveClearPer;
    s.cash += bonus;
    s.cashEarned += bonus;

    let dividends = 0;
    for (const t of s.towers) {
      const sp = towerStatsOf(t).special;
      if (sp.kind === "generator") {
        dividends += sp.dividend;
        s.effects.push({
          kind: "float",
          ttl: 1.1,
          life: 1.1,
          x: t.c,
          y: t.r,
          text: `+${Math.round(sp.dividend)}`,
        });
      }
    }
    if (dividends > 0) {
      s.cash += Math.round(dividends);
      s.cashEarned += Math.round(dividends);
    }

    if (s.waveLeaks === 0) s.streak = Math.min(TUNING.streakMax, s.streak + 1);
    const streakMul = 1 + Math.min(TUNING.streakMax, s.streak) * TUNING.streakStep;
    s.score += Math.round((bonus + s.lives * TUNING.scoreLifeWeight) * streakMul);

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

/** Final score once the run is over (live score already folds in the bonuses;
    this is the value compared against the local best). */
export const finalScore = (s: GameState) => s.score;
