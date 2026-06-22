/* DOM binding + targeted rendering. The .astro page provides the structural
   shell and labelled slots; this module fills the data-driven lists once and
   then updates only the values that change each frame. No framework. */

import type { Derived, GameState } from "./types";
import {
  ACHIEVEMENTS,
  BUILDINGS,
  BUILDING_BY_ID,
  CATEGORY_LABELS,
  PRESTIGE,
  PRESTIGE_BRANCH_LABELS,
  TUNING,
  UPGRADES,
  WORKLOADS,
} from "./config";
import {
  buildingCost,
  creditScale,
  prestigeCost,
  prestigeUnlocked,
  startingMoney,
} from "./engine";
import { duration, fmt, money, pct, rate } from "./format";

export interface Handlers {
  onBuyBuilding(id: string): void;
  onBuyUpgrade(id: string): void;
  onBuyPrestige(id: string): void;
  onPrestige(): void;
  onOverclock(): void;
  onRespondEvent(): void;
  onRebalance(): void;
  onSetAllocation(id: string, delta: number): void;
  onAcceptContract(id: string): void;
  onDeclineContract(id: string): void;
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

  // --- Static slot references (rendered by the page) --------------------
  const stats: Record<string, HTMLElement> = {};
  root.querySelectorAll<HTMLElement>("[data-stat]").forEach((node) => {
    stats[node.dataset.stat!] = node;
  });

  const rackNote = $("[data-rack-note]");

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

  // --- Building rows, grouped by category ------------------------------
  const buildingRows: BuildingRow[] = [];
  (["producer", "power", "cooling", "network", "space", "staff"] as const).forEach((cat) => {
    const list = root.querySelector<HTMLElement>(`[data-list="${cat}"]`);
    if (!list) return;
    BUILDINGS.filter((b) => b.category === cat).forEach((def) => {
      const rowEl = el("button", "sft-row");
      rowEl.type = "button";
      (rowEl as HTMLButtonElement).addEventListener("click", () =>
        handlers.onBuyBuilding(def.id),
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
    share: HTMLElement;
    bar: HTMLElement;
    minus: HTMLButtonElement;
    plus: HTMLButtonElement;
    id: string;
  }
  const workloadWrap = root.querySelector<HTMLElement>("[data-workloads]");
  const workloadRows: WorkloadRow[] = [];
  if (workloadWrap) {
    for (const def of WORKLOADS) {
      const rowEl = el("div", "sft-wl");
      const head = el("div", "sft-wl__head");
      const name = el("span", "sft-wl__name", def.name);
      const price = el("span", "sft-wl__price", "");
      head.append(name, price);

      const desc = el("span", "sft-wl__desc", def.desc);

      const barWrap = el("div", "sft-wl__bar");
      const bar = el("span", "sft-wl__fill");
      barWrap.appendChild(bar);

      const ctrls = el("div", "sft-wl__ctrls");
      const minus = el("button", "sft-wl__step", "–") as HTMLButtonElement;
      minus.type = "button";
      const share = el("span", "sft-wl__share", "0%");
      const plus = el("button", "sft-wl__step", "+") as HTMLButtonElement;
      plus.type = "button";
      minus.addEventListener("click", () => handlers.onSetAllocation(def.id, -1));
      plus.addEventListener("click", () => handlers.onSetAllocation(def.id, 1));
      ctrls.append(minus, share, plus);

      rowEl.append(head, desc, barWrap, ctrls);
      workloadWrap.appendChild(rowEl);
      workloadRows.push({ root: rowEl, price, share, bar, minus, plus, id: def.id });
    }
  }

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

  const prestigeBtn = $<HTMLButtonElement>("[data-prestige-go]");
  const prestigePreview = $("[data-prestige-preview]");
  prestigeBtn.addEventListener("click", () => handlers.onPrestige());
  overclockBtn.addEventListener("click", () => handlers.onOverclock());

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
    reward: HTMLElement;
    timer: HTMLElement;
  }
  interface OfferRow {
    root: HTMLElement;
    title: HTMLElement;
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
    const reward = el("p", "sft-contract__reward");
    const timer = el("p", "sft-contract__expiry");
    rootEl.append(title, barWrap, progress, reward, timer);
    return { root: rootEl, title, fill, progress, reward, timer };
  }

  function makeOfferRow(id: string): OfferRow {
    const rootEl = el("div", "sft-contract__offer");
    const title = el("p", "sft-contract__line");
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
    rootEl.append(title, reward, risk, expiry, actions);
    return { root: rootEl, title, reward, risk, expiry, accept };
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
  const toastWrap = $("[data-toasts]");
  function toast(message: string, ms = 5000) {
    const t = el("div", "sft-toast", message);
    toastWrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add("is-in"));
    setTimeout(() => {
      t.classList.remove("is-in");
      setTimeout(() => t.remove(), 400);
    }, ms);
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
    setText(stats.reputation, fmt(s.reputation));
    setText(stats.credits, fmt(s.credits));
    setText(
      stats.power,
      `${fmt(d.powerDraw)} / ${fmt(d.powerCap)} kW`,
    );
    setFlag(stats.power?.parentElement ?? root, "is-warn", d.powerThrottle < 1);
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
      const cost = buildingCost(s, r.def);
      setText(r.owned, "x" + count);
      // Floor space gates physical equipment before money does: once the rack
      // units are gone, the only fix is a facility expansion.
      const noSpace =
        r.def.space != null && d.spaceUsed + r.def.space > d.spaceCap;
      setFlag(r.root, "is-nospace", noSpace);
      if (noSpace) {
        setText(r.cost, "Floor full");
        setDisabled(r.button, true);
        setFlag(r.root, "is-afford", false);
        continue;
      }
      setText(r.cost, money(cost));
      const afford = s.money >= cost;
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
        r.bar.style.width = pct(w.alloc);
        setText(r.share, pct(w.alloc));
        const weight = Math.max(0, Math.floor(s.allocation[r.id] ?? 0));
        setDisabled(r.minus, weight <= 0);
        setDisabled(r.plus, weight >= TUNING.allocationMax);
        setFlag(r.root, "is-active", w.alloc > 0);
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
    const gridRatio = d.gridPrice / TUNING.basePowerRate;
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
          ? `${active.length} active${d.contracts.streak >= 2 ? ` · ${d.contracts.streak}× streak` : ""}`
          : "Demand market",
      );
    }
  }

  return { render, toast, pushLog };
}
