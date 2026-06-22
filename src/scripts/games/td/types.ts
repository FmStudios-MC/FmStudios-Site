/* Signal Defense - shared types.
   The simulation (engine.ts) is pure: it reads + mutates a GameState built from
   static defs (config.ts). No DOM, no canvas, no storage in here. The live run
   lives in GameState and is *never* persisted; only Meta (best score/wave) is.
   Grid coordinates are in "cells": an integer (c, r) is a cell centre, so a
   tower at cell (c, r) sits at grid point (c, r) and ranges are in cell units. */

export type EnemyKind = "packet" | "mote" | "hauler" | "plated" | "daemon";
export type TowerId = "bolt" | "arc" | "damper" | "driver";

/** Per-tower-type special behaviour. Upgrades recompute these in towerStats(). */
export type TowerSpecial =
  | { kind: "single" }
  | { kind: "chain"; chains: number; chainRange: number; falloff: number }
  | { kind: "slow"; slowFactor: number; dps: number }
  | { kind: "pierce"; pierce: number };

/** What one upgrade tier changes. Applied in order over the base stats. */
export interface UpgradeMod {
  dmgMul?: number;
  rateMul?: number;
  rangeMul?: number;
  chainsAdd?: number; // chain towers: more jumps
  pierceAdd?: number; // pierce towers: ignore more armour (clamped to 0.95)
  slowFactor?: number; // slow towers: set a stronger (lower) slow factor
  dpsMul?: number; // slow towers: scale the field's damage-over-time
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
  rate: number; // shots per second (0 for the slow field)
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
  shape: "square" | "triangle" | "hex";
  size: number; // radius in cells
  boss?: boolean;
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
}

// --- Live run entities ---------------------------------------------------

export interface Enemy {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  armor: number;
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

/** Short-lived visual: a chain beam, a kill burst, or a leak flash.
    Purely cosmetic; the engine owns them so offline/headless ticks still work,
    but render.ts is free to skip them under prefers-reduced-motion. */
export interface Effect {
  kind: "beam" | "burst" | "leak";
  ttl: number;
  life: number; // initial ttl, for fade
  x: number;
  y: number;
  /** beam: flattened [x1,y1,x2,y2, ...] segments. */
  pts?: number[];
}

export type RunStatus = "lull" | "wave" | "over";

export interface GameState {
  status: RunStatus;
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
  hpMult: number; // health scaling for the current wave
  bountyMult: number; // cash scaling for the current wave

  lullTimer: number; // seconds until the next wave auto-starts (<=0 = manual)

  // Ephemeral control/selection state (in GameState for convenience, never saved).
  selected: number | null; // selected tower id
  build: TowerId | null; // tower type queued for placement
  hover: { c: number; r: number } | null; // hovered cell, for the placement ghost
  speed: 1 | 2;
  paused: boolean;
  shake: number; // screen-shake energy, decays each step

  kills: number;
  leaked: number;
  nextId: number;
}

/** The only persisted slice: local records + a couple of settings. */
export interface Meta {
  version: number;
  bestScore: number;
  bestWave: number;
  runs: number;
  muted: boolean; // reserved for the future Web Audio pass
}
