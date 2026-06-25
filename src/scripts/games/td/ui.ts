/* DOM binding only: builds the setup overlay, build tray, selected-node panel,
   next-wave intel, ability buttons, and end card once, then patches just the
   values that change each render frame. The board itself is canvas (render.ts);
   nothing here touches game logic — index.ts wires the callbacks through the
   engine. */

import {
  DIFFICULTIES,
  ENEMIES,
  MAPS,
  TOWERS,
  TOWER_BY_ID,
  TUNING,
  waveDef,
} from "./config";
import {
  canTarget,
  effDps,
  rawDps,
  sellValue,
  towerStatsOf,
  upgradeCost,
} from "./engine";
import { dec, int, money, pct, secs } from "./format";
import { TARGET_LABEL } from "./types";
import type {
  Difficulty,
  EnemyKind,
  GameState,
  Meta,
  Tower,
  TowerId,
} from "./types";

export interface UIHandlers {
  onBuild(id: TowerId): void;
  onStart(): void;
  onPause(): void;
  onSpeed(): void;
  onUpgrade(): void;
  onSell(): void;
  onTarget(): void;
  onOverclock(): void;
  onSurge(): void;
  onMute(): void;
  onReplay(): void;
  onPickDifficulty(id: Difficulty): void;
  onPickMap(id: string): void;
  onDeploy(): void;
}

export interface EndInfo {
  wave: number;
  score: number;
  bestScore: number;
  bestWave: number;
  newBest: boolean;
  difficultyName: string;
  mapName: string;
  kills: number;
  leaked: number;
  intercept: number; // 0..1
  cashEarned: number;
  built: number;
  topNode: string; // "—" if nothing dealt damage
}

const $ = <T extends HTMLElement>(root: ParentNode, sel: string) =>
  root.querySelector<T>(sel)!;

// Heaviest / rarest first so the eye lands on the threat, not the chaff.
const INTEL_ORDER: EnemyKind[] = [
  "daemon",
  "hauler",
  "healer",
  "shielded",
  "plated",
  "splitter",
  "rusher",
  "packet",
  "mote",
];

export function createUI(root: HTMLElement, h: UIHandlers) {
  const canvas = $<HTMLCanvasElement>(root, "[data-canvas]");
  const stat = (k: string) => $<HTMLElement>(root, `[data-stat="${k}"]`);
  const cash = stat("cash");
  const lives = stat("lives");
  const waveEl = stat("wave");
  const score = stat("score");
  const best = stat("best");
  const live = $<HTMLElement>(root, "[data-live]");
  const streakBadge = $<HTMLElement>(root, "[data-streak]");

  const startBtn = $<HTMLButtonElement>(root, "[data-start]");
  const pauseBtn = $<HTMLButtonElement>(root, "[data-pause]");
  const speedBtn = $<HTMLButtonElement>(root, "[data-speed]");
  const ocBtn = $<HTMLButtonElement>(root, "[data-overclock]");
  const surgeBtn = $<HTMLButtonElement>(root, "[data-surge]");
  const muteBtn = $<HTMLButtonElement>(root, "[data-mute]");
  const helpBtn = $<HTMLButtonElement>(root, "[data-help-btn]");
  const helpPop = $<HTMLElement>(root, "[data-help]");
  const intel = $<HTMLElement>(root, "[data-intel]");
  const toasts = $<HTMLElement>(root, "[data-toasts]");

  startBtn.addEventListener("click", () => h.onStart());
  pauseBtn.addEventListener("click", () => h.onPause());
  speedBtn.addEventListener("click", () => h.onSpeed());
  ocBtn.addEventListener("click", () => h.onOverclock());
  surgeBtn.addEventListener("click", () => h.onSurge());
  muteBtn.addEventListener("click", () => h.onMute());
  helpBtn.addEventListener("click", () => helpPop.classList.toggle("is-open"));

  // --- Setup overlay (difficulty + map, built once) ---------------------
  const setup = $<HTMLElement>(root, "[data-setup]");
  setup.innerHTML = `
    <div class="td-setup__card" role="dialog" aria-modal="true" aria-label="Configure the defense">
      <p class="td-setup__eyebrow">Signal Defense</p>
      <h2 class="td-setup__title">Configure the defense</h2>
      <div class="td-setup__cols">
        <div class="td-setup__group">
          <h3 class="td-setup__label">Difficulty</h3>
          <div class="td-setup__opts" data-diff-opts role="radiogroup" aria-label="Difficulty"></div>
        </div>
        <div class="td-setup__group">
          <h3 class="td-setup__label">Map</h3>
          <div class="td-setup__opts" data-map-opts role="radiogroup" aria-label="Map"></div>
        </div>
      </div>
      <p class="td-setup__best" data-setup-best></p>
      <button type="button" class="td-btn td-btn--primary td-setup__go" data-deploy>Deploy nodes ▸</button>
    </div>`;
  const diffOpts = $<HTMLElement>(setup, "[data-diff-opts]");
  const mapOpts = $<HTMLElement>(setup, "[data-map-opts]");
  const setupBest = $<HTMLElement>(setup, "[data-setup-best]");
  const diffBtns = new Map<Difficulty, HTMLButtonElement>();
  const mapBtns = new Map<string, HTMLButtonElement>();
  DIFFICULTIES.forEach((d) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "td-opt";
    b.dataset.diff = d.id;
    b.setAttribute("role", "radio");
    b.title = d.desc;
    b.innerHTML = `
      <span class="td-opt__name">${d.name}</span>
      <span class="td-opt__meta">${d.startLives} lives · ${money(d.startCash)} start</span>`;
    b.addEventListener("click", () => h.onPickDifficulty(d.id));
    diffOpts.appendChild(b);
    diffBtns.set(d.id, b);
  });
  MAPS.forEach((m) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "td-opt";
    b.dataset.map = m.id;
    b.setAttribute("role", "radio");
    b.innerHTML = `
      <span class="td-opt__name">${m.name}</span>
      <span class="td-opt__desc">${m.desc}</span>`;
    b.addEventListener("click", () => h.onPickMap(m.id));
    mapOpts.appendChild(b);
    mapBtns.set(m.id, b);
  });
  $<HTMLButtonElement>(setup, "[data-deploy]").addEventListener("click", () => h.onDeploy());

  // --- Build tray (built once) ------------------------------------------
  const tray = $<HTMLElement>(root, "[data-tray]");
  const trayBtns = new Map<TowerId, HTMLButtonElement>();
  TOWERS.forEach((def, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "td-tower";
    b.dataset.build = def.id;
    b.setAttribute("aria-pressed", "false");
    b.innerHTML = `
      <span class="td-tower__head">
        <span class="td-tower__name">${def.name}</span>
        <kbd class="td-tower__key">${i + 1}</kbd>
      </span>
      <span class="td-tower__role">${def.role}</span>
      <span class="td-tower__desc">${def.desc}</span>
      <span class="td-tower__cost" data-cost>${money(def.cost)}</span>`;
    b.addEventListener("click", () => h.onBuild(def.id));
    tray.appendChild(b);
    trayBtns.set(def.id, b);
  });

  // --- Selected-node panel (built once, patched per frame) --------------
  const panel = $<HTMLElement>(root, "[data-panel]");
  panel.innerHTML = `
    <div class="td-panel__empty" data-panel-empty>
      <p class="td-panel__hint">Pick a node from the tray, then tap an open cell to place it. Tap a placed node to inspect, retarget, upgrade, or sell it.</p>
    </div>
    <div class="td-panel__detail" data-panel-detail hidden>
      <div class="td-panel__top">
        <h3 class="td-panel__name" data-panel-name></h3>
        <span class="td-panel__role" data-panel-role></span>
      </div>
      <button type="button" class="td-target" data-target hidden>
        <span class="td-target__lbl">Targeting</span>
        <span class="td-target__val" data-panel-target></span>
      </button>
      <dl class="td-stats">
        <div class="td-stat"><dt>Damage</dt><dd data-panel-dmg></dd></div>
        <div class="td-stat"><dt>Range</dt><dd data-panel-range></dd></div>
        <div class="td-stat"><dt>Rate</dt><dd data-panel-rate></dd></div>
        <div class="td-stat"><dt>Output</dt><dd data-panel-dps></dd></div>
      </dl>
      <p class="td-panel__special" data-panel-special></p>
      <div class="td-panel__actions">
        <button type="button" class="td-btn td-btn--up" data-upgrade></button>
        <button type="button" class="td-btn td-btn--sell" data-sell></button>
      </div>
    </div>`;
  const pEmpty = $<HTMLElement>(panel, "[data-panel-empty]");
  const pDetail = $<HTMLElement>(panel, "[data-panel-detail]");
  const pName = $<HTMLElement>(panel, "[data-panel-name]");
  const pRole = $<HTMLElement>(panel, "[data-panel-role]");
  const pDmg = $<HTMLElement>(panel, "[data-panel-dmg]");
  const pRange = $<HTMLElement>(panel, "[data-panel-range]");
  const pRate = $<HTMLElement>(panel, "[data-panel-rate]");
  const pDps = $<HTMLElement>(panel, "[data-panel-dps]");
  const pSpecial = $<HTMLElement>(panel, "[data-panel-special]");
  const targetBtn = $<HTMLButtonElement>(panel, "[data-target]");
  const pTarget = $<HTMLElement>(panel, "[data-panel-target]");
  const upBtn = $<HTMLButtonElement>(panel, "[data-upgrade]");
  const sellBtn = $<HTMLButtonElement>(panel, "[data-sell]");
  upBtn.addEventListener("click", () => {
    disarmSell();
    h.onUpgrade();
  });
  targetBtn.addEventListener("click", () => h.onTarget());

  // Sell needs a confirm: first click arms, second within the window commits.
  let sellArmed = false;
  let sellTimer = 0;
  function disarmSell() {
    sellArmed = false;
    if (sellTimer) {
      clearTimeout(sellTimer);
      sellTimer = 0;
    }
    sellBtn.classList.remove("is-armed");
  }
  sellBtn.addEventListener("click", () => {
    if (sellArmed) {
      disarmSell();
      h.onSell();
    } else {
      sellArmed = true;
      sellBtn.classList.add("is-armed");
      sellTimer = window.setTimeout(disarmSell, 2600);
    }
  });

  // --- End screen (built once) ------------------------------------------
  const end = $<HTMLElement>(root, "[data-end]");
  end.innerHTML = `
    <div class="td-end__card" role="dialog" aria-modal="true" aria-label="Run over">
      <p class="td-end__eyebrow">Core breached</p>
      <h2 class="td-end__title">Run over</h2>
      <p class="td-end__ctx" data-end-ctx></p>
      <div class="td-end__scores">
        <div class="td-end__metric"><span class="td-end__num" data-end-wave></span><span class="td-end__lbl">Wave reached</span></div>
        <div class="td-end__metric"><span class="td-end__num" data-end-score></span><span class="td-end__lbl">Score</span></div>
      </div>
      <dl class="td-recap" data-end-recap></dl>
      <p class="td-end__best" data-end-best></p>
      <button type="button" class="td-btn td-btn--primary" data-replay>Play again</button>
    </div>`;
  $<HTMLButtonElement>(end, "[data-replay]").addEventListener("click", () => h.onReplay());
  const endCtx = $<HTMLElement>(end, "[data-end-ctx]");
  const endWave = $<HTMLElement>(end, "[data-end-wave]");
  const endScore = $<HTMLElement>(end, "[data-end-score]");
  const endRecap = $<HTMLElement>(end, "[data-end-recap]");
  const endBest = $<HTMLElement>(end, "[data-end-best]");

  // --- Helpers ----------------------------------------------------------
  function specialText(t: Tower): string {
    const sp = towerStatsOf(t).special;
    if (sp.kind === "chain") return `Lightning arcs to ${sp.chains} more intrusions.`;
    if (sp.kind === "slow") return `Field slows to ${pct(sp.slowFactor)} speed and bleeds HP.`;
    if (sp.kind === "pierce") return `Railgun line-pierces, ignoring ${pct(sp.pierce)} of armour.`;
    if (sp.kind === "generator") return `Pays ${money(Math.round(sp.dividend))} each wave you clear.`;
    return "Single-target fire.";
  }

  /** Reference armour for the DPS readout: the toughest thing in play, else
      the toughest in the upcoming wave, else unarmoured. */
  function refArmour(s: GameState): number {
    let a = 0;
    for (const e of s.enemies) a = Math.max(a, e.armor);
    if (a > 0) return a;
    const next = s.status === "wave" ? s.wave : s.wave + 1;
    for (const g of waveDef(Math.max(1, next)).groups) a = Math.max(a, ENEMIES[g.kind].armor);
    return a;
  }

  // Rebuild the intel chips only when the previewed wave number changes.
  let lastIntelWave = -1;
  function renderIntel(s: GameState) {
    if (s.status === "wave") {
      if (lastIntelWave !== 0) {
        lastIntelWave = 0;
        intel.innerHTML = `<span class="td-intel__lead">Wave ${s.wave} in progress</span>`;
      }
      return;
    }
    const n = s.wave + 1;
    if (n === lastIntelWave) return;
    lastIntelWave = n;
    const def = waveDef(n);
    const counts = new Map<EnemyKind, number>();
    for (const g of def.groups) counts.set(g.kind, (counts.get(g.kind) ?? 0) + g.count);
    let chips = "";
    for (const kind of INTEL_ORDER) {
      const c = counts.get(kind);
      if (!c) continue;
      const ed = ENEMIES[kind];
      chips += `<span class="td-chip" title="${ed.name}"><span class="td-glyph td-glyph--${ed.shape}${ed.boss ? " is-boss" : ""}"></span><span class="td-chip__n">${c}</span></span>`;
    }
    intel.innerHTML =
      `<span class="td-intel__lead">Next wave${def.theme ? ` · ${def.theme}` : ""}</span>` +
      `<span class="td-intel__chips">${chips}</span>`;
  }

  function renderAbility(
    btn: HTMLButtonElement,
    cd: number,
    maxCd: number,
    active: number,
    activeMax: number,
  ) {
    const fill = $<HTMLElement>(btn, "[data-fill]");
    const tag = $<HTMLElement>(btn, "[data-tag]");
    if (active > 0) {
      btn.classList.add("is-active");
      btn.classList.remove("is-cooling");
      fill.style.transform = `scaleX(${Math.max(0, active / activeMax)})`;
      tag.textContent = `${secs(active)} live`;
      btn.disabled = false;
    } else if (cd > 0) {
      btn.classList.remove("is-active");
      btn.classList.add("is-cooling");
      fill.style.transform = `scaleX(${Math.max(0, cd / maxCd)})`;
      tag.textContent = secs(cd);
      btn.disabled = true;
    } else {
      btn.classList.remove("is-active", "is-cooling");
      fill.style.transform = "scaleX(0)";
      tag.textContent = "Ready";
      btn.disabled = false;
    }
  }

  // --- Per-frame render -------------------------------------------------
  function render(s: GameState, meta: Meta) {
    // Setup overlay drives off status.
    setup.classList.toggle("is-open", s.status === "setup");
    setup.hidden = s.status !== "setup";
    if (s.status === "setup") {
      for (const [id, b] of diffBtns) {
        const on = s.difficulty === id;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-checked", String(on));
      }
      for (const [id, b] of mapBtns) {
        const on = s.map.id === id;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-checked", String(on));
      }
      const mb = meta.modeBest[s.difficulty];
      const dn = DIFFICULTIES.find((d) => d.id === s.difficulty)?.name ?? "";
      setupBest.textContent =
        mb && mb.score > 0
          ? `${dn} best — ${int(mb.score)} · wave ${int(mb.wave)}`
          : `No ${dn} record yet. Set one.`;
    }

    cash.textContent = money(s.cash);
    lives.textContent = int(s.lives);
    lives.classList.toggle("is-low", s.lives <= 5);
    waveEl.textContent = s.wave === 0 ? "—" : int(s.wave);
    score.textContent = int(s.score);
    best.textContent = `${int(meta.bestScore)} · W${int(meta.bestWave)}`;

    // Flawless-streak badge.
    if (s.streak > 0) {
      streakBadge.hidden = false;
      streakBadge.textContent = `Flawless ×${s.streak}`;
    } else {
      streakBadge.hidden = true;
    }

    renderIntel(s);

    // Start / next-wave button.
    if (s.status === "wave") {
      startBtn.textContent = `Wave ${s.wave} running`;
      startBtn.disabled = true;
    } else if (s.status === "over" || s.status === "setup") {
      startBtn.disabled = true;
      startBtn.textContent = s.wave === 0 ? "Start wave 1" : "Next wave";
    } else {
      startBtn.disabled = false;
      startBtn.textContent =
        s.wave === 0
          ? "Start wave 1"
          : s.lullTimer > 0
            ? `Next wave ▸ ${secs(s.lullTimer)}`
            : "Next wave";
    }

    pauseBtn.textContent = s.paused ? "Resume" : "Pause";
    pauseBtn.setAttribute("aria-pressed", String(s.paused));
    speedBtn.textContent = `${s.speed}×`;
    speedBtn.setAttribute("aria-pressed", String(s.speed === 2));

    renderAbility(ocBtn, s.overclockCd, TUNING.overclockCd, s.overclock, TUNING.overclockDur);
    renderAbility(surgeBtn, s.surgeCd, TUNING.surgeCd, 0, 1);
    surgeBtn.classList.toggle("is-armed", s.surgeArm);

    muteBtn.setAttribute("aria-pressed", String(!meta.muted));
    muteBtn.classList.toggle("is-muted", meta.muted);
    muteBtn.textContent = meta.muted ? "Sound off" : "Sound on";

    // Tray: affordability + active build highlight.
    for (const [id, btn] of trayBtns) {
      const def = TOWER_BY_ID[id];
      const afford = s.cash >= def.cost;
      btn.classList.toggle("is-unaffordable", !afford);
      btn.classList.toggle("is-active", s.build === id);
      btn.setAttribute("aria-pressed", String(s.build === id));
    }

    // Selected-node panel.
    const t = s.selected != null ? s.towers.find((x) => x.id === s.selected) : null;
    if (!t) {
      if (pDetail.hidden === false) disarmSell();
      pEmpty.hidden = false;
      pDetail.hidden = true;
    } else {
      pEmpty.hidden = true;
      pDetail.hidden = false;
      const def = TOWER_BY_ID[t.defId];
      const st = towerStatsOf(t);
      pName.textContent = def.name;
      pRole.textContent = `${def.role} · Tier ${t.tier}`;
      pDmg.textContent = st.dmg > 0 ? dec(st.dmg, 0) : "—";
      pRange.textContent = st.range > 0 ? `${dec(st.range)} cells` : "—";
      pRate.textContent = st.rate > 0 ? `${dec(st.rate)}/s` : st.special.kind === "slow" ? "field" : "—";

      if (st.special.kind === "generator") {
        pDps.textContent = `${money(Math.round(st.special.dividend))}/wave`;
      } else if (st.special.kind === "slow") {
        pDps.textContent = `${dec(st.special.dps)} dps field`;
      } else {
        const armour = refArmour(s);
        pDps.textContent = `≈${int(effDps(st, armour))} dps`;
        pDps.title = `${int(rawDps(st))} dps unarmoured · vs armour ${armour}`;
      }
      pSpecial.textContent = specialText(t);

      // Targeting control (hidden for damper/generator).
      if (canTarget(t.defId)) {
        targetBtn.hidden = false;
        pTarget.textContent = TARGET_LABEL[t.target];
      } else {
        targetBtn.hidden = true;
      }

      if (t.tier >= 2) {
        upBtn.disabled = true;
        upBtn.textContent = "Fully upgraded";
      } else {
        const cost = upgradeCost(t);
        upBtn.disabled = s.cash < cost;
        upBtn.textContent = `Upgrade · ${money(cost)} — ${def.upgrades[t.tier].note}`;
      }
      sellBtn.textContent = sellArmed
        ? `Confirm sell · ${money(sellValue(t))}`
        : `Sell · ${money(sellValue(t))}`;
    }
  }

  function setStatus(msg: string) {
    live.textContent = msg;
  }

  function showEnd(info: EndInfo) {
    endCtx.textContent = `${info.difficultyName} · ${info.mapName}`;
    endWave.textContent = int(info.wave);
    endScore.textContent = int(info.score);
    endRecap.innerHTML = `
      <div class="td-recap__row"><dt>Intrusions stopped</dt><dd>${int(info.kills)}</dd></div>
      <div class="td-recap__row"><dt>Leaked</dt><dd>${int(info.leaked)}</dd></div>
      <div class="td-recap__row"><dt>Intercept rate</dt><dd>${pct(info.intercept)}</dd></div>
      <div class="td-recap__row"><dt>Cash earned</dt><dd>${money(info.cashEarned)}</dd></div>
      <div class="td-recap__row"><dt>Nodes built</dt><dd>${int(info.built)}</dd></div>
      <div class="td-recap__row"><dt>Top node</dt><dd>${info.topNode}</dd></div>`;
    endBest.textContent = info.newBest
      ? "New personal best."
      : `Best: ${int(info.bestScore)} · wave ${int(info.bestWave)}.`;
    endBest.classList.toggle("is-new", info.newBest);
    end.classList.add("is-open");
    end.hidden = false;
  }

  function hideEnd() {
    end.classList.remove("is-open");
    end.hidden = true;
  }

  function closeHelp() {
    helpPop.classList.remove("is-open");
  }

  function toggleHelp() {
    helpPop.classList.toggle("is-open");
  }

  function toast(msg: string, ms = 3200) {
    const el = document.createElement("div");
    el.className = "td-toast";
    el.textContent = msg;
    toasts.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-in"));
    setTimeout(() => {
      el.classList.remove("is-in");
      setTimeout(() => el.remove(), 300);
    }, ms);
  }

  return { canvas, render, setStatus, showEnd, hideEnd, closeHelp, toggleHelp, toast };
}
