/* localStorage persistence + offline-progress catch-up. */

import type { GameState } from "./types";
import { defaultState, sanitize, serialize, SAVE_VERSION } from "./state";
import { offlineEfficiency, tick } from "./engine";
import { TUNING } from "./config";

const KEY = "fmi.sft.v1";

/** A breakdown of what the farm did while the player was away (idea #12),
    captured by snapshotting state across the offline catch-up tick. */
export interface OfflineSummary {
  sec: number;
  /** Gross the farm produced (production + contracts), pre-bill. */
  earnings: number;
  /** Net change in cash on hand (earnings less the electricity bill). */
  netCash: number;
  reputation: number;
  research: number;
  contractsCompleted: number;
  contractsFailed: number;
}

export interface LoadResult {
  state: GameState;
  /** Money earned while away, if any (for the welcome-back toast). */
  offlineEarnings: number;
  offlineSec: number;
  /** Full offline breakdown for the summary modal (null if nothing happened). */
  offline: OfflineSummary | null;
}

export function load(now = Date.now()): LoadResult {
  let state: GameState;
  try {
    const raw = localStorage.getItem(KEY);
    state = (raw && sanitize(JSON.parse(raw), now)) || defaultState(now);
  } catch {
    state = defaultState(now);
  }

  // Offline catch-up: fast-forward the economy by the elapsed real time,
  // capped and run at reduced efficiency.
  const elapsedSec = Math.min(
    TUNING.maxOfflineSec,
    Math.max(0, (now - state.lastTick) / 1000),
  );
  // Pause any in-progress contracts across the away time: shift their clocks
  // forward by the elapsed gap so deadlines can't lapse while the player is
  // gone. Delivery still accrues over the catch-up window (at offline rate),
  // so a contract can be fulfilled while away but never failed by absence.
  if (state.contracts.length && elapsedSec > 1) {
    const shiftMs = elapsedSec * 1000;
    for (const c of state.contracts) {
      c.startedAt += shiftMs;
      c.endsAt += shiftMs;
    }
  }

  // Snapshot the fields the summary reports across the catch-up tick.
  const before = {
    money: state.money,
    lifetime: state.lifetimeEarnings,
    reputation: state.reputation,
    research: state.research,
    completed: state.contractsCompleted,
    failed: state.contractsFailed,
  };
  if (elapsedSec > 1) {
    tick(state, elapsedSec, now, offlineEfficiency(state));
  } else {
    state.lastTick = now;
  }

  const offlineEarnings = state.money - before.money;
  const offline: OfflineSummary | null =
    elapsedSec > 1
      ? {
          sec: elapsedSec,
          earnings: state.lifetimeEarnings - before.lifetime,
          netCash: offlineEarnings,
          reputation: state.reputation - before.reputation,
          research: state.research - before.research,
          contractsCompleted: state.contractsCompleted - before.completed,
          contractsFailed: state.contractsFailed - before.failed,
        }
      : null;

  return {
    state,
    offlineEarnings,
    offlineSec: elapsedSec,
    offline,
  };
}

export function save(state: GameState): void {
  try {
    localStorage.setItem(KEY, serialize(state));
  } catch {
    /* storage full or unavailable - non-fatal, keep playing in-memory. */
  }
}

export function wipe(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Export the save as a base64 text blob for manual backup. */
export function exportSave(state: GameState): string {
  return btoa(unescape(encodeURIComponent(serialize(state))));
}

/** Import a previously exported blob. Returns null on failure. */
export function importSave(blob: string, now = Date.now()): GameState | null {
  try {
    const json = decodeURIComponent(escape(atob(blob.trim())));
    const state = sanitize(JSON.parse(json), now);
    if (state) state.version = SAVE_VERSION;
    return state;
  } catch {
    return null;
  }
}
