/* Default state + (de)serialization. Versioned so saves survive balance edits. */

import type {
  ActiveContract,
  ActiveEvent,
  ContractOffer,
  GameState,
} from "./types";
import { EVENT_BY_ID, TUNING } from "./config";

export const SAVE_VERSION = 3;

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
    activeEvent: null,
    nextEventAt: 0,
    eventSeed: 0,
    eventsResponded: 0,
    achievements: [],
    contract: null,
    contractOffer: null,
    nextOfferAt: 0,
    contractSeed: 0,
    contractsCompleted: 0,
    contractsFailed: 0,
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

  // Only keep a live incident if its shape + id are recognisable; the
  // scheduler will expire/replace it on the next tick regardless.
  let activeEvent: ActiveEvent | null = null;
  if (o.activeEvent && typeof o.activeEvent === "object") {
    const e = o.activeEvent as Record<string, unknown>;
    if (typeof e.id === "string" && EVENT_BY_ID[e.id]) {
      activeEvent = {
        id: e.id,
        startedAt: num(e.startedAt, now),
        endsAt: num(e.endsAt, now),
        responded: e.responded === true,
      };
    }
  }

  const achievements = Array.isArray(o.achievements)
    ? (o.achievements.filter((x) => typeof x === "string") as string[])
    : [];

  // Contracts: keep an in-progress contract / pending offer only if the shape
  // reads back cleanly; the scheduler repairs anything missing on the next tick.
  let contract: ActiveContract | null = null;
  if (o.contract && typeof o.contract === "object") {
    const c = o.contract as Record<string, unknown>;
    if (typeof c.id === "string") {
      contract = {
        id: c.id,
        required: Math.max(0, num(c.required, 0)),
        delivered: Math.max(0, num(c.delivered, 0)),
        reward: Math.max(0, num(c.reward, 0)),
        repReward: Math.max(0, num(c.repReward, 0)),
        repPenalty: Math.max(0, num(c.repPenalty, 0)),
        startedAt: num(c.startedAt, now),
        endsAt: num(c.endsAt, now),
      };
    }
  }

  let contractOffer: ContractOffer | null = null;
  if (o.contractOffer && typeof o.contractOffer === "object") {
    const co = o.contractOffer as Record<string, unknown>;
    if (typeof co.id === "string") {
      contractOffer = {
        id: co.id,
        required: Math.max(0, num(co.required, 0)),
        reward: Math.max(0, num(co.reward, 0)),
        repReward: Math.max(0, num(co.repReward, 0)),
        repPenalty: Math.max(0, num(co.repPenalty, 0)),
        durationSec: Math.max(1, num(co.durationSec, 180)),
        expiresAt: num(co.expiresAt, now),
      };
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
    activeEvent,
    nextEventAt: num(o.nextEventAt, 0),
    eventSeed: Math.max(0, Math.floor(num(o.eventSeed, 0))),
    eventsResponded: Math.max(0, Math.floor(num(o.eventsResponded, 0))),
    achievements,
    contract,
    contractOffer,
    nextOfferAt: num(o.nextOfferAt, 0),
    contractSeed: Math.max(0, Math.floor(num(o.contractSeed, 0))),
    contractsCompleted: Math.max(0, Math.floor(num(o.contractsCompleted, 0))),
    contractsFailed: Math.max(0, Math.floor(num(o.contractsFailed, 0))),
  };
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}
