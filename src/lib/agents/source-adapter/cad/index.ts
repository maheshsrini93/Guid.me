/**
 * CAD source-adapter sub-implementation (T-082).
 *
 * Handles STEP inputs (with or without an authored explode video). The two
 * paths produce the same `ExtractedSource` shape; downstream agents see the
 * difference only via `structuredMetadata.sequenceSource` /
 * `sequenceConfidence`.
 *
 *   STEP + explode-video MP4
 *     ├─ parse STEP   → parts catalog + assembly tree + meshes
 *     ├─ extract keyframes from MP4    → Frame[]
 *     └─ structuredMetadata.sequenceSource = "explode-video", confidence 1.0
 *
 *   STEP only (no auxiliary)
 *     ├─ parse STEP   → parts catalog + assembly tree + meshes
 *     ├─ render multi-views (top/front/side/iso) → Frame[]
 *     ├─ Gemini Pro sequence inference  → ordered Component IDs + confidence
 *     └─ structuredMetadata.sequenceSource = "geometry-inferred"
 *
 * The CAD path is meaningfully heavier than the PDF/DOCX siblings (a STEP
 * parse can take seconds; multi-view rendering is CPU-bound; sequence
 * inference is a Pro-model call). We report sub-progress generously so the
 * SSE-driven pipeline UI doesn't appear stuck.
 */
import path from "path";
import { mkdir, copyFile } from "fs/promises";
import type {
  SourceAdapterInput,
  ExtractedSource,
  Frame,
  StructuredPartRef,
} from "@/types/agents";
import type { AgentContext } from "../../types";
import type { SourceAdapterImpl } from "../types";
import { getJobDir } from "@/lib/utils/file-storage";
import { parseStep } from "./step-parser";
import { extractKeyframes } from "./keyframe-extractor";
import { inferSequence } from "./sequence-inference";
import { renderAssemblyViews } from "@/lib/render/three-renderer";

const STEP_EXTENSIONS = [".step", ".stp"];
const STEP_MIME_TYPES = new Set([
  "model/step",
  "application/step",
  "application/STEP",
]);

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".jt", ".m4v"];

export const cadImpl: SourceAdapterImpl = {
  name: "cad",

  canHandle(input: SourceAdapterInput): boolean {
    if (STEP_MIME_TYPES.has(input.mimeType)) return true;
    // Browsers commonly hand STEP files over as application/octet-stream — fall
    // through to extension matching in that case.
    const ext = path.extname(input.filePath).toLowerCase();
    return STEP_EXTENSIONS.includes(ext);
  },

  async extract(
    input: SourceAdapterInput,
    context: AgentContext,
  ): Promise<ExtractedSource> {
    const startTime = Date.now();
    const filename = path.basename(input.filePath);

    context.reportProgress(5, "Parsing STEP file");
    const parsed = await parseStep(input.filePath);
    context.reportProgress(
      30,
      `Parsed ${parsed.partsCatalog.length} components`,
    );

    const hasExplodeVideo = !!input.auxiliaryPath
      && VIDEO_EXTENSIONS.includes(path.extname(input.auxiliaryPath).toLowerCase());

    let frames: Frame[];
    let sequenceSource: "explode-video" | "geometry-inferred";
    let sequenceConfidence: number;
    let orderedPartsCatalog: StructuredPartRef[] = parsed.partsCatalog;

    if (hasExplodeVideo) {
      // Path 1: explode video provides the authored build sequence.
      context.reportProgress(35, "Extracting keyframes from explode video");
      const kf = await extractKeyframes(input.auxiliaryPath!, input.jobId);
      frames = kf.frames;
      sequenceSource = "explode-video";
      sequenceConfidence = 1.0;
      context.reportProgress(
        85,
        `Extracted ${frames.length} keyframes from ${kf.durationSeconds.toFixed(1)}s video`,
      );
    } else {
      // Path 2: STEP-only fallback. Render multi-views, then ask Gemini Pro
      // to propose a build order from geometry.
      context.reportProgress(35, "Rendering multi-view CAD images");
      const renderDir = path.join(getJobDir(input.jobId), "cad-renders");
      await mkdir(renderDir, { recursive: true });
      const rendered = await renderAssemblyViews(parsed.meshes, renderDir);

      // The four renders also serve as the Frame[] feeding Agent 2 — a
      // CAD-only assembly with no video has only these views to look at.
      frames = await collectMultiViewFrames(rendered, input.jobId);

      context.reportProgress(60, "Inferring build sequence with Gemini Pro");
      const views = pickPaths(rendered);
      const inference = await inferSequence(
        parsed.partsCatalog,
        parsed.assemblyTree,
        views,
      );

      // Record the inference cost on the agent's cost ledger so the pipeline
      // cost ticker reflects it.
      context.recordCost({
        agent: "source-adapter",
        model: "gemini-3.1-pro-preview",
        inputTokens: inference.inputTokens,
        outputTokens: inference.outputTokens,
        costUsd: inference.costUsd,
        durationMs: 0,
        timestamp: new Date(),
      });

      // Reorder the parts catalog by the inferred sequence so downstream
      // agents iterate in build order.
      orderedPartsCatalog = reorderCatalog(
        parsed.partsCatalog,
        inference.orderedComponentIds,
      );
      sequenceSource = "geometry-inferred";
      sequenceConfidence = inference.confidence;

      context.reportProgress(
        90,
        `Inferred sequence (confidence ${(inference.confidence * 100).toFixed(0)}%)`,
      );
    }

    return {
      frames,
      documentMetadata: {
        filename,
        format: hasExplodeVideo ? "step+explode-video" : "step",
        pageCount: frames.length,
      },
      structuredMetadata: {
        partsCatalog: orderedPartsCatalog,
        assemblyTree: parsed.assemblyTree,
        sourceFormat: hasExplodeVideo ? "step+explode-video" : "step",
        sequenceSource,
        sequenceConfidence,
      },
      durationMs: Date.now() - startTime,
    };
  },
};

// ============================================================
// Helpers
// ============================================================

/**
 * Convert a multi-view render result into the canonical `Frame[]` consumed
 * by Agent 2. Frames are copied into the standard pages directory so the
 * rest of the pipeline (which already serves images out of `pages/`) doesn't
 * need to know about CAD-specific paths.
 */
async function collectMultiViewFrames(
  rendered: { views: Array<{ view: string; width: number; height: number; filePath: string }> },
  jobId: string,
): Promise<Frame[]> {
  const pagesDir = path.join(getJobDir(jobId), "pages");
  await mkdir(pagesDir, { recursive: true });

  const frames: Frame[] = [];
  for (let i = 0; i < rendered.views.length; i++) {
    const v = rendered.views[i];
    const dest = path.join(pagesDir, `frame-${String(i + 1).padStart(2, "0")}-${v.view}.png`);
    await copyFile(v.filePath, dest);
    frames.push({
      frameNumber: i + 1,
      imagePath: dest,
      width: v.width,
      height: v.height,
      mimeType: "image/png",
    });
  }
  return frames;
}

function pickPaths(rendered: {
  views: Array<{ view: string; filePath: string }>;
}): { top: string; front: string; side: string; isometric: string } {
  const get = (name: string) => {
    const v = rendered.views.find((x) => x.view === name);
    if (!v) throw new Error(`renderAssemblyViews did not produce '${name}' view`);
    return v.filePath;
  };
  return {
    top: get("top"),
    front: get("front"),
    side: get("side"),
    isometric: get("isometric"),
  };
}

function reorderCatalog(
  catalog: StructuredPartRef[],
  orderedIds: string[],
): StructuredPartRef[] {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const ordered: StructuredPartRef[] = [];
  for (const id of orderedIds) {
    const part = byId.get(id);
    if (part) {
      ordered.push(part);
      byId.delete(id);
    }
  }
  // Anything the inference omitted goes at the end so we don't drop Components.
  for (const remaining of byId.values()) {
    ordered.push(remaining);
  }
  return ordered;
}
