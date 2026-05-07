/**
 * CAD illustration sub-implementation (T-089).
 *
 * Per-step CAD-rendered PNG with programmatic overlays. Used when
 * `state.extractedSource.structuredMetadata` is present — see ADR-0002.
 *
 * Per step, the orchestration is:
 *   1. Resolve which Components are *active* this step vs already
 *      *installed* in earlier steps. Hidden Components are everything else.
 *   2. Call {@link renderStepBase} → base PNG + projection helpers.
 *   3. Open a Canvas2D OverlayContext at the same dimensions, paint the
 *      base PNG into it, then layer overlays per the EnforcedStep fields.
 *   4. Encode the composited canvas to PNG and write it as the final
 *      illustration. Cost line is $0 (no Gemini calls).
 *
 * Mesh data isn't persisted in `ExtractedSource`, so this impl re-parses
 * the STEP file from `state.documentPath` once per render. The parse
 * takes a few hundred ms even for moderately complex assemblies, so it's
 * acceptable to amortize across a multi-step render.
 */
import path from "path";
import { unlink, writeFile } from "fs/promises";
import { loadImage } from "@napi-rs/canvas";
import type {
  ExtractedSource,
  EnforcedStep,
  GeneratedIllustration,
  StructuredPartRef,
} from "@/types/agents";
import { getIllustrationsDir } from "@/lib/utils/file-storage";
import { parseStep } from "@/lib/agents/source-adapter/cad/step-parser";
import { PipelineCancelledError } from "../../types";
import {
  createOverlayContext,
  drawDetailCallout,
  drawMotionArrow,
  drawPartLabel,
  drawRotationIndicator,
  drawTwoPersonGrip,
  type OverlayContext,
} from "@/lib/render/overlays";
import { renderStepBase, type RenderStepBaseResult } from "./base-renderer";
import type {
  IllustrationRendererImpl,
  RenderInput,
  RenderOutput,
} from "../types";

const PROMPT_VERSION = "illustration-renderer.cad@1.0";
const MODEL = "internal-cad-renderer";
const RENDER_WIDTH = 1600;
const RENDER_HEIGHT = 1200;
const LABEL_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // skip 'I' / 'O' per IL-007

class CadIllustrationRenderer implements IllustrationRendererImpl {
  readonly name = "cad";

  canHandle(extractedSource: ExtractedSource | undefined): boolean {
    return !!extractedSource?.structuredMetadata;
  }

  async render(input: RenderInput): Promise<RenderOutput> {
    const { guide, jobId, context } = input;
    const stepFilePath = context.pipelineState.documentPath;
    if (!stepFilePath) {
      throw new Error(
        "CAD illustration renderer requires `pipelineState.documentPath` to point at the STEP file.",
      );
    }

    const steps = guide.steps;
    const totalSteps = steps.length;

    context.reportProgress(
      1,
      "Re-parsing STEP file for mesh data",
    );
    const parsed = await parseStep(stepFilePath);
    const partsCatalog = parsed.partsCatalog;

    const illustrationsDir = getIllustrationsDir(jobId);
    const illustrations: GeneratedIllustration[] = [];
    const installedComponentIds = new Set<string>();

    for (let i = 0; i < totalSteps; i++) {
      if (context.isCancelled()) {
        throw new PipelineCancelledError(jobId);
      }

      const step = steps[i];
      const stepStart = Date.now();

      const progressPct = Math.round(((i + 0.5) / totalSteps) * 100);
      context.reportProgress(
        progressPct,
        `Rendering CAD illustration ${i + 1} of ${totalSteps}...`,
      );

      // 1. Resolve active components for this step.
      const activeComponentIds = resolveActiveComponentIds(
        step.parts,
        partsCatalog,
      );

      // 2. Base render.
      const filename = `step-${String(step.stepNumber).padStart(3, "0")}.png`;
      const filePath = path.join(illustrationsDir, filename);
      const baseTmpPath = `${filePath}.base.png`;

      const baseResult = await renderStepBase({
        meshes: parsed.meshes,
        activeComponentIds,
        installedComponentIds: new Set(installedComponentIds),
        outputPath: baseTmpPath,
        width: RENDER_WIDTH,
        height: RENDER_HEIGHT,
      });

      // 3. Composite overlays on top of the base.
      const overlay = createOverlayContext(RENDER_WIDTH, RENDER_HEIGHT);
      const baseImage = await loadImage(baseTmpPath);
      overlay.ctx.drawImage(baseImage, 0, 0, RENDER_WIDTH, RENDER_HEIGHT);

      drawAllOverlays(overlay, step, partsCatalog, baseResult, activeComponentIds);

      // 4. Encode and persist.
      const pngBuffer = await overlay.canvas.encode("png");
      await writeFile(filePath, pngBuffer);
      // Drop the intermediate base PNG to keep the storage dir tidy.
      await unlink(baseTmpPath).catch(() => undefined);

      const stepDuration = Date.now() - stepStart;

      context.recordCost({
        agent: "illustration-renderer",
        model: MODEL,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        durationMs: stepDuration,
        timestamp: new Date(),
      });

      illustrations.push({
        stepNumber: step.stepNumber,
        imageBuffer: Buffer.from(pngBuffer),
        mimeType: "image/png",
        filePath,
        modelUsed: MODEL,
        width: RENDER_WIDTH,
        height: RENDER_HEIGHT,
        costUsd: 0,
        durationMs: stepDuration,
        complexity: step.parts.length >= 3 ? "complex" : "simple",
        attempt: 1,
      });

      // Carry forward to the next step's fade layer.
      for (const id of activeComponentIds) {
        installedComponentIds.add(id);
      }
    }

    return {
      illustrations,
      totalCostUsd: 0,
      primaryModel: MODEL,
      promptVersion: PROMPT_VERSION,
    };
  }
}

export const cadRenderer = new CadIllustrationRenderer();

// ============================================================
// Overlay composition (per-step)
// ============================================================

function drawAllOverlays(
  overlay: OverlayContext,
  step: EnforcedStep,
  partsCatalog: StructuredPartRef[],
  baseResult: RenderStepBaseResult,
  activeComponentIds: Set<string>,
): void {
  // 1. Part labels (IL-002): one letter per part on this step.
  const placedLabels: Array<{ x: number; y: number; w: number; h: number }> = [];
  for (let pi = 0; pi < step.parts.length; pi++) {
    const part = step.parts[pi];
    const componentId = resolveComponentId(part, partsCatalog);
    if (!componentId) continue;
    const anchor = baseResult.project(componentId);
    if (!anchor) continue;
    const placed = drawPartLabel(overlay, {
      letter: LABEL_LETTERS[pi % LABEL_LETTERS.length],
      partAnchor: anchor,
      existingLabels: placedLabels,
    });
    placedLabels.push(placed);
  }

  // 2. Motion arrow (IL-010).
  if (step.arrowDirection || step.arrowStart || step.arrowEnd) {
    const start =
      anchorForName(step.arrowStart, partsCatalog, baseResult) ??
      canvasCenter(overlay);
    const end =
      anchorForName(step.arrowEnd, partsCatalog, baseResult) ??
      offsetByDirection(start, step.arrowDirection ?? "downward", 220);
    drawMotionArrow(overlay, { start, end, label: step.arrowDirection ?? undefined });
  }

  // 3. Rotation indicator (IL-011).
  if (step.rotationDirection && step.rotationTarget) {
    const center =
      anchorForName(step.rotationTarget, partsCatalog, baseResult) ??
      canvasCenter(overlay);
    drawRotationIndicator(overlay, {
      center,
      radius: 70,
      direction:
        step.rotationDirection === "counter-clockwise"
          ? "counter-clockwise"
          : "clockwise",
      sweepDegrees: parseRotationAmount(step.rotationAmount),
      label: step.rotationAmount,
    });
  }

  // 4. Detail callout (IL-009).
  if (step.needsDetailCallout && step.detailCalloutSubject) {
    const firstActiveId = activeComponentIds.values().next().value;
    const sourceRegion =
      (firstActiveId ? baseResult.boundsOnScreen(firstActiveId) : null) ??
      defaultDetailSource(overlay);
    drawDetailCallout(overlay, {
      sourceRegion,
      insetPosition: {
        x: overlay.width - 320,
        y: 40,
        w: 280,
        h: 280,
      },
      subjectLabel: step.detailCalloutSubject,
    });
  }

  // 5. Two-person grip (IL-015).
  if (step.twoPersonRequired) {
    drawTwoPersonGrip(overlay, {
      positions: parseGripPositions(
        step.gripPositions,
        overlay.width,
        overlay.height,
      ),
    });
  }

  // OK/NOK (IL-013) is deferred to a follow-up — it requires a separate
  // base render for the NOK case which the current pipeline doesn't supply.
}

// ============================================================
// Component-ID resolution helpers
// ============================================================

/**
 * Resolve a step's part references to the Component IDs the renderer knows
 * about. The Composer (after T-090) grounds part IDs against the catalog,
 * so id-equality is the primary match. Until T-090 lands, fall back to
 * a case-insensitive name match against `partsCatalog`.
 */
function resolveActiveComponentIds(
  parts: StructuredPartRef[],
  catalog: StructuredPartRef[],
): Set<string> {
  const ids = new Set<string>();
  for (const part of parts) {
    const cid = resolveComponentId(part, catalog);
    if (cid) ids.add(cid);
  }
  return ids;
}

function resolveComponentId(
  part: StructuredPartRef,
  catalog: StructuredPartRef[],
): string | null {
  // 1. Exact id match.
  for (const c of catalog) {
    if (c.id === part.id) return c.id;
  }
  // 2. Name match (case-insensitive substring, either direction).
  const wantName = part.name?.trim().toLowerCase();
  if (wantName) {
    for (const c of catalog) {
      const have = c.name.trim().toLowerCase();
      if (have === wantName || have.includes(wantName) || wantName.includes(have)) {
        return c.id;
      }
    }
  }
  return null;
}

function findComponentByName(
  query: string | undefined,
  catalog: StructuredPartRef[],
): string | null {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  if (!q) return null;
  for (const c of catalog) {
    const have = c.name.trim().toLowerCase();
    if (have === q || have.includes(q) || q.includes(have)) {
      return c.id;
    }
  }
  return null;
}

function anchorForName(
  name: string | undefined,
  catalog: StructuredPartRef[],
  baseResult: RenderStepBaseResult,
): { x: number; y: number } | null {
  const componentId = findComponentByName(name, catalog);
  if (!componentId) return null;
  return baseResult.project(componentId);
}

// ============================================================
// Parsing helpers — descriptive strings → numbers / vectors
// ============================================================

const FRACTION_TURNS: Record<string, number> = {
  "¼": 90,
  "¼ turn": 90,
  "1/4": 90,
  "1/4 turn": 90,
  "½": 180,
  "½ turn": 180,
  "1/2": 180,
  "1/2 turn": 180,
  "¾": 270,
  "¾ turn": 270,
  "3/4": 270,
  "3/4 turn": 270,
};

function parseRotationAmount(amount: string | undefined): number {
  if (!amount) return 90; // sensible default
  const lower = amount.trim().toLowerCase();
  for (const [key, deg] of Object.entries(FRACTION_TURNS)) {
    if (lower.includes(key)) return deg;
  }
  // Numeric like "90°" or "180 degrees".
  const m = lower.match(/(\d+(?:\.\d+)?)/);
  if (m) {
    const n = parseFloat(m[1]);
    if (Number.isFinite(n) && n > 0) return Math.min(n, 720);
  }
  if (lower.includes("full")) return 360;
  if (lower.includes("half")) return 180;
  if (lower.includes("quarter")) return 90;
  return 90;
}

const DIRECTION_VECTORS: Record<string, [number, number]> = {
  downward: [0, 1],
  down: [0, 1],
  upward: [0, -1],
  up: [0, -1],
  left: [-1, 0],
  leftward: [-1, 0],
  right: [1, 0],
  rightward: [1, 0],
  "left-to-right": [1, 0],
  "right-to-left": [-1, 0],
  inward: [0, 1],
  outward: [0, -1],
};

function offsetByDirection(
  start: { x: number; y: number },
  direction: string,
  magnitude: number,
): { x: number; y: number } {
  const dir = direction.trim().toLowerCase();
  const vec = DIRECTION_VECTORS[dir] ?? [0, 1];
  return {
    x: start.x + vec[0] * magnitude,
    y: start.y + vec[1] * magnitude,
  };
}

function parseGripPositions(
  raw: string | undefined,
  width: number,
  height: number,
): Array<{ x: number; y: number; label?: string }> {
  // Two default positions (left-mid, right-mid). Future versions can parse
  // descriptive grip strings like "left support, right beam".
  const defaultPositions = [
    { x: width * 0.18, y: height * 0.55, label: "1" },
    { x: width * 0.82, y: height * 0.55, label: "2" },
  ];
  if (!raw) return defaultPositions;
  return defaultPositions;
}

function canvasCenter(overlay: OverlayContext): { x: number; y: number } {
  return { x: overlay.width / 2, y: overlay.height / 2 };
}

function defaultDetailSource(overlay: OverlayContext): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  return {
    x: overlay.width / 2 - 80,
    y: overlay.height / 2 - 80,
    w: 160,
    h: 160,
  };
}
