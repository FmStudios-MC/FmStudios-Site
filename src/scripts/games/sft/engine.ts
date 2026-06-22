/* Pure simulation. No DOM, no storage. Given a GameState (+ static config),
   it derives the live economy and advances it by a time delta. */

import type {
  AchievementDef,
  BuildingDef,
  ContractOffer,
  Derived,
  EventDef,
  GameState,
  GoalDef,
  PowerContract,
  ReputationTierDef,
  ScriptedEventDef,
  WorkloadDef,
} from "./types";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_BY_ID,
  BUILDINGS,
  BUILDING_BY_ID,
  CONTRACT_ARCHETYPES,
  EVENT_BY_ID,
  EVENTS,
  FINAL_GOAL_ID,
  GOALS,
  PRESTIGE,
  REPUTATION_TIERS,
  RESEARCH,
  RESEARCH_BY_ID,
  SCRIPTED_BY_ID,
  SCRIPTED_EVENTS,
  TUNING,
  UPGRADES,
  WORKLOADS,
} from "./config";

const owned = (s: GameState, id: string) => s.buildings[id] ?? 0;
const plevel = (s: GameState, id: string) => s.prestigeUpgrades[id] ?? 0;
const hasUpgrade = (s: GameState, id: string) => s.upgrades.includes(id);

const PRODUCER_IDS = BUILDINGS.filter((b) => b.category === "producer").map(
  (b) => b.id,
);
const producerCount = (s: GameState): number =>
  PRODUCER_IDS.reduce((n, id) => n + owned(s, id), 0);

/** Deterministic 0..1 PRNG from an integer seed (mulberry32 finalizer). Keeps
    the incident scheduler replayable, so offline catch-up is fair. */
function rng(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Floor space the farm has and uses: equipment occupies rack units, facility
    expansions add them. Both sides read straight off the buildings record, so
    no persisted state is needed. Shared by derive() and the purchase gate. */
export function floorSpace(s: GameState): { used: number; cap: number } {
  let used = 0;
  let cap = TUNING.baseSpace;
  for (const def of BUILDINGS) {
    const n = owned(s, def.id);
    if (n === 0) continue;
    if (def.space) used += def.space * n;
    if (def.spaceCap) cap += def.spaceCap * n;
  }
  return { used, cap };
}

/** Effective per-unit cost-growth for a building, after Bulk Procurement. */
function effectiveGrowth(s: GameState, def: BuildingDef): number {
  const reduction = plevel(s, "bulk") * 0.01;
  return Math.max(1.05, def.growth - reduction);
}

/** Cost of the next unit of a building, after prestige cost-growth reduction. */
export function buildingCost(s: GameState, def: BuildingDef): number {
  return Math.ceil(
    def.baseCost * Math.pow(effectiveGrowth(s, def), owned(s, def.id)),
  );
}

export type BuyMult = 1 | 10 | "max";

/** How many of a building to buy at the given multiplier, and the total cost,
    respecting floor space and (for "max") available cash. ×1/×10 report the
    full amount so the caller can afford-gate it; "max" stops at what fits and
    what the player can pay. Costs are summed per-unit to match buildingCost. */
export function bulkBuyInfo(
  s: GameState,
  def: BuildingDef,
  mult: BuyMult,
): { count: number; cost: number } {
  const growth = effectiveGrowth(s, def);
  const ownedNow = owned(s, def.id);
  // Floor space is a hard ceiling on physical equipment.
  let spaceLeft = Infinity;
  if (def.space) {
    const { used, cap } = floorSpace(s);
    spaceLeft = Math.max(0, Math.floor((cap - used) / def.space));
  }
  const hardCap = mult === "max" ? spaceLeft : Math.min(mult, spaceLeft);
  let cost = 0;
  let count = 0;
  for (let i = 0; i < hardCap && count < 100_000; i++) {
    const unit = Math.ceil(def.baseCost * Math.pow(growth, ownedNow + i));
    if (mult === "max" && cost + unit > s.money) break;
    cost += unit;
    count += 1;
  }
  return { count, cost };
}

/** Buy several units at once (×1, ×10, or as many as cash + space allow).
    Returns how many were actually installed. */
export function buyBuildingBulk(
  s: GameState,
  id: string,
  mult: BuyMult,
): number {
  const def = BUILDING_BY_ID[id];
  if (!def) return 0;
  const { count, cost } = bulkBuyInfo(s, def, mult);
  if (count <= 0 || s.money < cost) return 0;
  s.money -= cost;
  s.buildings[id] = owned(s, id) + count;
  return count;
}

/** Whether a prestige node's prerequisite branch nodes are satisfied. */
export function prestigeUnlocked(s: GameState, id: string): boolean {
  const def = PRESTIGE.find((p) => p.id === id);
  if (!def?.requires) return true;
  return def.requires.every((r) => plevel(s, r.id) >= r.level);
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

/** Offline catch-up efficiency, lifted by the Warm Spares prestige unlock. */
export function offlineEfficiency(s: GameState): number {
  return TUNING.offlineEfficiency + (plevel(s, "warm-spares") > 0 ? 0.25 : 0);
}

/** Raw spot-market electricity price ($/kW/s). Swings on a slow deterministic
    cycle so off-peak and peak hours feel different without any stored state.
    This is the *market*; what the farm is billed depends on its contract. */
export function gridPrice(now: number): number {
  const phase = (now / TUNING.gridCycleMs) * Math.PI * 2;
  return TUNING.basePowerRate * (1 + TUNING.gridSwing * Math.sin(phase));
}

/** The Endless modifier (idea #5): a single multiplier that scales both
    challenge and reward once the player has engaged it. 1 when off. */
export function endlessMult(s: GameState): number {
  return s.endless ? TUNING.endlessMult : 1;
}

/** The reputation tier the farm currently stands in, plus progress toward the
    next one (idea #8). Pure function of reputation — no stored state. */
export function reputationTier(reputation: number): {
  index: number;
  def: ReputationTierDef;
  nextAt: number | null;
  nextName: string | null;
  progress: number;
} {
  let index = 0;
  for (let i = 0; i < REPUTATION_TIERS.length; i++) {
    if (reputation >= REPUTATION_TIERS[i].minRep) index = i;
  }
  const def = REPUTATION_TIERS[index];
  const next = REPUTATION_TIERS[index + 1] ?? null;
  if (!next) return { index, def, nextAt: null, nextName: null, progress: 1 };
  const span = next.minRep - def.minRep;
  const progress = span > 0 ? Math.min(1, (reputation - def.minRep) / span) : 1;
  return { index, def, nextAt: next.minRep, nextName: next.name, progress };
}

/** The price the farm is actually billed per kW, given its power contract and
    UPS batteries (idea #7). Flat + green are fixed; spot rides the market, with
    each battery shaving part of any premium above the neutral rate. */
export function effectiveGridPrice(s: GameState, now: number): number {
  if (s.powerContract === "flat") return TUNING.powerFlatRate;
  if (s.powerContract === "green") return TUNING.powerGreenRate;
  // Spot: the live market, with batteries flattening the peak.
  const market = gridPrice(now);
  const premium = market - TUNING.basePowerRate;
  const batteries = owned(s, "battery");
  if (premium > 0 && batteries > 0) {
    const shave = Math.min(
      TUNING.batteryShaveMax,
      1 - Math.pow(1 - TUNING.batteryShavePer, batteries),
    );
    return TUNING.basePowerRate + premium * (1 - shave);
  }
  return market;
}

/** Cost of the next level of an in-run research node (idea #6). */
export function researchCost(s: GameState, id: string): number {
  const def = RESEARCH_BY_ID[id];
  if (!def) return Infinity;
  const lvl = s.researchNodes[id] ?? 0;
  if (def.maxLevel != null && lvl >= def.maxLevel) return Infinity;
  return Math.ceil(def.baseCost * Math.pow(def.costGrowth, lvl));
}

/** Cost to service the floor back to nominal, scaled to live gross (idea #9). */
export function serviceCost(s: GameState, grossPerSec: number): number {
  return Math.max(
    TUNING.wearServiceMin,
    Math.ceil(grossPerSec * TUNING.wearServiceSeconds),
  );
}

// --- Workloads ----------------------------------------------------------

/** A workload's live price multiplier, swinging on its own deterministic cycle. */
export function workloadPrice(def: WorkloadDef, now: number): number {
  const phase = (now / def.cycleMs) * Math.PI * 2;
  return def.priceMult * (1 + def.swing * Math.sin(phase));
}

/** Normalised capacity split across workloads. Falls back to "all on the first
    workload" when nothing is allocated, so the default run behaves like before. */
export function allocationFractions(
  s: GameState,
): { def: WorkloadDef; frac: number }[] {
  let total = 0;
  const weights = WORKLOADS.map((def) => {
    const w = Math.max(0, s.allocation[def.id] ?? 0);
    total += w;
    return { def, w };
  });
  if (total <= 0) {
    return WORKLOADS.map((def, i) => ({ def, frac: i === 0 ? 1 : 0 }));
  }
  return weights.map(({ def, w }) => ({ def, frac: w / total }));
}

/** Shift a workload's allocation weight by `delta`, clamped to [0, max]. */
export function setAllocation(s: GameState, id: string, delta: number): boolean {
  if (!WORKLOADS.some((w) => w.id === id)) return false;
  // If nothing is explicitly allocated yet (fresh/migrated save), materialise
  // the implicit baseline first, so the first nudge blends rather than jumps.
  const total = WORKLOADS.reduce(
    (n, w) => n + Math.max(0, s.allocation[w.id] ?? 0),
    0,
  );
  if (total <= 0) s.allocation[WORKLOADS[0].id] = 1;
  const cur = Math.max(0, Math.floor(s.allocation[id] ?? 0));
  const next = Math.max(0, Math.min(TUNING.allocationMax, cur + delta));
  if (next === cur) return false;
  s.allocation[id] = next;
  return true;
}

// --- Incident scheduler -------------------------------------------------

/** Set the next-incident timestamp from a deterministic gap. Higher reputation
    tiers stretch the gap (fewer incidents); Endless compresses it. */
function scheduleNextEvent(s: GameState, now: number): void {
  const r = rng(s.eventSeed ^ 0x9e3779b9);
  const tier = reputationTier(s.reputation).def;
  const gap =
    (TUNING.eventMinGapMs + r * (TUNING.eventMaxGapMs - TUNING.eventMinGapMs)) *
    tier.incidentGapMult /
    endlessMult(s);
  s.nextEventAt = now + gap;
}

/** Pick an eligible incident deterministically from the current seed. */
function rollEvent(s: GameState): EventDef | null {
  const pool = EVENTS.filter((e) => !e.relevant || e.relevant(s));
  if (pool.length === 0) return null;
  const total = pool.reduce((sum, e) => sum + e.weight, 0);
  let r = rng(s.eventSeed) * total;
  for (const e of pool) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return pool[pool.length - 1];
}

/** Advance incident state up to `now`: expire a finished event, then fire a
    due one. An event whose whole window elapsed while offline is consumed
    (not applied retroactively), so returning players aren't penalised. */
function advanceEvents(s: GameState, now: number): void {
  if (s.nextEventAt === 0) {
    scheduleNextEvent(s, now);
    return;
  }
  if (s.activeEvent && now >= s.activeEvent.endsAt) {
    s.activeEvent = null;
    scheduleNextEvent(s, now);
  }
  if (!s.activeEvent && now >= s.nextEventAt) {
    if (s.lifetimeEarnings < TUNING.eventMinEarnings) {
      scheduleNextEvent(s, now);
      return;
    }
    const def = rollEvent(s);
    if (!def) {
      scheduleNextEvent(s, now);
      return;
    }
    const endsAt = s.nextEventAt + def.durationSec * 1000;
    s.eventSeed += 1;
    if (now < endsAt) {
      s.activeEvent = { id: def.id, startedAt: s.nextEventAt, endsAt, responded: false };
    } else {
      // Window already passed offline — skip it and line up the next one.
      scheduleNextEvent(s, now);
    }
  }
}

/** Cost to immediately mitigate the live incident. */
export function eventRespondCost(s: GameState, grossPerSec: number): number {
  return Math.max(
    TUNING.eventRespondMin,
    Math.ceil(grossPerSec * TUNING.eventRespondSeconds),
  );
}

// --- Rack hotspot scheduler ---------------------------------------------

/** Set the next-hotspot timestamp; technicians stretch the gap, Endless
    compresses it. */
function scheduleNextHotspot(s: GameState, now: number): void {
  const r = rng(s.hotspotSeed ^ 0xc2b2ae35);
  const gap =
    (TUNING.hotspotMinGapMs +
      r * (TUNING.hotspotMaxGapMs - TUNING.hotspotMinGapMs) +
      owned(s, "technician") * TUNING.hotspotTechGapMs) /
    endlessMult(s);
  s.nextHotspotAt = now + gap;
}

/** Advance hotspot state up to `now`, mirroring advanceEvents: expire a stale
    one, then fire a due one once the floor is busy enough to have hot spots.
    A window that fully elapsed offline is consumed rather than applied. */
function advanceHotspots(s: GameState, now: number): void {
  if (s.nextHotspotAt === 0) {
    scheduleNextHotspot(s, now);
    return;
  }
  if (s.hotspot && now >= s.hotspot.endsAt) {
    s.hotspot = null;
    scheduleNextHotspot(s, now);
  }
  if (!s.hotspot && now >= s.nextHotspotAt) {
    if (producerCount(s) < TUNING.hotspotMinProducers) {
      scheduleNextHotspot(s, now);
      return;
    }
    const endsAt = s.nextHotspotAt + TUNING.hotspotDurationSec * 1000;
    s.hotspotSeed += 1;
    if (now < endsAt) {
      s.hotspot = { startedAt: s.nextHotspotAt, endsAt };
    } else {
      scheduleNextHotspot(s, now);
    }
  }
}

/** Cost to immediately clear the live hotspot. */
export function hotspotClearCost(grossPerSec: number): number {
  return Math.max(
    TUNING.hotspotClearMin,
    Math.ceil(grossPerSec * TUNING.hotspotClearSeconds),
  );
}

// --- Scripted opportunity scheduler -------------------------------------

/** Set the next scripted-event timestamp from a deterministic gap. Rarer than
    incidents; the cadence is independent of reputation. */
function scheduleNextScript(s: GameState, now: number): void {
  const r = rng(s.scriptSeed ^ 0x1b873593);
  const gap =
    TUNING.scriptMinGapMs + r * (TUNING.scriptMaxGapMs - TUNING.scriptMinGapMs);
  s.nextScriptAt = now + gap;
}

/** Pick an eligible scripted event deterministically from the current seed. */
function rollScript(s: GameState): ScriptedEventDef | null {
  const pool = SCRIPTED_EVENTS.filter((e) => !e.relevant || e.relevant(s));
  if (pool.length === 0) return null;
  const total = pool.reduce((sum, e) => sum + e.weight, 0);
  let r = rng(s.scriptSeed ^ 0x2545f491) * total;
  for (const e of pool) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return pool[pool.length - 1];
}

/** Advance scripted-event scheduling up to `now`, mirroring advanceEvents:
    a window that closed without success expires quietly, then a new one opens
    when due, the farm is established and one is relevant. A window that fully
    elapsed offline is consumed (never auto-resolved) so absence can't win it. */
function advanceScripts(s: GameState, now: number): void {
  if (s.nextScriptAt === 0) {
    scheduleNextScript(s, now);
    return;
  }
  if (s.activeScript && now >= s.activeScript.endsAt) {
    s.activeScript = null;
    scheduleNextScript(s, now);
  }
  if (!s.activeScript && now >= s.nextScriptAt) {
    if (s.lifetimeEarnings < TUNING.scriptMinEarnings) {
      scheduleNextScript(s, now);
      return;
    }
    const def = rollScript(s);
    if (!def) {
      scheduleNextScript(s, now);
      return;
    }
    const endsAt = s.nextScriptAt + def.windowSec * 1000;
    s.scriptSeed += 1;
    if (now < endsAt) {
      s.activeScript = {
        id: def.id,
        startedAt: s.nextScriptAt,
        endsAt,
        heldMs: 0,
        lastHold: false,
      };
    } else {
      scheduleNextScript(s, now);
    }
  }
}

// --- Contract scheduler -------------------------------------------------

/** Set the earliest time a new offer may be posted, from a deterministic gap. */
function scheduleNextOffer(s: GameState, now: number): void {
  const r = rng(s.contractSeed ^ 0x85ebca6b);
  const gap =
    TUNING.contractOfferMinGapMs +
    r * (TUNING.contractOfferMaxGapMs - TUNING.contractOfferMinGapMs);
  s.nextOfferAt = now + gap;
}

/** Build a contract offer deterministically, scaled to the current farm and
    shaped by a rotating archetype, so the board holds a mix of deal shapes.
    Returns null when there's nothing meaningful to ask for yet (no compute). */
function generateOffer(s: GameState, now: number): ContractOffer | null {
  const d = derive(s, now);
  if (d.compute <= 0) return null;

  const arch = CONTRACT_ARCHETYPES[s.contractSeed % CONTRACT_ARCHETYPES.length];

  // Decorrelated draws off the same monotonic seed.
  const r2 = rng(s.contractSeed ^ 0xa5a5a5a5);
  const r3 = rng((s.contractSeed + 0x9e3779b9) | 0);
  const r4 = rng((s.contractSeed ^ 0x27d4eb2f) | 0);

  const durationSec = TUNING.contractDurationsSec[arch.durIdx];

  // Required output is a slice of full-throughput production over the window;
  // the archetype sets the centre, a jittered factor adds variety. Higher
  // reputation tiers (idea #8) post bigger jobs; Endless (idea #5) bigger still.
  const tierScale = reputationTier(s.reputation).def.contractScale;
  const targetMult = arch.target * (0.85 + r2 * 0.3);
  const required = Math.max(
    1,
    d.compute * durationSec * targetMult * tierScale * endlessMult(s),
  );

  // Reward beats letting that compute auto-sell, paid as a lump sum; Standing
  // Orders (prestige) sweetens every payout.
  const standing = plevel(s, "standing-orders") > 0 ? 1.25 : 1;
  const bonus = arch.reward * (0.9 + r3 * 0.2);
  const reward = Math.ceil(required * d.price * bonus * standing);

  // Reputation is the contract's second currency, weighted by archetype.
  const repReward = Math.max(
    1,
    Math.round((durationSec / 60) * (2 + r4 * 3) * arch.rep),
  );
  const repPenalty = Math.round(repReward * 1.5);

  return {
    id: "ct-" + s.contractSeed,
    tag: arch.tag,
    required,
    reward,
    repReward,
    repPenalty,
    durationSec,
    expiresAt: now + TUNING.contractOfferTtlMs,
  };
}

/** Advance the offer board up to `now`: withdraw stale offers, then top the
    board up toward its size when due and the farm is established. The board is
    independent of the active jobs now, so deals keep appearing while you work. */
function advanceContracts(s: GameState, now: number): void {
  if (s.nextOfferAt === 0) {
    scheduleNextOffer(s, now);
    return;
  }
  if (s.contractOffers.length) {
    s.contractOffers = s.contractOffers.filter((o) => now < o.expiresAt);
  }
  if (
    now >= s.nextOfferAt &&
    s.lifetimeEarnings >= TUNING.contractMinEarnings &&
    s.contractOffers.length < TUNING.contractBoardSize
  ) {
    const offer = generateOffer(s, now);
    s.contractSeed += 1;
    if (offer) s.contractOffers.push(offer);
    scheduleNextOffer(s, now);
  }
}

/** Reputation multiplier on a contract payout from the current streak. */
function streakMult(s: GameState): number {
  return 1 + Math.min(TUNING.contractStreakMax, s.contractStreak) * TUNING.contractStreakStep;
}

/** Everything the UI and tick need, computed from state. */
export function derive(s: GameState, now: number): Derived {
  let computeBase = 0;
  let powerCap = TUNING.basePowerCap;
  let powerDraw = 0;
  let producerPowerDraw = 0;
  let coolingCap =
    TUNING.baseCoolingCap * Math.pow(1.5, plevel(s, "passive-cooling"));
  let heatGen = 0;
  let bandwidthCap = TUNING.baseBandwidthCap;
  let bandwidthDraw = 0;
  let spaceCap = TUNING.baseSpace;
  let spaceUsed = 0;

  // Staff accumulators
  let engineerMult = 0;
  let salesMult = 0;
  let uptimeBonus = 0;

  // One-off upgrade modifiers
  let powerDrawFactor = 1;
  let bandwidthDrawFactor = 1;
  let upgradeComputeMult = 1;
  let upgradePriceMult = 1;
  let coolingCapMult = 1;
  for (const u of UPGRADES) {
    if (!hasUpgrade(s, u.id)) continue;
    if (u.powerDrawFactor) powerDrawFactor *= u.powerDrawFactor;
    if (u.bandwidthDrawFactor) bandwidthDrawFactor *= u.bandwidthDrawFactor;
    if (u.multCompute) upgradeComputeMult *= u.multCompute;
    if (u.multPrice) upgradePriceMult *= u.multPrice;
    if (u.multCoolingCap) coolingCapMult *= u.multCoolingCap;
  }

  // Permanent milestone buffs.
  for (const id of s.achievements) {
    const buff = ACHIEVEMENT_BY_ID[id]?.buff;
    if (!buff) continue;
    if (buff.multCompute) upgradeComputeMult *= buff.multCompute;
    if (buff.multPrice) upgradePriceMult *= buff.multPrice;
    if (buff.multCoolingCap) coolingCapMult *= buff.multCoolingCap;
  }

  // In-run research (idea #6): each owned level compounds one lever. These
  // reset on prestige, so they're a mid-run boost rather than a permanent one.
  for (const def of RESEARCH) {
    const lvl = s.researchNodes[def.id] ?? 0;
    if (lvl <= 0) continue;
    if (def.multComputePer) upgradeComputeMult *= Math.pow(1 + def.multComputePer, lvl);
    if (def.multPricePer) upgradePriceMult *= Math.pow(1 + def.multPricePer, lvl);
    if (def.multCoolingPer) coolingCapMult *= Math.pow(1 + def.multCoolingPer, lvl);
    if (def.powerDrawFactorPer) powerDrawFactor *= Math.pow(def.powerDrawFactorPer, lvl);
  }

  // Live incident multipliers (guarded by endsAt so the effect stops the
  // instant the window closes, even before the next economy tick clears it).
  // Predictive Ops (prestige) eases bad incidents halfway back toward neutral.
  const liveEvent =
    s.activeEvent && now < s.activeEvent.endsAt ? s.activeEvent : null;
  const evDef = liveEvent ? EVENT_BY_ID[liveEvent.id] : undefined;
  const soften =
    evDef?.kind === "bad" && plevel(s, "predictive-ops") > 0 ? 0.5 : 0;
  const ease = (m: number) => 1 + (m - 1) * (1 - soften);
  const evCoolingMult = ease(evDef?.coolingMult ?? 1);
  // The green power contract (idea #7) shrugs off the Grid Surge price spike.
  const gridSurgeImmune =
    s.powerContract === "green" && (evDef?.gridPriceMult ?? 1) > 1;
  const evGridMult = gridSurgeImmune ? 1 : ease(evDef?.gridPriceMult ?? 1);
  const evPowerCapMult = ease(evDef?.powerCapMult ?? 1);
  const evComputeMult = ease(evDef?.computeMult ?? 1);
  const evPriceMult = evDef?.priceMult ?? 1; // good-only, never softened

  for (const def of BUILDINGS) {
    const n = owned(s, def.id);
    if (n === 0) continue;
    if (def.compute) computeBase += def.compute * n;
    if (def.powerCap) powerCap += def.powerCap * n;
    if (def.cooling) coolingCap += def.cooling * n;
    if (def.heat) heatGen += def.heat * n;
    if (def.bandwidthCap) bandwidthCap += def.bandwidthCap * n;
    if (def.bandwidthDraw) bandwidthDraw += def.bandwidthDraw * n * bandwidthDrawFactor;
    if (def.space) spaceUsed += def.space * n;
    if (def.spaceCap) spaceCap += def.spaceCap * n;
    if (def.powerDraw) {
      const draw = def.powerDraw * n;
      // PUE tuning only discounts producers, not infrastructure.
      if (def.category === "producer") {
        const p = draw * powerDrawFactor;
        powerDraw += p;
        producerPowerDraw += p;
      } else {
        powerDraw += draw;
      }
    }
    if (def.multCompute) engineerMult += def.multCompute * n;
    if (def.multPrice) salesMult += def.multPrice * n;
    if (def.multUptime) uptimeBonus += def.multUptime * n;
  }

  // Workload split: the blend sets the effective sell price and the extra heat
  // and power the chosen markets drive (AI training runs hot and hungry).
  const fractions = allocationFractions(s);
  let workloadPriceMult = 0;
  let workloadHeatExtra = 0;
  let workloadPowerExtra = 0;
  for (const { def, frac } of fractions) {
    workloadPriceMult += frac * workloadPrice(def, now);
    if (def.heatFactor) workloadHeatExtra += frac * def.heatFactor;
    if (def.powerFactor) workloadPowerExtra += frac * def.powerFactor;
  }
  heatGen *= 1 + workloadHeatExtra;
  powerDraw += producerPowerDraw * workloadPowerExtra;

  coolingCap *= coolingCapMult * evCoolingMult;
  powerCap *= evPowerCapMult;

  // Rack hotspot: a live one cuts effective cooling until cleared or it expires.
  const hotspotActive = s.hotspot != null && now < s.hotspot.endsAt;
  if (hotspotActive) coolingCap *= TUNING.hotspotCoolingMult;

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

  // Bandwidth throttle: same hard cap as power. Starve the network and the
  // compute can't get out, so output is gated exactly the same way.
  const bandwidthThrottle =
    bandwidthDraw > bandwidthCap && bandwidthDraw > 0
      ? bandwidthCap / bandwidthDraw
      : 1;

  // Prestige + upgrade + staff compute multipliers, plus active overclock.
  const prestigeComputeMult =
    (1 + 0.25 * plevel(s, "dist-arch")) * (1 + 0.35 * plevel(s, "hyperthread"));
  const overclockActive = now < s.overclockUntil;
  const overclock = overclockActive ? TUNING.overclockMult : 1;
  const computeMult =
    (1 + engineerMult) *
    upgradeComputeMult *
    prestigeComputeMult *
    overclock *
    evComputeMult;

  // Hardware wear (idea #9): worn hardware shaves effective compute until it's
  // serviced. Wear of 0 (fresh runs) leaves output untouched.
  const wearPenalty = Math.max(0, Math.min(1, s.wear)) * TUNING.wearMaxPenalty;

  const compute =
    computeBase *
    computeMult *
    heatThrottle *
    powerThrottle *
    bandwidthThrottle *
    (1 - wearPenalty);

  // Reputation standing (idea #8) + Endless (idea #5) both lift sell price.
  const tier = reputationTier(s.reputation);
  const endlessM = endlessMult(s);

  // Sell price: base, lifted by reputation, sales staff, upgrades, prestige,
  // the live workload blend, the standing premium and the Endless modifier.
  const repMult = 1 + Math.log10(1 + s.reputation) * 0.2;
  const prestigePriceMult = 1 + 0.2 * plevel(s, "market");
  const standingMult = tier.def.priceBonus * endlessM;
  const price =
    TUNING.basePrice *
    repMult *
    (1 + salesMult) *
    upgradePriceMult *
    prestigePriceMult *
    evPriceMult *
    workloadPriceMult *
    standingMult;

  // Operating cost: every kW of draw is billed at the contract grid price
  // (idea #7); the raw market still drives the peak/off-peak read-out.
  const gridMarket = gridPrice(now);
  const grid = effectiveGridPrice(s, now) * evGridMult;
  const grossPerSec = compute * price;
  const powerCost = powerDraw * grid;

  // Per-workload view for the UI: normalised share + live effective $/FLOP.
  const workloads = fractions.map(({ def, frac }) => {
    const slope = Math.cos((now / def.cycleMs) * Math.PI * 2);
    const trend: "up" | "down" | "flat" =
      def.swing < 0.08 ? "flat" : slope > 0.15 ? "up" : slope < -0.15 ? "down" : "flat";
    return {
      id: def.id,
      name: def.name,
      alloc: frac,
      // Effective $/FLOP this workload would fetch (everything except the blend).
      price:
        TUNING.basePrice *
        repMult *
        (1 + salesMult) *
        upgradePriceMult *
        prestigePriceMult *
        evPriceMult *
        standingMult *
        workloadPrice(def, now),
      trend,
    };
  });

  // Surface the live incident for the UI banner.
  let event: Derived["event"] = null;
  if (liveEvent && evDef) {
    const respondCost = eventRespondCost(s, grossPerSec);
    event = {
      id: evDef.id,
      name: evDef.name,
      desc: evDef.desc,
      kind: evDef.kind,
      endsAt: liveEvent.endsAt,
      respondCost,
      canRespond:
        evDef.kind === "bad" && !liveEvent.responded && s.money >= respondCost,
    };
  }

  // Surface the live hotspot for the UI banner.
  const hotspot =
    hotspotActive && s.hotspot
      ? {
          endsAt: s.hotspot.endsAt,
          severity: 1 - TUNING.hotspotCoolingMult,
          clearCost: hotspotClearCost(grossPerSec),
        }
      : null;

  // Surface the live scripted opportunity for the UI banner. `holding` reads
  // the value the last tick recorded (the render loop runs ahead of the tick),
  // so the indicator tracks the goal without re-evaluating it here.
  let script: Derived["script"] = null;
  const liveScript =
    s.activeScript && now < s.activeScript.endsAt ? s.activeScript : null;
  if (liveScript) {
    const sdef = SCRIPTED_BY_ID[liveScript.id];
    if (sdef) {
      script = {
        id: sdef.id,
        name: sdef.name,
        goal: sdef.goal,
        endsAt: liveScript.endsAt,
        holdSec: sdef.holdSec,
        heldSec: Math.min(sdef.holdSec, liveScript.heldMs / 1000),
        progress:
          sdef.holdSec > 0
            ? Math.min(1, liveScript.heldMs / (sdef.holdSec * 1000))
            : 1,
        holding: liveScript.lastHold,
        reward: Math.ceil(grossPerSec * sdef.rewardGrossSec),
        rewardRep: sdef.rewardRep,
      };
    }
  }

  // Surface the demand market: jobs in progress + the offers on the board,
  // with timers + progress resolved against `now` so the UI only paints.
  const active = s.contracts.map((c) => ({
    id: c.id,
    tag: c.tag,
    required: c.required,
    delivered: c.delivered,
    progress: c.required > 0 ? Math.min(1, c.delivered / c.required) : 1,
    reward: c.reward,
    repReward: c.repReward,
    remainingSec: Math.max(0, (c.endsAt - now) / 1000),
  }));
  const offers = s.contractOffers
    .filter((o) => now < o.expiresAt)
    .map((o) => ({
      id: o.id,
      tag: o.tag,
      required: o.required,
      reward: o.reward,
      repReward: o.repReward,
      repPenalty: o.repPenalty,
      durationSec: o.durationSec,
      expiresSec: Math.max(0, (o.expiresAt - now) / 1000),
    }));

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
    bandwidthCap,
    bandwidthDraw,
    bandwidthThrottle,
    spaceCap,
    spaceUsed,
    price,
    gridPrice: grid,
    gridMarket,
    grossPerSec,
    powerCost,
    moneyPerSec: grossPerSec - powerCost,
    pendingCredits: pendingCredits(s),
    overclockActive,
    computeMult,
    wear: Math.max(0, Math.min(1, s.wear)),
    wearPenalty,
    serviceCost: serviceCost(s, grossPerSec),
    powerContract: s.powerContract,
    gridSurgeImmune,
    repTier: {
      index: tier.index,
      name: tier.def.name,
      nextName: tier.nextName,
      nextAt: tier.nextAt,
      progress: tier.progress,
    },
    endlessUnlocked: s.goals.includes(FINAL_GOAL_ID),
    endless: s.endless,
    endlessMult: endlessM,
    workloads,
    hotspot,
    script,
    event,
    contracts: {
      streak: s.contractStreak,
      canAccept: s.contracts.length < TUNING.contractMaxActive,
      active,
      offers,
    },
  };
}

/** Grant any newly-earned milestones, mutating state. Returns the freshly
    unlocked defs so the caller can log/toast them; pure of DOM + storage. */
export function claimAchievements(s: GameState, d: Derived): AchievementDef[] {
  const granted: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (s.achievements.includes(a.id)) continue;
    if (a.check(s, d)) {
      s.achievements.push(a.id);
      granted.push(a);
    }
  }
  return granted;
}

/** Grant any newly-completed campaign goals (idea #5). Mirrors
    claimAchievements; the caller logs/toasts the returned defs. */
export function claimGoals(s: GameState, d: Derived): GoalDef[] {
  const granted: GoalDef[] = [];
  for (const g of GOALS) {
    if (s.goals.includes(g.id)) continue;
    if (g.check(s, d)) {
      s.goals.push(g.id);
      granted.push(g);
    }
  }
  return granted;
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
  // Resolve incidents + hotspots + post/withdraw contract offers up to `now`
  // before reading the economy off state.
  advanceEvents(s, now);
  advanceHotspots(s, now);
  advanceScripts(s, now);
  advanceContracts(s, now);
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

  // In-run research points accrue from live compute (idea #6); spendable this
  // run on the research tree, reset on prestige.
  s.research +=
    TUNING.researchRate * Math.sqrt(Math.max(0, d.compute)) * dtSec * efficiency;

  // Hardware wear (idea #9): once the floor is busy, gear ages — faster when
  // running hot, slower with technicians on staff, gentler while offline.
  if (producerCount(s) >= TUNING.wearMinProducers) {
    const heatStress = 1 + (1 - d.heatThrottle) * TUNING.wearHeatStress;
    const techSlow = 1 / (1 + owned(s, "technician") * TUNING.wearTechSlow);
    const offline = efficiency < 1 ? TUNING.wearOfflineMult : 1;
    s.wear = Math.min(
      1,
      s.wear + TUNING.wearRatePerSec * heatStress * techSlow * offline * dtSec,
    );
  }

  // Contract delivery: each active job accrues effective compute over the slice
  // of this window that fell before its deadline (so a window that elapsed
  // offline can't deliver past the deadline). Fulfils the instant it's met
  // (paying a streak-boosted reputation reward); fails the instant it lapses.
  if (s.contracts.length) {
    const windowStart = now - dtSec * 1000;
    for (let i = s.contracts.length - 1; i >= 0; i--) {
      const c = s.contracts[i];
      const deliverSec =
        Math.max(0, Math.min(now, c.endsAt) - windowStart) / 1000;
      c.delivered += d.compute * deliverSec * efficiency;
      if (c.delivered >= c.required) {
        s.money += c.reward;
        s.runEarnings += c.reward;
        s.lifetimeEarnings += c.reward;
        s.reputation += c.repReward * streakMult(s);
        s.contractsCompleted += 1;
        s.contractStreak += 1;
        s.contracts.splice(i, 1);
      } else if (now >= c.endsAt) {
        s.reputation = Math.max(0, s.reputation - c.repPenalty);
        s.contractsFailed += 1;
        s.contractStreak = 0;
        s.contracts.splice(i, 1);
      }
    }
  }

  // Scripted opportunity progression (idea #15): accrue continuous hold toward
  // the goal while the condition holds, paying out on success. Live play only —
  // offline catch-up can't fairly evaluate a continuous-hold condition over a
  // single replayed window, so the schedule advances but never auto-resolves.
  if (s.activeScript && efficiency >= 1 && now < s.activeScript.endsAt) {
    const def = SCRIPTED_BY_ID[s.activeScript.id];
    if (def) {
      const holding = def.hold(s, d);
      // A break in the condition resets the continuous-hold accumulator.
      s.activeScript.heldMs = holding ? s.activeScript.heldMs + dtSec * 1000 : 0;
      s.activeScript.lastHold = holding;
      if (s.activeScript.heldMs >= def.holdSec * 1000) {
        const reward = Math.ceil(d.grossPerSec * def.rewardGrossSec);
        s.money += reward;
        s.runEarnings += reward;
        s.lifetimeEarnings += reward;
        s.reputation += def.rewardRep;
        s.scriptsCompleted += 1;
        s.activeScript = null;
        scheduleNextScript(s, now);
      }
    } else {
      s.activeScript = null;
    }
  }

  s.lastTick = now;
  return s;
}

// --- Actions ------------------------------------------------------------

export function buyBuilding(s: GameState, id: string): boolean {
  const def = BUILDING_BY_ID[id];
  if (!def) return false;
  // Floor space is a hard gate: equipment can't be installed without the rack
  // units to stand it on. Lift the cap by buying facility expansions.
  if (def.space) {
    const { used, cap } = floorSpace(s);
    if (used + def.space > cap) return false;
  }
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
  if (!prestigeUnlocked(s, id)) return false;
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
  // In-run research + hardware wear are per-run: a rebuild ships fresh gear and
  // a cleared lab (idea #6, #9). Goals, Endless and the power contract persist.
  s.research = 0;
  s.researchNodes = {};
  s.wear = 0;
  // Prefab Halls (prestige) hands every rebuild a Server Hall to build into.
  if (plevel(s, "prefab-halls") > 0) s.buildings["server-hall"] = 1;
  // Reset the workload split back to the default baseline.
  s.allocation = { [WORKLOADS[0].id]: 1 };
  s.overclockUntil = 0;
  s.overclockReadyAt = 0;
  // A world incident / hotspot on a now-empty farm is meaningless — clear them
  // and let the schedulers line up the next ones. (Milestones persist.)
  s.activeEvent = null;
  s.hotspot = null;
  s.nextHotspotAt = 0;
  // A scripted opportunity was sized for the old farm — drop it and reschedule.
  s.activeScript = null;
  s.nextScriptAt = 0;
  // Likewise drop any contracts/offers: the deals were sized for the old farm.
  s.contracts = [];
  s.contractOffers = [];
  s.contractStreak = 0;
  s.nextOfferAt = 0;
  s.lastTick = now;
  return true;
}

/** Spend cash to immediately end the live bad incident. */
export function respondEvent(s: GameState, now: number): boolean {
  const ev = s.activeEvent;
  if (!ev || now >= ev.endsAt || ev.responded) return false;
  const def = EVENT_BY_ID[ev.id];
  if (!def || def.kind !== "bad") return false;
  const cost = eventRespondCost(s, derive(s, now).grossPerSec);
  if (s.money < cost) return false;
  s.money -= cost;
  s.activeEvent = null;
  s.eventsResponded += 1;
  scheduleNextEvent(s, now);
  return true;
}

/** Spend cash to immediately clear the live rack hotspot. */
export function rebalanceRacks(s: GameState, now: number): boolean {
  if (!s.hotspot || now >= s.hotspot.endsAt) return false;
  const cost = hotspotClearCost(derive(s, now).grossPerSec);
  if (s.money < cost) return false;
  s.money -= cost;
  s.hotspot = null;
  s.hotspotsCleared += 1;
  scheduleNextHotspot(s, now);
  return true;
}

/** Take an offer off the board, starting its delivery clock from `now`. */
export function acceptContract(s: GameState, now: number, id: string): boolean {
  if (s.contracts.length >= TUNING.contractMaxActive) return false;
  const idx = s.contractOffers.findIndex((o) => o.id === id);
  if (idx < 0) return false;
  const o = s.contractOffers[idx];
  if (now >= o.expiresAt) return false;
  s.contracts.push({
    id: o.id,
    tag: o.tag,
    required: o.required,
    delivered: 0,
    reward: o.reward,
    repReward: o.repReward,
    repPenalty: o.repPenalty,
    startedAt: now,
    endsAt: now + o.durationSec * 1000,
  });
  s.contractOffers.splice(idx, 1);
  return true;
}

/** Pass on an offer; the scheduler tops the board back up in time. */
export function declineContract(s: GameState, _now: number, id: string): boolean {
  const idx = s.contractOffers.findIndex((o) => o.id === id);
  if (idx < 0) return false;
  s.contractOffers.splice(idx, 1);
  return true;
}

export function triggerOverclock(s: GameState, now: number): boolean {
  if (now < s.overclockReadyAt) return false;
  s.overclockUntil = now + TUNING.overclockDurationMs;
  s.overclockReadyAt = now + TUNING.overclockCooldownMs;
  return true;
}

/** Switch the farm's electricity contract (idea #7). Free to change. */
export function setPowerContract(s: GameState, contract: PowerContract): boolean {
  if (s.powerContract === contract) return false;
  s.powerContract = contract;
  return true;
}

/** Buy a level of an in-run research node with R&D points (idea #6). */
export function buyResearch(s: GameState, id: string): boolean {
  const cost = researchCost(s, id);
  if (!isFinite(cost) || s.research < cost) return false;
  s.research -= cost;
  s.researchNodes[id] = (s.researchNodes[id] ?? 0) + 1;
  return true;
}

/** Spend cash to service the floor back to nominal, clearing wear (idea #9). */
export function serviceHardware(s: GameState, now: number): boolean {
  if (s.wear <= 0) return false;
  const cost = serviceCost(s, derive(s, now).grossPerSec);
  if (s.money < cost) return false;
  s.money -= cost;
  s.wear = 0;
  s.servicedCount += 1;
  return true;
}

/** Toggle Endless mode (idea #5). Only available once the campaign is done. */
export function toggleEndless(s: GameState): boolean {
  if (!s.goals.includes(FINAL_GOAL_ID)) return false;
  s.endless = !s.endless;
  return true;
}
