/**
 * Programmatic illustration overlay primitives (T-088).
 *
 * Six drawing primitives that render the IL-* annotation layer onto a
 * `@napi-rs/canvas` Canvas2D surface. Used by the CAD illustration
 * sub-implementation (T-089) to composite annotations on top of the base
 * CAD render produced by `three-renderer.ts` (T-087).
 *
 * # Backend choice — `@napi-rs/canvas`
 *
 * Three options were considered for primitives:
 *   A. `@napi-rs/canvas` — prebuilt napi binary, full Canvas2D API
 *   B. Pure-JS rasterizer on a `pngjs` framebuffer with a bitmap font
 *   C. SVG strings via `@resvg/resvg-js`
 *
 * Option A was chosen because it gives us:
 *   - Real text rendering (system fonts) — IKEA-grade callouts and labels
 *     need this; bitmap fonts look toy-grade
 *   - Browser-parity Canvas2D API — `arc`, `bezierCurveTo`, transforms,
 *     `measureText`, etc. Half the primitives below would be hundreds of
 *     extra LOC without it.
 *   - Prebuilt platform binary — no node-gyp, no clang, no problem with
 *     spaces in the worktree path (which forced `three-renderer.ts` to a
 *     pure-JS rasterizer in the first place; see its top-of-file note).
 *
 * One new dep added in `package.json`: `@napi-rs/canvas`.
 *
 * # Surface contract — `OverlayContext`
 *
 * Every primitive takes an `OverlayContext`. The context wraps a Canvas
 * plus its 2D rendering context. The orchestrator (T-089) will:
 *   1. Read the base PNG produced by T-087
 *   2. `createOverlayContext(width, height)` of matching size
 *   3. Draw the base PNG onto it via `ctx.drawImage(base, 0, 0)`
 *   4. For each annotation field on the `EnforcedStep`, call the matching
 *      primitive (`drawPartLabel`, `drawMotionArrow`, …)
 *   5. Encode `canvas.toBuffer("image/png")` and write to disk
 *
 * Primitives never read or compose the base render themselves — that is
 * the orchestrator's job. They draw onto the same Canvas the orchestrator
 * already filled with the base layer.
 */
import { createCanvas, type Canvas, type SKRSContext2D } from "@napi-rs/canvas";

/**
 * Drawing surface passed to every primitive. Holds the napi-rs Canvas, its
 * 2D context, and the target dimensions (in pixels). Pixel coordinates in
 * primitive params are in canvas-space: origin top-left, x right, y down.
 */
export interface OverlayContext {
  canvas: Canvas;
  ctx: SKRSContext2D;
  width: number;
  height: number;
}

/** Convenience factory used by the orchestrator. */
export function createOverlayContext(
  width: number,
  height: number,
): OverlayContext {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  return { canvas, ctx, width, height };
}

// ============================================================
// Shared style tokens — keep production-clean, IKEA-spec.
// ============================================================

export const OVERLAY_STYLE = {
  motionColor: "#1e3a8a", // dark blue, IL-010 / IL-011
  warningColor: "#dc2626", // red, NOK / safety
  okColor: "#16a34a", // green, OK
  leaderColor: "#374151", // neutral gray, leader lines
  labelBg: "#ffffff", // label box background
  labelBorder: "#111827", // label box border
  labelText: "#111827", // label letter / subject text
  fontFamilyLabel: '"Helvetica Neue", "Helvetica", "Arial", sans-serif',
  fontSizeLetter: 24, // single-letter part labels
  fontSizeSubject: 18, // descriptions, subject text
  fontSizeBadge: 14, // "2 PERSON" badge text
  labelBoxRadius: 4, // rounded label rect
  labelBoxPaddingX: 10,
  labelBoxPaddingY: 4,
  arrowWidth: 3.5, // motion / rotation arrow stroke width
  leaderWidth: 1.5, // leader lines, frames
} as const;

// ============================================================
// Re-exports — one primitive per file.
// ============================================================

export { drawPartLabel, type PartLabelParams } from "./labels";
export { drawMotionArrow, type MotionArrowParams } from "./arrows";
export { drawRotationIndicator, type RotationParams } from "./rotation";
export { drawDetailCallout, type CalloutParams } from "./callout";
export { drawOkNok, type OkNokParams } from "./oknok";
export { drawTwoPersonGrip, type TwoPersonGripParams } from "./grip";
