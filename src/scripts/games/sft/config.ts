/* Server-Farm Tycoon - all balancing lives here.
   Tuning the game = editing these numbers. */

import type { BuildingDef, UpgradeDef, PrestigeDef } from "./types";

export const TUNING = {
  startMoney: 15,
  basePrice: 1.2, // $/FLOP before reputation + multipliers
  basePowerCap: 8, // free kW at the start
  baseCoolingCap: 1, // free cooling at the start

  tickMs: 250, // economy tick
  saveEveryMs: 10_000,
  maxOfflineSec: 8 * 3600, // cap offline catch-up at 8h
  offlineEfficiency: 0.5, // offline runs at 50% of live rate

  heatThrottleFloor: 0.15, // worst-case output fraction when fully overheated
  reputationRate: 0.0004, // reputation gained per sec, scaled by sqrt(compute)

  // Credits = floor(sqrt(runEarnings / effective scale)), where the scale
  // climbs with every rebuild so each one demands a bigger run than the last.
  creditScale: 12_000,
  creditScaleGrowth: 1.6, // scale *= this per completed rebuild

  overclockMult: 2.5, // burst output multiplier
  overclockDurationMs: 15_000,
  overclockCooldownMs: 90_000,

  // Operating cost: electricity is billed per kW of draw, every second. The
  // grid price drifts between off-peak and peak on a slow, deterministic cycle,
  // so the same farm is cheaper to run at some times than others. This turns
  // power draw into an ongoing cash drain and makes efficiency (PUE Tuning,
  // Solar, right-sized cooling) an economic choice, not just a capacity gate.
  basePowerRate: 0.5, // $/kW/s at the neutral grid price
  gridSwing: 0.35, // ± fraction the price drifts from neutral
  gridCycleMs: 120_000, // one full off-peak -> peak -> off-peak cycle
} as const;

export const BUILDINGS: BuildingDef[] = [
  // --- Producers ---------------------------------------------------------
  {
    id: "mini-rack",
    name: "Mini Rack",
    desc: "A handful of consumer boxes. Where everyone starts.",
    category: "producer",
    baseCost: 10,
    growth: 1.16,
    compute: 0.18,
    powerDraw: 0.05,
    heat: 0.05,
  },
  {
    id: "blade",
    name: "Blade Server",
    desc: "Dense, rack-mounted, properly cooled.",
    category: "producer",
    baseCost: 150,
    growth: 1.16,
    compute: 1.8,
    powerDraw: 0.4,
    heat: 0.4,
    unlockAt: 260,
  },
  {
    id: "cluster",
    name: "Server Cluster",
    desc: "A full cabinet working as one.",
    category: "producer",
    baseCost: 1_800,
    growth: 1.17,
    compute: 22,
    powerDraw: 4,
    heat: 4,
    unlockAt: 4_500,
  },
  {
    id: "ai-pod",
    name: "AI Pod",
    desc: "GPU shelves. Enormous output, enormous heat.",
    category: "producer",
    baseCost: 32_000,
    growth: 1.18,
    compute: 360,
    powerDraw: 60,
    heat: 65,
    unlockAt: 90_000,
  },
  {
    id: "quantum",
    name: "Quantum Node",
    desc: "Cryogenic, temperamental, unreasonably fast.",
    category: "producer",
    baseCost: 520_000,
    growth: 1.18,
    compute: 8_000,
    powerDraw: 800,
    heat: 820,
    unlockAt: 1_600_000,
  },

  // --- Power capacity ----------------------------------------------------
  {
    id: "generator",
    name: "Diesel Generator",
    desc: "Cheap kilowatts, on demand.",
    category: "power",
    baseCost: 70,
    growth: 1.15,
    powerCap: 5,
  },
  {
    id: "solar",
    name: "Solar Array",
    desc: "Quiet baseline power.",
    category: "power",
    baseCost: 6_500,
    growth: 1.15,
    powerCap: 70,
    unlockAt: 11_000,
  },
  {
    id: "reactor",
    name: "Micro-Reactor",
    desc: "Industrial-scale supply.",
    category: "power",
    baseCost: 320_000,
    growth: 1.16,
    powerCap: 1_800,
    unlockAt: 550_000,
  },

  // --- Cooling -----------------------------------------------------------
  {
    id: "fan",
    name: "Cooling Fan",
    desc: "Moves air. Sips power.",
    category: "cooling",
    baseCost: 45,
    growth: 1.15,
    cooling: 0.45,
    powerDraw: 0.05,
  },
  {
    id: "ac",
    name: "AC Unit",
    desc: "Proper room cooling.",
    category: "cooling",
    baseCost: 3_200,
    growth: 1.15,
    cooling: 26,
    powerDraw: 2,
    unlockAt: 5_500,
  },
  {
    id: "liquid",
    name: "Liquid Loop",
    desc: "Direct-to-chip heat removal.",
    category: "cooling",
    baseCost: 160_000,
    growth: 1.16,
    cooling: 700,
    powerDraw: 40,
    unlockAt: 280_000,
  },

  // --- Staff (global multipliers) ---------------------------------------
  {
    id: "technician",
    name: "Technician",
    desc: "Keeps uptime high when things run hot.",
    category: "staff",
    baseCost: 1_400,
    growth: 1.25,
    multUptime: 0.025,
    unlockAt: 2_800,
  },
  {
    id: "engineer",
    name: "Engineer",
    desc: "+4% total compute, each.",
    category: "staff",
    baseCost: 11_000,
    growth: 1.25,
    multCompute: 0.04,
    unlockAt: 16_000,
  },
  {
    id: "sales",
    name: "Sales Rep",
    desc: "+4% sell price, each.",
    category: "staff",
    baseCost: 11_000,
    growth: 1.25,
    multPrice: 0.04,
    unlockAt: 16_000,
  },
];

export const UPGRADES: UpgradeDef[] = [
  {
    id: "hot-aisle",
    name: "Hot-Aisle Containment",
    desc: "Cooling capacity +25%.",
    cost: 7_000,
    multCoolingCap: 1.25,
    unlock: (s) => (s.buildings["fan"] ?? 0) >= 12,
  },
  {
    id: "spot-market",
    name: "Spot-Market Deals",
    desc: "Sell price +15%.",
    cost: 16_000,
    multPrice: 1.15,
    unlock: (s) => s.lifetimeEarnings >= 35_000,
  },
  {
    id: "pue-tuning",
    name: "PUE Tuning",
    desc: "Producer power draw -15%.",
    cost: 42_000,
    powerDrawFactor: 0.85,
    unlock: (s) => (s.buildings["cluster"] ?? 0) >= 6,
  },
  {
    id: "overclock-profile",
    name: "Tuned Clocks",
    desc: "Total compute +25%.",
    cost: 110_000,
    multCompute: 1.25,
    unlock: (s) => s.lifetimeEarnings >= 220_000,
  },
  {
    id: "immersion",
    name: "Immersion Tanks",
    desc: "Cooling capacity +50%.",
    cost: 340_000,
    multCoolingCap: 1.5,
    unlock: (s) => (s.buildings["ac"] ?? 0) >= 10,
  },
  {
    id: "enterprise-sla",
    name: "Enterprise SLAs",
    desc: "Sell price +40%.",
    cost: 750_000,
    multPrice: 1.4,
    unlock: (s) => s.lifetimeEarnings >= 1_500_000,
  },
];

export const PRESTIGE: PrestigeDef[] = [
  {
    id: "dist-arch",
    name: "Distributed Architecture",
    desc: "+25% global compute per level.",
    baseCost: 1,
    costGrowth: 2.4,
  },
  {
    id: "market",
    name: "Market Connections",
    desc: "+20% sell price per level.",
    baseCost: 1,
    costGrowth: 2.4,
  },
  {
    id: "bulk",
    name: "Bulk Procurement",
    desc: "-1% cost growth per level.",
    baseCost: 2,
    costGrowth: 2.5,
    maxLevel: 5,
  },
  {
    id: "seed",
    name: "Seed Capital",
    desc: "Start each run with 10x more cash per level.",
    baseCost: 2,
    costGrowth: 3.2,
    maxLevel: 6,
  },
  {
    id: "passive-cooling",
    name: "Passive Cooling R&D",
    desc: "+50% base cooling capacity per level.",
    baseCost: 2,
    costGrowth: 2.4,
  },
];

export const BUILDING_BY_ID: Record<string, BuildingDef> = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b]),
);

export const CATEGORY_LABELS: Record<string, string> = {
  producer: "Producers",
  power: "Power",
  cooling: "Cooling",
  staff: "Staff",
};
