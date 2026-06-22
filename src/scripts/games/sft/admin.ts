/* Admin / debug console for Server-Farm Tycoon.
   Discreet by design: nothing is exposed until you enable it, so ordinary
   visitors never see it. From the browser dev-tools console:

     sftAdmin()        -> turns the console on (persists for this browser)
     sft.help()        -> lists every command

   It can also be flipped on with the Ctrl+Shift+A hotkey, via the URL hash
   (#admin), or once the persisted flag is set. Everything operates on the
   live game state and re-renders. */

import { BUILDINGS, BUILDING_BY_ID, GOALS, PRESTIGE, UPGRADES } from "./config";
import { creditScale, derive, doPrestige, tick } from "./engine";
import type { GameState } from "./types";

export interface AdminCtx {
  getState(): GameState;
  /** Persist + repaint after a mutation. */
  commit(): void;
  toast(msg: string): void;
  log(msg: string): void;
  now(): number;
}

const STORAGE_FLAG = "sft-admin";

export function installAdmin(ctx: AdminCtx): void {
  const st = () => ctx.getState();
  const done = (msg: string) => {
    ctx.commit();
    ctx.log("✦ " + msg);
    return msg;
  };

  const api = {
    help() {
      const lines = [
        "Server-Farm Tycoon — admin console",
        "",
        "  sft.cash(n=1e6)        add money",
        "  sft.setCash(n)         set money",
        "  sft.credits(n=100)     add research credits ⬡",
        "  sft.setCredits(n)      set research credits",
        "  sft.rep(n=1000)        add reputation",
        "  sft.research(n=500)    add in-run R&D points",
        "  sft.wear(f=0)          set hardware wear (0..1)",
        "  sft.goals()            complete the whole campaign",
        "  sft.give(id, n=10)     add n of a building",
        "  sft.set(id, n)         set a building's count",
        "  sft.fill(n=25)         set EVERY building to n",
        "  sft.ids()              list building ids",
        "  sft.unlockAll()        open every unlock gate",
        "  sft.upgrades()         grant all one-off upgrades",
        "  sft.maxPrestige(l=25)  max out every prestige node",
        "  sft.ff(sec=3600)       fast-forward earnings by sec seconds",
        "  sft.rebuild()          force a rebuild now",
        "  sft.win()              cash + credits + unlock + fill, all at once",
        "  sft.state()            the raw game state object",
        "  sft.off()              disable the console",
      ];
      // eslint-disable-next-line no-console
      console.log(lines.join("\n"));
      return "see console ↑";
    },

    cash(n = 1_000_000) {
      st().money += n;
      return done(`+${n} cash`);
    },
    setCash(n: number) {
      st().money = n;
      return done(`cash = ${n}`);
    },
    credits(n = 100) {
      st().credits += n;
      return done(`+${n} ⬡`);
    },
    setCredits(n: number) {
      st().credits = n;
      return done(`credits = ${n}`);
    },
    rep(n = 1000) {
      st().reputation += n;
      return done(`+${n} reputation`);
    },
    research(n = 500) {
      st().research += n;
      return done(`+${n} R&D`);
    },
    wear(f = 0) {
      st().wear = Math.max(0, Math.min(1, f));
      return done(`wear = ${st().wear}`);
    },
    goals() {
      const s = st();
      for (const g of GOALS) if (!s.goals.includes(g.id)) s.goals.push(g.id);
      return done("campaign completed (Endless unlocked)");
    },

    ids() {
      return BUILDINGS.map((b) => b.id).join(", ");
    },
    give(id: string, n = 10) {
      if (!BUILDING_BY_ID[id]) return `unknown id "${id}". try sft.ids()`;
      const s = st();
      s.buildings[id] = (s.buildings[id] ?? 0) + n;
      return done(`+${n} ${id} (now ${s.buildings[id]})`);
    },
    set(id: string, n: number) {
      if (!BUILDING_BY_ID[id]) return `unknown id "${id}". try sft.ids()`;
      st().buildings[id] = Math.max(0, n);
      return done(`${id} = ${Math.max(0, n)}`);
    },
    fill(n = 25) {
      const s = st();
      for (const b of BUILDINGS) s.buildings[b.id] = n;
      return done(`every building set to ${n}`);
    },

    unlockAll() {
      const s = st();
      s.lifetimeEarnings = Math.max(s.lifetimeEarnings, 1e13);
      return done("all unlock gates opened");
    },
    upgrades() {
      const s = st();
      let added = 0;
      for (const u of UPGRADES)
        if (!s.upgrades.includes(u.id)) {
          s.upgrades.push(u.id);
          added++;
        }
      return done(`granted ${added} upgrade(s)`);
    },
    maxPrestige(lvl = 25) {
      const s = st();
      for (const p of PRESTIGE)
        s.prestigeUpgrades[p.id] =
          p.maxLevel != null ? Math.min(lvl, p.maxLevel) : lvl;
      return done(`prestige nodes maxed (lvl ${lvl})`);
    },

    ff(sec = 3600) {
      const now = ctx.now();
      tick(st(), sec, now);
      return done(`fast-forwarded ${sec}s`);
    },
    rebuild() {
      const now = ctx.now();
      const s = st();
      const pending = derive(s, now).pendingCredits;
      if (pending <= 0) {
        // Top the run up to exactly the first-credit threshold so a rebuild
        // is always possible from the console.
        s.runEarnings = creditScale(s);
      }
      if (!doPrestige(s, now)) return "rebuild failed";
      return done("rebuilt");
    },

    win() {
      const s = st();
      s.money += 1e9;
      s.credits += 1000;
      s.research += 5000;
      s.wear = 0;
      s.lifetimeEarnings = Math.max(s.lifetimeEarnings, 1e13);
      for (const u of UPGRADES)
        if (!s.upgrades.includes(u.id)) s.upgrades.push(u.id);
      for (const g of GOALS) if (!s.goals.includes(g.id)) s.goals.push(g.id);
      for (const b of BUILDINGS) s.buildings[b.id] = Math.max(s.buildings[b.id] ?? 0, 50);
      ctx.toast("Admin: god mode applied.");
      return done("god mode");
    },

    state() {
      return st();
    },
    off() {
      try {
        localStorage.removeItem(STORAGE_FLAG);
      } catch {
        /* ignore */
      }
      delete (window as Record<string, unknown>).sft;
      return "admin console off (reload to fully remove)";
    },
  };

  let enabled = false;
  function enable(): string {
    if (!enabled) {
      enabled = true;
      try {
        localStorage.setItem(STORAGE_FLAG, "1");
      } catch {
        /* ignore */
      }
      (window as Record<string, unknown>).sft = api;
      // eslint-disable-next-line no-console
      console.log(
        "%cSFT admin enabled%c — type sft.help()",
        "color:#e8b04b;font-weight:700",
        "color:inherit",
      );
    }
    return "admin ready — sft.help()";
  }

  // The always-present gatekeeper. Discoverable only if you know the name.
  (window as Record<string, unknown>).sftAdmin = enable;

  // Hidden hotkey: Ctrl+Shift+A flips the console on without the dev console.
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "a")) {
      e.preventDefault();
      const first = !enabled;
      enable();
      ctx.toast(
        first
          ? "Admin console enabled — open dev-tools and type sft.help()"
          : "Admin console already on.",
      );
    }
  });

  // Auto-enable for the owner: persisted flag or an #admin hash.
  let flagged = false;
  try {
    flagged = localStorage.getItem(STORAGE_FLAG) === "1";
  } catch {
    /* ignore */
  }
  if (flagged || /(^|[#&])admin\b/.test(window.location.hash)) enable();
}
