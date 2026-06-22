/* Entry point: wires storage + engine + render + input + ui and runs the loop.
   Imported by the game page via <script>; call startGame(root) on [data-td]. */

import { TOWERS, TUNING } from "./config";
import {
  placeTower,
  sellTower,
  startWave,
  step,
  towerAt,
  upgradeTower,
} from "./engine";
import { money } from "./format";
import { attachInput } from "./input";
import { createRenderer } from "./render";
import { defaultState } from "./state";
import { loadMeta, saveMeta } from "./storage";
import type { GameState, RunStatus } from "./types";
import { createUI } from "./ui";

const FIXED = 1 / 60; // fixed simulation step (seconds)

export function startGame(root: HTMLElement) {
  const meta = loadMeta();
  let state: GameState = defaultState();

  const rmQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = rmQuery.matches;
  rmQuery.addEventListener("change", (e) => (reducedMotion = e.matches));

  const ui = createUI(root, {
    onBuild: (id) => {
      state.build = state.build === id ? null : id;
      if (state.build) state.selected = null;
      syncCursor();
    },
    onStart: () => callWave(),
    onPause: () => {
      state.paused = !state.paused;
      root.classList.toggle("is-paused", state.paused);
    },
    onSpeed: () => {
      state.speed = state.speed === 1 ? 2 : 1;
    },
    onUpgrade: () => {
      if (state.selected != null) upgradeTower(state, state.selected);
    },
    onSell: () => {
      if (state.selected != null) sellTower(state, state.selected);
    },
    onReplay: () => {
      state = defaultState();
      reset();
      ui.hideEnd();
      root.classList.remove("is-paused");
      ui.toast("Fresh board. Build before you call wave 1.");
    },
  });

  const renderer = createRenderer(ui.canvas);

  attachInput(ui.canvas, {
    tapCell: (c, r) => {
      if (state.status === "over") return;
      const existing = towerAt(state, c, r);
      if (state.build) {
        if (existing) {
          state.selected = existing.id;
          state.build = null;
        } else {
          placeTower(state, state.build, c, r); // silently no-ops if invalid/poor
        }
      } else {
        state.selected = existing ? existing.id : null;
      }
      syncCursor();
    },
    hoverCell: (c, r) => {
      state.hover = r === null ? null : { c, r };
    },
    command: (name, index) => {
      if (name === "build" && index != null) {
        const id = TOWERS[index]?.id;
        if (id) {
          state.build = state.build === id ? null : id;
          if (state.build) state.selected = null;
          syncCursor();
        }
      } else if (name === "start") callWave();
      else if (name === "speed") state.speed = state.speed === 1 ? 2 : 1;
      else if (name === "pause") {
        state.paused = !state.paused;
        root.classList.toggle("is-paused", state.paused);
      } else if (name === "deselect") {
        state.build = null;
        state.selected = null;
        syncCursor();
      }
    },
  });

  // Shared by the Start button and the Space shortcut.
  function callWave() {
    const bonus = startWave(state);
    if (bonus > 0) ui.toast(`Wave called early — +${money(bonus)} bounty.`);
  }

  function syncCursor() {
    root.classList.toggle("is-placing", state.build != null);
  }

  // --- Transition watcher (toasts + records) ----------------------------
  let prevStatus = state.status;
  let prevWave = state.wave;

  function handleTransitions() {
    if (state.wave !== prevWave && state.status === "wave") {
      const boss = state.wave % 5 === 0;
      ui.toast(
        boss ? `Wave ${state.wave} — Daemon inbound.` : `Wave ${state.wave} incoming.`,
        boss ? 4200 : 2600,
      );
      ui.setStatus(`Wave ${state.wave} started. ${state.lives} lives.`);
    } else if (prevStatus === "wave" && state.status === "lull") {
      const bonus = TUNING.waveClearBase + state.wave * TUNING.waveClearPer;
      ui.toast(`Wave ${state.wave} held — +${money(bonus)}. Next in ${TUNING.lullSec}s.`);
      ui.setStatus(`Wave ${state.wave} cleared. ${state.lives} lives.`);
    }

    if (state.status === "over" && prevStatus !== "over") {
      const newBest = state.score > meta.bestScore;
      meta.runs += 1;
      meta.bestScore = Math.max(meta.bestScore, state.score);
      meta.bestWave = Math.max(meta.bestWave, state.wave);
      saveMeta(meta);
      ui.showEnd({
        wave: state.wave,
        score: state.score,
        bestScore: meta.bestScore,
        bestWave: meta.bestWave,
        newBest,
      });
      ui.setStatus(`Core breached on wave ${state.wave}. Score ${state.score}.`);
    }

    prevStatus = state.status;
    prevWave = state.wave;
  }

  function reset() {
    prevStatus = state.status;
    prevWave = state.wave;
    syncCursor();
  }

  // --- Main loop --------------------------------------------------------
  let last = performance.now();
  let acc = 0;

  function frame(now: number) {
    const dtReal = Math.min(0.25, (now - last) / 1000);
    last = now;

    if (!state.paused && state.status !== "over") {
      acc += dtReal * state.speed;
      let steps = 0;
      while (acc >= FIXED && steps < 600) {
        step(state, FIXED);
        acc -= FIXED;
        steps++;
        // step() can end the run mid-burst; the cast re-widens the status type
        // that TS narrowed away at the guard above, so it sees the new value.
        if ((state.status as RunStatus) === "over") break;
      }
      handleTransitions();
    } else {
      acc = 0;
    }

    ui.render(state, meta);
    renderer.draw(state, { reducedMotion, time: now / 1000 });
    requestAnimationFrame(frame);
  }

  // Keep the canvas buffer in step with its CSS box.
  const ro = new ResizeObserver(() => renderer.resize());
  ro.observe(ui.canvas);
  renderer.resize();

  // Returning to a hidden tab shouldn't teleport the sim; the dt clamp handles
  // it, but reset the clock so the first visible frame is small.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") last = performance.now();
  });

  ui.setStatus("Signal Defense ready. Build, then call wave 1.");
  ui.render(state, meta);
  requestAnimationFrame(frame);
}
