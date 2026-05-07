/**
 * IL-010: motion arrows.
 *
 * A solid line (straight or quadratic-curve) from `start` to `end` with a
 * filled triangular arrowhead at `end`. Optional curvature offsets the
 * control point perpendicular to the chord; positive curves "right" of
 * start→end direction, negative curves left. Optional label is drawn at
 * the curve midpoint with a small white background pill so it stays
 * legible over the base render.
 *
 * The orchestrator (T-089) is responsible for resolving the descriptive
 * `EnforcedStep.arrowDirection` / `arrowStart` / `arrowEnd` strings to
 * pixel anchors before calling this primitive.
 */
import type { SKRSContext2D } from "@napi-rs/canvas";
import type { OverlayContext } from "./index";
import { OVERLAY_STYLE } from "./index";

export interface MotionArrowParams {
  start: { x: number; y: number };
  end: { x: number; y: number };
  /** 0 = straight; +/- magnitude bends the arc perpendicular to the chord. */
  curvature?: number;
  /** Optional label drawn at midpoint, e.g. "push" or "↓". */
  label?: string;
  /** Override default motion color. */
  color?: string;
}

const ARROWHEAD_LENGTH = 16;
const ARROWHEAD_HALF_WIDTH = 8;

export function drawMotionArrow(
  ctx: OverlayContext,
  params: MotionArrowParams,
): void {
  const { start, end, curvature = 0, label, color } = params;
  const c = ctx.ctx;
  const stroke = color ?? OVERLAY_STYLE.motionColor;

  // Compute control point for curved path. Normal vector to start→end.
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const ctrlX = midX + nx * curvature;
  const ctrlY = midY + ny * curvature;

  // Stop the line short of `end` so the arrowhead's flat back doesn't
  // peek past the line — visually cleaner than overlapping them.
  const tangent = curvature === 0
    ? { x: dx / length, y: dy / length }
    : tangentAtT(start, { x: ctrlX, y: ctrlY }, end, 1);
  const lineEnd = {
    x: end.x - tangent.x * ARROWHEAD_LENGTH * 0.6,
    y: end.y - tangent.y * ARROWHEAD_LENGTH * 0.6,
  };

  // Draw shaft.
  c.strokeStyle = stroke;
  c.lineWidth = OVERLAY_STYLE.arrowWidth;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  c.moveTo(start.x, start.y);
  if (curvature === 0) {
    c.lineTo(lineEnd.x, lineEnd.y);
  } else {
    c.quadraticCurveTo(ctrlX, ctrlY, lineEnd.x, lineEnd.y);
  }
  c.stroke();

  // Draw arrowhead — filled triangle pointing along `tangent` at `end`.
  drawArrowhead(c, end, tangent, stroke);

  // Optional label at the geometric midpoint of the path.
  if (label) {
    const labelPos = curvature === 0
      ? { x: midX, y: midY }
      : pointOnCurve(start, { x: ctrlX, y: ctrlY }, end, 0.5);
    drawLabelPill(c, labelPos.x, labelPos.y, label, stroke);
  }
}

// ------------------------------------------------------------
// Helpers (file-local so each primitive stays self-contained)
// ------------------------------------------------------------

function drawArrowhead(
  c: SKRSContext2D,
  tip: { x: number; y: number },
  tangent: { x: number; y: number },
  fill: string,
): void {
  // Perpendicular to tangent.
  const px = -tangent.y;
  const py = tangent.x;
  const baseX = tip.x - tangent.x * ARROWHEAD_LENGTH;
  const baseY = tip.y - tangent.y * ARROWHEAD_LENGTH;
  c.fillStyle = fill;
  c.beginPath();
  c.moveTo(tip.x, tip.y);
  c.lineTo(baseX + px * ARROWHEAD_HALF_WIDTH, baseY + py * ARROWHEAD_HALF_WIDTH);
  c.lineTo(baseX - px * ARROWHEAD_HALF_WIDTH, baseY - py * ARROWHEAD_HALF_WIDTH);
  c.closePath();
  c.fill();
}

function tangentAtT(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  // Derivative of quadratic Bezier: B'(t) = 2(1-t)(P1-P0) + 2t(P2-P1)
  const tx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const ty = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  const len = Math.hypot(tx, ty) || 1;
  return { x: tx / len, y: ty / len };
}

function pointOnCurve(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const it = 1 - t;
  return {
    x: it * it * p0.x + 2 * it * t * p1.x + t * t * p2.x,
    y: it * it * p0.y + 2 * it * t * p1.y + t * t * p2.y,
  };
}

function drawLabelPill(
  c: SKRSContext2D,
  cx: number,
  cy: number,
  text: string,
  borderColor: string,
): void {
  c.font = `500 ${OVERLAY_STYLE.fontSizeSubject}px ${OVERLAY_STYLE.fontFamilyLabel}`;
  const m = c.measureText(text);
  const w = Math.ceil(m.width) + 14;
  const h = OVERLAY_STYLE.fontSizeSubject + 8;
  const x = cx - w / 2;
  const y = cy - h / 2;
  // White rounded background pill.
  c.fillStyle = "#ffffff";
  c.strokeStyle = borderColor;
  c.lineWidth = 1.25;
  const r = h / 2;
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
  c.stroke();
  c.fillStyle = borderColor;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(text, cx, cy + 1);
}
