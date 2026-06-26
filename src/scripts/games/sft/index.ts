/* Entry point: wires storage + engine + UI together and runs the loops.
   Imported by the game page via <script>. */

import { installAdmin } from "./admin";
import { BUILDING_BY_ID, EVENT_BY_ID, TUNING, UPGRADES } from "./config";
import {
  acceptContract,
  buyBuildingBulk,
  buyCorporate,
  buyPrestige,
  buyResearch,
  buyUpgrade,
  claimAchievements,
  claimAscension,
  claimGoals,
  declineContract,
  derive,
  doPrestige,
  gridPrice,
  invalidateDerive,
  rebalanceRacks,
  reputationTier,
  respondEvent,
  serviceHardware,
  setAllocation,
  setAllocationShare,
  setPowerContract,
  tick,
  toggleEndless,
  triggerOverclock,
} from "./engine";
import { CORPORATE_BY_ID, RESEARCH_BY_ID, SCRIPTED_BY_ID } from "./config";
import { duration, fmt, money, pct } from "./format";
import { sound } from "./sound";
import { defaultState } from "./state";
import {
  exportSave,
  importSave,
  load,
  save,
  wipe,
} from "./storage";
import type { GameState } from "./types";
import { createUI, type Handlers } from "./ui";

export function startGame(root: HTMLElement) {
  const loaded = load();
  let state: GameState = loaded.state;

  const handlers: Handlers = {
    onBuyBuilding: (id, mult) => {
      const n = buyBuildingBulk(state, id, mult);
      if (n > 0) {
        const name = BUILDING_BY_ID[id]?.name ?? id;
        ui.pushLog(
          n > 1 ? `+ ${name} ×${n} online` : `+ ${name} online`,
          "good",
        );
        sound.buy();
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
    onBuyCorporate: (id) => {
      if (buyCorporate(state, id)) {
        const lvl = state.corporateUpgrades[id] ?? 0;
        ui.pushLog(
          `◈ Corporate: ${CORPORATE_BY_ID[id]?.name ?? id} → Lv ${lvl}`,
          "gold",
        );
        renderNow();
      }
    },
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
    onRebalance: () => {
      if (rebalanceRacks(state, Date.now())) {
        ui.toast("Racks rebalanced.");
        ui.pushLog("✓ Rack hotspot rebalanced", "good");
        renderNow();
      }
    },
    onSetAllocation: (id, delta) => {
      if (setAllocation(state, id, delta)) renderNow();
    },
    onSetAllocationShare: (id, frac) => {
      if (setAllocationShare(state, id, frac)) renderNow();
    },
    onAcceptContract: (id) => {
      const o = state.contractOffers.find((x) => x.id === id);
      if (o && acceptContract(state, Date.now(), id)) {
        ui.toast("Contract accepted. Deliver before the deadline.");
        ui.pushLog(`◇ ${o.tag} contract accepted — ${money(o.reward)} on delivery`, "gold");
        renderNow();
      }
    },
    onDeclineContract: (id) => {
      if (declineContract(state, Date.now(), id)) {
        ui.pushLog("◇ Contract passed", "");
        renderNow();
      }
    },
    onSetPowerContract: (id) => {
      if (setPowerContract(state, id)) {
        ui.pushLog(`⚡ Power contract → ${id}`, "gold");
        renderNow();
      }
    },
    onBuyResearch: (id) => {
      if (buyResearch(state, id)) {
        const lvl = state.researchNodes[id] ?? 0;
        ui.pushLog(
          `⚙ Research: ${RESEARCH_BY_ID[id]?.name ?? id} → Lv ${lvl}`,
          "gold",
        );
        renderNow();
      }
    },
    onServiceHardware: () => {
      if (serviceHardware(state, Date.now())) {
        ui.toast("Hardware serviced. Wear cleared.");
        ui.pushLog("✓ Hardware serviced — wear cleared", "good");
        renderNow();
      }
    },
    onToggleEndless: () => {
      if (toggleEndless(state)) {
        if (state.endless) {
          ui.toast("Endless engaged. Higher stakes, richer rewards.");
          ui.pushLog("★ Endless mode engaged", "gold");
        } else {
          ui.pushLog("◇ Endless mode stood down", "");
        }
        save(state);
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
      const infBefore = state.influence;
      if (doPrestige(state, Date.now())) {
        const infGain = state.influence - infBefore;
        const infTag = infGain > 0 ? ` · +${infGain} ◈` : "";
        save(state);
        ui.toast(`Rebuilt. +${gain} ⬡${infTag} banked.`);
        ui.pushLog(
          `⟳ Data center rebuilt — +${gain} ⬡${
            infGain > 0 ? ` · +${infGain} ◈ influence` : ""
          } banked`,
          "gold",
        );
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
  };

  const ui = createUI(root, handlers);

  function renderNow() {
    const now = Date.now();
    ui.render(state, derive(state, now), now);
  }

  // Hidden admin/debug console (see admin.ts for how to enable it).
  installAdmin({
    getState: () => state,
    commit: () => {
      // Admin mutates raw state, so drop the memoised derive before repainting.
      invalidateDerive();
      save(state);
      renderNow();
    },
    toast: (msg) => ui.toast(msg),
    log: (msg) => ui.pushLog(msg, "gold"),
    now: () => Date.now(),
  });

  // Grant any milestones + goals the save already qualifies for, silently — no
  // toast storm for a returning player or a save predating this feature.
  claimAchievements(state, derive(state, Date.now()));
  claimGoals(state, derive(state, Date.now()));

  ui.pushLog("▣ Systems online", "good");

  // Welcome-back: a full breakdown modal for a real absence, a light toast for
  // a short gap. Either way, log it to the activity feed.
  if (loaded.offline && loaded.offlineEarnings > 1 && loaded.offlineSec > 5) {
    ui.pushLog(
      `↩ Offline earnings: ${money(loaded.offlineEarnings)} over ${duration(
        loaded.offlineSec,
      )}`,
      "gold",
    );
    if (loaded.offlineSec >= 60) {
      ui.showOfflineSummary(loaded.offline);
    } else {
      ui.toast(
        `Welcome back. Your farm earned ${money(
          loaded.offlineEarnings,
        )} over ${duration(loaded.offlineSec)}.`,
        7000,
      );
    }
  }

  // Activity watcher: log state transitions and lifetime milestones, sampled
  // once a second so the feed reads like a real ops console without spamming.
  let prevOverheat = false;
  let prevBrownout = false;
  let prevSaturated = false;
  let prevEventId: string | null = state.activeEvent?.id ?? null;
  let prevHotspot = state.hotspot != null;
  let prevOfferIds = new Set(state.contractOffers.map((o) => o.id));
  let prevCompleted = state.contractsCompleted;
  let prevFailed = state.contractsFailed;
  let prevPeak = gridPrice(Date.now()) / TUNING.basePowerRate > 1.12;
  let prevTier = reputationTier(state.reputation).index;
  let prevWorn = false;
  let prevScriptId: string | null = state.activeScript?.id ?? null;
  let prevScriptsCompleted = state.scriptsCompleted;
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

    // Statistics sparklines + the audio hum both sample on this 1s cadence.
    ui.recordHistory(d);
    sound.setLoad(d.heatLoad);

    const overheat = d.heatThrottle < 0.999;
    if (overheat && !prevOverheat) {
      ui.pushLog(`⚠ Overheating — output ${pct(d.heatThrottle)}`, "warn");
      sound.klaxon();
    } else if (!overheat && prevOverheat)
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

    // Hotspots: announce a fresh one and the all-clear when it ends.
    const hotspot = d.hotspot != null;
    if (hotspot && !prevHotspot)
      ui.pushLog("⚠ Rack hotspot — cooling degraded, rebalance to clear", "warn");
    else if (!hotspot && prevHotspot)
      ui.pushLog("✓ Rack hotspot cleared", "good");
    prevHotspot = hotspot;

    // Contracts: announce each fresh offer on the board, and resolve
    // fulfilment/failure off the lifetime counters (the engine clears a
    // contract when it resolves).
    const offerIds = new Set<string>();
    for (const o of state.contractOffers) {
      offerIds.add(o.id);
      if (!prevOfferIds.has(o.id)) {
        ui.pushLog(
          `◇ ${o.tag} contract — ${fmt(o.required)} FLOP for ${money(o.reward)}`,
          "gold",
        );
        ui.toast(`New ${o.tag} contract: ${fmt(o.required)} FLOP for ${money(o.reward)}.`, 6000);
      }
    }
    prevOfferIds = offerIds;

    if (state.contractsCompleted > prevCompleted) {
      ui.pushLog("✦ Contract fulfilled — bonus + reputation paid", "gold");
      ui.toast("Contract fulfilled.");
      sound.chime();
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

    // Campaign objectives: toast + log anything newly completed; flag the
    // Endless unlock when the final goal lands.
    for (const g of claimGoals(state, d)) {
      ui.pushLog(`◎ Objective complete — ${g.name}`, "gold");
      ui.toast(`Objective complete: ${g.name}`);
      if (g.final) {
        ui.pushLog("★ Campaign complete — Endless mode unlocked", "gold");
        ui.toast("Campaign complete. Endless mode unlocked.", 7000);
      }
    }

    // Ascension tiers (idea #4): post-campaign milestones that escalate Endless.
    for (const a of claimAscension(state, d)) {
      ui.pushLog(`★ Ascension — ${a.name} reached, Endless escalated`, "gold");
      ui.toast(`Ascension: ${a.name}.`, 6000);
      sound.chime();
    }

    // Reputation tier-ups: announce new standing.
    const tier = reputationTier(state.reputation);
    if (tier.index > prevTier) {
      ui.pushLog(`▲ Reputation standing — ${tier.def.name}`, "gold");
      ui.toast(`New standing: ${tier.def.name}.`);
    }
    prevTier = tier.index;

    // Hardware wear: nudge once the floor is noticeably worn, all-clear after.
    const worn = d.wear >= 0.4;
    if (worn && !prevWorn)
      ui.pushLog(`⚠ Hardware worn — output ${pct(1 - d.wearPenalty)}, service to restore`, "warn");
    else if (!worn && prevWorn) ui.pushLog("✓ Hardware serviced — wear cleared", "good");
    prevWorn = worn;

    // Scripted opportunities (idea #15): announce a fresh one; on resolution,
    // distinguish a win (scriptsCompleted ticked up) from a lapsed window.
    const curScript = d.script;
    const curScriptId = curScript?.id ?? null;
    if (curScriptId && curScriptId !== prevScriptId) {
      ui.pushLog(
        `◈ Opportunity — ${curScript!.name}: ${curScript!.goal}`,
        "gold",
      );
      ui.toast(`${curScript!.name}. ${curScript!.goal}`, 7000);
    } else if (
      !curScriptId &&
      prevScriptId &&
      state.scriptsCompleted === prevScriptsCompleted
    ) {
      ui.pushLog(
        `◇ Opportunity lapsed — ${SCRIPTED_BY_ID[prevScriptId]?.name ?? "scripted op"}`,
        "",
      );
    }
    prevScriptId = curScriptId;

    if (state.scriptsCompleted > prevScriptsCompleted) {
      ui.pushLog("★ Opportunity won — payout banked", "gold");
      ui.toast("Opportunity won. Payout banked.");
      sound.chime();
    }
    prevScriptsCompleted = state.scriptsCompleted;
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

  // Keyboard shortcuts (idea #13): action verbs + the buy multiplier. Ignored
  // when a modifier is held (so the admin Ctrl+Shift+A chord and browser
  // shortcuts pass through) or when a text field has focus. The action handlers
  // each no-op when their target isn't available, so stray presses are safe.
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    switch (e.key.toLowerCase()) {
      case "o":
        handlers.onOverclock();
        break;
      case "r":
        handlers.onRespondEvent();
        break;
      case "b":
        handlers.onRebalance();
        break;
      case "m":
        handlers.onServiceHardware();
        break;
      case "1":
        ui.setBuyMult(1);
        break;
      case "2":
        ui.setBuyMult(10);
        break;
      case "3":
        ui.setBuyMult("max");
        break;
      default:
        return;
    }
  });

  // Autosave + save on exit.
  setInterval(() => save(state), TUNING.saveEveryMs);
  window.addEventListener("beforeunload", () => save(state));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") save(state);
  });

  renderNow();
}
