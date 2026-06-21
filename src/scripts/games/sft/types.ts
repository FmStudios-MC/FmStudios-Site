/* Server-Farm Tycoon - shared types.
   The simulation (engine.ts) is pure: it reads a GameState + static defs and
   returns Derived values or a mutated state. No DOM here. */

export type BuildingCategory = "producer" | "power" | "cooling" | "staff";

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

  // Staff act as global, additive multipliers (fraction per unit).
  multCompute?: number; // +x to the global compute multiplier
  multPrice?: number; // +x to the global sell-price multiplier
  multUptime?: number; // raises the heat-throttle floor (less severe throttling)

  /** Hidden until lifetime earnings reach this value. */
  unlockAt?: number;
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

  overclockUntil: number; // epoch ms, while > now the burst is active
  overclockReadyAt: number; // epoch ms, cooldown gate
  lastTick: number; // epoch ms, for offline catch-up
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
  price: number; // $/FLOP after reputation + mults
  moneyPerSec: number;
  pendingCredits: number; // credits gained if prestiging now
  overclockActive: boolean;
  computeMult: number; // combined compute multiplier (debug/preview)
}
