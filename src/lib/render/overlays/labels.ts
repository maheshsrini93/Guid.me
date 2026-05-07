/**
 * IL-002: single-letter part labels with leader lines.
 *
 * Each part on a step gets one letter (A, B, C, …) drawn in a small white
 * box outside the part's projection, with a thin leader line back to the
 * part's pixel-space anchor (the centroid of its 2D projection). This
 * primitive places ONE label and returns its bounding box so callers can
 * accumulate `existingLabels` and avoid overlap on subsequent calls.
 *
 * Layout strategy (deliberately simple — IL-002 only requires that labels
 * are legible and outside the part):
 *   1. Compute the radial direction from canvas center to the part anchor.
 *   2. Push the label outward from the anchor along that direction by an
 *      initial distance, so the label sits OUTSIDE the part projection.
 *   3. If the candidate box collides with any `existingLabels`, step
 *      further outward, then around the periphery in 30° increments, until
 *      a free slot is found or we hit a max-iteration cap.
 *   4. Clamp the box inside the canvas margin (4 px).
 */
import type { SKRSContext2D } from "@napi-rs/canvas";
import type { OverlayContext } from "./index";
import { OVERLAY_STYLE } from "./index";

export interface PartLabelParams {
  /** "A", "B", … — single uppercase letter. */
  letter: string;
  /** Centroid of the part's 2D projection on the canvas (pixel coords). */
  partAnchor: { x: number; y: number };
  /** Already-placed label boxes, used for greedy collision avoidance. */
  existingLabels: Array<{ x: number; y: number; w: number; h: number }>;
}

export interface PlacedLabelBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const INITIAL_PUSH = 70; // px from anchor along radial direction
const STEP_OUT = 25; // px to step outward on collision
const PERIPHERAL_ANGLES = [
  -30, 30, -60, 60, -90, 90, -120, 120, -150, 150, 180,
];
const MAX_OUTWARD_STEPS = 6;
const MARGIN = 4;

export function drawPartLabel(
  ctx: OverlayContext,
  params: PartLabelParams,
): PlacedLabelBox {
  const { letter, partAnchor, existingLabels } = params;
  const { ctx: c, width, height } = ctx;

  // Measure the label box dimensions.
  c.font = `600 ${OVERLAY_STYLE.fontSizeLetter}px ${OVERLAY_STYLE.fontFamilyLabel}`;
  const m = c.measureText(letter);
  const textW = Math.ceil(m.width);
  const textH = OVERLAY_STYLE.fontSizeLetter; // approximate
  const w = textW + OVERLAY_STYLE.labelBoxPaddingX * 2;
  const h = textH + OVERLAY_STYLE.labelBoxPaddingY * 2;

  // Direction from canvas center to anchor (radially outward).
  const cx = width / 2;
  const cy = height / 2;
  const baseDx = partAnchor.x - cx;
  const baseDy = partAnchor.y - cy;
  const baseLen = Math.hypot(baseDx, baseDy) || 1;
  const baseAngle = Math.atan2(baseDy, baseDx);

  // Search: try the radial direction first, then peripheral angles, with
  // increasing outward steps. Greedy first-fit is enough for the demo.
  const angles = [0, ...PERIPHERAL_ANGLES.map((deg) => (deg * Math.PI) / 180)];
  let placed: PlacedLabelBox | null = null;

  outer: for (let step = 0; step <= MAX_OUTWARD_STEPS; step++) {
    const distance = INITIAL_PUSH + step * STEP_OUT;
    for (const offsetAngle of angles) {
      const a = baseAngle + offsetAngle;
      const cxBox = partAnchor.x + Math.cos(a) * distance;
      const cyBox = partAnchor.y + Math.sin(a) * distance;
      const x = clamp(cxBox - w / 2, MARGIN, width - w - MARGIN);
      const y = clamp(cyBox - h / 2, MARGIN, height - h - MARGIN);
      const candidate = { x, y, w, h };
      if (!collides(candidate, existingLabels)) {
        placed = candidate;
        break outer;
      }
    }
  }

  // Fallback: even if we never found a clean slot, place along the
  // initial radial direction at max distance — overlap is preferable to
  // not drawing the label at all.
  if (!placed) {
    const distance = INITIAL_PUSH + MAX_OUTWARD_STEPS * STEP_OUT;
    const cxBox = partAnchor.x + (baseDx / baseLen) * distance;
    const cyBox = partAnchor.y + (baseDy / baseLen) * distance;
    placed = {
      x: clamp(cxBox - w / 2, MARGIN, width - w - MARGIN),
      y: clamp(cyBox - h / 2, MARGIN, height - h - MARGIN),
      w,
      h,
    };
  }

  // Draw leader: from label edge (closest side to anchor) to anchor.
  const labelCx = placed.x + placed.w / 2;
  const labelCy = placed.y + placed.h / 2;
  const leaderStart = clipPointToRect(partAnchor, placed, labelCx, labelCy);
  c.strokeStyle = OVERLAY_STYLE.leaderColor;
  c.lineWidth = OVERLAY_STYLE.leaderWidth;
  c.beginPath();
  c.moveTo(leaderStart.x, leaderStart.y);
  c.lineTo(partAnchor.x, partAnchor.y);
  c.stroke();

  // Small dot at the part anchor (1.5 px) to make the leader's target clear.
  c.fillStyle = OVERLAY_STYLE.leaderColor;
  c.beginPath();
  c.arc(partAnchor.x, partAnchor.y, 2, 0, Math.PI * 2);
  c.fill();

  // Draw label box (rounded white rect with thin border).
  drawRoundedRect(c, placed.x, placed.y, placed.w, placed.h, OVERLAY_STYLE.labelBoxRadius);
  c.fillStyle = OVERLAY_STYLE.labelBg;
  c.fill();
  c.strokeStyle = OVERLAY_STYLE.labelBorder;
  c.lineWidth = 1.5;
  c.stroke();

  // Draw letter centered.
  c.fillStyle = OVERLAY_STYLE.labelText;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(letter, labelCx, labelCy + 1);

  return placed;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function collides(
  a: { x: number; y: number; w: number; h: number },
  others: Array<{ x: number; y: number; w: number; h: number }>,
): boolean {
  for (const b of others) {
    if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
      return true;
    }
  }
  return false;
}

/** Find the point on the edge of `box` closest to the line from box center to `target`. */
function clipPointToRect(
  target: { x: number; y: number },
  box: { x: number; y: number; w: number; h: number },
  cx: number,
  cy: number,
): { x: number; y: number } {
  const dx = target.x - cx;
  const dy = target.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const halfW = box.w / 2;
  const halfH = box.h / 2;
  const scale = Math.min(halfW / Math.abs(dx || 1e-9), halfH / Math.abs(dy || 1e-9));
  return { x: cx + dx * scale, y: cy + dy * scale };
}

function drawRoundedRect(
  c: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
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
}
