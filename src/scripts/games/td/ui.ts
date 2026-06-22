/* DOM binding only: builds the build tray + selected-node panel once, then
   patches the HUD / control / panel values each render frame. The board itself
   is canvas (render.ts); nothing here touches game logic — index.ts wires the
   callbacks through the engine. */

import { TOWERS, TOWER_BY_ID } from "./config";
import { sellValue, towerStatsOf, upgradeCost } from "./engine";
import { dec, int, money, secs } from "./format";
import type { GameState, Meta, Tower, TowerId } from "./types";

export interface UIHandlers {
  onBuild(id: TowerId): void;
  onStart(): void;
  onPause(): void;
  onSpeed(): void;
  onUpgrade(): void;
  onSell(): void;
  onReplay(): void;
}

export interface EndInfo {
  wave: number;
  score: number;
  bestScore: number;
  bestWave: number;
  newBest: boolean;
}

const $ = <T extends HTMLElement>(root: ParentNode, sel: string) =>
  root.querySelector<T>(sel)!;

export function createUI(root: HTMLElement, h: UIHandlers) {
  const canvas = $<HTMLCanvasElement>(root, "[data-canvas]");
  const stat = (k: string) => $<HTMLElement>(root, `[data-stat="${k}"]`);
  const cash = stat("cash");
  const lives = stat("lives");
  const waveEl = stat("wave");
  const score = stat("score");
  const best = stat("best");
  const live = $<HTMLElement>(root, "[data-live]");

  const startBtn = $<HTMLButtonElement>(root, "[data-start]");
  const pauseBtn = $<HTMLButtonElement>(root, "[data-pause]");
  const speedBtn = $<HTMLButtonElement>(root, "[data-speed]");
  const toasts = $<HTMLElement>(root, "[data-toasts]");

  startBtn.addEventListener("click", () => h.onStart());
  pauseBtn.addEventListener("click", () => h.onPause());
  speedBtn.addEventListener("click", () => h.onSpeed());

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
      <p class="td-panel__hint">Pick a node from the tray below, then tap an open cell to place it. Tap a placed node to inspect, upgrade, or sell it.</p>
    </div>
    <div class="td-panel__detail" data-panel-detail hidden>
      <div class="td-panel__top">
        <h3 class="td-panel__name" data-panel-name></h3>
        <span class="td-panel__role" data-panel-role></span>
      </div>
      <dl class="td-stats">
        <div class="td-stat"><dt>Damage</dt><dd data-panel-dmg></dd></div>
        <div class="td-stat"><dt>Range</dt><dd data-panel-range></dd></div>
        <div class="td-stat"><dt>Rate</dt><dd data-panel-rate></dd></div>
        <div class="td-stat"><dt>Special</dt><dd data-panel-special></dd></div>
      </dl>
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
  const pSpecial = $<HTMLElement>(panel, "[data-panel-special]");
  const upBtn = $<HTMLButtonElement>(panel, "[data-upgrade]");
  const sellBtn = $<HTMLButtonElement>(panel, "[data-sell]");
  upBtn.addEventListener("click", () => h.onUpgrade());
  sellBtn.addEventListener("click", () => h.onSell());

  // --- End screen (built once) ------------------------------------------
  const end = $<HTMLElement>(root, "[data-end]");
  end.innerHTML = `
    <div class="td-end__card" role="dialog" aria-modal="true" aria-label="Run over">
      <p class="td-end__eyebrow">Core breached</p>
      <h2 class="td-end__title">Run over</h2>
      <div class="td-end__scores">
        <div class="td-end__metric"><span class="td-end__num" data-end-wave></span><span class="td-end__lbl">Wave reached</span></div>
        <div class="td-end__metric"><span class="td-end__num" data-end-score></span><span class="td-end__lbl">Score</span></div>
      </div>
      <p class="td-end__best" data-end-best></p>
      <button type="button" class="td-btn td-btn--primary" data-replay>Play again</button>
    </div>`;
  $<HTMLButtonElement>(end, "[data-replay]").addEventListener("click", () => h.onReplay());
  const endWave = $<HTMLElement>(end, "[data-end-wave]");
  const endScore = $<HTMLElement>(end, "[data-end-score]");
  const endBest = $<HTMLElement>(end, "[data-end-best]");

  function specialText(t: Tower): string {
    const sp = towerStatsOf(t).special;
    if (sp.kind === "chain") return `Arcs to ${sp.chains} more`;
    if (sp.kind === "slow") return `Slows to ${Math.round(sp.slowFactor * 100)}%`;
    if (sp.kind === "pierce") return `Pierces ${Math.round(sp.pierce * 100)}% armour`;
    return "Single target";
  }

  function render(s: GameState, meta: Meta) {
    cash.textContent = money(s.cash);
    lives.textContent = int(s.lives);
    lives.classList.toggle("is-low", s.lives <= 5);
    waveEl.textContent = s.wave === 0 ? "—" : int(s.wave);
    score.textContent = int(s.score);
    best.textContent = `${int(meta.bestScore)} · W${int(meta.bestWave)}`;

    // Start / next-wave button.
    if (s.status === "wave") {
      startBtn.textContent = `Wave ${s.wave} running`;
      startBtn.disabled = true;
    } else if (s.status === "over") {
      startBtn.disabled = true;
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
      pRange.textContent = `${dec(st.range)} cells`;
      pRate.textContent = st.rate > 0 ? `${dec(st.rate)}/s` : "field";
      pSpecial.textContent = specialText(t);

      if (t.tier >= 2) {
        upBtn.disabled = true;
        upBtn.textContent = "Fully upgraded";
      } else {
        const cost = upgradeCost(t);
        upBtn.disabled = s.cash < cost;
        upBtn.textContent = `Upgrade · ${money(cost)} — ${def.upgrades[t.tier].note}`;
      }
      sellBtn.textContent = `Sell · ${money(sellValue(t))}`;
    }
  }

  function setStatus(msg: string) {
    live.textContent = msg;
  }

  function showEnd(info: EndInfo) {
    endWave.textContent = int(info.wave);
    endScore.textContent = int(info.score);
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

  return { canvas, render, setStatus, showEnd, hideEnd, toast };
}
