/**
 * IL-013: side-by-side OK / NOK comparison framing.
 *
 * Draws the framing, badges, and descriptions ONLY — this primitive does
 * not draw the OK/NOK images themselves. The orchestrator (T-089) is
 * responsible for compositing the actual correct/incorrect renders into
 * `okFrame` and `nokFrame` regions before calling this primitive (or
 * after — the borders and badges sit on top either way, as long as call
 * order is consistent).
 *
 * Layout per frame:
 *   - Thin colored border around the frame (green for OK, red for NOK)
 *   - Round badge in top-right corner of the frame (✓ / ✗)
 *   - Description text below the frame, wrapped to frame width
 */
import type { SKRSContext2D } from "@napi-rs/canvas";
import type { OverlayContext } from "./index";
import { OVERLAY_STYLE } from "./index";

export interface OkNokParams {
  okFrame: { x: number; y: number; w: number; h: number };
  nokFrame: { x: number; y: number; w: number; h: number };
  okDescription: string;
  nokDescription: string;
}

const BADGE_RADIUS = 16; // 32 px diameter
const BADGE_INSET = 10;

export function drawOkNok(ctx: OverlayContext, params: OkNokParams): void {
  const { okFrame, nokFrame, okDescription, nokDescription } = params;
  const c = ctx.ctx;

  drawFrameWithBadge(c, okFrame, OVERLAY_STYLE.okColor, true);
  drawWrappedDescription(c, okFrame, okDescription, OVERLAY_STYLE.okColor, ctx.height);

  drawFrameWithBadge(c, nokFrame, OVERLAY_STYLE.warningColor, false);
  drawWrappedDescription(
    c,
    nokFrame,
    nokDescription,
    OVERLAY_STYLE.warningColor,
    ctx.height,
  );
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function drawFrameWithBadge(
  c: SKRSContext2D,
  frame: { x: number; y: number; w: number; h: number },
  color: string,
  isOk: boolean,
): void {
  // Border.
  c.strokeStyle = color;
  c.lineWidth = 2;
  c.strokeRect(frame.x, frame.y, frame.w, frame.h);

  // Badge — circle in top-right.
  const cx = frame.x + frame.w - BADGE_INSET - BADGE_RADIUS;
  const cy = frame.y + BADGE_INSET + BADGE_RADIUS;
  c.fillStyle = color;
  c.beginPath();
  c.arc(cx, cy, BADGE_RADIUS, 0, Math.PI * 2);
  c.fill();

  // Glyph (✓ or ✗) drawn as strokes in white for crisp legibility at any size.
  c.strokeStyle = "#ffffff";
  c.lineWidth = 3;
  c.lineCap = "round";
  c.lineJoin = "round";
  if (isOk) {
    c.beginPath();
    c.moveTo(cx - 7, cy + 1);
    c.lineTo(cx - 2, cy + 6);
    c.lineTo(cx + 8, cy - 5);
    c.stroke();
  } else {
    c.beginPath();
    c.moveTo(cx - 6, cy - 6);
    c.lineTo(cx + 6, cy + 6);
    c.moveTo(cx + 6, cy - 6);
    c.lineTo(cx - 6, cy + 6);
    c.stroke();
  }
}

function drawWrappedDescription(
  c: SKRSContext2D,
  frame: { x: number; y: number; w: number; h: number },
  text: string,
  color: string,
  canvasHeight: number,
): void {
  const fontSize = OVERLAY_STYLE.fontSizeSubject;
  c.font = `500 ${fontSize}px ${OVERLAY_STYLE.fontFamilyLabel}`;
  c.fillStyle = color;
  c.textAlign = "center";
  c.textBaseline = "top";

  const maxWidth = frame.w - 8;
  const lines = wrapText(c, text, maxWidth);
  const lineHeight = fontSize + 4;
  let y = frame.y + frame.h + 8;

  // Clamp so the description does not run off the canvas.
  const maxBottom = canvasHeight - 4;
  for (const line of lines) {
    if (y + lineHeight > maxBottom) break;
    c.fillText(line, frame.x + frame.w / 2, y);
    y += lineHeight;
  }
}

function wrapText(
  c: SKRSContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (c.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
