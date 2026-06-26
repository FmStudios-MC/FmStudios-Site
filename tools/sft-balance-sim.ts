/* Server-Farm Tycoon — headless balance sim (idea P2.6).
 *
 * Because engine.ts is pure and deterministic, a greedy "good-enough" player can
 * be run for simulated hours with no DOM, then the earnings/compute curve printed.
 * Run it after any config.ts edit to catch stalls (a wall you can't climb) and
 * runaways (trivial infinite money) BEFORE they ship.
 *
 *   npm run sim            # 4 simulated hours
 *   npm run sim -- 12      # 12 simulated hours
 *
 * The strategy: keep cooling/power/network/floor ahead of demand, otherwise sink
 * surplus into the best-ROI producer; accept a contract when there's spare
 * capacity; rebuild once the credit payout is worthwhile and reinvest it.
 */

import {
  acceptContract,
  buildingCost,
  buyBuilding,
  buyPrestige,
  buyUpgrade,
  derive,
  doPrestige,
  floorSpace,
  pendingCredits,
  prestigeCost,
  prestigeUnlocked,
  tick,
} from "../src/scripts/games/sft/engine";
import { BUILDINGS, PRESTIGE, UPGRADES } from "../src/scripts/games/sft/config";
import { defaultState } from "../src/scripts/games/sft/state";
import type { BuildingDef, GameState } from "../src/scripts/games/sft/types";

const HOURS = Number(process.argv[2] ?? 4);
const DT = 1; // simulated seconds per step
const SAMPLE_MIN = 15; // print a row every N simulated minutes

const PRODUCERS = BUILDINGS.filter((b) => b.category === "producer");
const byCat = (cat: string) => BUILDINGS.filter((b) => b.category === cat);

const unlocked = (s: GameState, def: BuildingDef) =>
  def.unlockAt == null || s.lifetimeEarnings >= def.unlockAt;

function fits(s: GameState, def: BuildingDef): boolean {
  if (!def.space) return true;
  const { used, cap } = floorSpace(s);
  return used + def.space <= cap;
}

const canBuy = (s: GameState, def: BuildingDef) =>
  unlocked(s, def) && fits(s, def) && s.money >= buildingCost(s, def);

/** Cheapest affordable building in a category (for shoring up a bottleneck). */
function cheapest(s: GameState, cat: string): BuildingDef | null {
  let best: BuildingDef | null = null;
  let bestCost = Infinity;
  for (const def of byCat(cat)) {
    if (!canBuy(s, def)) continue;
    const c = buildingCost(s, def);
    if (c < bestCost) {
      best = def;
      bestCost = c;
    }
  }
  return best;
}

/** Best compute-per-dollar producer we can afford right now. */
function bestProducer(s: GameState): BuildingDef | null {
  let best: BuildingDef | null = null;
  let bestRoi = 0;
  for (const def of PRODUCERS) {
    if (!canBuy(s, def) || !def.compute) continue;
    const roi = def.compute / buildingCost(s, def);
    if (roi > bestRoi) {
      best = def;
      bestRoi = roi;
    }
  }
  return best;
}

/** One greedy spending pass: clear bottlenecks, then sink surplus into output. */
function greedyBuy(s: GameState, now: number): void {
  for (let guard = 0; guard < 2000; guard++) {
    const d = derive(s, now);
    let target: BuildingDef | null = null;

    if (d.spaceUsed >= d.spaceCap) target = cheapest(s, "space");
    else if (d.powerThrottle < 0.999 || d.powerDraw > d.powerCap * 0.85)
      target = cheapest(s, "power") ?? cheapest(s, "space");
    else if (d.heatThrottle < 0.97) target = cheapest(s, "cooling") ?? cheapest(s, "space");
    else if (d.bandwidthThrottle < 0.999)
      target = cheapest(s, "network") ?? cheapest(s, "space");
    else target = bestProducer(s);

    // Keep a little cash buffer so we don't stall the next infra fix.
    if (!target || s.money < buildingCost(s, target) * 1.05) break;
    if (!buyBuilding(s, target.id)) break;
  }

  // Grab any affordable one-off upgrade.
  for (const u of UPGRADES) {
    if (!s.upgrades.includes(u.id) && u.unlock(s) && s.money >= u.cost) {
      buyUpgrade(s, u.id);
    }
  }
}

/** Accept the richest offer when there's spare capacity for its reservation. */
function workContracts(s: GameState, now: number): void {
  const d = derive(s, now);
  if (!d.contracts.canAccept || d.reservedFrac > 0.5) return;
  const best = [...d.contracts.offers]
    .filter((o) => d.reservedFrac + o.reserve <= 0.7)
    .sort((a, b) => b.reward - a.reward)[0];
  if (best) acceptContract(s, now, best.id);
}

/** Spend banked credits down the cheapest available prestige nodes. */
function spendCredits(s: GameState): void {
  for (let guard = 0; guard < 200; guard++) {
    let best: string | null = null;
    let bestCost = Infinity;
    for (const p of PRESTIGE) {
      if (!prestigeUnlocked(s, p.id)) continue;
      const c = prestigeCost(s, p.id);
      if (isFinite(c) && c <= s.credits && c < bestCost) {
        best = p.id;
        bestCost = c;
      }
    }
    if (!best || !buyPrestige(s, best)) break;
  }
}

function main(): void {
  const start = 1_700_000_000_000;
  const s = defaultState(start);
  const steps = Math.round((HOURS * 3600) / DT);
  const sampleEvery = Math.round((SAMPLE_MIN * 60) / DT);

  let lastGain = 0;
  let peakCompute = 0;

  const fmt = (n: number) => {
    if (!isFinite(n)) return "∞";
    if (n < 1000) return n.toFixed(n < 10 ? 2 : 0);
    const tier = Math.min(6, Math.floor(Math.log10(n) / 3));
    const suf = ["", "K", "M", "B", "T", "Qa", "Qi"][tier];
    return (n / 1000 ** tier).toFixed(2) + suf;
  };
  const pad = (str: string, w: number) => str.padStart(w);

  console.log(`SFT balance sim — ${HOURS}h, dt=${DT}s\n`);
  console.log(
    [pad("min", 5), pad("money", 11), pad("compute", 11), pad("lifetime", 11), pad("net/s", 10), pad("rebuilds", 8), pad("⬡", 6), pad("◈", 5)].join("  "),
  );

  for (let i = 0; i < steps; i++) {
    const now = start + i * DT * 1000;
    tick(s, DT, now);
    workContracts(s, now);
    greedyBuy(s, now);

    // Rebuild when the payout has grown worthwhile (≥15, and ≥2× the last one).
    const pending = pendingCredits(s);
    if (pending >= 15 && pending >= lastGain * 2) {
      lastGain = pending;
      doPrestige(s, now);
      spendCredits(s);
    }

    if (i % sampleEvery === 0) {
      const d = derive(s, now);
      peakCompute = Math.max(peakCompute, d.compute);
      console.log(
        [
          pad(String(Math.round((i * DT) / 60)), 5),
          pad(fmt(s.money), 11),
          pad(fmt(d.compute), 11),
          pad(fmt(s.lifetimeEarnings), 11),
          pad(fmt(d.moneyPerSec), 10),
          pad(String(s.prestigeCount), 8),
          pad(fmt(s.credits), 6),
          pad(String(s.influence), 5),
        ].join("  "),
      );
    }
  }

  const d = derive(s, start + steps * DT * 1000);
  console.log("\nSummary");
  console.log(`  final compute    : ${fmt(d.compute)} FLOP/s`);
  console.log(`  lifetime earnings: ${fmt(s.lifetimeEarnings)}`);
  console.log(`  rebuilds         : ${s.prestigeCount}  (credits ${fmt(s.credits)}, influence ${s.influence})`);
  console.log(`  ascension tiers  : ${s.ascension}  endless×${(d.endlessMult).toFixed(2)}`);
  console.log(`  contracts        : ${s.contractsCompleted} done / ${s.contractsFailed} failed`);
  console.log(`  peak compute     : ${fmt(peakCompute)} FLOP/s`);
  if (!Number.isFinite(d.compute) || !Number.isFinite(s.money)) {
    console.log("  ⚠ NON-FINITE STATE — runaway/NaN bug");
    process.exitCode = 1;
  }
}

main();
