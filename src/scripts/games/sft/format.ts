/* Number + time formatting. Kept tiny and dependency-free. */

const SUFFIXES = [
  "",
  "K",
  "M",
  "B",
  "T",
  "Qa",
  "Qi",
  "Sx",
  "Sp",
  "Oc",
  "No",
  "Dc",
];

/** Compact number: 1234 -> "1.23K", 5e7 -> "50.0M". */
export function fmt(n: number, decimals = 2): string {
  if (!isFinite(n)) return "0";
  if (n < 0) return "-" + fmt(-n, decimals);
  if (n < 1000) {
    // Whole numbers stay clean; fractions show up to `decimals`.
    return Number.isInteger(n) ? String(n) : n.toFixed(decimals);
  }
  const tier = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(n) / 3));
  const scaled = n / Math.pow(1000, tier);
  return scaled.toFixed(scaled >= 100 ? 1 : 2) + SUFFIXES[tier];
}

/** Money with a leading $. */
export function money(n: number): string {
  return "$" + fmt(n);
}

/** Per-second rate, e.g. "$12.4K/s". */
export function rate(n: number, unit = ""): string {
  return fmt(n) + unit + "/s";
}

/** Human duration from seconds: "3h 12m", "45s". */
export function duration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  if (s < 60) return s + "s";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m " + (s % 60) + "s";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h " + (m % 60) + "m";
  const d = Math.floor(h / 24);
  return d + "d " + (h % 24) + "h";
}

/** Percentage from a 0..1 fraction. */
export function pct(frac: number): string {
  return Math.round(frac * 100) + "%";
}
