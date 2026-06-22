/* localStorage persistence for the only durable slice: best score / best wave /
   settings. A run is a session, so live GameState is never written. */

import { defaultMeta, sanitizeMeta } from "./state";
import type { Meta } from "./types";

const KEY = "fmi.td.v1";

export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? sanitizeMeta(JSON.parse(raw)) : defaultMeta();
  } catch {
    return defaultMeta();
  }
}

export function saveMeta(meta: Meta): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(meta));
  } catch {
    /* storage full or blocked - non-fatal, records just won't persist. */
  }
}
