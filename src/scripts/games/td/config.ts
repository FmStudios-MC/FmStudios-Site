/* Signal Defense - balancing data + map geometry. Pure data and the few
   map-derived helpers (path rasterisation, position-along-path). No logic that
   reads or mutates a live GameState lives here. */

import type { EnemyDef, EnemyKind, TowerDef, TowerId, WaveDef } from "./types";

export const TUNING = {
  cols: 16,
  rows: 9,

  startCash: 150,
  startLives: 20,

  sellRefund: 0.7, // fraction of total spend returned on sell
  projectileSpeed: 15, // cells/sec for homing shots (bolt/driver)

  lullSec: 12, // auto-start countdown between waves
  earlyCallRate: 2, // cash per second of lull skipped when calling early
  waveClearBase: 18, // base end-of-wave cash + score bonus
  waveClearPer: 6, // + this much per wave number
  scoreLifeWeight: 3, // bonus score per surviving life, each wave clear (rewards clean play)

  authoredWaves: 12, // after this, waves are generated endlessly
} as const;

// --- Map -----------------------------------------------------------------
// Axis-aligned switchback. Integer (c, r) points are cell centres; the first
// point sits off the left edge so enemies slide in. The last point is the core.

export const WAYPOINTS: [number, number][] = [
  [-1, 1],
  [14, 1],
  [14, 3],
  [2, 3],
  [2, 5],
  [14, 5],
  [14, 7],
  [6, 7],
];

export const CORE = {
  c: WAYPOINTS[WAYPOINTS.length - 1][0],
  r: WAYPOINTS[WAYPOINTS.length - 1][1],
};

/** Cumulative path length at each waypoint, in cells. */
const SEG = (() => {
  const cum: number[] = [0];
  for (let i = 1; i < WAYPOINTS.length; i++) {
    const dx = WAYPOINTS[i][0] - WAYPOINTS[i - 1][0];
    const dy = WAYPOINTS[i][1] - WAYPOINTS[i - 1][1];
    cum.push(cum[i - 1] + Math.hypot(dx, dy));
  }
  return cum;
})();

export const PATH_LENGTH = SEG[SEG.length - 1];

/** Grid position at a given distance along the path (clamped to its ends). */
export function posAt(dist: number): { x: number; y: number } {
  const d = Math.max(0, Math.min(PATH_LENGTH, dist));
  let i = 1;
  while (i < SEG.length - 1 && SEG[i] < d) i++;
  const t = (d - SEG[i - 1]) / (SEG[i] - SEG[i - 1] || 1);
  return {
    x: WAYPOINTS[i - 1][0] + (WAYPOINTS[i][0] - WAYPOINTS[i - 1][0]) * t,
    y: WAYPOINTS[i - 1][1] + (WAYPOINTS[i][1] - WAYPOINTS[i - 1][1]) * t,
  };
}

/** Cells the path covers (so they can't be built on). Rasterised from the
    axis-aligned segments; off-board cells are skipped. */
export const PATH_CELLS: Set<string> = (() => {
  const set = new Set<string>();
  const add = (c: number, r: number) => {
    if (c >= 0 && c < TUNING.cols && r >= 0 && r < TUNING.rows)
      set.add(`${c},${r}`);
  };
  for (let i = 1; i < WAYPOINTS.length; i++) {
    let [c, r] = WAYPOINTS[i - 1];
    const [tc, tr] = WAYPOINTS[i];
    const sc = Math.sign(tc - c);
    const sr = Math.sign(tr - r);
    add(c, r);
    while (c !== tc || r !== tr) {
      if (c !== tc) c += sc;
      else if (r !== tr) r += sr;
      add(c, r);
    }
  }
  return set;
})();

export const cellKey = (c: number, r: number) => `${c},${r}`;

export function inBounds(c: number, r: number): boolean {
  return c >= 0 && c < TUNING.cols && r >= 0 && r < TUNING.rows;
}

/** A cell can host a tower if it's on the board and not on the path/core. */
export function isOpenCell(c: number, r: number): boolean {
  return inBounds(c, r) && !PATH_CELLS.has(cellKey(c, r));
}

// --- Towers --------------------------------------------------------------

export const TOWERS: TowerDef[] = [
  {
    id: "bolt",
    name: "Bolt Node",
    role: "Basic",
    desc: "Reliable single-target fire. The workhorse you spam early.",
    cost: 50,
    dmg: 11,
    range: 2.6,
    rate: 1.6,
    special: { kind: "single" },
    upgrades: [
      { cost: 55, note: "+ damage, + range", mods: { dmgMul: 1.6, rangeMul: 1.12 } },
      { cost: 120, note: "+ damage, + fire rate", mods: { dmgMul: 1.7, rateMul: 1.35 } },
    ],
  },
  {
    id: "arc",
    name: "Arc Coil",
    role: "Chain",
    desc: "Each shot arcs between nearby intrusions. Shreds tight swarms.",
    cost: 85,
    dmg: 7,
    range: 2.3,
    rate: 1.25,
    special: { kind: "chain", chains: 2, chainRange: 1.9, falloff: 0.82 },
    upgrades: [
      { cost: 80, note: "+1 arc, + damage", mods: { chainsAdd: 1, dmgMul: 1.4 } },
      { cost: 150, note: "+2 arcs, + damage", mods: { chainsAdd: 2, dmgMul: 1.4 } },
    ],
  },
  {
    id: "damper",
    name: "Damper",
    role: "Control",
    desc: "Slows every intrusion in its field. Multiplies your damage nodes.",
    cost: 70,
    dmg: 0,
    range: 2.6,
    rate: 0,
    special: { kind: "slow", slowFactor: 0.55, dps: 3 },
    upgrades: [
      { cost: 70, note: "stronger slow, + range", mods: { slowFactor: 0.42, rangeMul: 1.12, dpsMul: 1.5 } },
      { cost: 130, note: "stronger slow, + damage", mods: { slowFactor: 0.32, dpsMul: 1.6 } },
    ],
  },
  {
    id: "driver",
    name: "Driver",
    role: "Heavy",
    desc: "Slow, long-range, armour-piercing hits. The answer to plating.",
    cost: 140,
    dmg: 60,
    range: 3.8,
    rate: 0.5,
    special: { kind: "pierce", pierce: 0.7 },
    upgrades: [
      { cost: 120, note: "+ damage, + pierce", mods: { dmgMul: 1.5, pierceAdd: 0.15 } },
      { cost: 230, note: "+ damage, + range", mods: { dmgMul: 1.6, rangeMul: 1.1 } },
    ],
  },
];

export const TOWER_BY_ID: Record<TowerId, TowerDef> = Object.fromEntries(
  TOWERS.map((t) => [t.id, t]),
) as Record<TowerId, TowerDef>;

// --- Enemies -------------------------------------------------------------

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  packet: {
    kind: "packet",
    name: "Packet",
    hp: 32,
    speed: 1.7,
    armor: 0,
    bounty: 6,
    score: 10,
    leak: 1,
    shape: "square",
    size: 0.4,
  },
  mote: {
    kind: "mote",
    name: "Mote",
    hp: 13,
    speed: 3.1,
    armor: 0,
    bounty: 3,
    score: 6,
    leak: 1,
    shape: "triangle",
    size: 0.34,
  },
  hauler: {
    kind: "hauler",
    name: "Hauler",
    hp: 175,
    speed: 0.95,
    armor: 3,
    bounty: 18,
    score: 26,
    leak: 2,
    shape: "hex",
    size: 0.56,
  },
  plated: {
    kind: "plated",
    name: "Plated",
    hp: 80,
    speed: 1.45,
    armor: 9,
    bounty: 13,
    score: 20,
    leak: 1,
    shape: "square",
    size: 0.46,
  },
  daemon: {
    kind: "daemon",
    name: "Daemon",
    hp: 1000,
    speed: 1.05,
    armor: 6,
    bounty: 130,
    score: 200,
    leak: 6,
    shape: "hex",
    size: 0.74,
    boss: true,
  },
};

// --- Waves ---------------------------------------------------------------
// The authored opening teaches the roster in order: packets, then motes, the
// first boss, haulers, plated, and escalating mixes. After TUNING.authoredWaves
// the generator (below) takes over forever.

export const WAVES: WaveDef[] = [
  { groups: [{ kind: "packet", count: 8, gap: 0.9, delay: 0 }] },
  { groups: [{ kind: "packet", count: 12, gap: 0.7, delay: 0 }] },
  {
    groups: [
      { kind: "packet", count: 6, gap: 0.8, delay: 0 },
      { kind: "mote", count: 10, gap: 0.35, delay: 2 },
    ],
  },
  {
    groups: [
      { kind: "packet", count: 8, gap: 0.7, delay: 0 },
      { kind: "plated", count: 4, gap: 1.4, delay: 3 },
    ],
  },
  {
    groups: [
      { kind: "packet", count: 8, gap: 0.6, delay: 0 },
      { kind: "daemon", count: 1, gap: 0, delay: 4 },
    ],
  },
  {
    groups: [
      { kind: "hauler", count: 4, gap: 1.8, delay: 0 },
      { kind: "mote", count: 12, gap: 0.3, delay: 2 },
    ],
  },
  {
    groups: [
      { kind: "packet", count: 10, gap: 0.5, delay: 0 },
      { kind: "plated", count: 5, gap: 1.1, delay: 2 },
      { kind: "mote", count: 10, gap: 0.3, delay: 5 },
    ],
  },
  {
    groups: [
      { kind: "mote", count: 20, gap: 0.22, delay: 0 },
      { kind: "plated", count: 6, gap: 0.9, delay: 3 },
    ],
  },
  {
    groups: [
      { kind: "hauler", count: 5, gap: 1.4, delay: 0 },
      { kind: "plated", count: 8, gap: 0.8, delay: 2 },
      { kind: "mote", count: 12, gap: 0.28, delay: 4 },
    ],
  },
  {
    groups: [
      { kind: "packet", count: 10, gap: 0.4, delay: 0 },
      { kind: "daemon", count: 2, gap: 3, delay: 3 },
      { kind: "plated", count: 6, gap: 0.9, delay: 5 },
    ],
  },
  {
    groups: [
      { kind: "hauler", count: 6, gap: 1.2, delay: 0 },
      { kind: "mote", count: 24, gap: 0.2, delay: 1 },
      { kind: "plated", count: 8, gap: 0.7, delay: 3 },
    ],
  },
  {
    groups: [
      { kind: "packet", count: 16, gap: 0.35, delay: 0 },
      { kind: "hauler", count: 6, gap: 1.1, delay: 1 },
      { kind: "plated", count: 10, gap: 0.6, delay: 3 },
      { kind: "mote", count: 20, gap: 0.2, delay: 4 },
    ],
  },
];

/** Health scaling for a given wave. Ramps gently through the authored set,
    then compounds for the endless tail. */
export function waveHpMult(n: number): number {
  const a = TUNING.authoredWaves;
  if (n <= a) return 1 + (n - 1) * 0.06;
  const top = 1 + (a - 1) * 0.06;
  return top * Math.pow(1.14, n - a);
}

/** Cash scaling, kept under the health curve so the economy stays tight. */
export function waveBountyMult(n: number): number {
  return Math.sqrt(waveHpMult(n));
}

/** Procedural wave for n > authoredWaves. Boss on every 5th. */
export function generateWave(n: number): WaveDef {
  const k = n - TUNING.authoredWaves;
  const groups: WaveDef["groups"] = [
    { kind: "packet", count: 10 + k * 2, gap: 0.4, delay: 0 },
    { kind: "mote", count: 12 + k * 3, gap: 0.2, delay: 1 },
    { kind: "plated", count: 4 + k, gap: 0.8, delay: 2 },
  ];
  if (k % 2 === 0) {
    groups.push({ kind: "hauler", count: 3 + Math.floor(k / 2), gap: 1.2, delay: 0 });
  }
  if (n % 5 === 0) {
    groups.push({ kind: "daemon", count: Math.floor(n / 10) + 1, gap: 3, delay: 3 });
  }
  return { groups };
}

/** The wave definition for any wave number (authored or generated). */
export function waveDef(n: number): WaveDef {
  return n <= TUNING.authoredWaves ? WAVES[n - 1] : generateWave(n);
}
