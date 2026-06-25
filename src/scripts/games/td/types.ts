/* Signal Defense - shared types.
   The simulation (engine.ts) is pure: it reads + mutates a GameState built from
   static defs (config.ts). No DOM, no canvas, no storage in here. The live run
   lives in GameState and is *never* persisted; only Meta (records/settings) is.
   Grid coordinates are in "cells": an integer (c, r) is a cell centre, so a
   tower at cell (c, r) sits at grid point (c, r) and ranges are in cell units. */

export type EnemyKind =
  | "packet"
  | "mote"
  | "hauler"
  | "plated"
  | "daemon"
  | "splitter"
  | "shielded"
  | "healer"
  | "rusher";
export type TowerId = "bolt" | "arc" | "damper" | "driver" | "generator";

/** How a firing tower chooses among the enemies inside its range. Damper and
    generator ignore this (field / no attack). Cycled from the node panel. */
export type TargetMode = "first" | "last" | "strong" | "weak" | "near";

export const TARGET_MODES: TargetMode[] = ["first", "last", "strong", "weak", "near"];
export const TARGET_LABEL: Record<TargetMode, string> = {
  first: "First",
  last: "Last",
  strong: "Strongest",
  weak: "Weakest",
  near: "Nearest",
};

/** Per-tower-type special behaviour. Upgrades recompute these in towerStats(). */
export type TowerSpecial =
  | { kind: "single" }
  | { kind: "chain"; chains: number; chainRange: number; falloff: number }
  | { kind: "slow"; slowFactor: number; dps: number }
  | { kind: "pierce"; pierce: number } // true line-pierce: hits everything on its shot line
  | { kind: "generator"; dividend: number }; // no attack; pays out each wave clear

/** What one upgrade tier changes. Applied in order over the base stats. */
export interface UpgradeMod {
  dmgMul?: number;
  rateMul?: number;
  rangeMul?: number;
  chainsAdd?: number; // chain towers: more jumps
  pierceAdd?: number; // pierce towers: ignore more armour (clamped to 0.95)
  slowFactor?: number; // slow towers: set a stronger (lower) slow factor
  dpsMul?: number; // slow towers: scale the field's damage-over-time
  dividendMul?: number; // generator towers: scale the per-wave payout
}

export interface UpgradeTier {
  cost: number;
  /** One short line shown on the Upgrade button. */
  note: string;
  mods: UpgradeMod;
}

/** The effective combat profile of a tower at a given upgrade tier. */
export interface TowerStats {
  dmg: number;
  range: number; // cells
  rate: number; // shots per second (0 for the slow field / generator)
  special: TowerSpecial;
}

export interface TowerDef extends TowerStats {
  id: TowerId;
  name: string;
  /** One-word role shown beside the name. */
  role: string;
  /** One short, functional line under the name. */
  desc: string;
  cost: number;
  /** Exactly two upgrade tiers. */
  upgrades: [UpgradeTier, UpgradeTier];
}

/** Periodic speed burst for the "rusher" archetype. */
export interface RushProfile {
  interval: number; // seconds between bursts
  duration: number; // seconds a burst lasts
  mult: number; // speed multiplier while bursting
}

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  hp: number;
  speed: number; // cells per second
  armor: number; // flat damage reduction per hit (pierce ignores a fraction)
  bounty: number; // cash on kill (scaled by the wave's bounty multiplier)
  score: number; // points on kill
  leak: number; // lives lost if it reaches the core
  /** Drawing hint, read by render.ts. */
  shape: "square" | "triangle" | "hex" | "diamond" | "pentagon";
  size: number; // radius in cells
  boss?: boolean;
  // --- behaviours (all optional; absence = the plain walk-the-path enemy) ---
  shield?: number; // absorbs this much (post-armour) damage before HP is touched
  regen?: number; // HP/sec restored to allies (and self) within healRadius
  healRadius?: number; // cells; presence marks this as a healer
  splitInto?: { kind: EnemyKind; count: number }; // spawned at the death point
  rush?: RushProfile; // periodic speed bursts
}

/** One burst of identical enemies inside a wave's spawn timeline. */
export interface SpawnGroup {
  kind: EnemyKind;
  count: number;
  gap: number; // seconds between spawns in this group
  delay: number; // seconds before the group starts (from wave start)
}

export interface WaveDef {
  groups: SpawnGroup[];
  /** Optional one-line theme label for the next-wave intel ("Swarm", "Armour"). */
  theme?: string;
}

// --- Map -----------------------------------------------------------------

/** A selectable map: just its name + an axis-aligned waypoint chain. All the
    derived geometry (path length, rasterised cells, core) is built once into a
    MapRuntime by buildMap(). */
export interface GameMap {
  id: string;
  name: string;
  desc: string;
  waypoints: [number, number][];
}

/** The geometry the simulation + renderer actually read. Lives on GameState
    (run-only, never persisted) so the engine stays pure — no module globals. */
export interface MapRuntime {
  id: string;
  name: string;
  waypoints: [number, number][];
  seg: number[]; // cumulative path length at each waypoint
  pathLength: number;
  pathCells: Set<string>; // "c,r" of every cell the path covers (unbuildable)
  core: { c: number; r: number };
}

// --- Difficulty ----------------------------------------------------------

export type Difficulty = "calm" | "standard" | "relentless";

export interface DifficultyDef {
  id: Difficulty;
  name: string;
  desc: string;
  startCash: number;
  startLives: number;
  hpScale: number; // multiplies the per-wave HP curve
}

// --- Live run entities ---------------------------------------------------

export interface Enemy {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  shield: number; // current shield (0 for most)
  maxShield: number;
  armor: number; // flat damage reduction per hit (pierce ignores a fraction)
  speed: number; // base cells/sec
  bounty: number;
  score: number;
  leak: number;
  size: number;
  dist: number; // distance travelled along the path, in cells
  x: number; // grid coords, derived from dist each step
  y: number;
  slowMul: number; // 0..1, recomputed every step from damper fields
  hitFlash: number; // seconds of "just took a hit" highlight remaining
  stun: number; // seconds frozen in place (from Surge)
  age: number; // seconds alive (drives rusher bursts)
  rushing: boolean; // mid speed-burst this step (render cue)
  alive: boolean;
}

export interface Tower {
  id: number;
  defId: TowerId;
  c: number;
  r: number;
  tier: number; // 0..2 (number of upgrades bought)
  cooldown: number; // seconds until it can fire again
  fireFlash: number; // seconds of muzzle glow remaining
  angle: number; // facing, radians (toward last target)
  target: TargetMode; // firing priority (ignored by damper/generator)
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  target: Enemy | null;
  tx: number; // last-known target position (in case the target dies mid-flight)
  ty: number;
  dmg: number;
  pierce: number;
  speed: number; // cells/sec
  kind: TowerId;
  alive: boolean;
}

/** Short-lived visual: a chain beam, a kill burst, a leak flash, a railgun
    trace, or an ability pulse. Purely cosmetic; the engine owns them so
    offline/headless ticks still work, but render.ts is free to skip the showy
    ones under prefers-reduced-motion. */
export interface Effect {
  kind: "beam" | "burst" | "leak" | "rail" | "surge" | "float";
  ttl: number;
  life: number; // initial ttl, for fade
  x: number;
  y: number;
  /** beam / rail: flattened [x1,y1,x2,y2, ...] segments. */
  pts?: number[];
  /** surge: radius in cells the pulse expands to. */
  radius?: number;
  /** float: short combat text (e.g. a generator payout). */
  text?: string;
}

export type RunStatus = "setup" | "lull" | "wave" | "over";

export interface GameState {
  status: RunStatus;
  map: MapRuntime;
  difficulty: Difficulty;
  hpScale: number; // difficulty HP multiplier, folded into each wave's hpMult

  wave: number; // 0 before the first wave is called
  cash: number;
  lives: number;
  maxLives: number;
  score: number;

  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  effects: Effect[];

  /** Remaining spawns for the active wave, sorted by `at` (seconds). */
  spawns: { kind: EnemyKind; at: number }[];
  spawnIdx: number;
  waveTime: number; // seconds elapsed in the current wave
  hpMult: number; // health scaling for the current wave (incl. difficulty)
  bountyMult: number; // cash scaling for the current wave

  lullTimer: number; // seconds until the next wave auto-starts (<=0 = manual)

  // Abilities (timers in seconds; cd = cooldown remaining, 0 = ready).
  overclock: number; // remaining duration of the active Overclock (0 = off)
  overclockCd: number;
  surgeCd: number;
  surgeArm: boolean; // armed and waiting for a target cell

  // Streak: consecutive flawless (no-leak) wave clears; boosts clear score.
  streak: number;
  waveLeaks: number; // leaks during the current wave (resets the streak if >0)

  // Ephemeral control/selection state (in GameState for convenience, never saved).
  selected: number | null; // selected tower id
  build: TowerId | null; // tower type queued for placement
  hover: { c: number; r: number } | null; // hovered cell, for the placement ghost
  preview: { c: number; r: number } | null; // tapped-but-unconfirmed cell (touch flow)
  speed: 1 | 2;
  paused: boolean;
  shake: number; // screen-shake energy, decays each step

  // Run tally (drives the end-of-run summary).
  kills: number;
  leaked: number;
  cashEarned: number; // total cash gained over the run (bounty + bonuses)
  built: number; // towers placed this run
  dmgByType: Record<TowerId, number>; // damage attributed to each tower type
  nextId: number;
}

/** Best score + wave for one difficulty. */
export interface ModeBest {
  score: number;
  wave: number;
}

/** The only persisted slice: local records + a couple of settings. */
export interface Meta {
  version: number;
  bestScore: number; // best across all modes (shown in the HUD)
  bestWave: number;
  runs: number;
  muted: boolean;
  difficulty: Difficulty; // last chosen, pre-selected on the setup screen
  mapId: string; // last chosen map
  modeBest: Record<Difficulty, ModeBest>;
}
