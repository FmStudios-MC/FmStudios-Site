/* The only canvas module: draws a GameState to a 2D context each frame. The
   static board (grid, path, core housing, spawn gate) is rendered once per map
   to an offscreen canvas and blitted; only the live entities are drawn per
   frame. Geometry comes off state.map, so a new map re-bakes the static layer.
   Grid coords: integer (c, r) = a cell centre, so pixel(gx) = (gx + 0.5) * cell. */

import { ENEMIES, TOWER_BY_ID, TUNING, TUNING as T, inBounds, isOpenCell } from "./config";
import { towerStats } from "./engine";
import type { Enemy, GameState, MapRuntime, Tower, TowerId } from "./types";

const C = {
  bg: "oklch(0.15 0.01 75)",
  bgDeep: "oklch(0.11 0.008 75)",
  surface: "oklch(0.22 0.013 72)",
  line: "oklch(0.34 0.012 72)",
  lineStrong: "oklch(0.44 0.014 72)",
  ink: "oklch(0.96 0.006 85)",
  inkMuted: "oklch(0.76 0.012 80)",
  gold: "oklch(0.8 0.13 80)",
  goldBright: "oklch(0.92 0.095 92)",
  goldDeep: "oklch(0.66 0.125 62)",
  hot: "oklch(0.62 0.19 28)",
  // Cool, low-chroma enemy steels — kept off the gold so the player's own
  // nodes/core stay the only true accent.
  steel: "oklch(0.6 0.03 250)",
  steelLite: "oklch(0.74 0.03 250)",
  steelDark: "oklch(0.46 0.03 255)",
  mend: "oklch(0.64 0.05 195)", // healer's cool teal — still off the gold
};

const DPR = () => Math.min(2, window.devicePixelRatio || 1);

export interface DrawOpts {
  reducedMotion: boolean;
  time: number; // seconds, for ambient pulses
}

export function createRenderer(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const stat = document.createElement("canvas");
  const sctx = stat.getContext("2d")!;
  let cell = 1;
  let W = 1;
  let H = 1;
  let staticMapId = "";
  let staticCell = 0;

  const px = (gx: number) => (gx + 0.5) * cell;
  const py = (gy: number) => (gy + 0.5) * cell;

  function ring(x: number, y: number, r: number, color: string, fillAlpha: number) {
    // color is a bare "oklch(L C H)" — splice an alpha in for the soft fill.
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color.replace(")", ` / ${fillAlpha})`);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, cell * 0.025);
    ctx.stroke();
  }

  function resize() {
    const dpr = DPR();
    const cssW = canvas.clientWidth || 1;
    const cssH = cssW * (TUNING.rows / TUNING.cols);
    W = cssW;
    H = cssH;
    cell = cssW / TUNING.cols;
    for (const cv of [canvas, stat]) {
      cv.width = Math.round(cssW * dpr);
      cv.height = Math.round(cssH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    staticMapId = ""; // force a static rebuild at the new size
  }

  // --- Static board (per map) -------------------------------------------
  function tracePath(c: CanvasRenderingContext2D, map: MapRuntime) {
    const wp = map.waypoints;
    c.beginPath();
    c.moveTo(px(wp[0][0]), py(wp[0][1]));
    for (let i = 1; i < wp.length; i++) c.lineTo(px(wp[i][0]), py(wp[i][1]));
  }

  function drawStatic(map: MapRuntime) {
    const c = sctx;
    c.clearRect(0, 0, W, H);

    // Warm void + vignette.
    c.fillStyle = C.bg;
    c.fillRect(0, 0, W, H);
    const vg = c.createRadialGradient(W * 0.5, H * 0.42, H * 0.1, W * 0.5, H * 0.55, H * 1.1);
    vg.addColorStop(0, "oklch(0.17 0.012 75)");
    vg.addColorStop(1, "oklch(0.1 0.008 75)");
    c.fillStyle = vg;
    c.fillRect(0, 0, W, H);

    // Build-cell markers (faint dots on open cells only).
    c.fillStyle = "oklch(0.5 0.012 78 / 0.16)";
    for (let r = 0; r < TUNING.rows; r++) {
      for (let col = 0; col < TUNING.cols; col++) {
        if (!isOpenCell(map, col, r)) continue;
        c.beginPath();
        c.arc(px(col), py(r), Math.max(1, cell * 0.04), 0, Math.PI * 2);
        c.fill();
      }
    }

    // Etched path: a recessed channel with a faint lit centre trace.
    c.lineJoin = "round";
    c.lineCap = "round";
    tracePath(c, map);
    c.strokeStyle = C.bgDeep;
    c.lineWidth = cell * 0.84;
    c.stroke();
    tracePath(c, map);
    c.strokeStyle = "oklch(0.24 0.013 72 / 0.9)";
    c.lineWidth = cell * 0.6;
    c.stroke();
    tracePath(c, map);
    c.strokeStyle = "oklch(0.55 0.03 80 / 0.35)";
    c.lineWidth = Math.max(1, cell * 0.05);
    c.setLineDash([cell * 0.32, cell * 0.34]);
    c.stroke();
    c.setLineDash([]);

    // Spawn gate bracket at the first on-board path cell, facing travel.
    const wp = map.waypoints;
    let ex = wp[0][0];
    let ey = wp[0][1];
    const sdx = Math.sign(wp[1][0] - wp[0][0]);
    const sdy = Math.sign(wp[1][1] - wp[0][1]);
    while (!inBounds(ex, ey)) {
      ex += sdx;
      ey += sdy;
    }
    const ang = Math.atan2(sdy, sdx);
    c.save();
    c.translate(px(ex), py(ey));
    c.rotate(ang);
    c.strokeStyle = C.inkMuted;
    c.lineWidth = Math.max(1.5, cell * 0.06);
    const g = cell * 0.34;
    c.beginPath();
    c.moveTo(-g - g * 0.4, -g);
    c.lineTo(-g, -g);
    c.lineTo(-g, g);
    c.lineTo(-g - g * 0.4, g);
    c.stroke();
    c.restore();

    // Core housing (octagonal plate); the live core glows over it each frame.
    polygon(c, px(map.core.c), py(map.core.r), cell * 0.62, 8, Math.PI / 8);
    c.fillStyle = C.surface;
    c.fill();
    c.strokeStyle = C.lineStrong;
    c.lineWidth = Math.max(1, cell * 0.04);
    c.stroke();
  }

  function ensureStatic(map: MapRuntime) {
    if (map.id !== staticMapId || cell !== staticCell) {
      drawStatic(map);
      staticMapId = map.id;
      staticCell = cell;
    }
  }

  // --- Per-frame ---------------------------------------------------------
  function draw(s: GameState, opts: DrawOpts) {
    ensureStatic(s.map);
    ctx.clearRect(0, 0, W, H);

    let dx = 0;
    let dy = 0;
    if (!opts.reducedMotion && s.shake > 0.01) {
      const m = s.shake * cell * 0.16;
      dx = (Math.random() - 0.5) * m;
      dy = (Math.random() - 0.5) * m;
    }
    ctx.save();
    ctx.translate(dx, dy);

    ctx.drawImage(stat, 0, 0, W, H);

    drawCore(s, opts);
    drawDamperFields(s);
    drawSelectionOrGhost(s);
    for (const t of s.towers) drawTower(t, s);
    for (const e of s.enemies) drawEnemy(e, opts);
    drawProjectiles(s);
    drawEffects(s, opts);

    ctx.restore();

    if (s.overclock > 0) drawOverclock(s, opts);
  }

  function drawCore(s: GameState, opts: DrawOpts) {
    const x = px(s.map.core.c);
    const y = py(s.map.core.r);
    const pulse = opts.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(opts.time * 2.2);
    const hurt = s.lives / s.maxLives;
    const glow = ctx.createRadialGradient(x, y, cell * 0.1, x, y, cell * (0.9 + pulse * 0.3));
    glow.addColorStop(0, `oklch(0.8 0.13 80 / ${0.32 + pulse * 0.12})`);
    glow.addColorStop(1, "oklch(0.8 0.13 80 / 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, cell * 1.2, 0, Math.PI * 2);
    ctx.fill();

    polygon(ctx, x, y, cell * (0.34 + pulse * 0.02), 4, Math.PI / 4);
    ctx.fillStyle = hurt < 0.34 ? C.goldDeep : C.gold;
    ctx.fill();
    polygon(ctx, x, y, cell * 0.2, 4, Math.PI / 4);
    ctx.fillStyle = C.goldBright;
    ctx.fill();
  }

  function drawDamperFields(s: GameState) {
    for (const t of s.towers) {
      if (t.defId !== "damper") continue;
      const st = towerStats(t.defId, t.tier);
      ctx.beginPath();
      ctx.arc(px(t.c), py(t.r), st.range * cell, 0, Math.PI * 2);
      ctx.fillStyle = "oklch(0.6 0.03 250 / 0.05)";
      ctx.fill();
      ctx.strokeStyle = "oklch(0.6 0.04 250 / 0.18)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function drawSelectionOrGhost(s: GameState) {
    if (s.selected != null) {
      const t = s.towers.find((x) => x.id === s.selected);
      if (t) {
        const rng = towerStats(t.defId, t.tier).range;
        if (rng > 0) ring(px(t.c), py(t.r), rng * cell, C.gold, 0.06);
      }
    }

    // Surge reticle follows the hover cell while armed.
    if (s.surgeArm && s.hover) {
      ring(px(s.hover.c), py(s.hover.r), T.surgeRadius * cell, C.gold, 0.05);
    }

    // Placement ghost: mouse hover, or a tapped-but-unconfirmed touch preview.
    const cellPos = s.hover ?? s.preview;
    if (s.build && cellPos) {
      const { c, r } = cellPos;
      const occupied = s.towers.some((t) => t.c === c && t.r === r);
      const valid = isOpenCell(s.map, c, r) && !occupied && s.cash >= TOWER_BY_ID[s.build].cost;
      const col = valid ? C.gold : C.hot;
      const rng = towerStats(s.build, 0).range;
      if (rng > 0) ring(px(c), py(r), rng * cell, col, valid ? 0.07 : 0.05);
      ctx.globalAlpha = 0.55;
      drawTowerGlyph(s.build, px(c), py(r), 0, valid ? C.gold : C.hot, true);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(1.5, cell * 0.05);
      const h = cell * 0.42;
      // The touch preview gets a dashed "tap again" frame to read as pending.
      if (!s.hover && s.preview) ctx.setLineDash([cell * 0.16, cell * 0.12]);
      ctx.strokeRect(px(c) - h, py(r) - h, h * 2, h * 2);
      ctx.setLineDash([]);
    }
  }

  function drawTower(t: Tower, s: GameState) {
    const x = px(t.c);
    const y = py(t.r);
    polygon(ctx, x, y, cell * 0.44, 4, Math.PI / 4);
    ctx.fillStyle = s.selected === t.id ? "oklch(0.26 0.02 75)" : C.surface;
    ctx.fill();
    ctx.strokeStyle = s.selected === t.id ? C.gold : C.line;
    ctx.lineWidth = Math.max(1, cell * 0.03);
    ctx.stroke();

    const lit = t.fireFlash > 0 || s.selected === t.id;
    drawTowerGlyph(t.defId, x, y, t.angle, lit ? C.goldBright : C.steelLite, lit);

    if (t.tier > 0) {
      ctx.fillStyle = C.gold;
      for (let i = 0; i < t.tier; i++) {
        ctx.beginPath();
        ctx.arc(x - cell * 0.18 + i * cell * 0.16, y + cell * 0.34, Math.max(1, cell * 0.045), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawTowerGlyph(id: TowerId, x: number, y: number, angle: number, accent: string, lit: boolean) {
    ctx.save();
    ctx.translate(x, y);
    const u = cell;
    if (id === "bolt") {
      ctx.rotate(angle);
      ctx.fillStyle = C.steel;
      roundRect(ctx, -u * 0.1, -u * 0.12, u * 0.42, u * 0.24, u * 0.05);
      ctx.fill();
      ctx.fillStyle = lit ? accent : C.steelLite;
      ctx.beginPath();
      ctx.arc(0, 0, u * 0.16, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === "arc") {
      ctx.fillStyle = C.steel;
      polygon(ctx, 0, 0, u * 0.26, 4, 0);
      ctx.fill();
      ctx.strokeStyle = lit ? accent : C.steelLite;
      ctx.lineWidth = Math.max(1, u * 0.04);
      ctx.beginPath();
      ctx.arc(0, 0, u * 0.14, 0, Math.PI * 1.4);
      ctx.stroke();
    } else if (id === "damper") {
      ctx.strokeStyle = lit ? accent : C.steelLite;
      ctx.lineWidth = Math.max(1.5, u * 0.05);
      polygon(ctx, 0, 0, u * 0.26, 6, Math.PI / 6);
      ctx.stroke();
      ctx.fillStyle = lit ? accent : C.steel;
      ctx.beginPath();
      ctx.arc(0, 0, u * 0.08, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === "generator") {
      // A charge cell: a rounded housing with a "+" terminal.
      ctx.strokeStyle = lit ? accent : C.steelLite;
      ctx.lineWidth = Math.max(1.5, u * 0.045);
      roundRect(ctx, -u * 0.2, -u * 0.18, u * 0.4, u * 0.36, u * 0.06);
      ctx.stroke();
      ctx.fillStyle = lit ? accent : C.steelLite;
      const b = u * 0.045;
      ctx.fillRect(-b, -u * 0.11, b * 2, u * 0.22); // vertical bar
      ctx.fillRect(-u * 0.11, -b, u * 0.22, b * 2); // horizontal bar
    } else {
      // driver
      ctx.rotate(angle);
      ctx.fillStyle = C.steelDark;
      roundRect(ctx, -u * 0.18, -u * 0.1, u * 0.5, u * 0.2, u * 0.04);
      ctx.fill();
      ctx.fillStyle = lit ? accent : C.steelLite;
      roundRect(ctx, u * 0.18, -u * 0.06, u * 0.18, u * 0.12, u * 0.03);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawEnemy(e: Enemy, opts: DrawOpts) {
    const x = px(e.x);
    const y = py(e.y);
    const rad = e.size * cell;
    const flash = e.hitFlash > 0;
    let fill = C.steel;
    if (e.kind === "mote") fill = C.steelLite;
    else if (e.kind === "hauler") fill = C.steelDark;
    else if (e.kind === "rusher") fill = C.steelLite;
    else if (e.kind === "healer") fill = C.mend;
    else if (e.kind === "daemon") fill = "oklch(0.4 0.05 280)";
    const stroke = e.kind === "plated" ? C.lineStrong : C.steelDark;
    const def = ENEMIES[e.kind];

    // Rusher speed-glow while bursting (direction-agnostic, so no wrong-way streak).
    if (e.rushing && !opts.reducedMotion) {
      const halo = ctx.createRadialGradient(x, y, rad * 0.4, x, y, rad * 1.7);
      halo.addColorStop(0, "oklch(0.82 0.04 235 / 0.32)");
      halo.addColorStop(1, "oklch(0.82 0.04 235 / 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, rad * 1.7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = flash ? C.ink : fill;
    ctx.strokeStyle = flash ? C.ink : stroke;
    ctx.lineWidth = Math.max(1, cell * 0.03);

    const shape = def.shape;
    if (shape === "square") {
      roundRect(ctx, -rad, -rad, rad * 2, rad * 2, rad * 0.22);
      ctx.fill();
      if (e.kind === "plated") {
        ctx.strokeStyle = flash ? C.ink : C.steelLite;
        ctx.lineWidth = Math.max(1.5, cell * 0.045);
        ctx.strokeRect(-rad * 0.6, -rad * 0.6, rad * 1.2, rad * 1.2);
      }
    } else if (shape === "triangle") {
      polygon(ctx, 0, 0, rad, 3, -Math.PI / 2);
      ctx.fill();
    } else if (shape === "diamond") {
      polygon(ctx, 0, 0, rad, 4, 0);
      ctx.fill();
      // a split seam, hinting it breaks apart
      ctx.strokeStyle = flash ? C.ink : C.bgDeep;
      ctx.lineWidth = Math.max(1, cell * 0.035);
      ctx.beginPath();
      ctx.moveTo(0, -rad * 0.8);
      ctx.lineTo(0, rad * 0.8);
      ctx.stroke();
    } else if (shape === "pentagon") {
      polygon(ctx, 0, 0, rad, 5, -Math.PI / 2);
      ctx.fill();
    } else {
      // hex (hauler / daemon / healer)
      polygon(ctx, 0, 0, rad, 6, Math.PI / 6);
      ctx.fill();
      ctx.stroke();
      if (e.kind === "daemon") {
        ctx.fillStyle = flash ? C.ink : "oklch(0.6 0.12 290)";
        polygon(ctx, 0, 0, rad * 0.42, 6, Math.PI / 6);
        ctx.fill();
      } else if (e.kind === "healer") {
        // a "+" cross, so the mender reads at a glance even in greyscale
        ctx.strokeStyle = flash ? C.ink : "oklch(0.86 0.04 195)";
        ctx.lineWidth = Math.max(1.5, cell * 0.05);
        ctx.beginPath();
        ctx.moveTo(-rad * 0.45, 0);
        ctx.lineTo(rad * 0.45, 0);
        ctx.moveTo(0, -rad * 0.45);
        ctx.lineTo(0, rad * 0.45);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Shield arc (shielded): a ring whose strength tracks remaining shield.
    if (e.maxShield > 0 && e.shield > 0) {
      const sa = e.shield / e.maxShield;
      ctx.strokeStyle = `oklch(0.82 0.04 235 / ${0.35 + sa * 0.45})`;
      ctx.lineWidth = Math.max(1.5, cell * 0.05);
      ctx.beginPath();
      ctx.arc(x, y, rad * 1.32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sa);
      ctx.stroke();
    }

    // Stun ring (frozen by Surge).
    if (e.stun > 0) {
      ctx.strokeStyle = "oklch(0.9 0.09 92 / 0.7)";
      ctx.lineWidth = Math.max(1, cell * 0.03);
      ctx.beginPath();
      ctx.arc(x, y, rad * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (e.hp < e.maxHp) {
      const w = rad * 2.1;
      const bx = x - w / 2;
      const by = y - rad - cell * 0.16;
      const bh = Math.max(2, cell * 0.05);
      ctx.fillStyle = "oklch(0.12 0.008 75 / 0.9)";
      ctx.fillRect(bx, by, w, bh);
      ctx.fillStyle = C.steelLite;
      ctx.fillRect(bx, by, w * Math.max(0, e.hp / e.maxHp), bh);
    }
  }

  function drawProjectiles(s: GameState) {
    for (const p of s.projectiles) {
      const x = px(p.x);
      const y = py(p.y);
      ctx.fillStyle = C.gold;
      ctx.beginPath();
      ctx.arc(x, y, cell * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEffects(s: GameState, opts: DrawOpts) {
    for (const f of s.effects) {
      const k = f.ttl / f.life;
      if (f.kind === "beam" && f.pts) {
        ctx.strokeStyle = `oklch(0.92 0.095 92 / ${k})`;
        ctx.lineWidth = Math.max(1, cell * 0.06 * k + 0.5);
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(px(f.pts[0]), py(f.pts[1]));
        for (let i = 2; i < f.pts.length; i += 2) ctx.lineTo(px(f.pts[i]), py(f.pts[i + 1]));
        ctx.stroke();
      } else if (f.kind === "rail" && f.pts) {
        // Driver railgun trace: a bright, fast-fading line.
        ctx.strokeStyle = `oklch(0.95 0.08 92 / ${k})`;
        ctx.lineCap = "round";
        ctx.lineWidth = Math.max(1, cell * 0.09 * k + 0.5);
        ctx.beginPath();
        ctx.moveTo(px(f.pts[0]), py(f.pts[1]));
        ctx.lineTo(px(f.pts[2]), py(f.pts[3]));
        ctx.stroke();
      } else if (f.kind === "surge") {
        // Overload pulse: an expanding gold ring out to its radius.
        const grow = (1 - k) * (f.radius ?? 2.4);
        ctx.strokeStyle = `oklch(0.86 0.1 92 / ${k * 0.85})`;
        ctx.lineWidth = cell * 0.1 * k + 1;
        ctx.beginPath();
        ctx.arc(px(f.x), py(f.y), grow * cell, 0, Math.PI * 2);
        ctx.stroke();
      } else if (f.kind === "leak") {
        ctx.strokeStyle = `oklch(0.62 0.19 28 / ${k * 0.8})`;
        ctx.lineWidth = cell * 0.12 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(px(f.x), py(f.y), cell * (0.4 + (1 - k) * 0.9), 0, Math.PI * 2);
        ctx.stroke();
      } else if (f.kind === "float" && f.text) {
        const rise = opts.reducedMotion ? 0 : (1 - k) * cell * 0.8;
        ctx.fillStyle = `oklch(0.9 0.095 92 / ${Math.min(1, k * 1.4)})`;
        ctx.font = `600 ${Math.round(cell * 0.34)}px ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(f.text, px(f.x), py(f.y) - cell * 0.4 - rise);
      } else if (f.kind === "burst" && !opts.reducedMotion) {
        ctx.fillStyle = `oklch(0.74 0.03 250 / ${k * 0.8})`;
        const n = 5;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const d = (1 - k) * cell * 0.5;
          ctx.beginPath();
          ctx.arc(px(f.x) + Math.cos(a) * d, py(f.y) + Math.sin(a) * d, cell * 0.05 * k + 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  /** A restrained gold frame while Overclock is live — signals the buff without
      flooding the board (One Voice Rule). */
  function drawOverclock(s: GameState, opts: DrawOpts) {
    const pulse = opts.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(opts.time * 6);
    const a = 0.1 + pulse * 0.08;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, `oklch(0.8 0.13 80 / ${a})`);
    grad.addColorStop(0.12, "oklch(0.8 0.13 80 / 0)");
    grad.addColorStop(0.88, "oklch(0.8 0.13 80 / 0)");
    grad.addColorStop(1, `oklch(0.8 0.13 80 / ${a})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  return { resize, draw };
}

// --- Small geometry helpers ---------------------------------------------

function polygon(c: CanvasRenderingContext2D, x: number, y: number, r: number, sides: number, rot: number) {
  c.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    const vx = x + Math.cos(a) * r;
    const vy = y + Math.sin(a) * r;
    if (i === 0) c.moveTo(vx, vy);
    else c.lineTo(vx, vy);
  }
  c.closePath();
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}
