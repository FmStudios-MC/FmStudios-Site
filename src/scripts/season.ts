// Seasonal theme switch. The decision of whether a season is eligible runs
// inline in BaseLayout's <head> (before paint); this only wires the toggle.

export const SEASON_OPTOUT_KEY = "fmi-season-off";
const THEME_COLOR = { halloween: "#16101d", default: "#1a1712" };
const FAVICON = { halloween: "/favicon-halloween.webp", default: "/favicon.webp" };

export function initSeasonToggle() {
  const root = document.documentElement;
  const season = root.dataset.seasonEligible;
  const toggle = document.querySelector<HTMLButtonElement>("[data-season-toggle]");
  if (!season || !toggle) return;

  // Opt-outs are scoped to one season in one year, so next October returns.
  const optOutValue = `${season}-${new Date().getFullYear()}`;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');

  const render = () => {
    const on = root.dataset.season === season;
    toggle.setAttribute("aria-pressed", String(on));
    toggle.title = on ? "Halloween theme: on" : "Halloween theme: off";
    meta?.setAttribute("content", on ? THEME_COLOR.halloween : THEME_COLOR.default);
    icon?.setAttribute("href", on ? FAVICON.halloween : FAVICON.default);
  };

  toggle.addEventListener("click", () => {
    const on = root.dataset.season === season;
    if (on) delete root.dataset.season;
    else root.dataset.season = season;
    try {
      if (on) localStorage.setItem(SEASON_OPTOUT_KEY, optOutValue);
      else localStorage.removeItem(SEASON_OPTOUT_KEY);
    } catch {
      // Storage blocked: the switch still works for this page view.
    }
    render();
  });

  render();
}
