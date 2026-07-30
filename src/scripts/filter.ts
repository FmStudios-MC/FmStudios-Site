/* Shared list filter for /work and /news.

   These controls are toggles over one visible list, not tabs over panels that
   swap. They previously declared role="tablist" with no tabpanel behind them,
   which promises arrow-key navigation and a panel relationship that never
   existed. Plain buttons with aria-pressed describe what they actually do, and
   a polite status line reports the new count so the change is not silent for
   anyone who cannot see the list reflow. */

interface FilterOptions {
  /** Attribute on each filterable item holding its value(s). */
  itemAttr: string;
  /** Item values are a comma-separated list rather than a single value. */
  multi?: boolean;
  /** Text for the polite live region after each change. */
  announce: (shown: number, filter: string) => string;
}

export function initListFilter({ itemAttr, multi = false, announce }: FilterOptions) {
  const buttons =
    document.querySelectorAll<HTMLButtonElement>("[data-filter]");
  const items = document.querySelectorAll<HTMLElement>(`[${itemAttr}]`);
  const empty = document.querySelector<HTMLElement>("[data-empty]");
  const status = document.querySelector<HTMLElement>("[data-filter-status]");
  if (!buttons.length || !items.length) return;

  const apply = (value: string) => {
    let shown = 0;
    items.forEach((item) => {
      const raw = item.getAttribute(itemAttr) || "";
      const match =
        value === "All" ||
        (multi ? raw.split(",").filter(Boolean).includes(value) : raw === value);
      item.hidden = !match;
      if (match) shown++;
    });
    if (empty) empty.hidden = shown !== 0;
    if (status) status.textContent = announce(shown, value);
  };

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) =>
        b.setAttribute("aria-pressed", String(b === btn)),
      );
      apply(btn.dataset.filter || "All");
    });
  });
}
