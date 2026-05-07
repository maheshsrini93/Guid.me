/**
 * IL-015: two-person grip indicator.
 *
 * Draws a numbered circle ("1", "2", …) at each grip position plus a
 * "2 PERSON" badge in the top-right corner of the canvas. The numbered
 * circles are deliberately simple — a labeled circle is unambiguous and
 * legible at any scale, where a stylized hand glyph would be ambiguous
 * once anti-aliased to the kinds of sizes typical here (~24-30 px).
 */
import type { SKRSContext2D } from "@napi-rs/canvas";
import type { OverlayContext } from "./index";
import { OVERLAY_STYLE } from "./index";

export interface TwoPersonGripParams {
  /** Typically 2-4 positions where someone should grip the assembly. */
  positions: Array<{ x: number; y: number; label?: string }>;
}

const GRIP_RADIUS = 16;
const BADGE_PADDING_X = 10;
const BADGE_PADDING_Y = 6;
const BADGE_INSET = 12;

export function drawTwoPersonGrip(
  ctx: OverlayContext,
  params: TwoPersonGripParams,
): void {
  const { positions } = params;
  const c = ctx.ctx;

  // Numbered grip circles.
  positions.forEach((pos, i) => {
    const label = pos.label ?? String(i + 1);
    // Outer dark blue ring with white fill.
    c.fillStyle = "#ffffff";
    c.strokeStyle = OVERLAY_STYLE.motionColor;
    c.lineWidth = 3;
    c.beginPath();
    c.arc(pos.x, pos.y, GRIP_RADIUS, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    // Number/label centered.
    c.fillStyle = OVERLAY_STYLE.motionColor;
    c.font = `700 ${OVERLAY_STYLE.fontSizeLetter - 4}px ${OVERLAY_STYLE.fontFamilyLabel}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(label, pos.x, pos.y + 1);
  });

  // "2 PERSON" badge — top-right corner.
  drawBadge(c, ctx.width, "2 PERSON");
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function drawBadge(
  c: SKRSContext2D,
  canvasWidth: number,
  text: string,
): void {
  c.font = `700 ${OVERLAY_STYLE.fontSizeBadge}px ${OVERLAY_STYLE.fontFamilyLabel}`;
  const m = c.measureText(text);
  const w = Math.ceil(m.width) + BADGE_PADDING_X * 2;
  const h = OVERLAY_STYLE.fontSizeBadge + BADGE_PADDING_Y * 2;
  const x = canvasWidth - w - BADGE_INSET;
  const y = BADGE_INSET;

  // Filled rounded rect — dark blue, white text.
  const r = h / 2;
  c.fillStyle = OVERLAY_STYLE.motionColor;
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
  c.fill();

  c.fillStyle = "#ffffff";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(text, x + w / 2, y + h / 2 + 1);
}
