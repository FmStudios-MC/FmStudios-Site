/* Default state + (de)serialization. Versioned so saves survive balance edits. */

import type {
  ActiveContract,
  ActiveEvent,
  ActiveHotspot,
  ActiveScript,
  ContractOffer,
  GameState,
} from "./types";
import { EVENT_BY_ID, SCRIPTED_BY_ID, TUNING, WORKLOADS } from "./config";

export const SAVE_VERSION = 7;

export function defaultState(now = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    money: TUNING.startMoney,
    reputation: 0,
    credits: 0,
    influence: 0,
    corporateUpgrades: {},
    runEarnings: 0,
    lifetimeEarnings: 0,
    prestigeCount: 0,
    buildings: {},
    upgrades: [],
    prestigeUpgrades: {},
    // Start with everything on the first (baseline) workload.
    allocation: { [WORKLOADS[0].id]: 1 },
    // Spot is the original swinging-grid behaviour (the default for new + old saves).
    powerContract: "spot",
    research: 0,
    researchNodes: {},
    wear: 0,
    servicedCount: 0,
    goals: [],
    endless: false,
    ascension: 0,
    overclockUntil: 0,
    overclockReadyAt: 0,
    lastTick: now,
    activeEvent: null,
    nextEventAt: 0,
    eventSeed: 0,
    eventsResponded: 0,
    hotspot: null,
    nextHotspotAt: 0,
    hotspotSeed: 0,
    hotspotsCleared: 0,
    activeScript: null,
    nextScriptAt: 0,
    scriptSeed: 0,
    scriptsCompleted: 0,
    achievements: [],
    contracts: [],
    contractOffers: [],
    nextOfferAt: 0,
    contractSeed: 0,
    contractStreak: 0,
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

  const countMap = (v: unknown): Record<string, number> => {
    const out: Record<string, number> = {};
    if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v as object)) {
        const n = num(val, 0);
        if (n > 0) out[k] = Math.floor(n);
      }
    }
    return out;
  };

  const buildings = countMap(o.buildings);
  const prestigeUpgrades = countMap(o.prestigeUpgrades);
  // Allocation weights can be 0, so keep the floor at >= 0 (not > 0 like counts).
  const allocation: Record<string, number> = {};
  if (o.allocation && typeof o.allocation === "object") {
    for (const [k, v] of Object.entries(o.allocation as object)) {
      const n = num(v, 0);
      if (n > 0) allocation[k] = Math.floor(n);
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

  let hotspot: ActiveHotspot | null = null;
  if (o.hotspot && typeof o.hotspot === "object") {
    const h = o.hotspot as Record<string, unknown>;
    hotspot = { startedAt: num(h.startedAt, now), endsAt: num(h.endsAt, now) };
  }

  // Only keep a live scripted event if its id is still recognisable; the
  // scheduler expires/replaces it on the next tick regardless.
  let activeScript: ActiveScript | null = null;
  if (o.activeScript && typeof o.activeScript === "object") {
    const a = o.activeScript as Record<string, unknown>;
    if (typeof a.id === "string" && SCRIPTED_BY_ID[a.id]) {
      activeScript = {
        id: a.id,
        startedAt: num(a.startedAt, now),
        endsAt: num(a.endsAt, now),
        heldMs: Math.max(0, num(a.heldMs, 0)),
        lastHold: a.lastHold === true,
      };
    }
  }

  const achievements = Array.isArray(o.achievements)
    ? (o.achievements.filter((x) => typeof x === "string") as string[])
    : [];

  const goals = Array.isArray(o.goals)
    ? (o.goals.filter((x) => typeof x === "string") as string[])
    : [];

  const researchNodes = countMap(o.researchNodes);

  const powerContract: GameState["powerContract"] =
    o.powerContract === "flat" || o.powerContract === "green" ? o.powerContract : "spot";

  // Contracts: read the new array shape, but migrate the old single
  // contract/contractOffer fields from a v3 save into the arrays.
  const readContract = (v: unknown): ActiveContract | null => {
    if (!v || typeof v !== "object") return null;
    const c = v as Record<string, unknown>;
    if (typeof c.id !== "string") return null;
    return {
      id: c.id,
      tag: typeof c.tag === "string" ? c.tag : "Contract",
      required: Math.max(0, num(c.required, 0)),
      delivered: Math.max(0, num(c.delivered, 0)),
      // Reserve is new in v7; default a moderate slice for migrated jobs.
      reserve: Math.max(0, Math.min(1, num(c.reserve, 0.3))),
      reward: Math.max(0, num(c.reward, 0)),
      repReward: Math.max(0, num(c.repReward, 0)),
      repPenalty: Math.max(0, num(c.repPenalty, 0)),
      startedAt: num(c.startedAt, now),
      endsAt: num(c.endsAt, now),
    };
  };
  const readOffer = (v: unknown): ContractOffer | null => {
    if (!v || typeof v !== "object") return null;
    const co = v as Record<string, unknown>;
    if (typeof co.id !== "string") return null;
    return {
      id: co.id,
      tag: typeof co.tag === "string" ? co.tag : "Contract",
      required: Math.max(0, num(co.required, 0)),
      reserve: Math.max(0, Math.min(1, num(co.reserve, 0.3))),
      reward: Math.max(0, num(co.reward, 0)),
      repReward: Math.max(0, num(co.repReward, 0)),
      repPenalty: Math.max(0, num(co.repPenalty, 0)),
      durationSec: Math.max(1, num(co.durationSec, 180)),
      expiresAt: num(co.expiresAt, now),
    };
  };

  let contracts: ActiveContract[] = [];
  if (Array.isArray(o.contracts)) {
    contracts = o.contracts
      .map(readContract)
      .filter((c): c is ActiveContract => c != null);
  } else {
    const single = readContract(o.contract); // v3 migration
    if (single) contracts = [single];
  }

  let contractOffers: ContractOffer[] = [];
  if (Array.isArray(o.contractOffers)) {
    contractOffers = o.contractOffers
      .map(readOffer)
      .filter((c): c is ContractOffer => c != null);
  } else {
    const single = readOffer(o.contractOffer); // v3 migration
    if (single) contractOffers = [single];
  }

  return {
    version: SAVE_VERSION,
    money: num(o.money, base.money),
    reputation: num(o.reputation, 0),
    credits: num(o.credits, 0),
    influence: Math.max(0, num(o.influence, 0)),
    corporateUpgrades: countMap(o.corporateUpgrades),
    runEarnings: num(o.runEarnings, 0),
    lifetimeEarnings: num(o.lifetimeEarnings, 0),
    prestigeCount: num(o.prestigeCount, 0),
    buildings,
    upgrades: Array.isArray(o.upgrades)
      ? (o.upgrades.filter((x) => typeof x === "string") as string[])
      : [],
    prestigeUpgrades,
    allocation,
    powerContract,
    research: Math.max(0, num(o.research, 0)),
    researchNodes,
    wear: Math.max(0, Math.min(1, num(o.wear, 0))),
    servicedCount: Math.max(0, Math.floor(num(o.servicedCount, 0))),
    goals,
    endless: o.endless === true,
    ascension: Math.max(0, Math.floor(num(o.ascension, 0))),
    overclockUntil: num(o.overclockUntil, 0),
    overclockReadyAt: num(o.overclockReadyAt, 0),
    lastTick: num(o.lastTick, now),
    activeEvent,
    nextEventAt: num(o.nextEventAt, 0),
    eventSeed: Math.max(0, Math.floor(num(o.eventSeed, 0))),
    eventsResponded: Math.max(0, Math.floor(num(o.eventsResponded, 0))),
    hotspot,
    nextHotspotAt: num(o.nextHotspotAt, 0),
    hotspotSeed: Math.max(0, Math.floor(num(o.hotspotSeed, 0))),
    hotspotsCleared: Math.max(0, Math.floor(num(o.hotspotsCleared, 0))),
    activeScript,
    nextScriptAt: num(o.nextScriptAt, 0),
    scriptSeed: Math.max(0, Math.floor(num(o.scriptSeed, 0))),
    scriptsCompleted: Math.max(0, Math.floor(num(o.scriptsCompleted, 0))),
    achievements,
    contracts,
    contractOffers,
    nextOfferAt: num(o.nextOfferAt, 0),
    contractSeed: Math.max(0, Math.floor(num(o.contractSeed, 0))),
    contractStreak: Math.max(0, Math.floor(num(o.contractStreak, 0))),
    contractsCompleted: Math.max(0, Math.floor(num(o.contractsCompleted, 0))),
    contractsFailed: Math.max(0, Math.floor(num(o.contractsFailed, 0))),
  };
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}
