/* Engine + state tests (idea P3.7). The simulation is pure and deterministic,
   so these lock in the contracts a balance edit would otherwise break silently:
   save migration, derive invariants, scheduler determinism, credit monotonicity,
   and the new mechanics (saturation, contract reservation, overclock cost,
   ascension). Run with `npm test`. */

import { describe, it, expect } from "vitest";

import {
  allocationFractions,
  buyBuilding,
  creditScale,
  derive,
  endlessMult,
  invalidateDerive,
  pendingCredits,
  saturationFactor,
  setAllocationShare,
  tick,
} from "./engine";
import { defaultState, sanitize, serialize, SAVE_VERSION } from "./state";
import { TUNING, WORKLOAD_BY_ID, WORKLOADS } from "./config";
import type { GameState } from "./types";

const now0 = 1_000_000_000_000;

/** A small running farm: producers + enough cooling/power to actually compute. */
function runningFarm(): GameState {
  const s = defaultState(now0);
  s.money = 1e9;
  s.buildings = { "mini-rack": 20, fan: 30, generator: 20, switch: 6, "floor-tile": 30 };
  s.lifetimeEarnings = 1e6;
  invalidateDerive();
  return s;
}

describe("sanitize / save migration", () => {
  it("round-trips a default state at the current version", () => {
    const s = defaultState(now0);
    const back = sanitize(JSON.parse(serialize(s)), now0);
    expect(back).not.toBeNull();
    expect(back!.version).toBe(SAVE_VERSION);
    expect(back!.influence).toBe(0);
    expect(back!.ascension).toBe(0);
    expect(back!.corporateUpgrades).toEqual({});
  });

  it("rejects unrecoverable input", () => {
    expect(sanitize(null)).toBeNull();
    expect(sanitize(42)).toBeNull();
    expect(sanitize("nope")).toBeNull();
  });

  it("migrates a v3 single contract/offer into the arrays with a reserve default", () => {
    const legacy = {
      version: 3,
      contract: { id: "old-1", required: 100, delivered: 10, reward: 50 },
      contractOffer: { id: "off-1", required: 80, reward: 40, durationSec: 180 },
    };
    const s = sanitize(legacy, now0)!;
    expect(s).not.toBeNull();
    expect(s.contracts).toHaveLength(1);
    expect(s.contracts[0].id).toBe("old-1");
    // reserve is new in v7; migrated jobs get a sane default in [0,1].
    expect(s.contracts[0].reserve).toBeGreaterThan(0);
    expect(s.contracts[0].reserve).toBeLessThanOrEqual(1);
    expect(s.contractOffers).toHaveLength(1);
    expect(s.contractOffers[0].reserve).toBeGreaterThan(0);
  });

  it("repairs out-of-range numbers", () => {
    const s = sanitize({ money: "x", wear: 5, ascension: -3, influence: -2 }, now0)!;
    expect(Number.isFinite(s.money)).toBe(true);
    expect(s.wear).toBeLessThanOrEqual(1);
    expect(s.ascension).toBe(0);
    expect(s.influence).toBe(0);
  });
});

describe("derive invariants", () => {
  it("keeps throttles in [0,1] and compute >= 0 on a healthy farm", () => {
    const d = derive(runningFarm(), now0);
    for (const t of [d.heatThrottle, d.powerThrottle, d.bandwidthThrottle]) {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1);
    }
    expect(d.compute).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(d.compute)).toBe(true);
    expect(Number.isFinite(d.moneyPerSec)).toBe(true);
  });

  it("survives a zero-cooling / zero-power edge without NaN", () => {
    const s = defaultState(now0);
    s.buildings = { "mini-rack": 10 }; // producers, no cooling, no power cap beyond base
    invalidateDerive();
    const d = derive(s, now0);
    expect(Number.isFinite(d.compute)).toBe(true);
    expect(d.compute).toBeGreaterThanOrEqual(0);
    expect(d.heatThrottle).toBeGreaterThanOrEqual(TUNING.heatThrottleFloor - 1e-9);
    expect(d.powerThrottle).toBeGreaterThanOrEqual(0);
    expect(d.powerThrottle).toBeLessThanOrEqual(1);
  });
});

describe("workload demand saturation (idea #1)", () => {
  it("never saturates the baseline workload", () => {
    expect(saturationFactor(WORKLOAD_BY_ID.web, 1)).toBe(1);
    expect(saturationFactor(WORKLOAD_BY_ID.web, 0.5)).toBe(1);
  });

  it("decays a saturating workload monotonically past its cap, staying in (0,1]", () => {
    const ai = WORKLOAD_BY_ID.ai;
    expect(saturationFactor(ai, 0)).toBe(1);
    expect(saturationFactor(ai, ai.satCap ?? 0)).toBeCloseTo(1, 5);
    const half = saturationFactor(ai, 0.6);
    const full = saturationFactor(ai, 1);
    expect(full).toBeLessThan(half);
    expect(half).toBeLessThanOrEqual(1);
    expect(full).toBeGreaterThan(0);
  });

  it("makes concentrating in AI worth less per share than spreading", () => {
    const allAi = defaultState(now0);
    allAi.buildings = runningFarm().buildings;
    allAi.allocation = { ai: 20 };
    const spread = { ...allAi, allocation: { web: 7, ai: 7, crypto: 6 } } as GameState;
    invalidateDerive();
    const dConcentrated = derive(allAi, now0);
    invalidateDerive();
    const dSpread = derive(spread, now0);
    // AI's effective workload price is dragged down by saturation when 100% on it.
    const aiConc = dConcentrated.workloads.find((w) => w.id === "ai")!;
    expect(aiConc.saturation).toBeGreaterThan(0);
    expect(dSpread.workloads.find((w) => w.id === "ai")!.saturation).toBeLessThan(
      aiConc.saturation,
    );
  });
});

describe("setAllocationShare (drag-to-set capacity)", () => {
  const shareOf = (s: GameState, id: string) =>
    allocationFractions(s).find((a) => a.def.id === id)!.frac;

  it("sets the dragged workload's share close to the target fraction", () => {
    const s = defaultState(now0);
    s.allocation = { web: 10, ai: 6, crypto: 4 };
    expect(setAllocationShare(s, "ai", 0.5)).toBe(true);
    // Weight lands on the allocationMax grid, so allow one notch of slack.
    expect(shareOf(s, "ai")).toBeCloseTo(0.5, 1);
  });

  it("holds the other workloads' relative split while redistributing", () => {
    const s = defaultState(now0);
    s.allocation = { web: 12, ai: 0, crypto: 6 }; // web:crypto = 2:1
    setAllocationShare(s, "ai", 0.4);
    // web should stay roughly twice crypto after the remainder is split.
    expect(s.allocation.web).toBeCloseTo(s.allocation.crypto * 2, 0);
  });

  it("clamps to the full range and keeps integer weights within bounds", () => {
    const s = defaultState(now0);
    s.allocation = { web: 5, ai: 5, crypto: 5 };
    setAllocationShare(s, "web", 5); // over 1 → clamp to 100%
    expect(shareOf(s, "web")).toBeCloseTo(1, 6);
    setAllocationShare(s, "web", -2); // under 0 → clamp to 0%
    expect(shareOf(s, "web")).toBeCloseTo(0, 6);
    for (const w of WORKLOADS) {
      const v = s.allocation[w.id];
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(TUNING.allocationMax);
    }
  });

  it("reports no change when the share is already at the target", () => {
    const s = defaultState(now0);
    s.allocation = { web: 10, ai: 5, crypto: 5 };
    setAllocationShare(s, "ai", 0.25);
    expect(setAllocationShare(s, "ai", 0.25)).toBe(false);
  });
});

describe("contracts reserve compute (idea #2)", () => {
  it("removes the reserved share from auto-sell gross", () => {
    const s = runningFarm();
    const base = derive(s, now0);
    s.contracts = [
      {
        id: "c1",
        tag: "Bulk",
        required: 1e9,
        delivered: 0,
        reserve: 0.5,
        reward: 1000,
        repReward: 5,
        repPenalty: 8,
        startedAt: now0,
        endsAt: now0 + 300_000,
      },
    ];
    invalidateDerive();
    const d = derive(s, now0);
    expect(d.reservedFrac).toBeCloseTo(0.5, 6);
    // Same total compute, but only half auto-sells.
    expect(d.compute).toBeCloseTo(base.compute, 6);
    expect(d.grossPerSec).toBeCloseTo(base.grossPerSec * 0.5, 4);
  });

  it("caps total reservation so the spot market is never fully starved", () => {
    const s = runningFarm();
    const mk = (id: string, reserve: number) => ({
      id,
      tag: "Bulk",
      required: 1e12,
      delivered: 0,
      reserve,
      reward: 1,
      repReward: 1,
      repPenalty: 1,
      startedAt: now0,
      endsAt: now0 + 600_000,
    });
    s.contracts = [mk("a", 0.65), mk("b", 0.65), mk("c", 0.65)];
    invalidateDerive();
    const d = derive(s, now0);
    expect(d.reservedFrac).toBeCloseTo(TUNING.contractReserveCap, 6);
  });
});

describe("overclock cost (idea #5)", () => {
  it("amplifies heat generation while the burst is live", () => {
    const s = runningFarm();
    const cool = derive(s, now0);
    s.overclockUntil = now0 + 10_000;
    invalidateDerive();
    const hot = derive(s, now0);
    expect(hot.heatGen).toBeCloseTo(cool.heatGen * TUNING.overclockHeatMult, 4);
    expect(hot.overclockActive).toBe(true);
  });
});

describe("endless + ascension (ideas #4/#5)", () => {
  it("is 1 when Endless is off", () => {
    const s = defaultState(now0);
    expect(endlessMult(s)).toBe(1);
  });

  it("escalates the multiplier with each ascension tier", () => {
    const s = defaultState(now0);
    s.endless = true;
    s.ascension = 0;
    const a0 = endlessMult(s);
    s.ascension = 1;
    const a1 = endlessMult(s);
    s.ascension = 3;
    const a3 = endlessMult(s);
    expect(a0).toBeCloseTo(TUNING.endlessMult, 6);
    expect(a1).toBeGreaterThan(a0);
    expect(a3).toBeGreaterThan(a1);
    expect(a3 - a1).toBeCloseTo(2 * TUNING.ascensionStep, 6);
  });
});

describe("credit scaling monotonicity", () => {
  it("creditScale rises and pendingCredits falls as prestigeCount climbs", () => {
    const s = defaultState(now0);
    s.runEarnings = 1e8;
    let prevScale = -1;
    let prevPending = Infinity;
    for (let p = 0; p < 8; p++) {
      s.prestigeCount = p;
      const scale = creditScale(s);
      const pending = pendingCredits(s);
      expect(scale).toBeGreaterThan(prevScale);
      expect(pending).toBeLessThanOrEqual(prevPending);
      prevScale = scale;
      prevPending = pending;
    }
  });
});

describe("scheduler determinism", () => {
  it("two identical states tick to identical state (replayable schedulers)", () => {
    const a = runningFarm();
    const b = sanitize(JSON.parse(serialize(a)), now0)!;
    // Step both forward in lockstep across a window that posts offers/incidents.
    let t = now0;
    for (let i = 0; i < 200; i++) {
      t += 1000;
      tick(a, 1, t);
      tick(b, 1, t);
    }
    expect(serialize(a)).toBe(serialize(b));
    expect(a.contractSeed).toBe(b.contractSeed);
    expect(a.eventSeed).toBe(b.eventSeed);
  });
});

describe("actions stay solvent", () => {
  it("buying a building never drives cash negative", () => {
    const s = defaultState(now0);
    s.money = 100;
    buyBuilding(s, "mini-rack");
    expect(s.money).toBeGreaterThanOrEqual(0);
  });

  it("a long offline-style catch-up never produces NaN or debt", () => {
    const s = runningFarm();
    s.powerContract = "spot";
    tick(s, TUNING.maxOfflineSec, now0 + TUNING.maxOfflineSec * 1000, 0.5);
    expect(Number.isFinite(s.money)).toBe(true);
    expect(s.money).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(s.reputation)).toBe(true);
  });
});
