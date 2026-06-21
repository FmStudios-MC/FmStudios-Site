/* Entry point: wires storage + engine + UI together and runs the loops.
   Imported by the game page via <script>. */

import { installAdmin } from "./admin";
import { BUILDING_BY_ID, EVENT_BY_ID, TUNING, UPGRADES } from "./config";
import {
  acceptContract,
  buyBuilding,
  buyPrestige,
  buyUpgrade,
  claimAchievements,
  declineContract,
  derive,
  doPrestige,
  gridPrice,
  respondEvent,
  tick,
  triggerOverclock,
} from "./engine";
import { duration, fmt, money, pct } from "./format";
import { defaultState } from "./state";
import {
  exportSave,
  importSave,
  load,
  save,
  wipe,
} from "./storage";
import type { GameState } from "./types";
import { createUI } from "./ui";

export function startGame(root: HTMLElement) {
  const loaded = load();
  let state: GameState = loaded.state;

  const ui = createUI(root, {
    onBuyBuilding: (id) => {
      if (buyBuilding(state, id)) {
        ui.pushLog(`+ ${BUILDING_BY_ID[id]?.name ?? id} online`, "good");
        renderNow();
      }
    },
    onBuyUpgrade: (id) => {
      if (buyUpgrade(state, id)) {
        const u = UPGRADES.find((x) => x.id === id);
        ui.pushLog(`▲ ${u?.name ?? id} installed`, "gold");
        renderNow();
      }
    },
    onBuyPrestige: (id) => buyPrestige(state, id) && renderNow(),
    onOverclock: () => {
      if (triggerOverclock(state, Date.now())) {
        ui.pushLog(`⚡ Overclock engaged ×${TUNING.overclockMult}`, "gold");
        renderNow();
      }
    },
    onRespondEvent: () => {
      const ev = state.activeEvent;
      if (ev && respondEvent(state, Date.now())) {
        const name = EVENT_BY_ID[ev.id]?.name ?? "Incident";
        ui.toast(`${name} mitigated.`);
        ui.pushLog(`✓ ${name} mitigated`, "good");
        renderNow();
      }
    },
    onAcceptContract: () => {
      const o = state.contractOffer;
      if (o && acceptContract(state, Date.now())) {
        ui.toast("Contract accepted. Deliver before the deadline.");
        ui.pushLog(`◇ Contract accepted — ${money(o.reward)} on delivery`, "gold");
        renderNow();
      }
    },
    onDeclineContract: () => {
      if (declineContract(state, Date.now())) {
        ui.pushLog("◇ Contract passed", "");
        renderNow();
      }
    },
    onPrestige: () => {
      const gain = derive(state, Date.now()).pendingCredits;
      if (gain <= 0) return;
      if (
        !window.confirm(
          `Decommission and rebuild?\n\nYou keep your research and gain +${gain} ⬡.\nServers, cash and reputation reset.`,
        )
      )
        return;
      if (doPrestige(state, Date.now())) {
        save(state);
        ui.toast(`Rebuilt. +${gain} ⬡ banked.`);
        ui.pushLog(`⟳ Data center rebuilt — +${gain} ⬡ banked`, "gold");
        renderNow();
      }
    },
    onSave: () => {
      save(state);
      ui.toast("Game saved.");
    },
    onReset: () => {
      if (
        window.confirm(
          "Hard reset? This wipes everything, including research. No undo.",
        )
      ) {
        wipe();
        state = defaultState();
        ui.toast("Save wiped. Fresh start.");
        renderNow();
      }
    },
    onExport: () => {
      const blob = exportSave(state);
      navigator.clipboard?.writeText(blob).then(
        () => ui.toast("Save copied to clipboard."),
        () => window.prompt("Copy your save:", blob),
      );
    },
    onImport: (blob) => {
      const next = importSave(blob);
      if (!next) {
        ui.toast("That save could not be read.");
        return;
      }
      state = next;
      save(state);
      ui.toast("Save imported.");
      ui.pushLog("↥ Save imported", "good");
      renderNow();
    },
  });

  function renderNow() {
    const now = Date.now();
    ui.render(state, derive(state, now), now);
  }

  // Hidden admin/debug console (see admin.ts for how to enable it).
  installAdmin({
    getState: () => state,
    commit: () => {
      save(state);
      renderNow();
    },
    toast: (msg) => ui.toast(msg),
    log: (msg) => ui.pushLog(msg, "gold"),
    now: () => Date.now(),
  });

  // Grant any milestones the save already qualifies for, silently — no toast
  // storm for a returning player or a save predating this feature.
  claimAchievements(state, derive(state, Date.now()));

  ui.pushLog("▣ Systems online", "good");

  // Welcome-back toast + log for offline earnings.
  if (loaded.offlineEarnings > 1 && loaded.offlineSec > 5) {
    ui.toast(
      `Welcome back. Your farm earned ${money(
        loaded.offlineEarnings,
      )} over ${duration(loaded.offlineSec)}.`,
      7000,
    );
    ui.pushLog(
      `↩ Offline earnings: ${money(loaded.offlineEarnings)} over ${duration(
        loaded.offlineSec,
      )}`,
      "gold",
    );
  }

  // Activity watcher: log state transitions and lifetime milestones, sampled
  // once a second so the feed reads like a real ops console without spamming.
  let prevOverheat = false;
  let prevBrownout = false;
  let prevSaturated = false;
  let prevEventId: string | null = state.activeEvent?.id ?? null;
  let prevOfferId: string | null = state.contractOffer?.id ?? null;
  let prevCompleted = state.contractsCompleted;
  let prevFailed = state.contractsFailed;
  let prevPeak = gridPrice(Date.now()) / TUNING.basePowerRate > 1.12;
  let milestoneExp =
    state.lifetimeEarnings >= 1000
      ? Math.floor(Math.log10(state.lifetimeEarnings)) + 1
      : 3;
  {
    const d0 = derive(state, Date.now());
    prevOverheat = d0.heatThrottle < 0.999;
    prevBrownout = d0.powerThrottle < 0.999;
    prevSaturated = d0.bandwidthThrottle < 0.999;
  }
  setInterval(() => {
    const d = derive(state, Date.now());

    const overheat = d.heatThrottle < 0.999;
    if (overheat && !prevOverheat)
      ui.pushLog(`⚠ Overheating — output ${pct(d.heatThrottle)}`, "warn");
    else if (!overheat && prevOverheat)
      ui.pushLog("✓ Heat back to nominal", "good");
    prevOverheat = overheat;

    const brownout = d.powerThrottle < 0.999;
    if (brownout && !prevBrownout)
      ui.pushLog(`⚠ Power over capacity — output ${pct(d.powerThrottle)}`, "warn");
    else if (!brownout && prevBrownout)
      ui.pushLog("✓ Power restored", "good");
    prevBrownout = brownout;

    const saturated = d.bandwidthThrottle < 0.999;
    if (saturated && !prevSaturated)
      ui.pushLog(`⚠ Network saturated — output ${pct(d.bandwidthThrottle)}`, "warn");
    else if (!saturated && prevSaturated)
      ui.pushLog("✓ Network throughput restored", "good");
    prevSaturated = saturated;

    // Grid pricing: flag peak/off-peak swings so the bill makes sense.
    const peak = d.gridPrice / TUNING.basePowerRate > 1.12;
    if (peak && !prevPeak && d.powerCost > 0)
      ui.pushLog(`$ Grid at peak rate — power bill ${money(d.powerCost)}/s`, "warn");
    else if (!peak && prevPeak && d.powerCost > 0)
      ui.pushLog("$ Grid back to off-peak rates", "good");
    prevPeak = peak;

    while (state.lifetimeEarnings >= Math.pow(10, milestoneExp)) {
      ui.pushLog(
        `★ Lifetime earnings passed ${money(Math.pow(10, milestoneExp))}`,
        "gold",
      );
      milestoneExp += 1;
    }

    // Incidents: announce a fresh event, and the all-clear when one ends.
    const curEvent = d.event;
    const curId = curEvent?.id ?? null;
    if (curId && curId !== prevEventId) {
      ui.pushLog(
        `${curEvent!.kind === "good" ? "▲" : "⚠"} ${curEvent!.name} — ${curEvent!.desc}`,
        curEvent!.kind === "good" ? "gold" : "warn",
      );
      ui.toast(`${curEvent!.name}: ${curEvent!.desc}`, 6000);
    } else if (!curId && prevEventId) {
      ui.pushLog(`✓ ${EVENT_BY_ID[prevEventId]?.name ?? "Incident"} cleared`, "good");
    }
    prevEventId = curId;

    // Contracts: announce a fresh offer, and resolve fulfilment/failure off
    // the lifetime counters (the engine clears the contract when it resolves).
    const offerId = state.contractOffer?.id ?? null;
    if (offerId && offerId !== prevOfferId) {
      const o = state.contractOffer!;
      ui.pushLog(
        `◇ Contract offered — ${fmt(o.required)} FLOP for ${money(o.reward)}`,
        "gold",
      );
      ui.toast(`New contract: deliver ${fmt(o.required)} FLOP for ${money(o.reward)}.`, 6000);
    }
    prevOfferId = offerId;

    if (state.contractsCompleted > prevCompleted) {
      ui.pushLog("✦ Contract fulfilled — bonus + reputation paid", "gold");
      ui.toast("Contract fulfilled.");
    }
    if (state.contractsFailed > prevFailed) {
      ui.pushLog("✕ Contract failed — reputation lost", "warn");
      ui.toast("Contract failed — reputation took a hit.");
    }
    prevCompleted = state.contractsCompleted;
    prevFailed = state.contractsFailed;

    // Milestones: toast + log anything newly earned this second.
    for (const a of claimAchievements(state, d)) {
      ui.pushLog(`✦ Milestone — ${a.name}`, "gold");
      ui.toast(`Milestone unlocked: ${a.name}`);
    }
  }, 1000);

  // Economy loop: fixed cadence, delta from real timestamps (robust to
  // background-tab throttling).
  let last = Date.now();
  setInterval(() => {
    const now = Date.now();
    tick(state, (now - last) / 1000, now);
    last = now;
  }, TUNING.tickMs);

  // Render loop: cheap, paints whatever the economy produced.
  function frame() {
    renderNow();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Autosave + save on exit.
  setInterval(() => save(state), TUNING.saveEveryMs);
  window.addEventListener("beforeunload", () => save(state));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") save(state);
  });

  renderNow();
}
