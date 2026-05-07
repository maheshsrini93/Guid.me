/**
 * IL-011: rotation indicator.
 *
 * A circular arc spanning `sweepDegrees` around `center` with an arrowhead
 * at the end pointing in the rotation direction. Optional inline label
 * (e.g. "¼ turn") is drawn next to the arc midpoint with a small
 * background pill so it stays readable over the base render.
 */
import type { SKRSContext2D } from "@napi-rs/canvas";
import type { OverlayContext } from "./index";
import { OVERLAY_STYLE } from "./index";

export interface RotationParams {
  center: { x: number; y: number };
  radius: number;
  direction: "clockwise" | "counter-clockwise";
  /** Sweep angle in degrees, e.g. 90 for a quarter turn. */
  sweepDegrees: number;
  /** Optional label like "¼ turn". */
  label?: string;
  /** Override default motion color. */
  color?: string;
}

const ARROWHEAD_LENGTH = 14;
const ARROWHEAD_HALF_WIDTH = 7;
const START_ANGLE_DEFAULT = -Math.PI / 2; // start at top of circle

export function drawRotationIndicator(
  ctx: OverlayContext,
  params: RotationParams,
): void {
  const { center, radius, direction, sweepDegrees, label, color } = params;
  const c = ctx.ctx;
  const stroke = color ?? OVERLAY_STYLE.motionColor;

  const sweepRad = (sweepDegrees * Math.PI) / 180;
  const sign = direction === "clockwise" ? 1 : -1;
  const startAngle = START_ANGLE_DEFAULT;
  const endAngle = startAngle + sign * sweepRad;

  // Pull the arc just shy of `endAngle` so the arrowhead sits flush at
  // the visual end without the line poking through it.
  const tipPullback = ARROWHEAD_LENGTH / Math.max(radius, 1);
  const drawEndAngle = endAngle - sign * tipPullback * 0.6;

  c.strokeStyle = stroke;
  c.lineWidth = OVERLAY_STYLE.arrowWidth;
  c.lineCap = "round";
  c.beginPath();
  c.arc(
    center.x,
    center.y,
    radius,
    startAngle,
    drawEndAngle,
    direction === "counter-clockwise",
  );
  c.stroke();

  // Arrowhead at end of arc, tangent to the circle.
  const tipX = center.x + Math.cos(endAngle) * radius;
  const tipY = center.y + Math.sin(endAngle) * radius;
  // Tangent direction at end angle (rotated 90° from radius vector).
  const tangentX = -Math.sin(endAngle) * sign;
  const tangentY = Math.cos(endAngle) * sign;
  drawArrowhead(c, { x: tipX, y: tipY }, { x: tangentX, y: tangentY }, stroke);

  // Optional label at arc midpoint, positioned slightly outside the arc.
  if (label) {
    const midAngle = startAngle + sign * sweepRad * 0.5;
    const lx = center.x + Math.cos(midAngle) * (radius + 22);
    const ly = center.y + Math.sin(midAngle) * (radius + 22);
    drawLabelPill(c, lx, ly, label, stroke);
  }
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function drawArrowhead(
  c: SKRSContext2D,
  tip: { x: number; y: number },
  tangent: { x: number; y: number },
  fill: string,
): void {
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
