import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import type { PipelineState, PipelineStatus } from "@/types/pipeline";
import { createAgentContext } from "@/lib/agents/context";
import { documentExtractor } from "@/lib/agents/document-extractor";
import { runConfigAgent } from "@/lib/agents/runner";
import { visionAnalyzerConfig } from "@/lib/agents/configs/vision-analyzer.config";
import { instructionComposerConfig } from "@/lib/agents/configs/instruction-composer.config";
import { guidelineEnforcerConfig } from "@/lib/agents/configs/guideline-enforcer.config";
import { PipelineCancelledError } from "@/lib/agents/types";
import { pipelineEvents } from "./event-emitter";

/** Track cancellation state per job */
const cancelledJobs = new Map<string, { current: boolean }>();

/**
 * Cancel a running pipeline.
 */
export function cancelPipeline(jobId: string): void {
  const ref = cancelledJobs.get(jobId);
  if (ref) {
    ref.current = true;
  }
}

/**
 * Run the full pipeline for a job.
 * Phase 1: agents 1-4 in sequence.
 * Phases 3-5 will extend this with agents 5-8, quality loops, illustrations.
 */
export async function runPipeline(
  jobId: string,
  documentPath: string,
  mimeType: string,
): Promise<void> {
  const cancelledRef = { current: false };
  cancelledJobs.set(jobId, cancelledRef);

  const state: PipelineState = {
    jobId,
    status: "pending",
    documentPath,
    documentMimeType: mimeType,
    textRevisionCount: 0,
    costs: [],
    totalCostUsd: 0,
    startedAt: new Date(),
    lastProgressAt: new Date(),
  };

  try {
    // ── Agent 1: Document Extractor ────────────────────────
    checkCancellation(jobId, cancelledRef);
    await updateStatus(jobId, "extracting", state);
    const ctx1 = createAgentContext(jobId, state, cancelledRef);
    const extractResult = await documentExtractor.run(ctx1);
    state.extractedDocument = extractResult.output;

    // Update page count in DB
    db.update(jobs)
      .set({ pageCount: extractResult.output.pageCount })
      .where(eq(jobs.id, jobId))
      .run();

    // ── Agent 2: Vision Analyzer ───────────────────────────
    checkCancellation(jobId, cancelledRef);
    await updateStatus(jobId, "analyzing", state);
    const ctx2 = createAgentContext(jobId, state, cancelledRef);
    const visionResult = await runConfigAgent(visionAnalyzerConfig, ctx2);
    state.pageExtractions = visionResult.output;

    // ── Agent 3: Instruction Composer ──────────────────────
    checkCancellation(jobId, cancelledRef);
    await updateStatus(jobId, "composing", state);
    const ctx3 = createAgentContext(jobId, state, cancelledRef);
    const composeResult = await runConfigAgent(instructionComposerConfig, ctx3);
    state.composedGuide = composeResult.output;

    // ── Agent 4: Guideline Enforcer ────────────────────────
    checkCancellation(jobId, cancelledRef);
    await updateStatus(jobId, "enforcing", state);
    const ctx4 = createAgentContext(jobId, state, cancelledRef);
    const enforceResult = await runConfigAgent(guidelineEnforcerConfig, ctx4);
    state.enforcedGuide = enforceResult.output;

    // ── Phase 1 complete ───────────────────────────────────
    // Phase 3 will add: reviewing → [revising loop] → assembling
    // Phase 4 will add: illustrating
    // For now, mark as completed after agent 4
    state.status = "completed";
    state.completedAt = new Date();

    db.update(jobs)
      .set({
        status: "completed",
        completedAt: new Date().toISOString(),
        totalCostUsd: state.totalCostUsd,
      })
      .where(eq(jobs.id, jobId))
      .run();

    pipelineEvents.emit(jobId, "pipeline:state", {
      state: "completed",
      timestamp: new Date().toISOString(),
    });

    pipelineEvents.emit(jobId, "pipeline:complete", {
      state: "completed",
      qualityScore: 0, // Phase 3 will add real scores
      qualityDecision: "pending",
      totalCostUsd: state.totalCostUsd,
      durationMs: Date.now() - state.startedAt.getTime(),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    if (error instanceof PipelineCancelledError) {
      state.status = "cancelled";
      db.update(jobs)
        .set({
          status: "cancelled",
          completedAt: new Date().toISOString(),
          errorMessage: "Pipeline cancelled by user",
        })
        .where(eq(jobs.id, jobId))
        .run();

      pipelineEvents.emit(jobId, "pipeline:state", {
        state: "cancelled",
        timestamp: new Date().toISOString(),
      });
    } else {
      state.status = "failed";
      state.error = errorMessage;

      db.update(jobs)
        .set({
          status: "failed",
          completedAt: new Date().toISOString(),
          errorMessage,
          totalCostUsd: state.totalCostUsd,
        })
        .where(eq(jobs.id, jobId))
        .run();

      pipelineEvents.emit(jobId, "pipeline:error", {
        error: errorMessage,
        recoverable: false,
      });

      pipelineEvents.emit(jobId, "pipeline:state", {
        state: "failed",
        timestamp: new Date().toISOString(),
      });
    }
  } finally {
    // Give SSE clients a moment to receive final events before cleanup
    setTimeout(() => {
      pipelineEvents.dispose(jobId);
      cancelledJobs.delete(jobId);
    }, 2000);
  }
}

// ============================================================
// Helpers
// ============================================================

function checkCancellation(
  jobId: string,
  cancelledRef: { current: boolean },
): void {
  if (cancelledRef.current) {
    throw new PipelineCancelledError(jobId);
  }
}

async function updateStatus(
  jobId: string,
  status: PipelineStatus,
  state: PipelineState,
): Promise<void> {
  state.status = status;
  state.lastProgressAt = new Date();

  db.update(jobs)
    .set({
      status,
      currentAgent: status,
      startedAt:
        status === "extracting"
          ? new Date().toISOString()
          : undefined,
    })
    .where(eq(jobs.id, jobId))
    .run();

  pipelineEvents.emit(jobId, "pipeline:state", {
    state: status,
    timestamp: new Date().toISOString(),
  });
}
