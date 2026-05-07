/**
 * Vision Analyzer — CAD path (T-084).
 *
 * Activated by the dispatcher when `state.extractedSource.structuredMetadata`
 * is present. The CAD source-adapter has already produced a deterministic
 * parts catalog, an assembly tree, and either:
 *
 *   - keyframes from an authored explode-view video (sequenceSource =
 *     "explode-video"), or
 *   - four multi-view renders of the static assembly (sequenceSource =
 *     "geometry-inferred").
 *
 * For the explode-video path, this impl walks the keyframes pairwise and
 * asks Gemini Flash to describe the *transition* — what was just installed
 * and how — using a much smaller schema than the document path. Parts,
 * tools, quantities, and warnings come from `structuredMetadata` directly,
 * so we do not pay tokens to re-extract them. Cost target: ~$0.04/job.
 *
 * For the geometry-inferred path, we synthesize one minimal frame extraction
 * per ordered Component without making a Gemini call. The sequence inference
 * already paid for the heavy lift; the multi-view renders do not contain
 * per-step motion to extract. Confidence is carried over from the source
 * adapter's `sequenceConfidence`.
 */
import { generateTextWithImages } from "@/lib/gemini/client";
import { FLASH_MODEL } from "@/lib/gemini/models";
import { waitForSlot } from "@/lib/gemini/rate-limiter";
import { readFile } from "@/lib/utils/file-storage";
import { generateId } from "@/lib/utils/ulid";
import type { PipelineState } from "@/types/pipeline";
import type {
  ArrowAnnotation,
  Frame,
  RawFrameExtraction,
  RawStepExtraction,
  StructuredMetadata,
  StructuredPartRef,
  VisualAction,
} from "@/types/agents";
import {
  AgentValidationError,
  PipelineCancelledError,
  classifyError,
  type AgentContext,
  type AgentResult,
} from "../types";
import { withRetry } from "../retry";
import {
  CAD_VISION_PROMPT_VERSION,
  buildCadVisionSystemPrompt,
  buildCadVisionUserPrompt,
} from "./cad.prompt";
import { cadVisionSchema } from "./cad.schema";
import type { VisionAnalyzerImpl } from "./types";

// Trimmed shape returned by Gemini for the CAD path. Distilled from cadVisionSchema.
interface CadGeminiResponse {
  actions?: VisualAction[];
  arrows?: Array<{
    direction: string;
    label?: string;
    indicatesMotion?: boolean;
    arrowType?: "rotation";
  }>;
  complexity: "simple" | "complex";
  confidence: number;
  confirmationCue?: string;
}

/**
 * Per-step retry config — vision calls can be slower than text-only calls.
 */
const CAD_RETRY_CONFIG = {
  maxAttempts: 3,
  timeoutMs: 90_000,
};

export const cadVisionImpl: VisionAnalyzerImpl = {
  name: "cad",

  canHandle(state: PipelineState): boolean {
    return !!state.extractedSource?.structuredMetadata;
  },

  async run(ctx: AgentContext): Promise<AgentResult<RawFrameExtraction[]>> {
    const startedAt = new Date();
    const executionId = generateId();
    const state = ctx.pipelineState;
    const meta = state.extractedSource?.structuredMetadata;
    const frames = state.extractedSource?.frames;

    if (!meta || !frames || frames.length === 0) {
      throw new AgentValidationError(
        "vision-analyzer",
        "CAD vision analyzer requires extractedSource with structuredMetadata and at least one frame.",
      );
    }

    if (ctx.isCancelled()) {
      throw new PipelineCancelledError(ctx.jobId);
    }

    ctx.emit("agent:start", {
      agent: "vision-analyzer",
      startedAt: startedAt.toISOString(),
    });

    try {
      let result:
        | { output: RawFrameExtraction[]; inputTokens: number; outputTokens: number; costUsd: number; modelUsed: string };

      if (meta.sequenceSource === "explode-video") {
        result = await analyzeKeyframePairs(ctx, frames, meta);
      } else {
        // geometry-inferred fallback: synthesize without Gemini calls.
        result = synthesizeFromCatalog(meta);
        ctx.reportProgress(
          100,
          `Synthesized ${result.output.length} step extractions from inferred sequence`,
        );
      }

      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      ctx.recordCost({
        agent: "vision-analyzer",
        model: result.modelUsed,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: result.costUsd,
        durationMs,
        timestamp: completedAt,
      });

      await ctx.persistExecution({
        id: executionId,
        jobId: ctx.jobId,
        agentName: "vision-analyzer",
        executionOrder: 2,
        model: result.modelUsed,
        wasEscalation: false,
        promptSent: `[cad-path] sequenceSource=${meta.sequenceSource}, frames=${frames.length}, components=${meta.partsCatalog.length}`,
        responseReceived: JSON.stringify(result.output).slice(0, 10_000),
        structuredOutput: JSON.stringify(result.output),
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: result.costUsd,
        promptVersion: CAD_VISION_PROMPT_VERSION,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs,
        status: "completed",
        errorMessage: null,
      });

      const totalSteps = result.output.reduce((s, f) => s + f.steps.length, 0);
      ctx.emit("agent:complete", {
        agent: "vision-analyzer",
        durationMs,
        costUsd: result.costUsd,
        summary: `CAD path (${meta.sequenceSource}): ${totalSteps} step transition${totalSteps === 1 ? "" : "s"} across ${frames.length} frame${frames.length === 1 ? "" : "s"}`,
      });

      return {
        output: result.output,
        durationMs,
        costUsd: result.costUsd,
        model: result.modelUsed,
        wasEscalation: false,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      };
    } catch (error) {
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();
      let errorMessage = error instanceof Error ? error.message : String(error);
      if (error instanceof Error && error.cause instanceof Error) {
        errorMessage += ` (cause: ${error.cause.message})`;
      }

      await ctx.persistExecution({
        id: executionId,
        jobId: ctx.jobId,
        agentName: "vision-analyzer",
        executionOrder: 2,
        model: FLASH_MODEL,
        wasEscalation: false,
        promptSent: null,
        responseReceived: null,
        structuredOutput: null,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        promptVersion: CAD_VISION_PROMPT_VERSION,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs,
        status: "failed",
        errorMessage,
      });

      ctx.emit("pipeline:error", {
        error: classifyError(error),
        agent: "vision-analyzer",
        recoverable: false,
      });

      throw error;
    }
  },
};

// ============================================================
// Path 1: keyframe-pair analysis (explode-video sequenceSource)
// ============================================================

async function analyzeKeyframePairs(
  ctx: AgentContext,
  frames: Frame[],
  meta: StructuredMetadata,
): Promise<{
  output: RawFrameExtraction[];
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  modelUsed: string;
}> {
  if (frames.length < 2) {
    // Single frame: no transition to describe. Fall back to per-component
    // synthesis so downstream agents still see something.
    const synthesized = synthesizeFromCatalog(meta);
    return synthesized;
  }

  const systemPrompt = buildCadVisionSystemPrompt();
  const totalSteps = frames.length - 1;
  const output: RawFrameExtraction[] = [];

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;
  let previousStepSummary = "";

  for (let i = 1; i < frames.length; i++) {
    if (ctx.isCancelled()) {
      throw new PipelineCancelledError(ctx.jobId);
    }

    const stepNumber = i;
    const progress = Math.round((stepNumber / totalSteps) * 100);
    ctx.reportProgress(
      progress,
      `Analyzing transition ${stepNumber} of ${totalSteps}`,
    );

    const beforeFrame = frames[i - 1];
    const afterFrame = frames[i];

    const activeComponents = pickActiveComponents(meta.partsCatalog, stepNumber, totalSteps);

    const userPrompt = buildCadVisionUserPrompt({
      stepNumber,
      totalSteps,
      activeComponents,
      previousStepSummary,
      assemblyTree: meta.assemblyTree,
    });

    const [beforeBuf, afterBuf] = await Promise.all([
      readFile(beforeFrame.imagePath),
      readFile(afterFrame.imagePath),
    ]);

    const result = await withRetry(
      "vision-analyzer",
      async () => {
        await waitForSlot(FLASH_MODEL);
        const r = await generateTextWithImages<CadGeminiResponse>(
          FLASH_MODEL,
          systemPrompt,
          userPrompt,
          [
            { data: beforeBuf, mimeType: beforeFrame.mimeType },
            { data: afterBuf, mimeType: afterFrame.mimeType },
          ],
          cadVisionSchema,
          { temperature: 0.4, maxOutputTokens: 2048 },
        );
        if (!("parsed" in r)) {
          throw new Error("CAD vision analyzer returned text without schema parsing");
        }
        return r;
      },
      {
        retryConfig: CAD_RETRY_CONFIG,
        isCancelled: () => ctx.isCancelled(),
      },
    );

    const parsed = result.parsed;
    totalInputTokens += result.inputTokens;
    totalOutputTokens += result.outputTokens;
    totalCost += result.costUsd;

    const frameExtraction = wrapTransition(
      stepNumber,
      parsed,
      activeComponents,
      meta,
    );
    output.push(frameExtraction);

    previousStepSummary = summarizeTransition(stepNumber, parsed, activeComponents);
  }

  return {
    output,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    costUsd: totalCost,
    modelUsed: FLASH_MODEL,
  };
}

/**
 * Pick the Components most likely to be installed in the n-th transition.
 *
 * For an authored explode video the parts catalog is in catalog order, not
 * install order — without a per-keyframe segmentation pass we cannot pinpoint
 * which Component(s) moved between frames. So we narrow the candidate list
 * by slicing the ordered catalog around the proportional position of the
 * step. The Gemini model then disambiguates by looking at the actual diff.
 *
 * For the geometry-inferred path the catalog *is* in installation order, so
 * the slice is tighter (single Component centered on stepNumber).
 *
 * The slice is intentionally permissive — passing too few candidates would
 * force the model to invent a name; passing too many wastes tokens. We
 * settle on a window of ±25% of catalog length, clamped.
 */
function pickActiveComponents(
  catalog: StructuredPartRef[],
  stepNumber: number,
  totalSteps: number,
): StructuredPartRef[] {
  if (catalog.length === 0) return [];
  if (catalog.length <= 8) return catalog; // small assemblies: send everything

  const proportional = Math.floor(((stepNumber - 1) / totalSteps) * catalog.length);
  const halfWindow = Math.max(2, Math.floor(catalog.length * 0.25));
  const lo = Math.max(0, proportional - halfWindow);
  const hi = Math.min(catalog.length, proportional + halfWindow + 1);
  return catalog.slice(lo, hi);
}

/**
 * Wrap a Gemini transition response into the canonical RawFrameExtraction
 * shape. Parts/tools/fasteners are intentionally empty — Agent 3 merges them
 * in from `structuredMetadata.partsCatalog`. See ADR-0001.
 */
function wrapTransition(
  stepNumber: number,
  parsed: CadGeminiResponse,
  activeComponents: StructuredPartRef[],
  meta: StructuredMetadata,
): RawFrameExtraction {
  const actions: VisualAction[] = (parsed.actions ?? []).map((a) => ({
    actionType: a.actionType,
    subject: a.subject,
    target: a.target,
    direction: a.direction,
  }));

  const arrows: ArrowAnnotation[] = (parsed.arrows ?? []).map((arrow) => ({
    direction: arrow.direction,
    label: arrow.label,
    indicatesMotion: arrow.indicatesMotion ?? true,
    arrowType: "rotation" as const,
  }));

  const rawDescription = describeTransition(actions, activeComponents);

  const step: RawStepExtraction = {
    stepNumber,
    rawDescription,
    isSubStep: false,
    partsShown: [], // CAD path: parts come from structuredMetadata, not vision
    toolsShown: [], // CAD path: tools come from structuredMetadata
    actions,
    spatialDetails: {},
    spatialRelationships: [],
    arrows,
    fasteners: [], // CAD path: fasteners come from structuredMetadata
    annotations: [],
    warnings: [],
    complexity: parsed.complexity,
    confidence: clamp01(parsed.confidence),
    confirmationCue: parsed.confirmationCue,
  };

  return {
    pageType: "assembly",
    steps: [step],
    pageIndicators: {
      arrowCount: arrows.length,
      hasHingeOrRotation: arrows.length > 0,
      hasFastenerAmbiguity: false,
      isPartsPage: false,
      hasTwoPersonWarning: estimateTwoPersonNeed(meta, activeComponents),
      hasSubSteps: false,
    },
  };
}

function describeTransition(
  actions: VisualAction[],
  activeComponents: StructuredPartRef[],
): string {
  if (actions.length === 0) {
    if (activeComponents.length > 0) {
      return `Install ${activeComponents.map((c) => c.name).join(", ")}`;
    }
    return "Transition between consecutive keyframes (no specific motion identified).";
  }
  return actions
    .map((a) => {
      const dir = a.direction ? ` (${a.direction})` : "";
      return `${a.actionType} ${a.subject} into ${a.target}${dir}`;
    })
    .join("; ");
}

function summarizeTransition(
  stepNumber: number,
  parsed: CadGeminiResponse,
  activeComponents: StructuredPartRef[],
): string {
  const subject =
    parsed.actions?.[0]?.subject ??
    activeComponents[0]?.name ??
    "(unknown)";
  return `Step ${stepNumber}: ${parsed.actions?.[0]?.actionType ?? "place"} ${subject}`;
}

/**
 * Heuristic for two-person flag: if any active component is heavy (>15kg) or
 * has a footprint > 1m on any axis, recommend two-person handling.
 */
function estimateTwoPersonNeed(
  _meta: StructuredMetadata,
  activeComponents: StructuredPartRef[],
): boolean {
  for (const c of activeComponents) {
    if (c.mass !== undefined && c.mass > 15) return true;
    if (c.boundingBox) {
      const dx = c.boundingBox.max[0] - c.boundingBox.min[0];
      const dy = c.boundingBox.max[1] - c.boundingBox.min[1];
      const dz = c.boundingBox.max[2] - c.boundingBox.min[2];
      if (dx > 1 || dy > 1 || dz > 1) return true;
    }
  }
  return false;
}

// ============================================================
// Path 2: synthesize from ordered partsCatalog (geometry-inferred fallback)
// ============================================================

/**
 * Generate one minimal RawFrameExtraction per Component in install order.
 *
 * We deliberately do *not* call Gemini here — the multi-view renders we'd
 * have to feed it do not show motion, and the sequence inference already
 * paid the LLM cost to determine install order. Confidence is carried over
 * from the source adapter's `sequenceConfidence` so downstream consumers
 * (and the inferred-sequence banner from T-093) see one consistent number.
 */
function synthesizeFromCatalog(meta: StructuredMetadata): {
  output: RawFrameExtraction[];
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  modelUsed: string;
} {
  const confidence = clamp01(meta.sequenceConfidence);

  const output: RawFrameExtraction[] = meta.partsCatalog.map((component, idx) => {
    const stepNumber = idx + 1;
    const action: VisualAction = {
      actionType: idx === 0 ? "Place" : "Attach",
      subject: component.name,
      target: idx === 0 ? "workspace" : "previously-installed assembly",
    };
    const step: RawStepExtraction = {
      stepNumber,
      rawDescription: `${action.actionType} ${component.name} (${component.id})`,
      isSubStep: false,
      partsShown: [],
      toolsShown: [],
      actions: [action],
      spatialDetails: {},
      spatialRelationships: [],
      arrows: [],
      fasteners: [],
      annotations: [],
      warnings: [],
      complexity: "simple",
      confidence,
      confirmationCue: undefined,
    };
    return {
      pageType: "assembly",
      steps: [step],
      pageIndicators: {
        arrowCount: 0,
        hasHingeOrRotation: false,
        hasFastenerAmbiguity: false,
        isPartsPage: false,
        hasTwoPersonWarning: estimateTwoPersonNeed(meta, [component]),
        hasSubSteps: false,
      },
    };
  });

  return {
    output,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    // "code" indicates a deterministic, no-LLM execution — matches the
    // convention used by BaseCodeAgent paths.
    modelUsed: "code",
  };
}

function clamp01(x: number): number {
  if (!isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
