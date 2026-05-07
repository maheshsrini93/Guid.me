/**
 * IL-009: detail callout — magnified inset of a region of interest.
 *
 * Draws three pieces:
 *   1. A thin circle ("balloon") around `sourceRegion` in the main image.
 *   2. A leader line from the source balloon to the inset frame.
 *   3. A framed inset rectangle at `insetPosition`, optionally blitting
 *      pre-rendered magnified RGBA bytes inside it. If no bytes are
 *      provided the inset shows a placeholder rectangle with the subject
 *      label centered — useful while T-089 is still wiring up the crop
 *      pipeline.
 *
 * The orchestrator (T-089) is responsible for cropping + scaling the base
 * render down to `magnifiedRgba` (RGBA, width = insetPosition.w, height =
 * insetPosition.h). This primitive does not crop or scale.
 */
import type { OverlayContext } from "./index";
import { OVERLAY_STYLE } from "./index";
import { createCanvas, ImageData } from "@napi-rs/canvas";

export interface CalloutParams {
  sourceRegion: { x: number; y: number; w: number; h: number };
  insetPosition: { x: number; y: number; w: number; h: number };
  /** Pre-cropped + pre-scaled RGBA bytes sized to insetPosition.w/h. */
  magnifiedRgba?: Uint8Array;
  subjectLabel: string;
}

export function drawDetailCallout(
  ctx: OverlayContext,
  params: CalloutParams,
): void {
  const { sourceRegion, insetPosition, magnifiedRgba, subjectLabel } = params;
  const c = ctx.ctx;

  // 1. Source balloon — circle around the region centroid, radius set to
  // enclose the region with a small margin.
  const sx = sourceRegion.x + sourceRegion.w / 2;
  const sy = sourceRegion.y + sourceRegion.h / 2;
  const sRadius = Math.hypot(sourceRegion.w, sourceRegion.h) / 2 + 6;
  c.strokeStyle = OVERLAY_STYLE.leaderColor;
  c.lineWidth = OVERLAY_STYLE.leaderWidth;
  c.beginPath();
  c.arc(sx, sy, sRadius, 0, Math.PI * 2);
  c.stroke();

  // 2. Inset frame — drawn before the leader so the leader visually
  // terminates against the frame edge.
  // Edge of source balloon closest to the inset center.
  const insetCx = insetPosition.x + insetPosition.w / 2;
  const insetCy = insetPosition.y + insetPosition.h / 2;
  const dx = insetCx - sx;
  const dy = insetCy - sy;
  const len = Math.hypot(dx, dy) || 1;
  const balloonEdge = {
    x: sx + (dx / len) * sRadius,
    y: sy + (dy / len) * sRadius,
  };
  // Closest inset edge point — clip the line to inset rectangle from its center.
  const insetEdge = clipLineToRect(
    { x: insetCx, y: insetCy },
    balloonEdge,
    insetPosition,
  );

  // Leader line.
  c.strokeStyle = OVERLAY_STYLE.leaderColor;
  c.lineWidth = OVERLAY_STYLE.leaderWidth;
  c.beginPath();
  c.moveTo(balloonEdge.x, balloonEdge.y);
  c.lineTo(insetEdge.x, insetEdge.y);
  c.stroke();

  // 3. Inset frame + contents.
  if (magnifiedRgba && magnifiedRgba.length === insetPosition.w * insetPosition.h * 4) {
    // Build an ImageData and stamp it into the canvas via a temp scratch
    // canvas (napi-rs canvas's `putImageData` doesn't blend, so we use
    // `drawImage` for a clean composite that respects existing pixels).
    const scratch = createCanvas(insetPosition.w, insetPosition.h);
    const sctx = scratch.getContext("2d");
    const img = new ImageData(
      new Uint8ClampedArray(magnifiedRgba),
      insetPosition.w,
      insetPosition.h,
    );
    sctx.putImageData(img, 0, 0);
    c.drawImage(scratch, insetPosition.x, insetPosition.y);
  } else {
    // Placeholder: light-gray fill with subject label.
    c.fillStyle = "#f3f4f6";
    c.fillRect(insetPosition.x, insetPosition.y, insetPosition.w, insetPosition.h);
    c.fillStyle = OVERLAY_STYLE.labelText;
    c.font = `500 ${OVERLAY_STYLE.fontSizeSubject}px ${OVERLAY_STYLE.fontFamilyLabel}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(
      subjectLabel,
      insetPosition.x + insetPosition.w / 2,
      insetPosition.y + insetPosition.h / 2,
    );
  }

  // Inset border (drawn last so it sits over magnified content).
  c.strokeStyle = OVERLAY_STYLE.labelBorder;
  c.lineWidth = 2;
  c.strokeRect(
    insetPosition.x,
    insetPosition.y,
    insetPosition.w,
    insetPosition.h,
  );

  // Subject label below the inset.
  c.fillStyle = OVERLAY_STYLE.labelText;
  c.font = `600 ${OVERLAY_STYLE.fontSizeSubject - 2}px ${OVERLAY_STYLE.fontFamilyLabel}`;
  c.textAlign = "center";
  c.textBaseline = "top";
  c.fillText(
    subjectLabel,
    insetCx,
    insetPosition.y + insetPosition.h + 6,
  );
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

/** Clip a ray from `center` toward `target` to the rectangle perimeter. */
function clipLineToRect(
  center: { x: number; y: number },
  target: { x: number; y: number },
  rect: { x: number; y: number; w: number; h: number },
): { x: number; y: number } {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  if (dx === 0 && dy === 0) return { x: center.x, y: center.y };
  const halfW = rect.w / 2;
  const halfH = rect.h / 2;
  const scale = Math.min(
    halfW / Math.abs(dx || 1e-9),
    halfH / Math.abs(dy || 1e-9),
  );
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}
