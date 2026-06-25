/* Signal Defense - balancing data + map geometry. Pure data and the few
   map-derived helpers (path rasterisation, position-along-path). No logic that
   reads or mutates a live GameState lives here. Geometry is per-map: a GameMap
   is just a waypoint chain; buildMap() bakes it into a MapRuntime that the
   engine + renderer read off GameState (keeps the simulation free of globals). */

import type {
  DifficultyDef,
  EnemyDef,
  EnemyKind,
  GameMap,
  MapRuntime,
  TowerDef,
  TowerId,
  WaveDef,
} from "./types";

export const TUNING = {
  cols: 16,
  rows: 9,

  startCash: 150,
  startLives: 20,

  sellRefund: 0.7, // fraction of total spend returned on sell
  projectileSpeed: 15, // cells/sec for homing shots (bolt)

  lullSec: 12, // auto-start countdown between waves
  earlyCallRate: 2, // cash per second of lull skipped when calling early
  waveClearBase: 18, // base end-of-wave cash + score bonus
  waveClearPer: 6, // + this much per wave number
  scoreLifeWeight: 3, // bonus score per surviving life, each wave clear (rewards clean play)

  // Flawless-streak: each consecutive no-leak clear adds streakStep to a score
  // multiplier on the clear bonus, capped at streakMax steps.
  streakStep: 0.12,
  streakMax: 6,

  // Active abilities (seconds / multipliers).
  overclockDur: 5, // how long Overclock lasts
  overclockCd: 30, // cooldown after it fires
  overclockRate: 1.85, // fire-rate (and damper DoT) multiplier while active
  surgeCd: 26, // Surge cooldown
  surgeRadius: 2.4, // AoE radius in cells
  surgeDmg: 130, // flat damage to everything caught
  surgeStun: 1.1, // seconds the caught enemies are frozen

  authoredWaves: 16, // after this, waves are generated endlessly
} as const;

// --- Maps ----------------------------------------------------------------
// Each map is an axis-aligned waypoint chain (every segment changes only c OR
// r). The first point sits off an edge so enemies slide in; the last point is
// the core. buildMap() rasterises the path and measures it.

export const MAPS: GameMap[] = [
  {
    id: "switchback",
    name: "Switchback",
    desc: "Long horizontal sweeps.",
    waypoints: [
      [-1, 1],
      [14, 1],
      [14, 3],
      [2, 3],
      [2, 5],
      [14, 5],
      [14, 7],
      [6, 7],
    ],
  },
  {
    id: "spiral",
    name: "Spiral",
    desc: "Winds to a central core.",
    waypoints: [
      [-1, 1],
      [14, 1],
      [14, 7],
      [1, 7],
      [1, 3],
      [12, 3],
      [12, 5],
      [4, 5],
      [4, 4],
      [8, 4],
    ],
  },
  {
    id: "serpent",
    name: "Serpent",
    desc: "Tight vertical lanes; longest route.",
    waypoints: [
      [1, -1],
      [1, 7],
      [5, 7],
      [5, 1],
      [9, 1],
      [9, 7],
      [13, 7],
      [13, 2],
      [11, 2],
    ],
  },
];

export const MAP_BY_ID: Record<string, GameMap> = Object.fromEntries(
  MAPS.map((m) => [m.id, m]),
);

export const cellKey = (c: number, r: number) => `${c},${r}`;

export function inBounds(c: number, r: number): boolean {
  return c >= 0 && c < TUNING.cols && r >= 0 && r < TUNING.rows;
}

/** Bake a GameMap into the geometry the engine + renderer read each frame. */
export function buildMap(id: string): MapRuntime {
  const def = MAP_BY_ID[id] ?? MAPS[0];
  const wp = def.waypoints;

  const seg: number[] = [0];
  for (let i = 1; i < wp.length; i++) {
    const dx = wp[i][0] - wp[i - 1][0];
    const dy = wp[i][1] - wp[i - 1][1];
    seg.push(seg[i - 1] + Math.hypot(dx, dy));
  }

  const pathCells = new Set<string>();
  const add = (c: number, r: number) => {
    if (inBounds(c, r)) pathCells.add(cellKey(c, r));
  };
  for (let i = 1; i < wp.length; i++) {
    let [c, r] = wp[i - 1];
    const [tc, tr] = wp[i];
    const sc = Math.sign(tc - c);
    const sr = Math.sign(tr - r);
    add(c, r);
    while (c !== tc || r !== tr) {
      if (c !== tc) c += sc;
      else if (r !== tr) r += sr;
      add(c, r);
    }
  }

  return {
    id: def.id,
    name: def.name,
    waypoints: wp,
    seg,
    pathLength: seg[seg.length - 1],
    pathCells,
    core: { c: wp[wp.length - 1][0], r: wp[wp.length - 1][1] },
  };
}

/** Grid position at a given distance along a map's path (clamped to its ends). */
export function posAt(map: MapRuntime, dist: number): { x: number; y: number } {
  const { seg, waypoints: wp, pathLength } = map;
  const d = Math.max(0, Math.min(pathLength, dist));
  let i = 1;
  while (i < seg.length - 1 && seg[i] < d) i++;
  const t = (d - seg[i - 1]) / (seg[i] - seg[i - 1] || 1);
  return {
    x: wp[i - 1][0] + (wp[i][0] - wp[i - 1][0]) * t,
    y: wp[i - 1][1] + (wp[i][1] - wp[i - 1][1]) * t,
  };
}

/** A cell can host a tower if it's on the board and not on this map's path. */
export function isOpenCell(map: MapRuntime, c: number, r: number): boolean {
  return inBounds(c, r) && !map.pathCells.has(cellKey(c, r));
}

// --- Difficulty ----------------------------------------------------------

export const DIFFICULTIES: DifficultyDef[] = [
  {
    id: "calm",
    name: "Calm",
    desc: "More lives, gentler curve.",
    startCash: 180,
    startLives: 30,
    hpScale: 0.82,
  },
  {
    id: "standard",
    name: "Standard",
    desc: "The intended balance.",
    startCash: 150,
    startLives: 20,
    hpScale: 1,
  },
  {
    id: "relentless",
    name: "Relentless",
    desc: "Fewer lives, steeper waves.",
    startCash: 130,
    startLives: 12,
    hpScale: 1.18,
  },
];

export const DIFFICULTY_BY_ID = Object.fromEntries(
  DIFFICULTIES.map((d) => [d.id, d]),
) as Record<DifficultyDef["id"], DifficultyDef>;

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
    desc: "Slow railgun. The shot pierces every intrusion on its line.",
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
  {
    id: "generator",
    name: "Generator",
    role: "Economy",
    desc: "No attack. Pays a dividend each wave you clear — invest early.",
    cost: 90,
    dmg: 0,
    range: 0,
    rate: 0,
    special: { kind: "generator", dividend: 24 },
    upgrades: [
      { cost: 90, note: "+ dividend", mods: { dividendMul: 1.7 } },
      { cost: 170, note: "+ dividend", mods: { dividendMul: 1.7 } },
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
  // --- behavioural roster ---
  splitter: {
    kind: "splitter",
    name: "Splitter",
    hp: 60,
    speed: 1.55,
    armor: 1,
    bounty: 11,
    score: 18,
    leak: 1,
    shape: "diamond",
    size: 0.46,
    splitInto: { kind: "mote", count: 3 },
  },
  shielded: {
    kind: "shielded",
    name: "Shielded",
    hp: 70,
    speed: 1.4,
    armor: 2,
    bounty: 15,
    score: 24,
    leak: 1,
    shape: "pentagon",
    size: 0.46,
    shield: 60, // soaks 60 post-armour damage before HP is touched
  },
  healer: {
    kind: "healer",
    name: "Mender",
    hp: 120,
    speed: 1.2,
    armor: 2,
    bounty: 22,
    score: 34,
    leak: 2,
    shape: "hex",
    size: 0.5,
    regen: 14, // HP/sec mended to nearby allies (and itself)
    healRadius: 2.2,
  },
  rusher: {
    kind: "rusher",
    name: "Rusher",
    hp: 46,
    speed: 1.2,
    armor: 0,
    bounty: 9,
    score: 16,
    leak: 1,
    shape: "triangle",
    size: 0.42,
    rush: { interval: 2.4, duration: 0.9, mult: 3.2 },
  },
};

// --- Waves ---------------------------------------------------------------
// The authored opening teaches the roster in order: packets, then motes, the
// first boss, haulers, plated, the behavioural archetypes, and escalating
// mixes. After TUNING.authoredWaves the generator (below) takes over forever.

export const WAVES: WaveDef[] = [
  { theme: "Probe", groups: [{ kind: "packet", count: 8, gap: 0.9, delay: 0 }] },
  { theme: "Probe", groups: [{ kind: "packet", count: 12, gap: 0.7, delay: 0 }] },
  {
    theme: "Swarm",
    groups: [
      { kind: "packet", count: 6, gap: 0.8, delay: 0 },
      { kind: "mote", count: 10, gap: 0.35, delay: 2 },
    ],
  },
  {
    theme: "Armour",
    groups: [
      { kind: "packet", count: 8, gap: 0.7, delay: 0 },
      { kind: "plated", count: 4, gap: 1.4, delay: 3 },
    ],
  },
  {
    theme: "Boss",
    groups: [
      { kind: "packet", count: 8, gap: 0.6, delay: 0 },
      { kind: "daemon", count: 1, gap: 0, delay: 4 },
    ],
  },
  {
    theme: "Heavy",
    groups: [
      { kind: "hauler", count: 4, gap: 1.8, delay: 0 },
      { kind: "mote", count: 12, gap: 0.3, delay: 2 },
    ],
  },
  {
    theme: "Fracture", // introduces the splitter
    groups: [
      { kind: "packet", count: 8, gap: 0.6, delay: 0 },
      { kind: "splitter", count: 5, gap: 1.1, delay: 2 },
    ],
  },
  {
    theme: "Swarm",
    groups: [
      { kind: "mote", count: 20, gap: 0.22, delay: 0 },
      { kind: "plated", count: 6, gap: 0.9, delay: 3 },
    ],
  },
  {
    theme: "Warded", // introduces the shielded
    groups: [
      { kind: "shielded", count: 6, gap: 1.0, delay: 0 },
      { kind: "packet", count: 10, gap: 0.5, delay: 2 },
    ],
  },
  {
    theme: "Blitz", // introduces the rusher
    groups: [
      { kind: "rusher", count: 8, gap: 0.7, delay: 0 },
      { kind: "splitter", count: 4, gap: 1.2, delay: 3 },
    ],
  },
  {
    theme: "Mended", // introduces the healer
    groups: [
      { kind: "healer", count: 2, gap: 2.2, delay: 0 },
      { kind: "plated", count: 8, gap: 0.7, delay: 1 },
      { kind: "mote", count: 12, gap: 0.28, delay: 4 },
    ],
  },
  {
    theme: "Boss",
    groups: [
      { kind: "packet", count: 10, gap: 0.4, delay: 0 },
      { kind: "daemon", count: 2, gap: 3, delay: 3 },
      { kind: "shielded", count: 6, gap: 0.9, delay: 5 },
    ],
  },
  {
    theme: "Heavy",
    groups: [
      { kind: "hauler", count: 6, gap: 1.2, delay: 0 },
      { kind: "rusher", count: 10, gap: 0.4, delay: 1 },
      { kind: "plated", count: 8, gap: 0.7, delay: 3 },
    ],
  },
  {
    theme: "Fracture",
    groups: [
      { kind: "splitter", count: 10, gap: 0.6, delay: 0 },
      { kind: "healer", count: 2, gap: 2.5, delay: 2 },
      { kind: "mote", count: 16, gap: 0.2, delay: 4 },
    ],
  },
  {
    theme: "Warded",
    groups: [
      { kind: "shielded", count: 10, gap: 0.7, delay: 0 },
      { kind: "hauler", count: 4, gap: 1.4, delay: 2 },
      { kind: "rusher", count: 8, gap: 0.5, delay: 4 },
    ],
  },
  {
    theme: "Onslaught",
    groups: [
      { kind: "packet", count: 16, gap: 0.32, delay: 0 },
      { kind: "hauler", count: 6, gap: 1.1, delay: 1 },
      { kind: "splitter", count: 8, gap: 0.7, delay: 3 },
      { kind: "shielded", count: 8, gap: 0.6, delay: 4 },
    ],
  },
];

/** Health scaling for a given wave. Ramps gently through the authored set,
    then compounds for the endless tail. */
export function waveHpMult(n: number): number {
  const a = TUNING.authoredWaves;
  if (n <= a) return 1 + (n - 1) * 0.05;
  const top = 1 + (a - 1) * 0.05;
  return top * Math.pow(1.13, n - a);
}

/** Cash scaling, kept under the health curve so the economy stays tight. */
export function waveBountyMult(n: number): number {
  return Math.sqrt(waveHpMult(n));
}

/** Procedural wave for n > authoredWaves. Cycles a handful of themes so the
    endless tail isn't one enemy with bigger numbers; boss on every 5th. */
export function generateWave(n: number): WaveDef {
  const k = n - TUNING.authoredWaves; // 1, 2, 3, ...
  const theme = k % 5; // 0..4, a rotating accent on the baseline
  const groups: WaveDef["groups"] = [
    { kind: "packet", count: 8 + k * 2, gap: 0.4, delay: 0 },
    { kind: "plated", count: 3 + k, gap: 0.8, delay: 2 },
  ];
  let label = "Mixed";

  if (theme === 0) {
    // Swarm: a wall of motes + rushers.
    groups.push({ kind: "mote", count: 18 + k * 4, gap: 0.16, delay: 1 });
    groups.push({ kind: "rusher", count: 6 + k, gap: 0.4, delay: 3 });
    label = "Swarm";
  } else if (theme === 1) {
    // Armour column: haulers + shielded, slow and tanky.
    groups.push({ kind: "hauler", count: 4 + Math.floor(k / 2), gap: 1.1, delay: 1 });
    groups.push({ kind: "shielded", count: 5 + k, gap: 0.7, delay: 3 });
    label = "Armour";
  } else if (theme === 2) {
    // Fracture: splitters, with menders keeping them topped up.
    groups.push({ kind: "splitter", count: 8 + k * 2, gap: 0.5, delay: 1 });
    groups.push({ kind: "healer", count: 1 + Math.floor(k / 3), gap: 2.2, delay: 2 });
    label = "Fracture";
  } else if (theme === 3) {
    // Blitz: rusher-heavy speed test.
    groups.push({ kind: "rusher", count: 12 + k * 2, gap: 0.32, delay: 1 });
    groups.push({ kind: "mote", count: 10 + k * 2, gap: 0.2, delay: 2 });
    label = "Blitz";
  } else {
    // Mixed bag of everything.
    groups.push({ kind: "mote", count: 12 + k * 2, gap: 0.2, delay: 1 });
    groups.push({ kind: "shielded", count: 4 + k, gap: 0.7, delay: 2 });
    groups.push({ kind: "splitter", count: 4 + k, gap: 0.7, delay: 3 });
    label = "Mixed";
  }

  if (n % 5 === 0) {
    groups.push({ kind: "daemon", count: Math.floor(n / 10) + 1, gap: 3, delay: 3 });
    label = "Boss";
  }
  return { groups, theme: label };
}

/** The wave definition for any wave number (authored or generated). */
export function waveDef(n: number): WaveDef {
  return n <= TUNING.authoredWaves ? WAVES[n - 1] : generateWave(n);
}
