/* Small, dependency-free formatting for the HUD. Numbers here stay human-sized
   (cash, lives, scores), so this is plainer than the idle game's big-number fmt. */

/** Integer with thousands separators: 12345 -> "12,345". */
export function int(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** Money with a leading $: 1500 -> "$1,500". */
export function money(n: number): string {
  return "$" + int(n);
}

/** Whole seconds: 3.4 -> "3s". */
export function secs(n: number): string {
  return Math.max(0, Math.ceil(n)) + "s";
}

/** One-decimal multiplier for tower stats: 1.6 -> "1.6". */
export function dec(n: number, places = 1): string {
  return n.toFixed(places);
}

/** A 0..1 ratio as a whole percent: 0.834 -> "83%". */
export function pct(n: number): string {
  return Math.round(n * 100) + "%";
}
