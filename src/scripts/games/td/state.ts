/* A fresh run + Meta (de)serialization. Only Meta is persisted; the live
   GameState is rebuilt from scratch every run, so it has no version field. The
   chosen map + difficulty are baked into the run at creation. */

import { DIFFICULTY_BY_ID, MAPS, TUNING, buildMap } from "./config";
import type { Difficulty, GameState, Meta, ModeBest, TowerId } from "./types";

export const SAVE_VERSION = 2;

const DIFFICULTIES: Difficulty[] = ["calm", "standard", "relentless"];
const zeroDmg = (): Record<TowerId, number> => ({
  bolt: 0,
  arc: 0,
  damper: 0,
  driver: 0,
  generator: 0,
});

export interface RunOpts {
  mapId?: string;
  difficulty?: Difficulty;
}

/** A brand-new run on the chosen map + difficulty. Starts in "setup" so the
    player picks before the board comes live; index flips it to "lull". */
export function defaultState(opts: RunOpts = {}): GameState {
  const map = buildMap(opts.mapId ?? MAPS[0].id);
  const diff = DIFFICULTY_BY_ID[opts.difficulty ?? "standard"];
  return {
    status: "setup",
    map,
    difficulty: diff.id,
    hpScale: diff.hpScale,

    wave: 0,
    cash: diff.startCash,
    lives: diff.startLives,
    maxLives: diff.startLives,
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

    overclock: 0,
    overclockCd: 0,
    surgeCd: 0,
    surgeArm: false,

    streak: 0,
    waveLeaks: 0,

    selected: null,
    build: null,
    hover: null,
    preview: null,
    speed: 1,
    paused: false,
    shake: 0,

    kills: 0,
    leaked: 0,
    cashEarned: 0,
    built: 0,
    dmgByType: zeroDmg(),
    nextId: 1,
  };
}

const emptyBest = (): Record<Difficulty, ModeBest> => ({
  calm: { score: 0, wave: 0 },
  standard: { score: 0, wave: 0 },
  relentless: { score: 0, wave: 0 },
});

export function defaultMeta(): Meta {
  return {
    version: SAVE_VERSION,
    bestScore: 0,
    bestWave: 0,
    runs: 0,
    muted: false,
    difficulty: "standard",
    mapId: MAPS[0].id,
    modeBest: emptyBest(),
  };
}

/** Validate + repair a parsed Meta blob. Returns a usable Meta either way,
    migrating the v1 shape (no per-mode bests) by seeding Standard. */
export function sanitizeMeta(raw: unknown): Meta {
  const base = defaultMeta();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const num = (v: unknown, f: number) =>
    typeof v === "number" && isFinite(v) ? v : f;
  const nonneg = (v: unknown, f: number) => Math.max(0, Math.floor(num(v, f)));

  const bestScore = nonneg(o.bestScore, 0);
  const bestWave = nonneg(o.bestWave, 0);

  const modeBest = emptyBest();
  const rawBest = o.modeBest as Record<string, unknown> | undefined;
  for (const d of DIFFICULTIES) {
    const mb = rawBest?.[d] as Record<string, unknown> | undefined;
    modeBest[d] = {
      score: nonneg(mb?.score, 0),
      wave: nonneg(mb?.wave, 0),
    };
  }
  // v1 migration: fold the single old record into Standard if nothing's there.
  if (!rawBest && (bestScore > 0 || bestWave > 0)) {
    modeBest.standard = { score: bestScore, wave: bestWave };
  }

  const difficulty = DIFFICULTIES.includes(o.difficulty as Difficulty)
    ? (o.difficulty as Difficulty)
    : "standard";
  const mapId = MAPS.some((m) => m.id === o.mapId) ? (o.mapId as string) : MAPS[0].id;

  return {
    version: SAVE_VERSION,
    bestScore,
    bestWave,
    runs: nonneg(o.runs, 0),
    muted: o.muted === true,
    difficulty,
    mapId,
    modeBest,
  };
}

// re-exported so callers don't need to reach into config for the tuning floor.
export const START_CASH = TUNING.startCash;
