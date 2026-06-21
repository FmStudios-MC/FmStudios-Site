/* Default state + (de)serialization. Versioned so saves survive balance edits. */

import type { GameState } from "./types";
import { TUNING } from "./config";

export const SAVE_VERSION = 1;

export function defaultState(now = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    money: TUNING.startMoney,
    reputation: 0,
    credits: 0,
    runEarnings: 0,
    lifetimeEarnings: 0,
    prestigeCount: 0,
    buildings: {},
    upgrades: [],
    prestigeUpgrades: {},
    overclockUntil: 0,
    overclockReadyAt: 0,
    lastTick: now,
  };
}

/** Validate + repair a parsed object into a usable GameState. Returns null if
    the shape is unrecoverable, so callers can fall back to a fresh game. */
export function sanitize(raw: unknown, now = Date.now()): GameState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const base = defaultState(now);

  const num = (v: unknown, fallback: number) =>
    typeof v === "number" && isFinite(v) ? v : fallback;

  const buildings: Record<string, number> = {};
  if (o.buildings && typeof o.buildings === "object") {
    for (const [k, v] of Object.entries(o.buildings as object)) {
      const n = num(v, 0);
      if (n > 0) buildings[k] = Math.floor(n);
    }
  }

  const prestigeUpgrades: Record<string, number> = {};
  if (o.prestigeUpgrades && typeof o.prestigeUpgrades === "object") {
    for (const [k, v] of Object.entries(o.prestigeUpgrades as object)) {
      const n = num(v, 0);
      if (n > 0) prestigeUpgrades[k] = Math.floor(n);
    }
  }

  return {
    version: SAVE_VERSION,
    money: num(o.money, base.money),
    reputation: num(o.reputation, 0),
    credits: num(o.credits, 0),
    runEarnings: num(o.runEarnings, 0),
    lifetimeEarnings: num(o.lifetimeEarnings, 0),
    prestigeCount: num(o.prestigeCount, 0),
    buildings,
    upgrades: Array.isArray(o.upgrades)
      ? (o.upgrades.filter((x) => typeof x === "string") as string[])
      : [],
    prestigeUpgrades,
    overclockUntil: num(o.overclockUntil, 0),
    overclockReadyAt: num(o.overclockReadyAt, 0),
    lastTick: num(o.lastTick, now),
  };
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}
