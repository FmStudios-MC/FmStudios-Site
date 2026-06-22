/* Server-Farm Tycoon - all balancing lives here.
   Tuning the game = editing these numbers. */

import type {
  AchievementDef,
  BuildingDef,
  EventDef,
  PrestigeDef,
  UpgradeDef,
  WorkloadDef,
} from "./types";

export const TUNING = {
  startMoney: 15,
  basePrice: 1.2, // $/FLOP before reputation + multipliers
  basePowerCap: 8, // free kW at the start
  baseCoolingCap: 1, // free cooling at the start
  baseBandwidthCap: 5, // free Gb/s of throughput at the start
  baseSpace: 24, // free rack units of floor space at the start

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

  // Incidents: a deterministic scheduler fires an event every gap, holds it for
  // its duration, then schedules the next. The window stays quiet until the
  // farm is past its first earnings so beginners aren't punished.
  eventMinEarnings: 400, // lifetime earnings before incidents begin
  eventMinGapMs: 90_000, // shortest quiet stretch between incidents
  eventMaxGapMs: 180_000, // longest quiet stretch between incidents
  eventRespondSeconds: 25, // respond cost = this many seconds of gross revenue
  eventRespondMin: 10, // ...but never cheaper than this

  // Contracts: a deterministic scheduler posts a single offer to the board
  // every gap; it sits there until accepted or withdrawn. Params are baked
  // from a live snapshot so a deal scales with the farm that's offered it.
  // Delivery measures effective compute over the window, so banking capacity
  // (and the bandwidth/power/cooling headroom behind it) is what wins them.
  contractMinEarnings: 2_000, // lifetime earnings before contracts appear
  contractOfferMinGapMs: 75_000, // shortest stretch between offers
  contractOfferMaxGapMs: 150_000, // longest stretch between offers
  contractOfferTtlMs: 60_000, // an unaccepted offer is withdrawn after this
  contractDurationsSec: [180, 300, 480], // delivery windows to roll from
  contractTargetMin: 0.7, // required = compute · window · (min..max)
  contractTargetMax: 1.35,
  contractRewardBonusMin: 1.4, // reward = required · price · (min..max), so a
  contractRewardBonusMax: 1.95, // fulfilled contract beats letting it auto-sell
  contractBoardSize: 3, // how many offers sit on the board at once
  contractMaxActive: 3, // how many contracts can run concurrently
  contractStreakStep: 0.1, // reputation bonus per consecutive fulfilment
  contractStreakMax: 10, // streak length the bonus caps out at

  // Workloads: the player splits capacity across markets (integer weights up to
  // this max each); the blend sets the effective sell price and the load the
  // farm carries. Web is the neutral baseline so the default split (all web)
  // leaves the early-game economy exactly where it was.
  allocationMax: 20,

  // Rack hotspots: a deterministic maintenance scheduler. Once the floor is big
  // enough, a hotspot periodically cuts effective cooling until it's cleared or
  // it times out; each technician on staff lengthens the gap between them.
  hotspotMinProducers: 8, // producers online before hotspots can occur
  hotspotMinGapMs: 60_000, // shortest stretch between hotspots
  hotspotMaxGapMs: 110_000, // longest stretch between hotspots
  hotspotTechGapMs: 12_000, // each technician adds this to the gap
  hotspotDurationSec: 40, // how long an unattended hotspot lasts
  hotspotCoolingMult: 0.6, // effective cooling while a hotspot is live
  hotspotClearSeconds: 8, // rebalance cost = this many seconds of gross
  hotspotClearMin: 5, // ...but never cheaper than this
} as const;

// --- Workloads ----------------------------------------------------------
export const WORKLOADS: WorkloadDef[] = [
  {
    id: "web",
    name: "Web Hosting",
    desc: "Steady demand. The reliable baseline.",
    priceMult: 1.0,
    swing: 0.06,
    cycleMs: 90_000,
  },
  {
    id: "ai",
    name: "AI Training",
    desc: "Pays the most — and runs the hardware hottest.",
    priceMult: 1.55,
    swing: 0.18,
    cycleMs: 70_000,
    heatFactor: 0.6,
    powerFactor: 0.25,
  },
  {
    id: "crypto",
    name: "Crypto / Batch",
    desc: "Volatile spot price. Feast or famine.",
    priceMult: 1.1,
    swing: 0.6,
    cycleMs: 50_000,
    powerFactor: 0.15,
  },
];

export const WORKLOAD_BY_ID: Record<string, WorkloadDef> = Object.fromEntries(
  WORKLOADS.map((w) => [w.id, w]),
);

// --- Contract archetypes -----------------------------------------------
// The board fills with a rotating mix of these so the player is choosing
// between shapes of deal, not just accept/decline. `durIdx` indexes
// TUNING.contractDurationsSec; `target`/`reward`/`rep` weight the generator.
export const CONTRACT_ARCHETYPES = [
  { tag: "Rush", durIdx: 0, target: 0.6, reward: 1.5, rep: 1.0 },
  { tag: "Bulk", durIdx: 2, target: 1.25, reward: 1.95, rep: 0.85 },
  { tag: "Reputation", durIdx: 1, target: 0.9, reward: 1.25, rep: 2.4 },
] as const;

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
    bandwidthDraw: 0.02,
    space: 1,
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
    bandwidthDraw: 0.3,
    space: 2,
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
    bandwidthDraw: 3,
    space: 5,
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
    bandwidthDraw: 70,
    space: 14,
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
    bandwidthDraw: 1_000,
    space: 40,
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
    space: 1,
  },
  {
    id: "solar",
    name: "Solar Array",
    desc: "Quiet baseline power.",
    category: "power",
    baseCost: 6_500,
    growth: 1.15,
    powerCap: 70,
    space: 6,
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
    space: 30,
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
    space: 1,
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
    space: 4,
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
    space: 25,
    unlockAt: 280_000,
  },

  // --- Network throughput ------------------------------------------------
  {
    id: "switch",
    name: "ToR Switch",
    desc: "Top-of-rack switching. Modest throughput.",
    category: "network",
    baseCost: 120,
    growth: 1.15,
    bandwidthCap: 6,
    powerDraw: 0.05,
    space: 1,
    unlockAt: 600,
  },
  {
    id: "uplink",
    name: "Fiber Uplink",
    desc: "A fat pipe to the backbone.",
    category: "network",
    baseCost: 9_000,
    growth: 1.15,
    bandwidthCap: 90,
    powerDraw: 1.5,
    space: 4,
    unlockAt: 14_000,
  },
  {
    id: "spine",
    name: "Spine Router",
    desc: "Carrier-grade core routing.",
    category: "network",
    baseCost: 400_000,
    growth: 1.16,
    bandwidthCap: 2_200,
    powerDraw: 30,
    space: 20,
    unlockAt: 600_000,
  },

  // --- Facility / floor space (a money sink that gates aggressive scaling) -
  // Equipment occupies rack units; these raise the cap. Flat capacity per unit
  // on a rising cost curve makes them an ongoing sink, with bigger tiers giving
  // far more room per purchase as the farm outgrows bare tiles.
  {
    id: "floor-tile",
    name: "Floor Tile",
    desc: "Bare rack space. The cheapest way to grow.",
    category: "space",
    baseCost: 130,
    growth: 1.16,
    spaceCap: 8,
  },
  {
    id: "server-hall",
    name: "Server Hall",
    desc: "A whole new room, racks and trays included.",
    category: "space",
    baseCost: 14_000,
    growth: 1.16,
    spaceCap: 110,
    unlockAt: 22_000,
  },
  {
    id: "mega-annex",
    name: "Mega Annex",
    desc: "Warehouse-scale floor for hyperscale builds.",
    category: "space",
    baseCost: 650_000,
    growth: 1.16,
    spaceCap: 2_800,
    unlockAt: 850_000,
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
    id: "traffic-shaping",
    name: "Traffic Shaping",
    desc: "Producer bandwidth draw -20%.",
    cost: 60_000,
    bandwidthDrawFactor: 0.8,
    unlock: (s) => (s.buildings["uplink"] ?? 0) >= 4,
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

// A small branching tree. Credits are scarce enough that no single rebuild can
// take everything, so each branch is a build identity. The five original nodes
// keep their ids (so old saves carry over); each branch then opens a deeper
// multiplier node and a one-off "unlock" node (maxLevel 1) gated behind it.
export const PRESTIGE: PrestigeDef[] = [
  // --- Scale: raw output + a bigger starting position -------------------
  {
    id: "dist-arch",
    name: "Distributed Architecture",
    desc: "+25% global compute per level.",
    baseCost: 1,
    costGrowth: 2.4,
    branch: "scale",
  },
  {
    id: "hyperthread",
    name: "Hyperthreading",
    desc: "+35% global compute per level.",
    baseCost: 6,
    costGrowth: 2.6,
    branch: "scale",
    requires: [{ id: "dist-arch", level: 3 }],
  },
  {
    id: "seed",
    name: "Seed Capital",
    desc: "Start each run with 10x more cash per level.",
    baseCost: 2,
    costGrowth: 3.2,
    maxLevel: 6,
    branch: "scale",
  },
  // --- Efficiency: cooling, cost, resilience ---------------------------
  {
    id: "passive-cooling",
    name: "Passive Cooling R&D",
    desc: "+50% base cooling capacity per level.",
    baseCost: 2,
    costGrowth: 2.4,
    branch: "efficiency",
  },
  {
    id: "bulk",
    name: "Bulk Procurement",
    desc: "-1% cost growth per level.",
    baseCost: 2,
    costGrowth: 2.5,
    maxLevel: 5,
    branch: "efficiency",
  },
  {
    id: "warm-spares",
    name: "Warm Spares",
    desc: "Offline farms run +25% efficiency.",
    baseCost: 5,
    costGrowth: 1,
    maxLevel: 1,
    branch: "efficiency",
    requires: [{ id: "passive-cooling", level: 2 }],
  },
  {
    id: "predictive-ops",
    name: "Predictive Ops",
    desc: "Incident severity halved.",
    baseCost: 8,
    costGrowth: 1,
    maxLevel: 1,
    branch: "efficiency",
    requires: [{ id: "bulk", level: 2 }],
  },
  // --- Market: price, contracts, prefab facilities ---------------------
  {
    id: "market",
    name: "Market Connections",
    desc: "+20% sell price per level.",
    baseCost: 1,
    costGrowth: 2.4,
    branch: "market",
  },
  {
    id: "prefab-halls",
    name: "Prefab Halls",
    desc: "Start each rebuild with a Server Hall.",
    baseCost: 6,
    costGrowth: 1,
    maxLevel: 1,
    branch: "market",
    requires: [{ id: "market", level: 2 }],
  },
  {
    id: "standing-orders",
    name: "Standing Orders",
    desc: "Contract payouts +25%.",
    baseCost: 7,
    costGrowth: 1,
    maxLevel: 1,
    branch: "market",
    requires: [{ id: "market", level: 3 }],
  },
];

export const PRESTIGE_BRANCH_LABELS: Record<string, string> = {
  scale: "Scale",
  efficiency: "Efficiency",
  market: "Market",
};

export const BUILDING_BY_ID: Record<string, BuildingDef> = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b]),
);

export const CATEGORY_LABELS: Record<string, string> = {
  producer: "Producers",
  power: "Power",
  cooling: "Cooling",
  network: "Network",
  space: "Facility",
  staff: "Staff",
};

// How many producer cabinets are online (gates a few events/milestones).
const PRODUCER_IDS = BUILDINGS.filter((b) => b.category === "producer").map(
  (b) => b.id,
);
const producerCount = (s: { buildings: Record<string, number> }): number =>
  PRODUCER_IDS.reduce((n, id) => n + (s.buildings[id] ?? 0), 0);

// --- Incidents ---------------------------------------------------------
export const EVENTS: EventDef[] = [
  {
    id: "heatwave",
    name: "Heatwave",
    desc: "Ambient temps up — cooling capacity cut 45%.",
    kind: "bad",
    durationSec: 45,
    weight: 3,
    coolingMult: 0.55,
    relevant: (s) => producerCount(s) > 0,
  },
  {
    id: "grid-surge",
    name: "Grid Surge",
    desc: "Spot electricity spiking — power bill up 120%.",
    kind: "bad",
    durationSec: 60,
    weight: 3,
    gridPriceMult: 2.2,
  },
  {
    id: "brownout",
    name: "Feeder Brownout",
    desc: "External feed degraded — power capacity down 40%.",
    kind: "bad",
    durationSec: 30,
    weight: 2,
    powerCapMult: 0.6,
  },
  {
    id: "hardware-fault",
    name: "Hardware Fault",
    desc: "A producer line is throttled — output down 40%.",
    kind: "bad",
    durationSec: 40,
    weight: 2,
    computeMult: 0.6,
    relevant: (s) => producerCount(s) > 0,
  },
  {
    id: "demand-spike",
    name: "Demand Spike",
    desc: "Compute prices rallying — sell price up 80%.",
    kind: "good",
    durationSec: 30,
    weight: 3,
    priceMult: 1.8,
  },
];

export const EVENT_BY_ID: Record<string, EventDef> = Object.fromEntries(
  EVENTS.map((e) => [e.id, e]),
);

// --- Milestones --------------------------------------------------------
const ownedAll = (s: { buildings: Record<string, number> }, ids: string[]) =>
  ids.every((id) => (s.buildings[id] ?? 0) > 0);

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-light",
    name: "First Light",
    desc: "Bring your first cabinet online.",
    check: (s) => producerCount(s) > 0,
  },
  {
    id: "petty-cash",
    name: "Petty Cash",
    desc: "Reach $1K in lifetime earnings.",
    check: (s) => s.lifetimeEarnings >= 1_000,
  },
  {
    id: "redline",
    name: "Redline",
    desc: "Engage an overclock burst.",
    check: (s) => s.overclockReadyAt > 0,
  },
  {
    id: "hyperscaler",
    name: "Hyperscaler",
    desc: "Reach $1M in lifetime earnings.",
    check: (s) => s.lifetimeEarnings >= 1_000_000,
    buff: { multCompute: 1.02 },
    buffNote: "+2% compute",
  },
  {
    id: "full-roster",
    name: "Full Roster",
    desc: "Employ a technician, an engineer and a sales rep.",
    check: (s) => ownedAll(s, ["technician", "engineer", "sales"]),
    buff: { multPrice: 1.02 },
    buffNote: "+2% sell price",
  },
  {
    id: "cool-head",
    name: "Cool Head",
    desc: "Run 50+ producers with heat fully nominal.",
    check: (s, d) => producerCount(s) >= 50 && d.heatThrottle >= 0.999,
    buff: { multCoolingCap: 1.05 },
    buffNote: "+5% cooling cap",
  },
  {
    id: "crisis-managed",
    name: "Crisis Managed",
    desc: "Respond to an incident.",
    check: (s) => s.eventsResponded >= 1,
  },
  {
    id: "off-the-grid",
    name: "Off The Grid",
    desc: "Commission a micro-reactor.",
    check: (s) => (s.buildings["reactor"] ?? 0) > 0,
  },
  {
    id: "breaking-ground",
    name: "Breaking Ground",
    desc: "Expand the floor with your first facility.",
    check: (s) =>
      (s.buildings["floor-tile"] ?? 0) > 0 ||
      (s.buildings["server-hall"] ?? 0) > 0 ||
      (s.buildings["mega-annex"] ?? 0) > 0,
  },
  {
    id: "packed-house",
    name: "Packed House",
    desc: "Fill 90% of a floor of 200+ rack units.",
    check: (s, d) => d.spaceCap >= 200 && d.spaceUsed >= d.spaceCap * 0.9,
    buff: { multCompute: 1.03 },
    buffNote: "+3% compute",
  },
  {
    id: "on-the-wire",
    name: "On The Wire",
    desc: "Bring a network device online.",
    check: (s) =>
      (s.buildings["switch"] ?? 0) > 0 ||
      (s.buildings["uplink"] ?? 0) > 0 ||
      (s.buildings["spine"] ?? 0) > 0,
  },
  {
    id: "first-contract",
    name: "Signed & Delivered",
    desc: "Fulfil your first compute contract.",
    check: (s) => s.contractsCompleted >= 1,
  },
  {
    id: "preferred-vendor",
    name: "Preferred Vendor",
    desc: "Fulfil 15 compute contracts.",
    check: (s) => s.contractsCompleted >= 15,
    buff: { multPrice: 1.04 },
    buffNote: "+4% sell price",
  },
  {
    id: "phoenix",
    name: "Phoenix",
    desc: "Decommission and rebuild for the first time.",
    check: (s) => s.prestigeCount >= 1,
  },
  {
    id: "quantum-leap",
    name: "Quantum Leap",
    desc: "Bring a quantum node online.",
    check: (s) => (s.buildings["quantum"] ?? 0) > 0,
    buff: { multCompute: 1.03 },
    buffNote: "+3% compute",
  },
  {
    id: "serial-rebuilder",
    name: "Serial Rebuilder",
    desc: "Complete 10 rebuilds.",
    check: (s) => s.prestigeCount >= 10,
    buff: { multPrice: 1.05 },
    buffNote: "+5% sell price",
  },
  {
    id: "cloud-baron",
    name: "Cloud Baron",
    desc: "Reach $1B in lifetime earnings.",
    check: (s) => s.lifetimeEarnings >= 1_000_000_000,
    buff: { multCompute: 1.05 },
    buffNote: "+5% compute",
  },
  {
    id: "diversified",
    name: "Diversified",
    desc: "Run all three workloads at once.",
    check: (s) => WORKLOADS.every((w) => (s.allocation[w.id] ?? 0) > 0),
    buff: { multPrice: 1.03 },
    buffNote: "+3% sell price",
  },
  {
    id: "load-balancer",
    name: "Load Balancer",
    desc: "Clear 10 rack hotspots.",
    check: (s) => s.hotspotsCleared >= 10,
    buff: { multCoolingCap: 1.05 },
    buffNote: "+5% cooling cap",
  },
  {
    id: "hot-streak",
    name: "Hot Streak",
    desc: "Fulfil 5 contracts in a row.",
    check: (s) => s.contractStreak >= 5,
    buff: { multCompute: 1.03 },
    buffNote: "+3% compute",
  },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> =
  Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
