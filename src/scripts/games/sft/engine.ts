/* Pure simulation. No DOM, no storage. Given a GameState (+ static config),
   it derives the live economy and advances it by a time delta. */

import type {
  AchievementDef,
  BuildingDef,
  ContractOffer,
  Derived,
  EventDef,
  GameState,
} from "./types";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_BY_ID,
  BUILDINGS,
  BUILDING_BY_ID,
  EVENT_BY_ID,
  EVENTS,
  PRESTIGE,
  TUNING,
  UPGRADES,
} from "./config";

const owned = (s: GameState, id: string) => s.buildings[id] ?? 0;
const plevel = (s: GameState, id: string) => s.prestigeUpgrades[id] ?? 0;
const hasUpgrade = (s: GameState, id: string) => s.upgrades.includes(id);

/** Deterministic 0..1 PRNG from an integer seed (mulberry32 finalizer). Keeps
    the incident scheduler replayable, so offline catch-up is fair. */
function rng(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

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

// --- Incident scheduler -------------------------------------------------

/** Set the next-incident timestamp from a deterministic gap. */
function scheduleNextEvent(s: GameState, now: number): void {
  const r = rng(s.eventSeed ^ 0x9e3779b9);
  const gap =
    TUNING.eventMinGapMs + r * (TUNING.eventMaxGapMs - TUNING.eventMinGapMs);
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

// --- Contract scheduler -------------------------------------------------

/** Set the earliest time a new offer may be posted, from a deterministic gap. */
function scheduleNextOffer(s: GameState, now: number): void {
  const r = rng(s.contractSeed ^ 0x85ebca6b);
  const gap =
    TUNING.contractOfferMinGapMs +
    r * (TUNING.contractOfferMaxGapMs - TUNING.contractOfferMinGapMs);
  s.nextOfferAt = now + gap;
}

/** Build a contract offer deterministically, scaled to the current farm so a
    deal is always relevant to whoever's offered it. Returns null when there's
    nothing meaningful to ask for yet (no live compute). */
function generateOffer(s: GameState, now: number): ContractOffer | null {
  const d = derive(s, now);
  if (d.compute <= 0) return null;

  // Four decorrelated draws off the same monotonic seed.
  const r1 = rng(s.contractSeed);
  const r2 = rng(s.contractSeed ^ 0xa5a5a5a5);
  const r3 = rng((s.contractSeed + 0x9e3779b9) | 0);
  const r4 = rng((s.contractSeed ^ 0x27d4eb2f) | 0);

  const durs = TUNING.contractDurationsSec;
  const durationSec = durs[Math.min(durs.length - 1, Math.floor(r1 * durs.length))];

  // Required output is a slice of full-throughput production over the window;
  // > 1.0 means you'll have to grow capacity to fulfil it in time.
  const targetMult =
    TUNING.contractTargetMin +
    r2 * (TUNING.contractTargetMax - TUNING.contractTargetMin);
  const required = Math.max(1, d.compute * durationSec * targetMult);

  // Reward beats letting that compute auto-sell, paid as a lump sum.
  const bonus =
    TUNING.contractRewardBonusMin +
    r3 * (TUNING.contractRewardBonusMax - TUNING.contractRewardBonusMin);
  const reward = Math.ceil(required * d.price * bonus);

  // Reputation is the contract's second currency: completing lifts it, and
  // failing an accepted deal costs more than completing it pays.
  const repReward = Math.max(1, Math.round((durationSec / 60) * (2 + r4 * 3)));
  const repPenalty = Math.round(repReward * 1.5);

  return {
    id: "ct-" + s.contractSeed,
    required,
    reward,
    repReward,
    repPenalty,
    durationSec,
    expiresAt: now + TUNING.contractOfferTtlMs,
  };
}

/** Advance the offer board up to `now`: withdraw a stale offer, then post a
    fresh one when due. No offers are posted while a contract is in progress
    (the board holds one job at a time) or before the farm is established. */
function advanceContracts(s: GameState, now: number): void {
  if (s.nextOfferAt === 0) {
    scheduleNextOffer(s, now);
    return;
  }
  if (s.contractOffer && now >= s.contractOffer.expiresAt) {
    s.contractOffer = null;
    scheduleNextOffer(s, now);
  }
  if (
    !s.contractOffer &&
    !s.contract &&
    now >= s.nextOfferAt &&
    s.lifetimeEarnings >= TUNING.contractMinEarnings
  ) {
    const offer = generateOffer(s, now);
    s.contractSeed += 1;
    if (offer) s.contractOffer = offer;
    else scheduleNextOffer(s, now);
  }
}

/** Everything the UI and tick need, computed from state. */
export function derive(s: GameState, now: number): Derived {
  let computeBase = 0;
  let powerCap = TUNING.basePowerCap;
  let powerDraw = 0;
  let coolingCap =
    TUNING.baseCoolingCap * Math.pow(1.5, plevel(s, "passive-cooling"));
  let heatGen = 0;
  let bandwidthCap = TUNING.baseBandwidthCap;
  let bandwidthDraw = 0;

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

  // Live incident multipliers (guarded by endsAt so the effect stops the
  // instant the window closes, even before the next economy tick clears it).
  const liveEvent =
    s.activeEvent && now < s.activeEvent.endsAt ? s.activeEvent : null;
  const evDef = liveEvent ? EVENT_BY_ID[liveEvent.id] : undefined;
  const evCoolingMult = evDef?.coolingMult ?? 1;
  const evGridMult = evDef?.gridPriceMult ?? 1;
  const evPowerCapMult = evDef?.powerCapMult ?? 1;
  const evPriceMult = evDef?.priceMult ?? 1;
  const evComputeMult = evDef?.computeMult ?? 1;

  for (const def of BUILDINGS) {
    const n = owned(s, def.id);
    if (n === 0) continue;
    if (def.compute) computeBase += def.compute * n;
    if (def.powerCap) powerCap += def.powerCap * n;
    if (def.cooling) coolingCap += def.cooling * n;
    if (def.heat) heatGen += def.heat * n;
    if (def.bandwidthCap) bandwidthCap += def.bandwidthCap * n;
    if (def.bandwidthDraw) bandwidthDraw += def.bandwidthDraw * n * bandwidthDrawFactor;
    if (def.powerDraw) {
      const draw = def.powerDraw * n;
      // PUE tuning only discounts producers, not infrastructure.
      powerDraw += def.category === "producer" ? draw * powerDrawFactor : draw;
    }
    if (def.multCompute) engineerMult += def.multCompute * n;
    if (def.multPrice) salesMult += def.multPrice * n;
    if (def.multUptime) uptimeBonus += def.multUptime * n;
  }

  coolingCap *= coolingCapMult * evCoolingMult;
  powerCap *= evPowerCapMult;

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
  const prestigeComputeMult = 1 + 0.25 * plevel(s, "dist-arch");
  const overclockActive = now < s.overclockUntil;
  const overclock = overclockActive ? TUNING.overclockMult : 1;
  const computeMult =
    (1 + engineerMult) *
    upgradeComputeMult *
    prestigeComputeMult *
    overclock *
    evComputeMult;

  const compute =
    computeBase * computeMult * heatThrottle * powerThrottle * bandwidthThrottle;

  // Sell price: base, lifted by reputation, sales staff, upgrades, prestige.
  const repMult = 1 + Math.log10(1 + s.reputation) * 0.2;
  const prestigePriceMult = 1 + 0.2 * plevel(s, "market");
  const price =
    TUNING.basePrice *
    repMult *
    (1 + salesMult) *
    upgradePriceMult *
    prestigePriceMult *
    evPriceMult;

  // Operating cost: every kW of draw is billed at the live grid price.
  const grid = gridPrice(now) * evGridMult;
  const grossPerSec = compute * price;
  const powerCost = powerDraw * grid;

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

  // Surface the demand market: the contract in progress and/or the live offer,
  // with timers + progress resolved against `now` so the UI only paints.
  let activeContract: Derived["contract"]["active"] = null;
  if (s.contract) {
    const c = s.contract;
    activeContract = {
      required: c.required,
      delivered: c.delivered,
      progress: c.required > 0 ? Math.min(1, c.delivered / c.required) : 1,
      reward: c.reward,
      repReward: c.repReward,
      remainingSec: Math.max(0, (c.endsAt - now) / 1000),
    };
  }
  let contractOffer: Derived["contract"]["offer"] = null;
  if (s.contractOffer && now < s.contractOffer.expiresAt) {
    const o = s.contractOffer;
    contractOffer = {
      required: o.required,
      reward: o.reward,
      repReward: o.repReward,
      repPenalty: o.repPenalty,
      durationSec: o.durationSec,
      expiresSec: Math.max(0, (o.expiresAt - now) / 1000),
    };
  }

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
    price,
    gridPrice: grid,
    grossPerSec,
    powerCost,
    moneyPerSec: grossPerSec - powerCost,
    pendingCredits: pendingCredits(s),
    overclockActive,
    computeMult,
    event,
    contract: { active: activeContract, offer: contractOffer },
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
  // Resolve incidents + post/withdraw contract offers up to `now` before
  // reading the economy off state.
  advanceEvents(s, now);
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

  // Contract delivery: effective compute accrues toward the active contract,
  // but only for the slice of this window that fell before its deadline (so a
  // window that elapsed offline can't deliver past the deadline). Fulfils the
  // instant it's met; fails the instant the deadline passes short.
  if (s.contract) {
    const c = s.contract;
    const windowStart = now - dtSec * 1000;
    const deliverSec =
      Math.max(0, Math.min(now, c.endsAt) - windowStart) / 1000;
    c.delivered += d.compute * deliverSec * efficiency;
    if (c.delivered >= c.required) {
      s.money += c.reward;
      s.runEarnings += c.reward;
      s.lifetimeEarnings += c.reward;
      s.reputation += c.repReward;
      s.contractsCompleted += 1;
      s.contract = null;
    } else if (now >= c.endsAt) {
      s.reputation = Math.max(0, s.reputation - c.repPenalty);
      s.contractsFailed += 1;
      s.contract = null;
    }
  }

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
  // A world incident on a now-empty farm is meaningless — clear it and let the
  // scheduler line up the next one. (Milestones persist across rebuilds.)
  s.activeEvent = null;
  // Likewise drop any contract/offer: the deal was sized for the old farm.
  s.contract = null;
  s.contractOffer = null;
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

/** Take the offer on the board, starting its delivery clock from `now`. */
export function acceptContract(s: GameState, now: number): boolean {
  const o = s.contractOffer;
  if (!o || s.contract || now >= o.expiresAt) return false;
  s.contract = {
    id: o.id,
    required: o.required,
    delivered: 0,
    reward: o.reward,
    repReward: o.repReward,
    repPenalty: o.repPenalty,
    startedAt: now,
    endsAt: now + o.durationSec * 1000,
  };
  s.contractOffer = null;
  scheduleNextOffer(s, now);
  return true;
}

/** Pass on the offer on the board; the scheduler lines up the next one. */
export function declineContract(s: GameState, now: number): boolean {
  if (!s.contractOffer) return false;
  s.contractOffer = null;
  scheduleNextOffer(s, now);
  return true;
}

export function triggerOverclock(s: GameState, now: number): boolean {
  if (now < s.overclockReadyAt) return false;
  s.overclockUntil = now + TUNING.overclockDurationMs;
  s.overclockReadyAt = now + TUNING.overclockCooldownMs;
  return true;
}
