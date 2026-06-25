/* Entry point: wires storage + engine + render + input + ui + audio and runs
   the loop. Imported by the game page via <script>; call startGame(root) on
   [data-td]. This file is where state transitions (waves, leaks, abilities,
   records) become toasts, audio, and the run recap. */

import { createAudio } from "./audio";
import { ENEMIES, TOWER_BY_ID, TOWERS, TUNING, waveDef } from "./config";
import {
  activateOverclock,
  armSurge,
  cycleTarget,
  placeTower,
  sellTower,
  startWave,
  step,
  towerAt,
  triggerSurge,
  upgradeTower,
} from "./engine";
import { money } from "./format";
import { attachInput } from "./input";
import { createRenderer } from "./render";
import { defaultState, type RunOpts } from "./state";
import { loadMeta, saveMeta } from "./storage";
import type { GameState, RunStatus, TowerId } from "./types";
import { createUI } from "./ui";

const FIXED = 1 / 60; // fixed simulation step (seconds)

const waveHasBoss = (n: number) => waveDef(n).groups.some((g) => ENEMIES[g.kind].boss);

function topNode(dmg: Record<TowerId, number>): TowerId | null {
  let best: TowerId | null = null;
  let max = 0;
  for (const t of TOWERS) {
    if (dmg[t.id] > max) {
      max = dmg[t.id];
      best = t.id;
    }
  }
  return best;
}

export function startGame(root: HTMLElement) {
  const meta = loadMeta();
  const audio = createAudio(meta.muted);

  // Pending setup selection, seeded from last session's choices.
  let pending: RunOpts = { mapId: meta.mapId, difficulty: meta.difficulty };
  let state: GameState = defaultState(pending);

  const rmQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = rmQuery.matches;
  rmQuery.addEventListener("change", (e) => (reducedMotion = e.matches));

  const ui = createUI(root, {
    onBuild: (id) => {
      if (state.status === "setup") return;
      state.build = state.build === id ? null : id;
      if (state.build) {
        state.selected = null;
        state.surgeArm = false;
        state.preview = null;
      }
      syncCursor();
    },
    onStart: () => callWave(),
    onPause: () => {
      if (state.status === "setup" || state.status === "over") return;
      state.paused = !state.paused;
      root.classList.toggle("is-paused", state.paused);
    },
    onSpeed: () => {
      state.speed = state.speed === 1 ? 2 : 1;
    },
    onUpgrade: () => {
      if (state.selected != null && upgradeTower(state, state.selected)) audio.play("upgrade");
      else audio.play("deny");
    },
    onSell: () => {
      if (state.selected != null && sellTower(state, state.selected)) audio.play("sell");
    },
    onTarget: () => {
      if (state.selected != null) cycleTarget(state, state.selected);
    },
    onOverclock: () => {
      if (activateOverclock(state)) {
        audio.play("ability");
        ui.toast("Overclock — every node redlined for 5s.");
      } else audio.play("deny");
    },
    onSurge: () => {
      if (state.surgeCd > 0) {
        audio.play("deny");
        return;
      }
      const armed = armSurge(state);
      state.build = null;
      state.preview = null;
      syncCursor();
      ui.toast(armed ? "Surge armed — tap a cell to discharge." : "Surge disarmed.");
    },
    onMute: () => {
      meta.muted = !meta.muted;
      audio.setMuted(meta.muted);
      saveMeta(meta);
      if (!meta.muted) {
        audio.resume();
        audio.play("place");
      }
    },
    onReplay: () => {
      pending = { mapId: state.map.id, difficulty: state.difficulty };
      state = defaultState(pending); // back to the setup overlay
      ui.hideEnd();
      ui.closeHelp();
      root.classList.remove("is-paused");
      reset();
    },
    onPickDifficulty: (id) => {
      pending.difficulty = id;
      applyPending();
    },
    onPickMap: (id) => {
      pending.mapId = id;
      applyPending();
    },
    onDeploy: () => {
      state.status = "lull";
      meta.difficulty = state.difficulty;
      meta.mapId = state.map.id;
      saveMeta(meta);
      audio.resume();
      audio.play("place");
      reset();
      ui.toast("Board live. Build your defense, then call wave 1.", 3800);
    },
  });

  const renderer = createRenderer(ui.canvas);

  attachInput(ui.canvas, {
    tapCell: (c, r, touch) => {
      if (state.status === "over" || state.status === "setup") return;

      // Surge: an armed tap discharges at the cell.
      if (state.surgeArm) {
        const hits = triggerSurge(state, c, r);
        audio.play("surge");
        ui.toast(hits > 0 ? `Surge — ${hits} frozen.` : "Surge discharged.");
        state.preview = null;
        return;
      }

      const existing = towerAt(state, c, r);
      if (state.build) {
        if (existing) {
          state.selected = existing.id;
          state.build = null;
          state.preview = null;
        } else if (touch) {
          // Tap-to-preview, tap-again-to-confirm so phone players see range first.
          if (state.preview && state.preview.c === c && state.preview.r === r) {
            commitPlace(c, r);
            state.preview = null;
          } else {
            state.preview = { c, r };
          }
        } else {
          commitPlace(c, r); // mouse: place immediately (hover already previews)
        }
      } else {
        state.selected = existing ? existing.id : null;
        state.preview = null;
      }
      syncCursor();
    },
    hoverCell: (c, r) => {
      state.hover = r === null ? null : { c, r };
    },
    command: (name, index) => {
      if (name === "build" && index != null) {
        const id = TOWERS[index]?.id;
        if (id && state.status !== "setup") {
          state.build = state.build === id ? null : id;
          if (state.build) {
            state.selected = null;
            state.surgeArm = false;
            state.preview = null;
          }
          syncCursor();
        }
      } else if (name === "start") callWave();
      else if (name === "speed") state.speed = state.speed === 1 ? 2 : 1;
      else if (name === "pause") {
        if (state.status === "setup" || state.status === "over") return;
        state.paused = !state.paused;
        root.classList.toggle("is-paused", state.paused);
      } else if (name === "overclock") {
        if (activateOverclock(state)) {
          audio.play("ability");
          ui.toast("Overclock — every node redlined for 5s.");
        } else audio.play("deny");
      } else if (name === "surge") {
        if (state.surgeCd > 0) {
          audio.play("deny");
        } else {
          const armed = armSurge(state);
          state.build = null;
          state.preview = null;
          syncCursor();
          ui.toast(armed ? "Surge armed — tap a cell to discharge." : "Surge disarmed.");
        }
      } else if (name === "mute") {
        meta.muted = !meta.muted;
        audio.setMuted(meta.muted);
        saveMeta(meta);
        if (!meta.muted) audio.resume();
      } else if (name === "help") {
        ui.toggleHelp();
      } else if (name === "deselect") {
        state.build = null;
        state.selected = null;
        state.surgeArm = false;
        state.preview = null;
        ui.closeHelp();
        syncCursor();
      }
    },
  });

  function commitPlace(c: number, r: number) {
    if (placeTower(state, state.build!, c, r)) {
      audio.play("place");
    } else if (towerAt(state, c, r) == null && state.cash < TOWER_BY_ID[state.build!].cost) {
      audio.play("deny");
      ui.toast("Not enough cash for that node.");
    }
  }

  // Shared by the Start button and the Space shortcut.
  function callWave() {
    if (state.status !== "lull") return;
    const bonus = startWave(state);
    if (bonus > 0) ui.toast(`Wave called early — +${money(bonus)} bounty.`);
  }

  function syncCursor() {
    root.classList.toggle("is-placing", state.build != null || state.surgeArm);
  }

  // Rebuild the run (new map/difficulty) without leaving the setup overlay.
  function applyPending() {
    state = defaultState(pending);
    reset();
  }

  // --- Transition watcher (toasts + audio + records) --------------------
  let prevStatus = state.status;
  let prevWave = state.wave;
  let prevLeaked = state.leaked;
  let prevOcCd = state.overclockCd;
  let prevSurgeCd = state.surgeCd;

  function handleTransitions() {
    // Leaks: a low thud + screen already shakes from the engine.
    if (state.leaked > prevLeaked) audio.play("leak");

    // Abilities coming off cooldown.
    if (prevOcCd > 0 && state.overclockCd === 0) ui.toast("Overclock ready.");
    if (prevSurgeCd > 0 && state.surgeCd === 0) ui.toast("Surge ready.");

    if (state.wave !== prevWave && state.status === "wave") {
      const boss = waveHasBoss(state.wave);
      audio.play("wave");
      if (boss) audio.play("boss");
      ui.toast(
        boss ? `Wave ${state.wave} — Daemon inbound.` : `Wave ${state.wave} incoming.`,
        boss ? 4200 : 2600,
      );
      ui.setStatus(`Wave ${state.wave} started. ${state.lives} lives.`);
    } else if (prevStatus === "wave" && state.status === "lull") {
      const bonus = TUNING.waveClearBase + state.wave * TUNING.waveClearPer;
      audio.play("clear");
      const streakNote = state.streak > 1 ? ` Flawless ×${state.streak}.` : "";
      ui.toast(`Wave ${state.wave} held — +${money(bonus)}.${streakNote}`);
      ui.setStatus(`Wave ${state.wave} cleared. ${state.lives} lives.`);
    }

    if (state.status === "over" && prevStatus !== "over") {
      audio.play("over");
      const newBest = state.score > meta.bestScore;
      meta.runs += 1;
      meta.bestScore = Math.max(meta.bestScore, state.score);
      meta.bestWave = Math.max(meta.bestWave, state.wave);
      const mb = meta.modeBest[state.difficulty];
      const newModeBest = state.score > mb.score;
      mb.score = Math.max(mb.score, state.score);
      mb.wave = Math.max(mb.wave, state.wave);
      saveMeta(meta);

      const total = state.kills + state.leaked;
      const top = topNode(state.dmgByType);
      ui.showEnd({
        wave: state.wave,
        score: state.score,
        bestScore: mb.score,
        bestWave: mb.wave,
        newBest: newBest || newModeBest,
        difficultyName: state.difficulty[0].toUpperCase() + state.difficulty.slice(1),
        mapName: state.map.name,
        kills: state.kills,
        leaked: state.leaked,
        intercept: total > 0 ? state.kills / total : 1,
        cashEarned: state.cashEarned,
        built: state.built,
        topNode: top ? TOWER_BY_ID[top].name : "—",
      });
      ui.setStatus(`Core breached on wave ${state.wave}. Score ${state.score}.`);
    }

    prevStatus = state.status;
    prevWave = state.wave;
    prevLeaked = state.leaked;
    prevOcCd = state.overclockCd;
    prevSurgeCd = state.surgeCd;
  }

  function reset() {
    prevStatus = state.status;
    prevWave = state.wave;
    prevLeaked = state.leaked;
    prevOcCd = state.overclockCd;
    prevSurgeCd = state.surgeCd;
    syncCursor();
  }

  // --- Main loop --------------------------------------------------------
  let last = performance.now();
  let acc = 0;

  function frame(now: number) {
    const dtReal = Math.min(0.25, (now - last) / 1000);
    last = now;

    const running = !state.paused && state.status !== "over" && state.status !== "setup";
    if (running) {
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
      // Records/recap still need to fire the frame the run ends on a paused tick.
      if (state.status === "over") handleTransitions();
    }

    // A subtle fire tick when attack nodes shoot (throttled inside the audio kit).
    if (running) {
      for (const t of state.towers) {
        if (t.fireFlash > 0.1) {
          audio.play("fire");
          break;
        }
      }
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

  ui.setStatus("Signal Defense ready. Choose a difficulty and map, then deploy.");
  ui.render(state, meta);
  requestAnimationFrame(frame);
}
