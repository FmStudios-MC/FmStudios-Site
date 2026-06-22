/* A fresh run + Meta (de)serialization. Only Meta is persisted; the live
   GameState is rebuilt from scratch every run, so it has no version field. */

import { TUNING } from "./config";
import type { GameState, Meta } from "./types";

export const SAVE_VERSION = 1;

/** A brand-new run, ready for the player to build before calling wave 1. */
export function defaultState(): GameState {
  return {
    status: "lull",
    wave: 0,
    cash: TUNING.startCash,
    lives: TUNING.startLives,
    maxLives: TUNING.startLives,
    score: 0,

    towers: [],
    enemies: [],
    projectiles: [],
    effects: [],

    spawns: [],
    spawnIdx: 0,
    waveTime: 0,
    hpMult: 1,
    bountyMult: 1,

    lullTimer: 0, // 0 before wave 1 => no auto-start; player calls the first wave

    selected: null,
    build: null,
    hover: null,
    speed: 1,
    paused: false,
    shake: 0,

    kills: 0,
    leaked: 0,
    nextId: 1,
  };
}

export function defaultMeta(): Meta {
  return { version: SAVE_VERSION, bestScore: 0, bestWave: 0, runs: 0, muted: true };
}

/** Validate + repair a parsed Meta blob. Returns a usable Meta either way. */
export function sanitizeMeta(raw: unknown): Meta {
  const base = defaultMeta();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const num = (v: unknown, f: number) =>
    typeof v === "number" && isFinite(v) ? v : f;
  return {
    version: SAVE_VERSION,
    bestScore: Math.max(0, Math.floor(num(o.bestScore, 0))),
    bestWave: Math.max(0, Math.floor(num(o.bestWave, 0))),
    runs: Math.max(0, Math.floor(num(o.runs, 0))),
    muted: o.muted !== false,
  };
}
