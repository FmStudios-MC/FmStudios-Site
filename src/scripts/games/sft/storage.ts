/* localStorage persistence + offline-progress catch-up. */

import type { GameState } from "./types";
import { defaultState, sanitize, serialize, SAVE_VERSION } from "./state";
import { offlineEfficiency, tick } from "./engine";
import { TUNING } from "./config";

const KEY = "fmi.sft.v1";

export interface LoadResult {
  state: GameState;
  /** Money earned while away, if any (for the welcome-back toast). */
  offlineEarnings: number;
  offlineSec: number;
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

  const before = state.money;
  if (elapsedSec > 1) {
    tick(state, elapsedSec, now, offlineEfficiency(state));
  } else {
    state.lastTick = now;
  }

  return {
    state,
    offlineEarnings: state.money - before,
    offlineSec: elapsedSec,
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
