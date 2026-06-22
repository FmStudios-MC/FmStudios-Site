/* Server-Farm Tycoon - shared types.
   The simulation (engine.ts) is pure: it reads a GameState + static defs and
   returns Derived values or a mutated state. No DOM here. */

export type BuildingCategory =
  | "producer"
  | "power"
  | "cooling"
  | "network"
  | "space"
  | "staff";

export interface BuildingDef {
  id: string;
  name: string;
  /** One short, functional line shown under the name. */
  desc: string;
  category: BuildingCategory;
  baseCost: number;
  /** Exponential cost growth per owned unit. */
  growth: number;

  // Per-unit effects (all optional; a building uses the ones that fit it).
  compute?: number; // FLOP/s produced
  powerDraw?: number; // kW consumed
  powerCap?: number; // kW capacity added
  heat?: number; // heat units/s generated
  cooling?: number; // heat units/s removed
  bandwidthCap?: number; // Gb/s of network throughput added
  bandwidthDraw?: number; // Gb/s consumed (producers)
  space?: number; // rack units of floor space occupied (physical equipment)
  spaceCap?: number; // rack units of floor space added (facility expansions)

  // Staff act as global, additive multipliers (fraction per unit).
  multCompute?: number; // +x to the global compute multiplier
  multPrice?: number; // +x to the global sell-price multiplier
  multUptime?: number; // raises the heat-throttle floor (less severe throttling)

  /** Hidden until lifetime earnings reach this value. */
  unlockAt?: number;
}

/** A sellable compute workload. The player splits the farm's capacity across
    these; each has its own price behaviour and its own load cost on the farm,
    so chasing the lucrative one (AI) means paying for it in heat and power. */
export interface WorkloadDef {
  id: string;
  name: string;
  desc: string;
  /** Baseline $/FLOP multiplier vs. TUNING.basePrice (web = 1.0, the neutral). */
  priceMult: number;
  /** ± fraction the price drifts on its own deterministic cycle. */
  swing: number;
  /** Length of one full price cycle, ms — decorrelates the workloads. */
  cycleMs: number;
  /** Extra heat driven at full allocation (fraction added to heat generation). */
  heatFactor?: number;
  /** Extra power drawn at full allocation (fraction added to producer draw). */
  powerFactor?: number;
}

export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  cost: number;

  // One-off, permanent-for-the-run modifiers.
  multCompute?: number; // multiplies global compute (e.g. 1.25)
  multPrice?: number; // multiplies sell price
  multCoolingCap?: number; // multiplies cooling capacity
  powerDrawFactor?: number; // scales producer power draw (e.g. 0.85 = -15%)
  bandwidthDrawFactor?: number; // scales producer bandwidth draw (e.g. 0.8 = -20%)

  /** Becomes purchasable once this predicate is true. */
  unlock: (s: GameState) => boolean;
}

export interface PrestigeDef {
  id: string;
  name: string;
  desc: string;
  baseCost: number; // in research credits
  costGrowth: number;
  maxLevel?: number;
  /** Which arm of the tech tree this node sits on (for grouping + colour). */
  branch?: "scale" | "efficiency" | "market";
  /** Prerequisite nodes that must reach a level before this one unlocks. */
  requires?: { id: string; level: number }[];
}

/** A world incident. While active, its multipliers ride the existing Derived
    levers (cooling, grid price, power cap, sell price, compute) — so the engine
    only multiplies, and ui.ts only paints. "bad" events can be Responded to. */
export interface EventDef {
  id: string;
  name: string;
  /** One functional ops-console line. */
  desc: string;
  kind: "bad" | "good";
  durationSec: number;
  /** Relative likelihood among eligible events. */
  weight: number;

  // Effect multipliers applied in derive() while the event is live.
  coolingMult?: number; // scales effective cooling capacity
  gridPriceMult?: number; // scales the electricity price
  powerCapMult?: number; // scales total power capacity
  priceMult?: number; // scales sell price
  computeMult?: number; // scales effective compute

  /** Only rolled when this holds (keeps irrelevant incidents from firing). */
  relevant?: (s: GameState) => boolean;
}

/** The currently-running incident, persisted so it survives reloads. */
export interface ActiveEvent {
  id: string;
  startedAt: number; // epoch ms
  endsAt: number; // epoch ms
  responded: boolean;
}

/** A localised thermal hotspot on the floor — the maintenance loop. While live
    it cuts effective cooling; the player clears it early with a rebalance, or
    waits it out and eats the throttle. Deterministic scheduler, like incidents. */
export interface ActiveHotspot {
  startedAt: number; // epoch ms
  endsAt: number; // epoch ms
}

/** A compute-delivery contract on the demand market, before it is accepted.
    Params are baked at offer time from a live snapshot, so the deal the player
    sees is the deal they get. Generated deterministically by the scheduler. */
export interface ContractOffer {
  id: string; // unique instance id (also used for log/UI keys)
  tag: string; // archetype label shown on the board ("Rush", "Bulk", "Reputation")
  required: number; // total FLOP to deliver
  reward: number; // cash paid on fulfilment
  repReward: number; // reputation gained on fulfilment
  repPenalty: number; // reputation lost if accepted then failed
  durationSec: number; // time allowed once accepted
  expiresAt: number; // epoch ms the offer is withdrawn if not accepted
}

/** An accepted contract being worked. `delivered` accrues from effective
    compute each tick; fulfils early at `required`, fails at `endsAt`. */
export interface ActiveContract {
  id: string;
  tag: string;
  required: number;
  delivered: number;
  reward: number;
  repReward: number;
  repPenalty: number;
  startedAt: number; // epoch ms
  endsAt: number; // epoch ms
}

/** A persisted milestone. `check` mirrors how UpgradeDef.unlock works; an
    optional `buff` makes it more than cosmetic. */
export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  check: (s: GameState, d: Derived) => boolean;
  /** Tiny permanent multipliers, applied in derive() once earned. */
  buff?: {
    multCompute?: number;
    multPrice?: number;
    multCoolingCap?: number;
  };
  /** Short functional note shown on the chip when a buff is attached. */
  buffNote?: string;
}

export interface GameState {
  version: number;
  money: number;
  reputation: number;
  credits: number; // prestige currency (research credits)
  runEarnings: number; // money earned since last prestige (drives credit payout)
  lifetimeEarnings: number; // all-time, for unlocks + stats
  prestigeCount: number;

  buildings: Record<string, number>; // id -> owned count
  upgrades: string[]; // purchased one-off upgrade ids
  prestigeUpgrades: Record<string, number>; // prestige id -> level

  // Workloads: how compute capacity is split across markets, as raw integer
  // weights (normalised in derive). Empty = everything on the first workload.
  allocation: Record<string, number>;

  overclockUntil: number; // epoch ms, while > now the burst is active
  overclockReadyAt: number; // epoch ms, cooldown gate
  lastTick: number; // epoch ms, for offline catch-up

  // Incidents (deterministic scheduler — see engine.advanceEvents).
  activeEvent: ActiveEvent | null;
  nextEventAt: number; // epoch ms the next incident is due (0 = unscheduled)
  eventSeed: number; // monotonic counter seeding the deterministic rolls
  eventsResponded: number; // lifetime count, for the milestone predicate

  // Rack hotspots / maintenance (deterministic scheduler — see advanceHotspots).
  hotspot: ActiveHotspot | null;
  nextHotspotAt: number; // epoch ms the next hotspot is due (0 = unscheduled)
  hotspotSeed: number; // monotonic counter seeding the deterministic rolls
  hotspotsCleared: number; // lifetime count, for the milestone predicate

  // Milestones (persist across rebuilds).
  achievements: string[]; // earned achievement ids

  // Contracts / demand market: a board of offers and concurrent active jobs,
  // plus a fulfilment streak that lifts reputation payouts.
  contracts: ActiveContract[]; // jobs in progress
  contractOffers: ContractOffer[]; // offers on the board
  nextOfferAt: number; // epoch ms a new offer may appear (0 = unscheduled)
  contractSeed: number; // monotonic counter seeding the deterministic rolls
  contractStreak: number; // consecutive fulfilments (resets on a failure)
  contractsCompleted: number; // lifetime count, for milestones + UI
  contractsFailed: number; // lifetime count, for UI
}

/** Everything computed from state each tick. Never persisted. */
export interface Derived {
  computeBase: number; // FLOP/s before throttle
  compute: number; // effective FLOP/s after throttle + mults + overclock
  powerCap: number;
  powerDraw: number;
  powerThrottle: number; // 0..1 hard cap when draw exceeds capacity
  coolingCap: number;
  heatGen: number;
  heatThrottle: number; // 0..1
  heatLoad: number; // heatGen / coolingCap (>1 means overheating)
  bandwidthCap: number; // Gb/s of throughput available
  bandwidthDraw: number; // Gb/s demanded by producers
  bandwidthThrottle: number; // 0..1 hard cap when draw exceeds capacity
  spaceCap: number; // rack units of floor space available
  spaceUsed: number; // rack units occupied by installed equipment
  price: number; // blended $/FLOP after reputation + mults + workload split
  gridPrice: number; // current electricity price, $/kW/s
  grossPerSec: number; // revenue before the electricity bill
  powerCost: number; // electricity bill, $/s
  moneyPerSec: number; // net income = grossPerSec - powerCost
  pendingCredits: number; // credits gained if prestiging now
  overclockActive: boolean;
  computeMult: number; // combined compute multiplier (debug/preview)

  /** Per-workload split as the UI needs it: normalised share + live price. */
  workloads: {
    id: string;
    name: string;
    alloc: number; // 0..1 share of capacity
    price: number; // effective $/FLOP for this workload right now
    trend: "up" | "down" | "flat";
  }[];

  /** The live rack hotspot, or null. `severity` is the cooling fraction lost. */
  hotspot: { endsAt: number; severity: number; clearCost: number } | null;

  /** The live incident as the UI needs it, or null. */
  event: {
    id: string;
    name: string;
    desc: string;
    kind: "bad" | "good";
    endsAt: number;
    respondCost: number;
    canRespond: boolean;
  } | null;

  /** The demand market as the UI needs it: the jobs in progress and the offers
      on the board, with timers/progress resolved against `now`. */
  contracts: {
    streak: number;
    canAccept: boolean; // false once the active list is at capacity
    active: {
      id: string;
      tag: string;
      required: number;
      delivered: number;
      progress: number; // 0..1
      reward: number;
      repReward: number;
      remainingSec: number;
    }[];
    offers: {
      id: string;
      tag: string;
      required: number;
      reward: number;
      repReward: number;
      repPenalty: number;
      durationSec: number;
      expiresSec: number; // seconds until the offer is withdrawn
    }[];
  };
}
