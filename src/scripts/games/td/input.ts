/* Pointer + keyboard handling. Translates raw events into grid-cell taps,
   hover, and named commands; it never touches game state directly — index.ts
   owns the handlers and routes them through the engine. */

import { TUNING } from "./config";

export interface InputHandlers {
  /** A click/tap landed on grid cell (c, r) — place or select. */
  tapCell(c: number, r: number): void;
  /** The pointer is hovering grid cell (c, r), or null when it leaves. */
  hoverCell(c: number, r: number | null): void;
  /** Named keyboard command. `build` carries the 0-based tower index. */
  command(
    name: "build" | "start" | "speed" | "pause" | "deselect",
    index?: number,
  ): void;
}

export function attachInput(canvas: HTMLCanvasElement, h: InputHandlers) {
  const cellAt = (clientX: number, clientY: number): { c: number; r: number } | null => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return null;
    const c = Math.floor(((clientX - rect.left) / rect.width) * TUNING.cols);
    const r = Math.floor(((clientY - rect.top) / rect.height) * TUNING.rows);
    if (c < 0 || c >= TUNING.cols || r < 0 || r >= TUNING.rows) return null;
    return { c, r };
  };

  canvas.addEventListener("pointerdown", (e) => {
    const cell = cellAt(e.clientX, e.clientY);
    if (cell) {
      e.preventDefault();
      h.tapCell(cell.c, cell.r);
    }
  });

  // Hover ghost — mouse only; on touch the tap itself is the commit.
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const cell = cellAt(e.clientX, e.clientY);
    h.hoverCell(cell?.c ?? 0, cell ? cell.r : null);
  });
  canvas.addEventListener("pointerleave", () => h.hoverCell(0, null));

  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    switch (e.key) {
      case "1":
      case "2":
      case "3":
      case "4":
        h.command("build", Number(e.key) - 1);
        break;
      case " ":
        e.preventDefault();
        h.command("start");
        break;
      case "f":
      case "F":
        h.command("speed");
        break;
      case "p":
      case "P":
        h.command("pause");
        break;
      case "Escape":
        h.command("deselect");
        break;
    }
  });
}
