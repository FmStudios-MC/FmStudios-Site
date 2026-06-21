/* Pure simulation. No DOM, no storage. Given a GameState (+ static config),
   it derives the live economy and advances it by a time delta. */

import type { BuildingDef, Derived, GameState } from "./types";
import {
  BUILDINGS,
  BUILDING_BY_ID,
  PRESTIGE,
  TUNING,
  UPGRADES,
} from "./config";

const owned = (s: GameState, id: string) => s.buildings[id] ?? 0;
const plevel = (s: GameState, id: string) => s.prestigeUpgrades[id] ?? 0;
const hasUpgrade = (s: GameState, id: string) => s.upgrades.includes(id);

/** Cost of the next unit of a building, after prestige cost-growth reduction. */
export function buildingCost(s: GameState, def: BuildingDef): number {
  const reduction = plevel(s, "bulk") * 0.01;
  const growth = Math.max(1.05, def.growth - reduction);
  return Math.ceil(def.baseCost * Math.pow(growth, owned(s, def.id)));
}

/** Cost of the next level of a prestige upgrade. */
export function prestigeCost(s: GameState, id: string): number {
  const def = PRESTIGE.find((p) => p.id === id);
  if (!def) return Infinity;
  if (def.maxLevel != null && plevel(s, id) >= def.maxLevel) return Infinity;
  return Math.ceil(def.baseCost * Math.pow(def.costGrowth, plevel(s, id)));
}

/** Run earnings needed for the *first* credit of the current rebuild. Climbs
    with every completed rebuild, so each one demands a bigger run than the last. */
export function creditScale(s: GameState): number {
  return TUNING.creditScale * Math.pow(TUNING.creditScaleGrowth, s.prestigeCount);
}

/** Credits awarded for prestiging right now. */
export function pendingCredits(s: GameState): number {
  return Math.floor(Math.sqrt(Math.max(0, s.runEarnings) / creditScale(s)));
}

/** The amount of money a fresh run starts with (Seed Capital prestige). */
export function startingMoney(s: GameState): number {
  return TUNING.startMoney * Math.pow(10, plevel(s, "seed"));
}

/** Current electricity price ($/kW/s). Swings on a slow deterministic cycle so
    off-peak and peak hours feel different without needing any stored state. */
export function gridPrice(now: number): number {
  const phase = (now / TUNING.gridCycleMs) * Math.PI * 2;
  return TUNING.basePowerRate * (1 + TUNING.gridSwing * Math.sin(phase));
}

/** Everything the UI and tick need, computed from state. */
export function derive(s: GameState, now: number): Derived {
  let computeBase = 0;
  let powerCap = TUNING.basePowerCap;
  let powerDraw = 0;
  let coolingCap =
    TUNING.baseCoolingCap * Math.pow(1.5, plevel(s, "passive-cooling"));
  let heatGen = 0;

  // Staff accumulators
  let engineerMult = 0;
  let salesMult = 0;
  let uptimeBonus = 0;

  // One-off upgrade modifiers
  let powerDrawFactor = 1;
  let upgradeComputeMult = 1;
  let upgradePriceMult = 1;
  let coolingCapMult = 1;
  for (const u of UPGRADES) {
    if (!hasUpgrade(s, u.id)) continue;
    if (u.powerDrawFactor) powerDrawFactor *= u.powerDrawFactor;
    if (u.multCompute) upgradeComputeMult *= u.multCompute;
    if (u.multPrice) upgradePriceMult *= u.multPrice;
    if (u.multCoolingCap) coolingCapMult *= u.multCoolingCap;
  }

  for (const def of BUILDINGS) {
    const n = owned(s, def.id);
    if (n === 0) continue;
    if (def.compute) computeBase += def.compute * n;
    if (def.powerCap) powerCap += def.powerCap * n;
    if (def.cooling) coolingCap += def.cooling * n;
    if (def.heat) heatGen += def.heat * n;
    if (def.powerDraw) {
      const draw = def.powerDraw * n;
      // PUE tuning only discounts producers, not infrastructure.
      powerDraw += def.category === "producer" ? draw * powerDrawFactor : draw;
    }
    if (def.multCompute) engineerMult += def.multCompute * n;
    if (def.multPrice) salesMult += def.multPrice * n;
    if (def.multUptime) uptimeBonus += def.multUptime * n;
  }

  coolingCap *= coolingCapMult;

  // Heat throttle: full output while cooling keeps up, easing toward a floor
  // as heat generation outruns cooling capacity.
  const heatLoad = coolingCap > 0 ? heatGen / coolingCap : heatGen > 0 ? 99 : 0;
  const floor = Math.min(0.95, TUNING.heatThrottleFloor + uptimeBonus);
  let heatThrottle = 1;
  if (heatGen > coolingCap) {
    const ratio = coolingCap / heatGen; // 0..1, smaller = worse
    heatThrottle = floor + (1 - floor) * ratio;
  }

  // Power throttle: a hard cap, no floor. Run out of power, output craters.
  const powerThrottle =
    powerDraw > powerCap && powerDraw > 0 ? powerCap / powerDraw : 1;

  // Prestige + upgrade + staff compute multipliers, plus active overclock.
  const prestigeComputeMult = 1 + 0.25 * plevel(s, "dist-arch");
  const overclockActive = now < s.overclockUntil;
  const overclock = overclockActive ? TUNING.overclockMult : 1;
  const computeMult =
    (1 + engineerMult) * upgradeComputeMult * prestigeComputeMult * overclock;

  const compute =
    computeBase * computeMult * heatThrottle * powerThrottle;

  // Sell price: base, lifted by reputation, sales staff, upgrades, prestige.
  const repMult = 1 + Math.log10(1 + s.reputation) * 0.2;
  const prestigePriceMult = 1 + 0.2 * plevel(s, "market");
  const price =
    TUNING.basePrice *
    repMult *
    (1 + salesMult) *
    upgradePriceMult *
    prestigePriceMult;

  // Operating cost: every kW of draw is billed at the live grid price.
  const grid = gridPrice(now);
  const grossPerSec = compute * price;
  const powerCost = powerDraw * grid;

  return {
    computeBase,
    compute,
    powerCap,
    powerDraw,
    powerThrottle,
    coolingCap,
    heatGen,
    heatThrottle,
    heatLoad,
    price,
    gridPrice: grid,
    grossPerSec,
    powerCost,
    moneyPerSec: grossPerSec - powerCost,
    pendingCredits: pendingCredits(s),
    overclockActive,
    computeMult,
  };
}

/** Advance the economy by dt seconds. Mutates and returns the state.
    `efficiency` lets offline catch-up run at a reduced rate. */
export function tick(
  s: GameState,
  dtSec: number,
  now: number,
  efficiency = 1,
): GameState {
  if (dtSec <= 0) {
    s.lastTick = now;
    return s;
  }
  const d = derive(s, now);

  // Revenue feeds earnings/credits; the electricity bill is a cash drain only,
  // so it never pushes lifetime/run earnings (and the unlocks they gate)
  // backwards. Cash is floored at zero so a lopsided farm can stall but never
  // go into debt.
  const gross = d.grossPerSec * dtSec * efficiency;
  const bill = d.powerCost * dtSec * efficiency;
  s.money = Math.max(0, s.money + gross - bill);
  s.runEarnings += gross;
  s.lifetimeEarnings += gross;

  // Reputation accrues slowly, scaled by output so a bigger farm earns trust.
  s.reputation += TUNING.reputationRate * Math.sqrt(d.compute) * dtSec;

  s.lastTick = now;
  return s;
}

// --- Actions ------------------------------------------------------------

export function buyBuilding(s: GameState, id: string): boolean {
  const def = BUILDING_BY_ID[id];
  if (!def) return false;
  const cost = buildingCost(s, def);
  if (s.money < cost) return false;
  s.money -= cost;
  s.buildings[id] = owned(s, id) + 1;
  return true;
}

export function buyUpgrade(s: GameState, id: string): boolean {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def || hasUpgrade(s, id) || !def.unlock(s)) return false;
  if (s.money < def.cost) return false;
  s.money -= def.cost;
  s.upgrades.push(id);
  return true;
}

export function buyPrestige(s: GameState, id: string): boolean {
  const cost = prestigeCost(s, id);
  if (!isFinite(cost) || s.credits < cost) return false;
  s.credits -= cost;
  s.prestigeUpgrades[id] = plevel(s, id) + 1;
  return true;
}

/** Reset the run, banking earned research credits. Keeps prestige progress. */
export function doPrestige(s: GameState, now: number): boolean {
  const gain = pendingCredits(s);
  if (gain <= 0) return false;
  s.credits += gain;
  s.prestigeCount += 1;
  s.money = startingMoney(s);
  s.reputation = 0;
  s.runEarnings = 0;
  s.buildings = {};
  s.upgrades = [];
  s.overclockUntil = 0;
  s.overclockReadyAt = 0;
  s.lastTick = now;
  return true;
}

export function triggerOverclock(s: GameState, now: number): boolean {
  if (now < s.overclockReadyAt) return false;
  s.overclockUntil = now + TUNING.overclockDurationMs;
  s.overclockReadyAt = now + TUNING.overclockCooldownMs;
  return true;
}
