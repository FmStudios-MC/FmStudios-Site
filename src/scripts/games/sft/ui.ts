/* DOM binding + targeted rendering. The .astro page provides the structural
   shell and labelled slots; this module fills the data-driven lists once and
   then updates only the values that change each frame. No framework. */

import type { Derived, GameState, PowerContract } from "./types";
import {
  ACHIEVEMENTS,
  ASCENSION,
  BUILDINGS,
  BUILDING_BY_ID,
  CATEGORY_LABELS,
  CORPORATE,
  GOALS,
  PRESTIGE,
  PRESTIGE_BRANCH_LABELS,
  REPUTATION_TIERS,
  RESEARCH,
  TUNING,
  UPGRADES,
  WORKLOADS,
} from "./config";
import {
  bulkBuyInfo,
  type BuyMult,
  corporateCost,
  corporateUnlocked,
  creditScale,
  prestigeCost,
  prestigeUnlocked,
  researchCost,
  startingMoney,
} from "./engine";
import { duration, fmt, money, pct, rate } from "./format";
import { sound } from "./sound";
import type { OfflineSummary } from "./storage";

/* The power-contract options, in the order they appear in the selector. */
const POWER_OPTIONS: { id: PowerContract; name: string; desc: string }[] = [
  { id: "spot", name: "Spot", desc: "Rides the market — cheap off-peak, brutal at peak." },
  { id: "flat", name: "Flat", desc: "A fixed rate. Predictable, slightly above average." },
  { id: "green", name: "Green", desc: "Costs more, but immune to Grid Surge spikes." },
];

export interface Handlers {
  onBuyBuilding(id: string, mult: BuyMult): void;
  onBuyUpgrade(id: string): void;
  onBuyPrestige(id: string): void;
  onBuyCorporate(id: string): void;
  onPrestige(): void;
  onOverclock(): void;
  onRespondEvent(): void;
  onRebalance(): void;
  onSetAllocation(id: string, delta: number): void;
  onSetAllocationShare(id: string, frac: number): void;
  onAcceptContract(id: string): void;
  onDeclineContract(id: string): void;
  onSetPowerContract(id: PowerContract): void;
  onBuyResearch(id: string): void;
  onServiceHardware(): void;
  onToggleEndless(): void;
  onSave(): void;
  onReset(): void;
  onExport(): void;
  onImport(blob: string): void;
}

/* Which buildings get a visible cabinet on the data-hall floor, grouped by
   the kind of equipment they render as. `slots` is how many unit modules a
   cabinet shows before it caps (the real owned count is still in the label). */
const HALL_GROUPS = [
  { kind: "producer", ids: ["mini-rack", "blade", "cluster", "ai-pod", "quantum"], slots: 14 },
  { kind: "power", ids: ["generator", "solar", "reactor"], slots: 6 },
  { kind: "cooling", ids: ["fan", "ac", "liquid"], slots: 6 },
  { kind: "network", ids: ["switch", "uplink", "spine"], slots: 6 },
] as const;

/* Short chassis labels so the nameplates stay one line. */
const HALL_SHORT: Record<string, string> = {
  "mini-rack": "Mini",
  blade: "Blade",
  cluster: "Cluster",
  "ai-pod": "AI Pod",
  quantum: "Quantum",
  fan: "Fans",
  ac: "AC",
  liquid: "Liquid",
  generator: "Diesel",
  solar: "Solar",
  reactor: "Reactor",
  switch: "Switch",
  uplink: "Uplink",
  spine: "Spine",
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

interface BuildingRow {
  root: HTMLElement;
  owned: HTMLElement;
  cost: HTMLElement;
  button: HTMLButtonElement;
  def: (typeof BUILDINGS)[number];
}

interface UpgradeCard {
  root: HTMLElement;
  button: HTMLButtonElement;
  def: (typeof UPGRADES)[number];
}

interface PrestigeRow {
  root: HTMLElement;
  level: HTMLElement;
  cost: HTMLElement;
  button: HTMLButtonElement;
  def: (typeof PRESTIGE)[number];
}

interface Cabinet {
  root: HTMLElement;
  units: HTMLElement[];
  count: HTMLElement;
  id: string;
  kind: string;
}

export function createUI(root: HTMLElement, handlers: Handlers) {
  const $ = <T extends HTMLElement>(sel: string) =>
    root.querySelector<T>(sel)!;

  const SVG_NS = "http://www.w3.org/2000/svg";

  // --- Static slot references (rendered by the page) --------------------
  const stats: Record<string, HTMLElement> = {};
  root.querySelectorAll<HTMLElement>("[data-stat]").forEach((node) => {
    stats[node.dataset.stat!] = node;
  });

  const rackNote = $("[data-rack-note]");

  // --- Pinned objective (idea #3) ---------------------------------------
  // The first incomplete campaign goal, echoed with live progress in the top
  // bar so there's always a visible "what now?". Falls back to a done state.
  const objectiveEl = root.querySelector<HTMLElement>("[data-objective]");
  const objectiveName = root.querySelector<HTMLElement>("[data-objective-name]");
  const objectiveProgress = root.querySelector<HTMLElement>("[data-objective-progress]");
  const objectiveBar = root.querySelector<HTMLElement>("[data-objective-bar]");

  // --- Progressive section gating (idea #3) -----------------------------
  // The rail reveals its systems in layers: a section stays dimmed + locked
  // until the farm earns it, so a new player isn't handed all five at once.
  // initTabs (in the page script) reads data-locked to refuse selection.
  const SECTION_GATES: Record<
    string,
    (s: GameState, d: Derived) => { unlocked: boolean; hint: string }
  > = {
    operate: (s) => ({
      unlocked: s.lifetimeEarnings >= TUNING.operateMinEarnings,
      hint: `Unlocks at ${money(TUNING.operateMinEarnings)} earned`,
    }),
    contracts: (s) => ({
      unlocked: s.lifetimeEarnings >= TUNING.contractMinEarnings,
      hint: `Unlocks at ${money(TUNING.contractMinEarnings)} earned`,
    }),
    progress: (s, d) => ({
      unlocked:
        s.prestigeCount > 0 ||
        s.goals.length > 0 ||
        d.pendingCredits > 0 ||
        s.lifetimeEarnings >= creditScale(s) * TUNING.progressUnlockFraction,
      hint: "Unlocks as your first rebuild comes into reach",
    }),
  };
  const navItems = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-tab]"),
  ).map((btn) => {
    // A padlock that only shows while the section is locked (CSS-gated). Stroke
    // icon, so it sits in the same visual family as the section icons.
    const lock = document.createElementNS(SVG_NS, "svg");
    lock.setAttribute("class", "sft-navitem__lock");
    lock.setAttribute("viewBox", "0 0 24 24");
    lock.setAttribute("fill", "none");
    lock.setAttribute("stroke", "currentColor");
    lock.setAttribute("stroke-width", "1.7");
    lock.setAttribute("stroke-linecap", "round");
    lock.setAttribute("stroke-linejoin", "round");
    lock.setAttribute("aria-hidden", "true");
    const r = document.createElementNS(SVG_NS, "rect");
    r.setAttribute("x", "5");
    r.setAttribute("y", "11");
    r.setAttribute("width", "14");
    r.setAttribute("height", "9");
    r.setAttribute("rx", "1.6");
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", "M8 11V7.5a4 4 0 0 1 8 0V11");
    lock.append(r, p);
    btn.appendChild(lock);
    return { id: btn.dataset.tab!, root: btn };
  });
  const navUnlocked: Record<string, boolean> = {};
  let navFirstRender = true;

  // --- Data Hall: one cabinet per producer/cooling/power building -------
  // Cabinets are built once (hidden until owned), then only their fill level
  // and count label change each frame.
  const hallEl = $("[data-hall]");
  const hallEmpty = $("[data-hall-empty]");
  const cabinets: Cabinet[] = [];
  // Each category is its own labelled zone; a zone hides itself until at
  // least one of its cabinets is online.
  const zones: { root: HTMLElement; kind: string }[] = [];
  for (const group of HALL_GROUPS) {
    const zone = el("div", `sft-hall__zone sft-hall__zone--${group.kind} is-empty`);
    const zoneCabs = el("div", "sft-hall__zone__cabs");

    for (const id of group.ids) {
      const def = BUILDING_BY_ID[id];
      if (!def) continue;

      const cab = el("div", `sft-cab sft-cab--${group.kind} sft-cab--${id} is-empty`);
      const frame = el("div", "sft-cab__frame");

      const unitsWrap = el("div", "sft-cab__units");
      const units: HTMLElement[] = [];
      for (let i = 0; i < group.slots; i++) {
        const u = el("span", "sft-u");
        unitsWrap.appendChild(u);
        units.push(u);
      }
      frame.appendChild(unitsWrap);

      // Producer chassis get a row of intake fans along the bottom.
      if (group.kind === "producer") {
        const fans = el("div", "sft-cab__fans");
        fans.append(el("span", "sft-fan"), el("span", "sft-fan"));
        frame.appendChild(fans);
      }

      const plate = el("div", "sft-cab__plate");
      const name = el("span", "sft-cab__name", HALL_SHORT[id] ?? def.name);
      const count = el("span", "sft-cab__count", "x0");
      plate.append(name, count);

      cab.append(frame, plate);
      zoneCabs.appendChild(cab);
      cabinets.push({ root: cab, units, count, id, kind: group.kind });
    }

    const label = el(
      "span",
      "sft-hall__zone__label",
      CATEGORY_LABELS[group.kind] ?? group.kind,
    );
    zone.append(label, zoneCabs);
    hallEl.appendChild(zone);
    zones.push({ root: zone, kind: group.kind });
  }

  const heatBar = $("[data-bar-heat]");
  const heatLabel = $("[data-label-heat]");
  const powerBar = $("[data-bar-power]");
  const powerLabel = $("[data-label-power]");
  const netBar = $("[data-bar-net]");
  const netLabel = $("[data-label-net]");

  const overclockBtn = $<HTMLButtonElement>("[data-overclock]");

  // --- Activity log -----------------------------------------------------
  const logEl = $("[data-log]");
  let logEmpty: HTMLElement | null = el(
    "li",
    "sft-log__empty",
    "Awaiting telemetry...",
  );
  logEl.appendChild(logEmpty);
  const MAX_LOG = 24;

  function pushLog(message: string, kind: "" | "good" | "warn" | "gold" = "") {
    if (logEmpty) {
      logEmpty.remove();
      logEmpty = null;
    }
    const row = el(
      "li",
      "sft-log__row" + (kind ? " sft-log__row--" + kind : ""),
    );
    const t = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    row.append(
      el(
        "span",
        "sft-log__time",
        `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`,
      ),
      el("span", "sft-log__msg", message),
    );
    logEl.insertBefore(row, logEl.firstChild);
    while (logEl.children.length > MAX_LOG) logEl.lastChild?.remove();
  }

  // Cache for custom-property writes so we only touch the DOM on change.
  const varCache: Record<string, string> = {};
  function setVar(name: string, value: string) {
    if (varCache[name] !== value) {
      root.style.setProperty(name, value);
      varCache[name] = value;
    }
  }

  // --- Bulk-buy multiplier (×1 / ×10 / Max) -----------------------------
  // A segmented control in the Operations header sets how many units a row
  // buys per click. The choice also drives the cost shown on each row.
  let buyMult: BuyMult = 1;
  const BUY_MULTS: { id: BuyMult; label: string }[] = [
    { id: 1, label: "×1" },
    { id: 10, label: "×10" },
    { id: "max", label: "Max" },
  ];
  const buyMultWrap = root.querySelector<HTMLElement>("[data-buymult]");
  const buyMultBtns: { id: BuyMult; root: HTMLButtonElement }[] = [];
  function setBuyMult(m: BuyMult) {
    buyMult = m;
    for (const b of buyMultBtns) {
      const on = b.id === m;
      setFlag(b.root, "is-active", on);
      b.root.setAttribute("aria-checked", on ? "true" : "false");
    }
  }
  if (buyMultWrap) {
    for (const opt of BUY_MULTS) {
      const btn = el("button", "sft-buymult__opt", opt.label) as HTMLButtonElement;
      btn.type = "button";
      btn.setAttribute("role", "radio");
      btn.addEventListener("click", () => setBuyMult(opt.id));
      buyMultWrap.appendChild(btn);
      buyMultBtns.push({ id: opt.id, root: btn });
    }
    setBuyMult(1);
  }

  // --- Building rows, grouped by category ------------------------------
  const buildingRows: BuildingRow[] = [];
  (["producer", "power", "cooling", "network", "space", "staff"] as const).forEach((cat) => {
    const list = root.querySelector<HTMLElement>(`[data-list="${cat}"]`);
    if (!list) return;
    BUILDINGS.filter((b) => b.category === cat).forEach((def) => {
      const rowEl = el("button", "sft-row");
      rowEl.type = "button";
      (rowEl as HTMLButtonElement).addEventListener("click", () =>
        handlers.onBuyBuilding(def.id, buyMult),
      );

      const main = el("span", "sft-row__main");
      const name = el("span", "sft-row__name", def.name);
      const desc = el("span", "sft-row__desc", def.desc);
      main.append(name, desc);

      const meta = el("span", "sft-row__meta");
      const owned = el("span", "sft-row__owned", "0");
      const cost = el("span", "sft-row__cost", money(def.baseCost));
      meta.append(owned, cost);

      rowEl.append(main, meta);
      list.appendChild(rowEl);

      buildingRows.push({
        root: rowEl,
        owned,
        cost,
        button: rowEl as HTMLButtonElement,
        def,
      });
    });
  });

  // --- One-off upgrades -------------------------------------------------
  const upgradeWrap = $("[data-upgrades]");
  const upgradeCards: UpgradeCard[] = UPGRADES.map((def) => {
    const card = el("button", "sft-upgrade");
    card.type = "button";
    (card as HTMLButtonElement).addEventListener("click", () =>
      handlers.onBuyUpgrade(def.id),
    );
    card.append(
      el("span", "sft-upgrade__name", def.name),
      el("span", "sft-upgrade__desc", def.desc),
      el("span", "sft-upgrade__cost", money(def.cost)),
    );
    upgradeWrap.appendChild(card);
    return { root: card, button: card as HTMLButtonElement, def };
  });

  // --- Workloads (capacity allocation) ----------------------------------
  // One row per workload: a live price + trend, the current share, and a pair
  // of steppers that shift its allocation weight. Built once; values patch.
  interface WorkloadRow {
    root: HTMLElement;
    price: HTMLElement;
    sat: HTMLElement;
    share: HTMLElement;
    bar: HTMLElement;
    slider: HTMLElement;
    thumb: HTMLElement;
    minus: HTMLButtonElement;
    plus: HTMLButtonElement;
    id: string;
    // Inline price sparkline (idea #9): lets players read the wave and time
    // crypto's volatility rather than gamble on it. Sampled by recordHistory.
    sparkData: number[];
    sparkLine: SVGPolylineElement;
    sparkArea: SVGPolygonElement;
  }
  const workloadWrap = root.querySelector<HTMLElement>("[data-workloads]");
  const workloadRows: WorkloadRow[] = [];
  if (workloadWrap) {
    for (const def of WORKLOADS) {
      const rowEl = el("div", "sft-wl");
      const head = el("div", "sft-wl__head");
      const name = el("span", "sft-wl__name", def.name);
      const headRight = el("div", "sft-wl__head-right");
      const price = el("span", "sft-wl__price", "");
      const sat = el("span", "sft-wl__sat", "");
      headRight.append(price, sat);
      head.append(name, headRight);

      const desc = el("span", "sft-wl__desc", def.desc);

      // Inline price sparkline.
      const svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("class", "sft-wl__spark");
      svg.setAttribute("viewBox", "0 0 100 24");
      svg.setAttribute("preserveAspectRatio", "none");
      svg.setAttribute("aria-hidden", "true");
      const sparkArea = document.createElementNS(SVG_NS, "polygon");
      sparkArea.setAttribute("class", "sft-wl__spark-area");
      const sparkLine = document.createElementNS(SVG_NS, "polyline");
      sparkLine.setAttribute("class", "sft-wl__spark-line");
      svg.append(sparkArea, sparkLine);

      // Drag-to-set capacity slider (track + fill + grabbable thumb). Dragging
      // anywhere along it sets this workload's share directly; the +/- steppers
      // stay for fine, one-unit nudges. Built as a slider so pointer + keyboard
      // both drive the same allocation.
      const slider = el("div", "sft-wl__slider");
      slider.setAttribute("role", "slider");
      slider.tabIndex = 0;
      slider.setAttribute("aria-label", `${def.name} capacity share`);
      slider.setAttribute("aria-valuemin", "0");
      slider.setAttribute("aria-valuemax", "100");
      const barWrap = el("div", "sft-wl__bar");
      const bar = el("span", "sft-wl__fill");
      barWrap.appendChild(bar);
      const thumb = el("span", "sft-wl__thumb");
      slider.append(barWrap, thumb);

      let dragging = false;
      const fracFromEvent = (e: PointerEvent) => {
        const rect = barWrap.getBoundingClientRect();
        if (rect.width <= 0) return 0;
        return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      };
      slider.addEventListener("pointerdown", (e) => {
        dragging = true;
        slider.classList.add("is-dragging");
        slider.setPointerCapture(e.pointerId);
        handlers.onSetAllocationShare(def.id, fracFromEvent(e));
        e.preventDefault();
      });
      slider.addEventListener("pointermove", (e) => {
        if (dragging) handlers.onSetAllocationShare(def.id, fracFromEvent(e));
      });
      const endDrag = (e: PointerEvent) => {
        if (!dragging) return;
        dragging = false;
        slider.classList.remove("is-dragging");
        if (slider.hasPointerCapture(e.pointerId))
          slider.releasePointerCapture(e.pointerId);
      };
      slider.addEventListener("pointerup", endDrag);
      slider.addEventListener("pointercancel", endDrag);
      slider.addEventListener("keydown", (e) => {
        const k = (e as KeyboardEvent).key;
        if (k === "ArrowLeft" || k === "ArrowDown") {
          handlers.onSetAllocation(def.id, -1);
          e.preventDefault();
        } else if (k === "ArrowRight" || k === "ArrowUp") {
          handlers.onSetAllocation(def.id, 1);
          e.preventDefault();
        }
      });

      const ctrls = el("div", "sft-wl__ctrls");
      const minus = el("button", "sft-wl__step", "–") as HTMLButtonElement;
      minus.type = "button";
      const share = el("span", "sft-wl__share", "0%");
      const plus = el("button", "sft-wl__step", "+") as HTMLButtonElement;
      plus.type = "button";
      minus.addEventListener("click", () => handlers.onSetAllocation(def.id, -1));
      plus.addEventListener("click", () => handlers.onSetAllocation(def.id, 1));
      ctrls.append(minus, share, plus);

      rowEl.append(head, desc, svg, slider, ctrls);
      workloadWrap.appendChild(rowEl);
      workloadRows.push({
        root: rowEl,
        price,
        sat,
        share,
        bar,
        slider,
        thumb,
        minus,
        plus,
        id: def.id,
        sparkData: [],
        sparkLine,
        sparkArea,
      });
    }
  }

  // --- Power strategy (contract selector) -------------------------------
  interface PowerRow { root: HTMLButtonElement; id: PowerContract }
  const powerWrap = root.querySelector<HTMLElement>("[data-power-contracts]");
  const powerNote = root.querySelector<HTMLElement>("[data-power-note]");
  const powerHint = root.querySelector<HTMLElement>("[data-power-hint]");
  const powerRows: PowerRow[] = [];
  if (powerWrap) {
    for (const opt of POWER_OPTIONS) {
      const btn = el("button", "sft-pwr__opt") as HTMLButtonElement;
      btn.type = "button";
      btn.setAttribute("role", "radio");
      btn.append(
        el("span", "sft-pwr__name", opt.name),
        el("span", "sft-pwr__desc", opt.desc),
      );
      btn.addEventListener("click", () => handlers.onSetPowerContract(opt.id));
      powerWrap.appendChild(btn);
      powerRows.push({ root: btn, id: opt.id });
    }
  }

  // --- In-run research tree --------------------------------------------
  // Reuses the prestige-row chrome (.sft-prow); cost is paid in R&D points.
  interface ResearchRow {
    root: HTMLElement;
    level: HTMLElement;
    cost: HTMLElement;
    button: HTMLButtonElement;
    id: string;
  }
  const researchWrap = root.querySelector<HTMLElement>("[data-research-list]");
  const researchNote = root.querySelector<HTMLElement>("[data-research-note]");
  const researchRows: ResearchRow[] = [];
  if (researchWrap) {
    for (const def of RESEARCH) {
      const rowEl = el("button", "sft-prow");
      rowEl.type = "button";
      (rowEl as HTMLButtonElement).addEventListener("click", () =>
        handlers.onBuyResearch(def.id),
      );
      const main = el("span", "sft-prow__main");
      main.append(
        el("span", "sft-prow__name", def.name),
        el("span", "sft-prow__desc", def.desc),
      );
      const meta = el("span", "sft-prow__meta");
      const level = el("span", "sft-prow__level", "Lv 0");
      const cost = el("span", "sft-prow__cost", "");
      meta.append(level, cost);
      rowEl.append(main, meta);
      researchWrap.appendChild(rowEl);
      researchRows.push({
        root: rowEl,
        level,
        cost,
        button: rowEl as HTMLButtonElement,
        id: def.id,
      });
    }
  }

  // --- Objectives (campaign goals + reputation standing) ----------------
  const goalsListWrap = root.querySelector<HTMLElement>("[data-goals-list]");
  const goalsNote = root.querySelector<HTMLElement>("[data-goals-note]");
  const standingTier = root.querySelector<HTMLElement>("[data-standing-tier]");
  const standingNext = root.querySelector<HTMLElement>("[data-standing-next]");
  const standingBar = root.querySelector<HTMLElement>("[data-standing-bar]");
  const standingPerks = root.querySelector<HTMLElement>("[data-standing-perks]");
  const endlessBtn = root.querySelector<HTMLButtonElement>("[data-endless]");
  endlessBtn?.addEventListener("click", () => handlers.onToggleEndless());
  const goalRows = goalsListWrap
    ? GOALS.map((def) => {
        const rowEl = el("div", "sft-goal is-locked");
        const mark = el("span", "sft-goal__mark", "○");
        const body = el("span", "sft-goal__body");
        body.append(
          el("span", "sft-goal__name", def.name),
          el("span", "sft-goal__desc", def.desc),
        );
        rowEl.append(mark, body);
        goalsListWrap.appendChild(rowEl);
        return { root: rowEl, mark, def };
      })
    : [];

  // --- Maintenance (hardware wear) --------------------------------------
  const wearBar = root.querySelector<HTMLElement>("[data-bar-wear]");
  const wearLabel = root.querySelector<HTMLElement>("[data-label-wear]");
  const wearNote = root.querySelector<HTMLElement>("[data-wear-note]");
  const serviceBtn = root.querySelector<HTMLButtonElement>("[data-service]");
  serviceBtn?.addEventListener("click", () => handlers.onServiceHardware());

  // --- Prestige tree (grouped by branch) --------------------------------
  const prestigeWrap = $("[data-prestige-list]");
  const prestigeRows: PrestigeRow[] = [];
  let prestigeBranch = "";
  for (const def of PRESTIGE) {
    if (def.branch && def.branch !== prestigeBranch) {
      prestigeBranch = def.branch;
      prestigeWrap.appendChild(
        el("p", "sft-subhead", PRESTIGE_BRANCH_LABELS[def.branch] ?? def.branch),
      );
    }
    const rowEl = el("button", "sft-prow");
    rowEl.type = "button";
    (rowEl as HTMLButtonElement).addEventListener("click", () =>
      handlers.onBuyPrestige(def.id),
    );
    const main = el("span", "sft-prow__main");
    main.append(
      el("span", "sft-prow__name", def.name),
      el("span", "sft-prow__desc", def.desc),
    );
    const meta = el("span", "sft-prow__meta");
    const level = el("span", "sft-prow__level", "Lv 0");
    const cost = el("span", "sft-prow__cost", "");
    meta.append(level, cost);
    rowEl.append(main, meta);
    prestigeWrap.appendChild(rowEl);
    prestigeRows.push({
      root: rowEl,
      level,
      cost,
      button: rowEl as HTMLButtonElement,
      def,
    });
  }

  // --- Corporate tree (second prestige currency, idea #4) ---------------
  // Reuses the .sft-prow chrome; paid in influence. The whole panel is hidden
  // until the Corporate layer unlocks (a handful of rebuilds in).
  interface CorporateRow {
    root: HTMLElement;
    level: HTMLElement;
    cost: HTMLElement;
    button: HTMLButtonElement;
    id: string;
  }
  const corpPanel = root.querySelector<HTMLElement>("[data-corporate]");
  const corpListWrap = root.querySelector<HTMLElement>("[data-corporate-list]");
  const corpNote = root.querySelector<HTMLElement>("[data-corporate-note]");
  const corporateRows: CorporateRow[] = [];
  if (corpListWrap) {
    for (const def of CORPORATE) {
      const rowEl = el("button", "sft-prow");
      rowEl.type = "button";
      (rowEl as HTMLButtonElement).addEventListener("click", () =>
        handlers.onBuyCorporate(def.id),
      );
      const main = el("span", "sft-prow__main");
      main.append(
        el("span", "sft-prow__name", def.name),
        el("span", "sft-prow__desc", def.desc),
      );
      const meta = el("span", "sft-prow__meta");
      const level = el("span", "sft-prow__level", "Lv 0");
      const cost = el("span", "sft-prow__cost", "");
      meta.append(level, cost);
      rowEl.append(main, meta);
      corpListWrap.appendChild(rowEl);
      corporateRows.push({
        root: rowEl,
        level,
        cost,
        button: rowEl as HTMLButtonElement,
        id: def.id,
      });
    }
  }

  // --- Ascension (post-campaign Endless escalation, idea #4) ------------
  const ascEl = root.querySelector<HTMLElement>("[data-ascension]");
  const ascTier = root.querySelector<HTMLElement>("[data-ascension-tier]");
  const ascNext = root.querySelector<HTMLElement>("[data-ascension-next]");
  const ascBar = root.querySelector<HTMLElement>("[data-ascension-bar]");

  const prestigeBtn = $<HTMLButtonElement>("[data-prestige-go]");
  const prestigePreview = $("[data-prestige-preview]");
  prestigeBtn.addEventListener("click", () => handlers.onPrestige());
  overclockBtn.addEventListener("click", () => handlers.onOverclock());
  // The burst runs the floor hot (idea #5) — note the trade-off on the control.
  overclockBtn.title = `×${TUNING.overclockMult} output, but heat and wear surge while it runs — time it for thermal headroom.`;

  // --- Incident banner --------------------------------------------------
  const eventBanner = root.querySelector<HTMLElement>("[data-event]");
  const eventName = root.querySelector<HTMLElement>("[data-event-name]");
  const eventDesc = root.querySelector<HTMLElement>("[data-event-desc]");
  const eventTimer = root.querySelector<HTMLElement>("[data-event-timer]");
  const respondBtn = root.querySelector<HTMLButtonElement>("[data-event-respond]");
  respondBtn?.addEventListener("click", () => handlers.onRespondEvent());

  // --- Hotspot banner ---------------------------------------------------
  const hotspotBanner = root.querySelector<HTMLElement>("[data-hotspot]");
  const hotspotDesc = root.querySelector<HTMLElement>("[data-hotspot-desc]");
  const hotspotTimer = root.querySelector<HTMLElement>("[data-hotspot-timer]");
  const rebalanceBtn = root.querySelector<HTMLButtonElement>("[data-hotspot-clear]");
  rebalanceBtn?.addEventListener("click", () => handlers.onRebalance());

  // --- Scripted opportunity banner --------------------------------------
  const scriptBanner = root.querySelector<HTMLElement>("[data-script]");
  const scriptName = root.querySelector<HTMLElement>("[data-script-name]");
  const scriptGoal = root.querySelector<HTMLElement>("[data-script-goal]");
  const scriptTimer = root.querySelector<HTMLElement>("[data-script-timer]");
  const scriptBar = root.querySelector<HTMLElement>("[data-script-bar]");
  const scriptHold = root.querySelector<HTMLElement>("[data-script-hold]");
  const scriptReward = root.querySelector<HTMLElement>("[data-script-reward]");

  // --- Statistics sparklines (idea #11) ---------------------------------
  // Three rolling sparklines sampled once a second by index.ts. Built once;
  // each repaint only rewrites two SVG point strings + two labels.
  const SPARK_LEN = 60;
  interface Spark {
    data: number[];
    fixed?: [number, number];
    fmt: (n: number) => string;
    value: HTMLElement;
    range: HTMLElement;
    line: SVGPolylineElement;
    area: SVGPolygonElement;
  }
  const SPARK_DEFS: {
    key: string;
    name: string;
    fixed?: [number, number];
    fmt: (n: number) => string;
  }[] = [
    { key: "income", name: "Net income", fmt: (n) => "$" + fmt(n) + "/s" },
    { key: "compute", name: "Compute", fmt: (n) => rate(n, " FLOP") },
    { key: "output", name: "Output", fixed: [0, 1], fmt: (n) => pct(n) },
  ];
  const sparkWrap = root.querySelector<HTMLElement>("[data-spark-list]");
  const sparks: Record<string, Spark> = {};
  if (sparkWrap) {
    for (const def of SPARK_DEFS) {
      const card = el("div", "sft-spark");
      const top = el("div", "sft-spark__top");
      const name = el("span", "sft-spark__name", def.name);
      const value = el("span", "sft-spark__value", "—");
      top.append(name, value);

      const svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("class", "sft-spark__svg");
      svg.setAttribute("viewBox", "0 0 100 30");
      svg.setAttribute("preserveAspectRatio", "none");
      svg.setAttribute("aria-hidden", "true");
      const area = document.createElementNS(SVG_NS, "polygon");
      area.setAttribute("class", "sft-spark__area");
      const line = document.createElementNS(SVG_NS, "polyline");
      line.setAttribute("class", "sft-spark__line");
      svg.append(area, line);

      const foot = el("div", "sft-spark__foot");
      const range = el("span", "sft-spark__range", "Sampling…");
      foot.append(range);

      card.append(top, svg, foot);
      sparkWrap.appendChild(card);
      sparks[def.key] = {
        data: [],
        fixed: def.fixed,
        fmt: def.fmt,
        value,
        range,
        line,
        area,
      };
    }
  }

  function paintSpark(sp: Spark) {
    const n = sp.data.length;
    const latest = n ? sp.data[n - 1] : 0;
    setText(sp.value, n ? sp.fmt(latest) : "—");
    if (n < 2) {
      setText(sp.range, "Sampling…");
      return;
    }
    let lo: number;
    let hi: number;
    if (sp.fixed) {
      [lo, hi] = sp.fixed;
    } else {
      lo = Math.min(...sp.data);
      hi = Math.max(...sp.data);
      if (hi - lo < 1e-9) {
        hi += 1;
        lo = Math.max(0, lo - 1);
      }
    }
    const span = hi - lo || 1;
    const pts: string[] = [];
    for (let i = 0; i < n; i++) {
      const x = (i / (SPARK_LEN - 1)) * 100;
      const norm = Math.min(1, Math.max(0, (sp.data[i] - lo) / span));
      const y = 29 - norm * 28; // 1px breathing room top + bottom
      pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    const lineStr = pts.join(" ");
    if (sp.line.getAttribute("points") !== lineStr)
      sp.line.setAttribute("points", lineStr);
    const lastX = ((n - 1) / (SPARK_LEN - 1)) * 100;
    sp.area.setAttribute("points", `0,30 ${lineStr} ${lastX.toFixed(2)},30`);
    setText(sp.range, `${sp.fmt(lo)} – ${sp.fmt(hi)}`);
  }

  function paintWorkloadSpark(r: WorkloadRow) {
    const data = r.sparkData;
    const n = data.length;
    if (n < 2) {
      if (r.sparkLine.getAttribute("points")) r.sparkLine.setAttribute("points", "");
      if (r.sparkArea.getAttribute("points")) r.sparkArea.setAttribute("points", "");
      return;
    }
    let lo = Math.min(...data);
    let hi = Math.max(...data);
    if (hi - lo < 1e-9) {
      hi += 1;
      lo = Math.max(0, lo - 1);
    }
    const span = hi - lo || 1;
    const pts: string[] = [];
    for (let i = 0; i < n; i++) {
      const x = (i / (SPARK_LEN - 1)) * 100;
      const norm = Math.min(1, Math.max(0, (data[i] - lo) / span));
      pts.push(`${x.toFixed(2)},${(23 - norm * 22).toFixed(2)}`);
    }
    const lineStr = pts.join(" ");
    if (r.sparkLine.getAttribute("points") !== lineStr)
      r.sparkLine.setAttribute("points", lineStr);
    const lastX = ((n - 1) / (SPARK_LEN - 1)) * 100;
    r.sparkArea.setAttribute("points", `0,24 ${lineStr} ${lastX.toFixed(2)},24`);
  }

  function recordHistory(d: Derived) {
    // Per-workload price sparklines (idea #9) — recorded independently of the
    // statistics panel so they tick even when Progress is locked/hidden.
    if (workloadRows.length) {
      const priceById: Record<string, number> = {};
      for (const w of d.workloads) priceById[w.id] = w.price;
      for (const r of workloadRows) {
        const price = priceById[r.id];
        if (price == null) continue;
        r.sparkData.push(price);
        if (r.sparkData.length > SPARK_LEN) r.sparkData.shift();
        paintWorkloadSpark(r);
      }
    }
    if (!sparkWrap) return;
    const output =
      d.heatThrottle *
      d.powerThrottle *
      d.bandwidthThrottle *
      (1 - d.wearPenalty);
    const push = (key: string, v: number) => {
      const sp = sparks[key];
      if (!sp) return;
      sp.data.push(v);
      if (sp.data.length > SPARK_LEN) sp.data.shift();
      paintSpark(sp);
    };
    push("income", Math.max(0, d.moneyPerSec));
    push("compute", d.compute);
    push("output", Math.min(1, Math.max(0, output)));
  }

  // --- Sound toggle (idea #14) ------------------------------------------
  // Opt-in; ships off. Clicking is the user gesture WebAudio needs to start.
  const soundBtn = root.querySelector<HTMLButtonElement>("[data-sound]");
  function syncSound() {
    if (!soundBtn) return;
    const on = sound.isEnabled();
    setText(soundBtn, on ? "Sound: On" : "Sound: Off");
    setFlag(soundBtn, "is-active", on);
    soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  soundBtn?.addEventListener("click", () => {
    sound.setEnabled(!sound.isEnabled());
    syncSound();
  });

  // --- Offline summary modal (idea #12) ---------------------------------
  // A dismissible breakdown of what the farm did while away — the welcome-back
  // toast made permanent for longer absences. Built once, filled on demand.
  const offlineSlots: Record<string, HTMLElement> = {};
  let offlineScrim: HTMLElement | null = null;
  {
    const scrim = el("div", "sft-modal-scrim");
    scrim.setAttribute("role", "dialog");
    scrim.setAttribute("aria-modal", "true");
    scrim.setAttribute("aria-label", "Offline summary");
    scrim.hidden = true;

    const card = el("div", "sft-modal");
    const head = el("div", "sft-modal__head");
    head.append(
      el("h2", "sft-modal__title", "Welcome back"),
      el("p", "sft-modal__sub", ""),
    );
    offlineSlots.sub = head.lastChild as HTMLElement;

    const grid = el("div", "sft-modal__grid");
    const metric = (key: string, label: string) => {
      const cell = el("div", "sft-modal__metric");
      const v = el("span", "sft-modal__metric-val", "—");
      const l = el("span", "sft-modal__metric-label", label);
      cell.append(v, l);
      grid.appendChild(cell);
      offlineSlots[key] = v;
    };
    metric("earnings", "Earnings");
    metric("netCash", "Net cash");
    metric("reputation", "Reputation");
    metric("research", "R&D banked");
    metric("contracts", "Contracts");
    metric("rate", "Avg / hr");

    const note = el(
      "p",
      "sft-modal__note",
      "Offline farms run at reduced efficiency. Warm Spares narrows the gap.",
    );
    const close = el(
      "button",
      "sft-modal__close",
      "Back to the floor",
    ) as HTMLButtonElement;
    close.type = "button";

    card.append(head, grid, note, close);
    scrim.appendChild(card);
    root.appendChild(scrim);
    offlineScrim = scrim;

    const dismiss = () => {
      scrim.classList.remove("is-open");
      setTimeout(() => {
        scrim.hidden = true;
      }, 280);
    };
    close.addEventListener("click", dismiss);
    scrim.addEventListener("click", (e) => {
      if (e.target === scrim) dismiss();
    });
    scrim.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Escape") dismiss();
    });
    offlineSlots.close = close;
  }

  function showOfflineSummary(o: OfflineSummary) {
    if (!offlineScrim) return;
    setText(offlineSlots.sub, `Your farm ran for ${duration(o.sec)}.`);
    setText(offlineSlots.earnings, money(o.earnings));
    setText(
      offlineSlots.netCash,
      (o.netCash < 0 ? "-" : "+") + money(Math.abs(o.netCash)).slice(1),
    );
    setText(offlineSlots.reputation, "+" + fmt(o.reputation));
    setText(offlineSlots.research, "+" + fmt(o.research));
    setText(
      offlineSlots.contracts,
      o.contractsCompleted + o.contractsFailed > 0
        ? `${o.contractsCompleted} done · ${o.contractsFailed} lost`
        : "—",
    );
    setText(
      offlineSlots.rate,
      money(o.sec > 0 ? (o.earnings / o.sec) * 3600 : 0),
    );
    offlineScrim.hidden = false;
    requestAnimationFrame(() => offlineScrim!.classList.add("is-open"));
    (offlineSlots.close as HTMLButtonElement).focus();
  }

  // --- Contracts card ---------------------------------------------------
  // A board of offers plus the concurrent jobs in progress. Rows are keyed by
  // contract id and reconciled each frame (create new, drop gone, patch the
  // rest) so the demand market can hold several deals at once without churn.
  const contractBody = root.querySelector<HTMLElement>("[data-contract-body]");
  const contractNote = root.querySelector<HTMLElement>("[data-contract-note]");

  interface ActiveRow {
    root: HTMLElement;
    title: HTMLElement;
    fill: HTMLElement;
    progress: HTMLElement;
    reserve: HTMLElement;
    reward: HTMLElement;
    timer: HTMLElement;
  }
  interface OfferRow {
    root: HTMLElement;
    title: HTMLElement;
    reserve: HTMLElement;
    reward: HTMLElement;
    risk: HTMLElement;
    expiry: HTMLElement;
    accept: HTMLButtonElement;
  }

  const cIdle = el("p", "sft-contract__idle");
  const cActiveList = el("div", "sft-contract__list");
  const cOfferList = el("div", "sft-contract__list");
  contractBody?.append(cIdle, cActiveList, cOfferList);

  const activeRows = new Map<string, ActiveRow>();
  const offerRows = new Map<string, OfferRow>();

  function makeActiveRow(): ActiveRow {
    const rootEl = el("div", "sft-contract__active");
    const title = el("p", "sft-contract__line");
    const barWrap = el("div", "sft-bar");
    const fill = el("span", "sft-bar__fill");
    barWrap.appendChild(fill);
    const progress = el("p", "sft-contract__progress");
    const reserve = el("p", "sft-contract__reserve");
    const reward = el("p", "sft-contract__reward");
    const timer = el("p", "sft-contract__expiry");
    rootEl.append(title, barWrap, progress, reserve, reward, timer);
    return { root: rootEl, title, fill, progress, reserve, reward, timer };
  }

  function makeOfferRow(id: string): OfferRow {
    const rootEl = el("div", "sft-contract__offer");
    const title = el("p", "sft-contract__line");
    const reserve = el("p", "sft-contract__reserve");
    const reward = el("p", "sft-contract__reward");
    const risk = el("p", "sft-contract__risk");
    const expiry = el("p", "sft-contract__expiry");
    const actions = el("div", "sft-contract__actions");
    const accept = el("button", "sft-contract__accept", "Accept") as HTMLButtonElement;
    accept.type = "button";
    const decline = el("button", "sft-contract__decline", "Pass") as HTMLButtonElement;
    decline.type = "button";
    accept.addEventListener("click", () => handlers.onAcceptContract(id));
    decline.addEventListener("click", () => handlers.onDeclineContract(id));
    actions.append(accept, decline);
    rootEl.append(title, reserve, reward, risk, expiry, actions);
    return { root: rootEl, title, reserve, reward, risk, expiry, accept };
  }

  // --- Milestones (collapsible) ----------------------------------------
  const achWrap = root.querySelector<HTMLElement>("[data-achievements]");
  const achNote = root.querySelector<HTMLElement>("[data-ach-note]");
  const achPanel = achWrap?.closest<HTMLElement>(".sft-ach");
  achPanel
    ?.querySelector(".sft-panel__head")
    ?.addEventListener("click", () => achPanel.classList.toggle("is-collapsed"));

  const achChips = achWrap
    ? ACHIEVEMENTS.map((def) => {
        const chip = el("div", "sft-ach__chip is-locked");
        chip.append(
          el("span", "sft-ach__name", def.name),
          el("span", "sft-ach__desc", def.desc),
        );
        if (def.buffNote) chip.append(el("span", "sft-ach__buff", def.buffNote));
        achWrap.appendChild(chip);
        return { root: chip, def };
      })
    : [];

  // --- Save / data controls --------------------------------------------
  $("[data-save]").addEventListener("click", () => handlers.onSave());
  $("[data-reset]").addEventListener("click", () => handlers.onReset());
  $("[data-export]").addEventListener("click", () => handlers.onExport());
  $("[data-import]").addEventListener("click", () => {
    const blob = window.prompt("Paste a previously exported save:");
    if (blob) handlers.onImport(blob);
  });

  // --- Toasts -----------------------------------------------------------
  // Capped stack: a burst of events (offline catch-up, a milestone cascade,
  // several contracts landing at once) must never pile past a few cards, or the
  // column buries the screen — fatal on mobile, where it would cover the nav.
  // The activity log keeps the full history, so dropping the oldest is safe.
  // Cards are click-to-dismiss for anyone who wants the corner cleared sooner.
  const toastWrap = $("[data-toasts]");
  const MAX_TOASTS = 4;
  function dismissToast(t: HTMLElement) {
    if (t.dataset.leaving) return;
    t.dataset.leaving = "1";
    t.classList.remove("is-in");
    setTimeout(() => t.remove(), 400);
  }
  function toast(message: string, ms = 5000) {
    const t = el("div", "sft-toast", message);
    t.addEventListener("click", () => dismissToast(t));
    toastWrap.appendChild(t);
    // Cut the oldest cards instantly once over the cap (they're being buried
    // anyway), so the stack never grows tall enough to swamp the layout.
    while (toastWrap.children.length > MAX_TOASTS) {
      toastWrap.firstElementChild?.remove();
    }
    requestAnimationFrame(() => t.classList.add("is-in"));
    setTimeout(() => dismissToast(t), ms);
  }

  // --- Render -----------------------------------------------------------
  function setText(node: HTMLElement | null | undefined, value: string) {
    if (node && node.textContent !== value) node.textContent = value;
  }
  function setDisabled(btn: HTMLButtonElement, disabled: boolean) {
    if (btn.disabled !== disabled) btn.disabled = disabled;
  }
  function setFlag(node: HTMLElement, cls: string, on: boolean) {
    if (node.classList.contains(cls) !== on) node.classList.toggle(cls, on);
  }

  function render(s: GameState, d: Derived, now: number) {
    // HUD
    setText(stats.money, money(s.money));
    setText(stats.rate, "$" + fmt(d.moneyPerSec) + "/s");
    setText(stats.compute, rate(d.compute, " FLOP"));
    setText(stats.reputation, `${fmt(s.reputation)} · ${d.repTier.name}`);
    setText(stats.research, fmt(s.research));
    setText(stats.credits, fmt(s.credits));
    // Power draw/cap lives in the rail vitals (below), not the top bar.
    setText(stats.space, `${fmt(d.spaceUsed)} / ${fmt(d.spaceCap)} RU`);
    // Warn once the floor is full enough that the cheapest cabinet won't fit.
    setFlag(
      stats.space?.parentElement ?? root,
      "is-warn",
      d.spaceUsed >= d.spaceCap,
    );
    setText(
      stats.bill,
      d.powerCost > 0 ? "-$" + fmt(d.powerCost) + "/s" : "$0/s",
    );
    setFlag(
      stats.bill?.parentElement ?? root,
      "is-warn",
      d.powerCost > d.grossPerSec && d.powerCost > 0,
    );

    // Building rows
    for (const r of buildingRows) {
      const count = s.buildings[r.def.id] ?? 0;
      const unlocked =
        r.def.unlockAt == null || s.lifetimeEarnings >= r.def.unlockAt;
      setFlag(r.root, "is-locked", !unlocked);
      if (!unlocked) {
        setText(r.owned, "locked");
        setText(r.cost, `at ${money(r.def.unlockAt!)} earned`);
        setDisabled(r.button, true);
        continue;
      }
      setText(r.owned, "x" + count);
      // Floor space gates physical equipment before money does: once the rack
      // units are gone, the only fix is a facility expansion.
      const oneFits =
        r.def.space == null || d.spaceUsed + r.def.space <= d.spaceCap;
      setFlag(r.root, "is-nospace", !oneFits);
      if (!oneFits) {
        setText(r.cost, "Floor full");
        setDisabled(r.button, true);
        setFlag(r.root, "is-afford", false);
        continue;
      }
      // Cost + count reflect the active buy multiplier; ×N annotates the count.
      const info = bulkBuyInfo(s, r.def, buyMult);
      const display = info.count > 0 ? info.cost : bulkBuyInfo(s, r.def, 1).cost;
      setText(
        r.cost,
        info.count > 1 ? `${money(display)} ·${info.count}` : money(display),
      );
      const afford = info.count > 0 && s.money >= info.cost;
      setDisabled(r.button, !afford);
      setFlag(r.root, "is-afford", afford);
    }

    // Upgrades (hidden until unlocked, removed once owned)
    for (const u of upgradeCards) {
      const ownedUp = s.upgrades.includes(u.def.id);
      const unlocked = u.def.unlock(s);
      setFlag(u.root, "is-hidden", ownedUp || !unlocked);
      if (ownedUp || !unlocked) continue;
      const afford = s.money >= u.def.cost;
      setDisabled(u.button, !afford);
      setFlag(u.root, "is-afford", afford);
    }

    // Workload allocation
    if (workloadRows.length) {
      const byId: Record<string, Derived["workloads"][number]> = {};
      for (const w of d.workloads) byId[w.id] = w;
      for (const r of workloadRows) {
        const w = byId[r.id];
        if (!w) continue;
        const arrow = w.trend === "up" ? "▲" : w.trend === "down" ? "▼" : "·";
        setText(r.price, `$${fmt(w.price)} ${arrow}`);
        setFlag(r.price, "is-up", w.trend === "up");
        setFlag(r.price, "is-down", w.trend === "down");
        // Demand saturation (idea #1): flag when concentration is decaying the
        // price, so spreading vs concentrating reads as a live trade-off.
        const satPct = Math.round(w.saturation * 100);
        setText(r.sat, satPct >= 3 ? `−${satPct}% saturated` : "");
        setFlag(r.root, "is-saturated", satPct >= 3);
        const allocPct = pct(w.alloc);
        r.bar.style.width = allocPct;
        r.thumb.style.left = allocPct;
        setText(r.share, allocPct);
        r.slider.setAttribute("aria-valuenow", String(Math.round(w.alloc * 100)));
        r.slider.setAttribute("aria-valuetext", allocPct);
        const weight = Math.max(0, Math.floor(s.allocation[r.id] ?? 0));
        setDisabled(r.minus, weight <= 0);
        setDisabled(r.plus, weight >= TUNING.allocationMax);
        setFlag(r.root, "is-active", w.alloc > 0);
      }
    }

    // Power strategy: highlight the active contract; the hint reads the live
    // billed rate, the raw market state and any UPS / surge-immunity perk.
    if (powerRows.length) {
      for (const r of powerRows) {
        const on = s.powerContract === r.id;
        setFlag(r.root, "is-active", on);
        r.root.setAttribute("aria-checked", on ? "true" : "false");
      }
      const active = POWER_OPTIONS.find((o) => o.id === s.powerContract);
      setText(powerNote ?? undefined, `${active?.name ?? "Spot"} contract`);
      const marketRatio = d.gridMarket / TUNING.basePowerRate;
      const marketWord =
        marketRatio > 1.12 ? "peak" : marketRatio < 0.88 ? "off-peak" : "normal";
      const batteries = s.buildings["battery"] ?? 0;
      let hint = `Billed $${fmt(d.gridPrice)}/kW·s · market ${marketWord}`;
      if (s.powerContract === "spot" && batteries > 0)
        hint += ` · ${batteries} UPS shaving peaks`;
      if (s.powerContract === "green")
        hint += d.gridSurgeImmune ? " · surge shrugged off" : " · surge-proof";
      setText(powerHint ?? undefined, hint);
    }

    // In-run research
    if (researchRows.length) {
      setText(researchNote ?? undefined, `${fmt(s.research)} R&D`);
      for (const r of researchRows) {
        const lvl = s.researchNodes[r.id] ?? 0;
        setText(r.level, "Lv " + lvl);
        const cost = researchCost(s, r.id);
        const maxed = !isFinite(cost);
        setText(r.cost, maxed ? "MAX" : fmt(cost) + " R&D");
        const afford = !maxed && s.research >= cost;
        setDisabled(r.button, !afford);
        setFlag(r.root, "is-afford", afford);
      }
    }

    // Prestige tree
    for (const p of prestigeRows) {
      const lvl = s.prestigeUpgrades[p.def.id] ?? 0;
      const unlocked = prestigeUnlocked(s, p.def.id);
      setFlag(p.root, "is-locked", !unlocked);
      setText(p.level, "Lv " + lvl);
      if (!unlocked) {
        const req = p.def.requires
          ?.map((r) => {
            const dep = PRESTIGE.find((x) => x.id === r.id);
            return `${dep?.name ?? r.id} Lv${r.level}`;
          })
          .join(", ");
        setText(p.cost, req ? `needs ${req}` : "Locked");
        setDisabled(p.button, true);
        setFlag(p.root, "is-afford", false);
        continue;
      }
      const cost = prestigeCost(s, p.def.id);
      const maxed = !isFinite(cost);
      setText(p.cost, maxed ? "MAX" : fmt(cost) + " ⬡");
      const afford = !maxed && s.credits >= cost;
      setDisabled(p.button, !afford);
      setFlag(p.root, "is-afford", afford);
    }

    // Prestige action
    const pending = d.pendingCredits;
    setDisabled(prestigeBtn, pending <= 0);
    setText(
      prestigePreview,
      pending > 0
        ? `Rebuild for +${fmt(pending)} ⬡  (resets to ${money(
            startingMoney(s),
          )})`
        : `Earn ${money(creditScale(s))} this run to unlock a rebuild.`,
    );

    // Telemetry: heat
    const heatFrac = Math.min(1, d.heatLoad); // 1 == at capacity
    heatBar.style.width = pct(heatFrac);
    const overheating = d.heatThrottle < 1;
    setFlag(heatBar, "is-hot", overheating);
    setText(
      heatLabel,
      overheating
        ? `Overheating - output ${pct(d.heatThrottle)}`
        : `Nominal - ${fmt(d.heatGen)}/${fmt(d.coolingCap)} cooling`,
    );

    // Telemetry: power
    const powerFrac = d.powerCap > 0 ? Math.min(1, d.powerDraw / d.powerCap) : 0;
    powerBar.style.width = pct(powerFrac);
    const browningOut = d.powerThrottle < 1;
    setFlag(powerBar, "is-hot", browningOut);
    const gridRatio = d.gridMarket / TUNING.basePowerRate;
    const gridWord =
      gridRatio > 1.12 ? "peak" : gridRatio < 0.88 ? "off-peak" : "normal";
    setText(
      powerLabel,
      browningOut
        ? `Over capacity - output ${pct(d.powerThrottle)}`
        : `${fmt(d.powerDraw)} / ${fmt(d.powerCap)} kW · grid ${gridWord}`,
    );

    // Telemetry: network throughput (same hard-cap behaviour as power)
    const netFrac =
      d.bandwidthCap > 0 ? Math.min(1, d.bandwidthDraw / d.bandwidthCap) : 0;
    netBar.style.width = pct(netFrac);
    const saturated = d.bandwidthThrottle < 1;
    setFlag(netBar, "is-hot", saturated);
    setText(
      netLabel,
      saturated
        ? `Saturated - output ${pct(d.bandwidthThrottle)}`
        : `${fmt(d.bandwidthDraw)} / ${fmt(d.bandwidthCap)} Gb/s`,
    );

    // Data Hall: fill each cabinet from its owned count.
    const tier =
      d.heatThrottle >= 0.9 ? "ok" : d.heatThrottle >= 0.6 ? "warm" : "hot";
    const zoneTotals: Record<string, number> = {};
    for (const cab of cabinets) {
      const count = s.buildings[cab.id] ?? 0;
      zoneTotals[cab.kind] = (zoneTotals[cab.kind] ?? 0) + count;
      const empty = count <= 0;
      setFlag(cab.root, "is-empty", empty);
      if (empty) continue;
      const lit = Math.min(cab.units.length, count);
      for (let i = 0; i < cab.units.length; i++) {
        setFlag(cab.units[i], "is-on", i < lit);
      }
      setFlag(cab.root, "is-full", count > cab.units.length);
      setText(cab.count, "x" + fmt(count));
    }
    const producerCount = zoneTotals.producer ?? 0;
    // Hide an entire category zone (label included) until it has hardware.
    for (const z of zones) {
      setFlag(z.root, "is-empty", (zoneTotals[z.kind] ?? 0) <= 0);
    }

    // Hall-wide reactive state, driven by attributes/vars so CSS does the work.
    if (hallEl.dataset.tier !== tier) hallEl.dataset.tier = tier;
    const powerState = d.powerThrottle < 1 ? "low" : "ok";
    if (hallEl.dataset.power !== powerState) hallEl.dataset.power = powerState;
    const netState = d.bandwidthThrottle < 1 ? "low" : "ok";
    if (hallEl.dataset.net !== netState) hallEl.dataset.net = netState;
    const ocState = d.overclockActive ? "1" : "0";
    if (hallEl.dataset.oc !== ocState) hallEl.dataset.oc = ocState;
    // A live hotspot flares the producer floor; worn hardware ages its look.
    const hotspotState = d.hotspot != null ? "1" : "0";
    if (hallEl.dataset.hotspot !== hotspotState)
      hallEl.dataset.hotspot = hotspotState;
    setVar("--sft-wear", d.wear.toFixed(3));
    const wearState = d.wear >= 0.4 ? "1" : "0";
    if (hallEl.dataset.wear !== wearState) hallEl.dataset.wear = wearState;
    setFlag(hallEmpty, "is-hidden", producerCount > 0);

    // Fans spin faster as the floor heats up (clamped to a sane range).
    const load = Math.min(2, Math.max(0, d.heatLoad));
    setVar("--sft-fan-dur", Math.max(0.55, 2.8 - load * 1.1).toFixed(2) + "s");

    // Drive the ambient corridor: brighter with more servers, redder when hot.
    setVar(
      "--sft-glow",
      Math.min(1, Math.log10(1 + producerCount) / 2.2).toFixed(3),
    );
    setVar("--sft-heat-pct", Math.round((1 - d.heatThrottle) * 100) + "%");

    // Floor space lights the hall up as you expand: more capacity -> brighter,
    // fuller deck. CSS reads --sft-floor (0..1) on the scene.
    setVar("--sft-floor", Math.min(1, Math.log10(1 + d.spaceCap) / 3.5).toFixed(3));

    setText(
      rackNote,
      `${fmt(producerCount)} server${producerCount === 1 ? "" : "s"} online`,
    );

    // Overclock button / cooldown
    const ocReady = now >= s.overclockReadyAt;
    setFlag(overclockBtn, "is-active", d.overclockActive);
    setDisabled(overclockBtn, !ocReady && !d.overclockActive);
    const ocLabel = d.overclockActive
      ? `Overclocking ${duration((s.overclockUntil - now) / 1000)}`
      : ocReady
        ? `Overclock x${TUNING.overclockMult}`
        : `Cooldown ${duration((s.overclockReadyAt - now) / 1000)}`;
    setText(overclockBtn, ocLabel);

    // Incident banner
    if (eventBanner) {
      const ev = d.event;
      setFlag(eventBanner, "is-shown", ev != null);
      if (ev) {
        if (eventBanner.dataset.kind !== ev.kind) eventBanner.dataset.kind = ev.kind;
        setText(eventName, ev.name);
        setText(eventDesc, ev.desc);
        setText(eventTimer, duration((ev.endsAt - now) / 1000));
        if (respondBtn) {
          const showRespond = ev.kind === "bad";
          setFlag(respondBtn, "is-hidden", !showRespond);
          if (showRespond) {
            setText(respondBtn, `Respond · ${money(ev.respondCost)}`);
            setDisabled(respondBtn, !ev.canRespond);
          }
        }
      }
    }

    // Hotspot banner
    if (hotspotBanner) {
      const hs = d.hotspot;
      setFlag(hotspotBanner, "is-shown", hs != null);
      if (hs) {
        setText(
          hotspotDesc,
          `Rack hotspot — cooling cut ${pct(hs.severity)}. Rebalance to clear.`,
        );
        setText(hotspotTimer, duration((hs.endsAt - now) / 1000));
        if (rebalanceBtn) {
          setText(rebalanceBtn, `Rebalance · ${money(hs.clearCost)}`);
          setDisabled(rebalanceBtn, s.money < hs.clearCost);
        }
      }
    }

    // Scripted opportunity banner
    if (scriptBanner) {
      const sc = d.script;
      setFlag(scriptBanner, "is-shown", sc != null);
      if (sc) {
        setText(scriptName, sc.name);
        setText(scriptGoal, sc.goal);
        setText(scriptTimer, duration((sc.endsAt - now) / 1000));
        if (scriptBar) scriptBar.style.width = pct(sc.progress);
        if (scriptHold) {
          setText(
            scriptHold,
            sc.holding
              ? `Holding · ${Math.floor(sc.heldSec)} / ${sc.holdSec}s`
              : "Out of spec — output throttled",
          );
          setFlag(scriptHold, "is-holding", sc.holding);
        }
        setText(
          scriptReward,
          `Pays ${money(sc.reward)} + ${fmt(sc.rewardRep)} rep`,
        );
      }
    }

    // Milestones
    if (achChips.length) {
      let unlocked = 0;
      for (const c of achChips) {
        const has = s.achievements.includes(c.def.id);
        if (has) unlocked++;
        setFlag(c.root, "is-locked", !has);
        setFlag(c.root, "is-unlocked", has);
      }
      setText(achNote ?? undefined, `${unlocked} / ${achChips.length}`);
    }

    // Contracts: reconcile the active + offer lists by id, then patch values.
    if (contractBody) {
      const active = d.contracts.active;
      const offers = d.contracts.offers;

      // Active jobs.
      const seenActive = new Set<string>();
      for (const ac of active) {
        seenActive.add(ac.id);
        let r = activeRows.get(ac.id);
        if (!r) {
          r = makeActiveRow();
          activeRows.set(ac.id, r);
          cActiveList.appendChild(r.root);
        }
        setText(r.title, `${ac.tag} · deliver ${fmt(ac.required)} FLOP`);
        r.fill.style.width = pct(ac.progress);
        setText(
          r.progress,
          `${fmt(ac.delivered)} / ${fmt(ac.required)} FLOP · ${pct(ac.progress)}`,
        );
        setText(r.reserve, `Reserves ${pct(ac.reserve)} of compute from spot`);
        setText(r.reward, `Pays ${money(ac.reward)} + ${fmt(ac.repReward)} rep`);
        setText(r.timer, `${duration(ac.remainingSec)} remaining`);
      }
      for (const [id, r] of activeRows) {
        if (!seenActive.has(id)) {
          r.root.remove();
          activeRows.delete(id);
        }
      }

      // Offers on the board (accept disabled once the active list is full).
      const seenOffer = new Set<string>();
      for (const of of offers) {
        seenOffer.add(of.id);
        let r = offerRows.get(of.id);
        if (!r) {
          r = makeOfferRow(of.id);
          offerRows.set(of.id, r);
          cOfferList.appendChild(r.root);
        }
        setText(
          r.title,
          `${of.tag} · ${fmt(of.required)} FLOP in ${duration(of.durationSec)}`,
        );
        setText(r.reserve, `Reserves ${pct(of.reserve)} of compute while active`);
        setText(r.reward, `Pays ${money(of.reward)} + ${fmt(of.repReward)} rep`);
        setText(r.risk, `Failure costs ${fmt(of.repPenalty)} reputation`);
        setText(r.expiry, `Withdrawn in ${duration(of.expiresSec)}`);
        setDisabled(r.accept, !d.contracts.canAccept);
      }
      for (const [id, r] of offerRows) {
        if (!seenOffer.has(id)) {
          r.root.remove();
          offerRows.delete(id);
        }
      }

      const empty = active.length === 0 && offers.length === 0;
      setFlag(cIdle, "is-hidden", !empty);
      if (empty) {
        setText(
          cIdle,
          s.lifetimeEarnings < TUNING.contractMinEarnings
            ? `The board opens at ${money(TUNING.contractMinEarnings)} earned.`
            : "No contracts on the board. Check back shortly.",
        );
      }
      setText(
        contractNote ?? undefined,
        active.length
          ? `${active.length} active · ${pct(d.reservedFrac)} reserved${
              d.contracts.streak >= 2 ? ` · ${d.contracts.streak}× streak` : ""
            }`
          : "Demand market",
      );
    }

    // Reputation standing (tier badge + progress + perks)
    const tierInfo = d.repTier;
    setText(standingTier ?? undefined, tierInfo.name);
    if (tierInfo.nextAt != null) {
      setText(
        standingNext ?? undefined,
        `${fmt(s.reputation)} / ${fmt(tierInfo.nextAt)} → ${tierInfo.nextName}`,
      );
    } else {
      setText(standingNext ?? undefined, "Top tier");
    }
    if (standingBar) standingBar.style.width = pct(tierInfo.progress);
    const tierDef = REPUTATION_TIERS[tierInfo.index];
    setText(
      standingPerks ?? undefined,
      tierInfo.index === 0
        ? "Baseline standing — climb for bigger contracts and fewer incidents."
        : `+${pct(tierDef.priceBonus - 1)} price · ${tierDef.contractScale.toFixed(1)}× contract size · fewer incidents`,
    );

    // Objectives (campaign goals)
    if (goalRows.length) {
      let done = 0;
      for (const g of goalRows) {
        const has = s.goals.includes(g.def.id);
        if (has) done++;
        setFlag(g.root, "is-locked", !has);
        setFlag(g.root, "is-done", has);
        setText(g.mark, has ? "●" : "○");
      }
      setText(goalsNote ?? undefined, `${done} / ${goalRows.length}`);
    }

    // Endless toggle (revealed once the final goal is complete)
    if (endlessBtn) {
      endlessBtn.hidden = !d.endlessUnlocked;
      if (d.endlessUnlocked) {
        setText(
          endlessBtn,
          d.endless
            ? `Endless ×${d.endlessMult.toFixed(1)} — stand down`
            : `Engage Endless ×${(TUNING.endlessMult + d.ascension * TUNING.ascensionStep).toFixed(1)}`,
        );
        setFlag(endlessBtn, "is-active", d.endless);
      }
    }

    // Ascension (idea #4): post-campaign tiers that escalate the Endless
    // multiplier. Hidden until the campaign is complete.
    if (ascEl) {
      setFlag(ascEl, "is-hidden", !d.endlessUnlocked);
      if (d.endlessUnlocked) {
        const liveMult = (TUNING.endlessMult + d.ascension * TUNING.ascensionStep).toFixed(1);
        const tierName =
          d.ascension > 0 ? ASCENSION[Math.min(d.ascension, ASCENSION.length) - 1].name : "Unascended";
        setText(ascTier ?? undefined, `${tierName} · Endless ×${liveMult}`);
        const nextTier = ASCENSION[d.ascension];
        if (nextTier) {
          setText(
            ascNext ?? undefined,
            `${rate(d.compute, " FLOP")} / ${rate(nextTier.compute, " FLOP")} → ${nextTier.name} (×${(
              TUNING.endlessMult +
              (d.ascension + 1) * TUNING.ascensionStep
            ).toFixed(1)})`,
          );
          if (ascBar) ascBar.style.width = pct(Math.min(1, d.compute / nextTier.compute));
        } else {
          setText(ascNext ?? undefined, "Maximum ascension reached.");
          if (ascBar) ascBar.style.width = "100%";
        }
      }
    }

    // Maintenance (hardware wear)
    if (wearBar) {
      const w = d.wear;
      wearBar.style.width = pct(w);
      setFlag(wearBar, "is-hot", w >= 0.5);
      const worn = w > 0.02;
      setText(
        wearLabel ?? undefined,
        worn ? `${pct(w)} worn — output ${pct(1 - d.wearPenalty)}` : "Nominal",
      );
      setText(wearNote ?? undefined, worn ? `${pct(w)} worn` : "Nominal");
      if (serviceBtn) {
        setText(serviceBtn, `Service · ${money(d.serviceCost)}`);
        setDisabled(serviceBtn, w <= 0 || s.money < d.serviceCost);
      }
    }

    // Pinned objective (idea #3): the first incomplete goal, with live progress.
    if (objectiveEl) {
      const next = GOALS.find((g) => !s.goals.includes(g.id));
      if (!next) {
        setFlag(objectiveEl, "is-complete", true);
        setText(objectiveName ?? undefined, "Campaign complete");
        setText(
          objectiveProgress ?? undefined,
          d.endlessUnlocked && !s.endless ? "Engage Endless for more" : "All objectives cleared",
        );
        if (objectiveBar) objectiveBar.style.width = "100%";
      } else {
        setFlag(objectiveEl, "is-complete", false);
        setText(objectiveName ?? undefined, next.name);
        const m = next.metric?.(s, d);
        if (m) {
          setText(
            objectiveProgress ?? undefined,
            `${fmt(m.value)} / ${fmt(m.target)} ${m.unit}`,
          );
          if (objectiveBar)
            objectiveBar.style.width = pct(m.target > 0 ? Math.min(1, m.value / m.target) : 0);
        } else {
          setText(objectiveProgress ?? undefined, next.desc);
          if (objectiveBar) objectiveBar.style.width = "0%";
        }
      }
    }

    // Progressive rail gating (idea #3): lock sections until the farm earns
    // them; initTabs (page script) reads data-locked to refuse selection.
    for (const item of navItems) {
      const gate = SECTION_GATES[item.id];
      if (!gate) continue;
      const { unlocked, hint } = gate(s, d);
      const wasUnlocked = navUnlocked[item.id] ?? true;
      setFlag(item.root, "is-locked", !unlocked);
      if (!unlocked) {
        item.root.dataset.locked = "1";
        item.root.setAttribute("aria-disabled", "true");
        if (item.root.title !== hint) item.root.title = hint;
      } else {
        if (item.root.dataset.locked) delete item.root.dataset.locked;
        if (item.root.getAttribute("aria-disabled")) item.root.removeAttribute("aria-disabled");
        if (item.root.title) item.root.title = "";
      }
      if (!navFirstRender && unlocked && !wasUnlocked) {
        const label =
          item.root.querySelector(".sft-navitem__label")?.textContent ?? item.id;
        pushLog(`▣ ${label} unlocked`, "gold");
        toast(`${label} unlocked.`);
      }
      navUnlocked[item.id] = unlocked;
    }
    navFirstRender = false;

    // Corporate layer (idea #4): a second prestige tree, hidden until unlocked.
    if (corpPanel) {
      const unlockedCorp = corporateUnlocked(s);
      setFlag(corpPanel, "is-hidden", !unlockedCorp);
      if (unlockedCorp) {
        setText(corpNote ?? undefined, `${fmt(s.influence)} ◈ influence`);
        for (const r of corporateRows) {
          const lvl = s.corporateUpgrades[r.id] ?? 0;
          setText(r.level, "Lv " + lvl);
          const cost = corporateCost(s, r.id);
          const maxed = !isFinite(cost);
          setText(r.cost, maxed ? "MAX" : fmt(cost) + " ◈");
          const afford = !maxed && s.influence >= cost;
          setDisabled(r.button, !afford);
          setFlag(r.root, "is-afford", afford);
        }
      }
    }
  }

  syncSound();

  return {
    render,
    toast,
    pushLog,
    recordHistory,
    showOfflineSummary,
    setBuyMult,
  };
}
