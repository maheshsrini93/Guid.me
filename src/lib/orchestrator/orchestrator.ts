import { eq, and, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs, agentExecutions, generatedGuides, generatedIllustrations } from "@/lib/db/schema";
import { generateId } from "@/lib/utils/ulid";
import type { PipelineState, PipelineStatus } from "@/types/pipeline";
import { createAgentContext } from "@/lib/agents/context";
import { documentExtractor } from "@/lib/agents/document-extractor";
import { xmlAssembler } from "@/lib/agents/xml-assembler";
import { illustrationGenerator } from "@/lib/agents/illustration-generator";
import { runConfigAgent } from "@/lib/agents/runner";
import { visionAnalyzerConfig } from "@/lib/agents/configs/vision-analyzer.config";
import { instructionComposerConfig } from "@/lib/agents/configs/instruction-composer.config";
import { guidelineEnforcerConfig } from "@/lib/agents/configs/guideline-enforcer.config";
import { qualityReviewerConfig } from "@/lib/agents/configs/quality-reviewer.config";
import { safetyReviewerConfig } from "@/lib/agents/configs/safety-reviewer.config";
import { PipelineCancelledError, classifyError } from "@/lib/agents/types";
import type { AgentName } from "@/lib/agents/types";
import { postProcess } from "@/lib/guidelines/post-processor";
import { validateGuide, summarizeFlags } from "@/lib/quality/validator-registry";
import { evaluateQualityGate } from "@/lib/quality/quality-gate";
import { config } from "@/lib/config";
import { pipelineEvents } from "./event-emitter";
import { runDemoPipeline, cancelDemoPipeline } from "@/lib/demo/demo-manager";

/** Track cancellation state per job */
const cancelledJobs = new Map<string, { current: boolean }>();

/**
 * Cancel a running pipeline.
 */
export function cancelPipeline(jobId: string): void {
  if (config.demoMode) {
    cancelDemoPipeline(jobId);
    return;
  }
  const ref = cancelledJobs.get(jobId);
  if (ref) {
    ref.current = true;
  }
}

/**
 * Run the full pipeline for a job.
 * Agents 1-4 → post-process → agents 5+6 (parallel) → quality gate → [revision loop] → agent 8
 */
export async function runPipeline(
  jobId: string,
  documentPath: string,
  mimeType: string,
): Promise<void> {
  // Demo mode: use cached results with realistic timing
  if (config.demoMode) {
    return runDemoPipeline(jobId);
  }

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

    // ── Post-processor (Layer 3) ───────────────────────────
    state.enforcedGuide = postProcess(state.enforcedGuide);

    // ── Validators (Layer 4) ───────────────────────────────
    const validationFlags = validateGuide(state.enforcedGuide);
    const flagSummary = summarizeFlags(validationFlags);
    // Store flags for later inclusion in XML
    // (flags are informational — they don't block the pipeline)

    // ── Review + Revision Loop ─────────────────────────────
    let qualityGateResult = await runReviewCycle(
      jobId,
      state,
      cancelledRef,
    );

    // Revision loop (max N iterations)
    while (qualityGateResult.decision === "revise" && qualityGateResult.canRevise) {
      checkCancellation(jobId, cancelledRef);
      await updateStatus(jobId, "revising", state);

      state.textRevisionCount++;

      // Update revision count in DB
      db.update(jobs)
        .set({ textRevisionCount: state.textRevisionCount })
        .where(eq(jobs.id, jobId))
        .run();

      pipelineEvents.emit(jobId, "agent:progress", {
        agent: "guideline-enforcer",
        progress: 0,
        message: `Revision ${state.textRevisionCount} of ${config.maxRevisionLoops}: applying reviewer feedback`,
      });

      // Re-run enforcer with revision feedback
      await updateStatus(jobId, "enforcing", state);
      const ctxRevise = createAgentContext(jobId, state, cancelledRef);
      // Inject revision feedback into the pipeline state for the enforcer prompt
      const revisionResult = await runConfigAgent(guidelineEnforcerConfig, ctxRevise);
      state.enforcedGuide = revisionResult.output;

      // Re-apply post-processing
      state.enforcedGuide = postProcess(state.enforcedGuide);

      // Re-review
      qualityGateResult = await runReviewCycle(jobId, state, cancelledRef);
    }

    // ── Agent 7: Illustration Generator ────────────────────
    checkCancellation(jobId, cancelledRef);
    await updateStatus(jobId, "illustrating", state);
    const ctx7 = createAgentContext(jobId, state, cancelledRef);
    const illustrateResult = await illustrationGenerator.run(ctx7);
    state.illustrations = illustrateResult.output;

    // ── Agent 8: XML Assembler ─────────────────────────────
    checkCancellation(jobId, cancelledRef);
    await updateStatus(jobId, "assembling", state);
    const ctx8 = createAgentContext(jobId, state, cancelledRef);
    const assembleResult = await xmlAssembler.run(ctx8);
    state.xmlOutput = assembleResult.output;

    // ── Persist to generated_guides ────────────────────────
    const guideId = generateId();
    db.insert(generatedGuides)
      .values({
        id: guideId,
        jobId,
        xmlContent: assembleResult.output.xmlContent,
        jsonContent: JSON.stringify(assembleResult.output.jsonContent),
        xmlFilePath: assembleResult.output.xmlFilePath,
        qualityScore: state.qualityReview!.overallScore,
        qualityDecision: state.qualityReview!.decision,
        qualityIssues: JSON.stringify(state.qualityReview!.issues),
        safetyIssues: JSON.stringify(state.safetyReview!.issues),
        stepCount: state.enforcedGuide!.steps.length,
        phaseCount: countPhases(state.enforcedGuide!),
        title: state.enforcedGuide!.guideMetadata.purposeStatement,
        domain: state.composedGuide?.metadata?.skillLevel ?? "general",
        estimatedMinutes: state.enforcedGuide!.guideMetadata.estimatedMinutes,
        safetyLevel: state.safetyReview!.recommendedSafetyLevel,
        modelsUsed: JSON.stringify([...new Set(state.costs.filter(c => c.model !== "code").map(c => c.model))]),
        textRevisionLoops: state.textRevisionCount,
        totalCostUsd: state.totalCostUsd,
        generatedAt: new Date().toISOString(),
      })
      .run();

    // ── Persist illustrations to DB ────────────────────────
    if (state.illustrations && state.illustrations.length > 0) {
      for (const il of state.illustrations) {
        db.insert(generatedIllustrations)
          .values({
            id: generateId(),
            jobId,
            guideId,
            stepNumber: il.stepNumber,
            filePath: il.filePath,
            mimeType: il.mimeType,
            width: il.width,
            height: il.height,
            model: il.modelUsed,
            costUsd: il.costUsd,
            durationMs: il.durationMs,
            generatedAt: new Date().toISOString(),
          })
          .run();
      }
    }

    // ── Complete ───────────────────────────────────────────
    state.status = "completed";
    state.completedAt = new Date();

    db.update(jobs)
      .set({
        status: "completed",
        completedAt: new Date().toISOString(),
        totalCostUsd: state.totalCostUsd,
        qualityScore: state.qualityReview!.overallScore,
        qualityDecision: state.qualityReview!.decision,
        textRevisionCount: state.textRevisionCount,
      })
      .where(eq(jobs.id, jobId))
      .run();

    pipelineEvents.emit(jobId, "pipeline:state", {
      state: "completed",
      timestamp: new Date().toISOString(),
    });

    pipelineEvents.emit(jobId, "pipeline:complete", {
      state: "completed",
      qualityScore: state.qualityReview!.overallScore,
      qualityDecision: state.qualityReview!.decision,
      totalCostUsd: state.totalCostUsd,
      durationMs: Date.now() - state.startedAt.getTime(),
    });
  } catch (error) {
    const errorMessage = classifyError(error);

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
// Resume Pipeline (retry from failure point)
// ============================================================

/**
 * Agent execution order for determining resume point.
 * Maps agent names to the pipeline stages they produce output for.
 */
const AGENT_ORDER: AgentName[] = [
  "document-extractor",
  "vision-analyzer",
  "instruction-composer",
  "guideline-enforcer",
  "quality-reviewer",
  "safety-reviewer",
  "illustration-generator",
  "xml-assembler",
];

/**
 * Resume a failed pipeline from the last successful agent.
 * Reads completed agent_executions from DB, reconstructs PipelineState,
 * emits SSE events for completed agents, then continues from the failure point.
 */
export async function resumePipeline(jobId: string): Promise<void> {
  // Load the job record
  const job = db.select().from(jobs).where(eq(jobs.id, jobId)).get();
  if (!job) throw new Error(`Job ${jobId} not found`);
  if (job.status !== "failed") throw new Error(`Job ${jobId} is not in failed state (current: ${job.status})`);

  const cancelledRef = { current: false };
  cancelledJobs.set(jobId, cancelledRef);

  // Load all completed agent executions for this job, ordered by execution order
  const completedExecs = db
    .select()
    .from(agentExecutions)
    .where(
      and(
        eq(agentExecutions.jobId, jobId),
        eq(agentExecutions.status, "completed"),
      ),
    )
    .orderBy(asc(agentExecutions.executionOrder))
    .all();

  // Build set of completed agent names (use latest execution per agent)
  const completedAgents = new Set<string>();
  const agentOutputs = new Map<string, string>();
  for (const exec of completedExecs) {
    completedAgents.add(exec.agentName);
    if (exec.structuredOutput) {
      agentOutputs.set(exec.agentName, exec.structuredOutput);
    }
  }

  // Reconstruct pipeline state from completed outputs
  const state: PipelineState = {
    jobId,
    status: "pending",
    documentPath: job.filePath,
    documentMimeType: job.mimeType,
    textRevisionCount: job.textRevisionCount ?? 0,
    costs: [],
    totalCostUsd: job.totalCostUsd ?? 0,
    startedAt: new Date(),
    lastProgressAt: new Date(),
  };

  // Restore outputs from completed agents
  if (completedAgents.has("document-extractor") && agentOutputs.has("document-extractor")) {
    state.extractedDocument = JSON.parse(agentOutputs.get("document-extractor")!);
  }
  if (completedAgents.has("vision-analyzer") && agentOutputs.has("vision-analyzer")) {
    state.pageExtractions = JSON.parse(agentOutputs.get("vision-analyzer")!);
  }
  if (completedAgents.has("instruction-composer") && agentOutputs.has("instruction-composer")) {
    state.composedGuide = JSON.parse(agentOutputs.get("instruction-composer")!);
  }
  if (completedAgents.has("guideline-enforcer") && agentOutputs.has("guideline-enforcer")) {
    state.enforcedGuide = JSON.parse(agentOutputs.get("guideline-enforcer")!);
    // Re-apply post-processing to ensure consistency
    state.enforcedGuide = postProcess(state.enforcedGuide!);
  }
  if (completedAgents.has("quality-reviewer") && agentOutputs.has("quality-reviewer")) {
    state.qualityReview = JSON.parse(agentOutputs.get("quality-reviewer")!);
  }
  if (completedAgents.has("safety-reviewer") && agentOutputs.has("safety-reviewer")) {
    state.safetyReview = JSON.parse(agentOutputs.get("safety-reviewer")!);
  }

  // Determine resume point: find first agent in order that is NOT completed
  let resumeFromIndex = 0;
  for (let i = 0; i < AGENT_ORDER.length; i++) {
    if (completedAgents.has(AGENT_ORDER[i])) {
      resumeFromIndex = i + 1;
    } else {
      break;
    }
  }
  // Special case: agents 5+6 run in parallel — if one completed but not both,
  // resume from reviewing (index 4)
  if (
    (completedAgents.has("quality-reviewer") && !completedAgents.has("safety-reviewer")) ||
    (!completedAgents.has("quality-reviewer") && completedAgents.has("safety-reviewer"))
  ) {
    resumeFromIndex = 4; // re-run the review cycle
    state.qualityReview = undefined;
    state.safetyReview = undefined;
  }

  const resumeAgent = resumeFromIndex < AGENT_ORDER.length
    ? AGENT_ORDER[resumeFromIndex]
    : null;

  console.log(
    `[Pipeline ${jobId}] Resuming from agent ${resumeAgent ?? "completion"} (${completedAgents.size} agents completed)`,
  );

  // Reset job status to indicate retry in progress
  db.update(jobs)
    .set({
      status: "pending" as const,
      errorMessage: null,
      completedAt: null,
    })
    .where(eq(jobs.id, jobId))
    .run();

  // Emit SSE events for already-completed agents so the UI shows them as done
  for (const exec of completedExecs) {
    // Only emit for agents before the resume point
    if (!completedAgents.has(exec.agentName) || AGENT_ORDER.indexOf(exec.agentName as AgentName) >= resumeFromIndex) {
      continue;
    }
    pipelineEvents.emit(jobId, "agent:start", {
      agent: exec.agentName,
      startedAt: exec.startedAt,
    });
    pipelineEvents.emit(jobId, "agent:complete", {
      agent: exec.agentName,
      durationMs: exec.durationMs ?? 0,
      costUsd: exec.costUsd ?? 0,
      summary: `Restored from previous run`,
    });
  }

  // Emit current cost
  if (state.totalCostUsd > 0) {
    pipelineEvents.emit(jobId, "pipeline:cost", {
      totalUsd: state.totalCostUsd,
      breakdown: {},
    });
  }

  try {
    // Resume from the appropriate point
    if (resumeFromIndex <= 0) {
      // Agent 1: Document Extractor
      checkCancellation(jobId, cancelledRef);
      await updateStatus(jobId, "extracting", state);
      const ctx1 = createAgentContext(jobId, state, cancelledRef);
      const extractResult = await documentExtractor.run(ctx1);
      state.extractedDocument = extractResult.output;
      db.update(jobs)
        .set({ pageCount: extractResult.output.pageCount })
        .where(eq(jobs.id, jobId))
        .run();
    }

    if (resumeFromIndex <= 1) {
      // Agent 2: Vision Analyzer
      checkCancellation(jobId, cancelledRef);
      await updateStatus(jobId, "analyzing", state);
      const ctx2 = createAgentContext(jobId, state, cancelledRef);
      const visionResult = await runConfigAgent(visionAnalyzerConfig, ctx2);
      state.pageExtractions = visionResult.output;
    }

    if (resumeFromIndex <= 2) {
      // Agent 3: Instruction Composer
      checkCancellation(jobId, cancelledRef);
      await updateStatus(jobId, "composing", state);
      const ctx3 = createAgentContext(jobId, state, cancelledRef);
      const composeResult = await runConfigAgent(instructionComposerConfig, ctx3);
      state.composedGuide = composeResult.output;
    }

    if (resumeFromIndex <= 3) {
      // Agent 4: Guideline Enforcer
      checkCancellation(jobId, cancelledRef);
      await updateStatus(jobId, "enforcing", state);
      const ctx4 = createAgentContext(jobId, state, cancelledRef);
      const enforceResult = await runConfigAgent(guidelineEnforcerConfig, ctx4);
      state.enforcedGuide = enforceResult.output;
      state.enforcedGuide = postProcess(state.enforcedGuide);
      validateGuide(state.enforcedGuide);
    }

    if (resumeFromIndex <= 4) {
      // Review cycle (agents 5+6 parallel)
      let qualityGateResult = await runReviewCycle(jobId, state, cancelledRef);

      // Revision loop
      while (qualityGateResult.decision === "revise" && qualityGateResult.canRevise) {
        checkCancellation(jobId, cancelledRef);
        await updateStatus(jobId, "revising", state);
        state.textRevisionCount++;
        db.update(jobs)
          .set({ textRevisionCount: state.textRevisionCount })
          .where(eq(jobs.id, jobId))
          .run();
        pipelineEvents.emit(jobId, "agent:progress", {
          agent: "guideline-enforcer",
          progress: 0,
          message: `Revision ${state.textRevisionCount} of ${config.maxRevisionLoops}: applying reviewer feedback`,
        });
        await updateStatus(jobId, "enforcing", state);
        const ctxRevise = createAgentContext(jobId, state, cancelledRef);
        const revisionResult = await runConfigAgent(guidelineEnforcerConfig, ctxRevise);
        state.enforcedGuide = revisionResult.output;
        state.enforcedGuide = postProcess(state.enforcedGuide);
        qualityGateResult = await runReviewCycle(jobId, state, cancelledRef);
      }
    }

    if (resumeFromIndex <= 6) {
      // Agent 7: Illustration Generator
      checkCancellation(jobId, cancelledRef);
      await updateStatus(jobId, "illustrating", state);
      const ctx7 = createAgentContext(jobId, state, cancelledRef);
      const illustrateResult = await illustrationGenerator.run(ctx7);
      state.illustrations = illustrateResult.output;
    }

    if (resumeFromIndex <= 7) {
      // Agent 8: XML Assembler
      checkCancellation(jobId, cancelledRef);
      await updateStatus(jobId, "assembling", state);
      const ctx8 = createAgentContext(jobId, state, cancelledRef);
      const assembleResult = await xmlAssembler.run(ctx8);
      state.xmlOutput = assembleResult.output;
    }

    // Clean up any previous guide/illustration records from prior failed attempts
    const existingGuide = db.select({ id: generatedGuides.id }).from(generatedGuides).where(eq(generatedGuides.jobId, jobId)).get();
    if (existingGuide) {
      db.delete(generatedIllustrations).where(eq(generatedIllustrations.guideId, existingGuide.id)).run();
      db.delete(generatedGuides).where(eq(generatedGuides.id, existingGuide.id)).run();
    }

    // Persist results
    const guideId = generateId();
    db.insert(generatedGuides)
      .values({
        id: guideId,
        jobId,
        xmlContent: state.xmlOutput!.xmlContent,
        jsonContent: JSON.stringify(state.xmlOutput!.jsonContent),
        xmlFilePath: state.xmlOutput!.xmlFilePath,
        qualityScore: state.qualityReview!.overallScore,
        qualityDecision: state.qualityReview!.decision,
        qualityIssues: JSON.stringify(state.qualityReview!.issues),
        safetyIssues: JSON.stringify(state.safetyReview!.issues),
        stepCount: state.enforcedGuide!.steps.length,
        phaseCount: countPhases(state.enforcedGuide!),
        title: state.enforcedGuide!.guideMetadata.purposeStatement,
        domain: state.composedGuide?.metadata?.skillLevel ?? "general",
        estimatedMinutes: state.enforcedGuide!.guideMetadata.estimatedMinutes,
        safetyLevel: state.safetyReview!.recommendedSafetyLevel,
        modelsUsed: JSON.stringify([...new Set(state.costs.filter(c => c.model !== "code").map(c => c.model))]),
        textRevisionLoops: state.textRevisionCount,
        totalCostUsd: state.totalCostUsd,
        generatedAt: new Date().toISOString(),
      })
      .run();

    if (state.illustrations && state.illustrations.length > 0) {
      for (const il of state.illustrations) {
        db.insert(generatedIllustrations)
          .values({
            id: generateId(),
            jobId,
            guideId,
            stepNumber: il.stepNumber,
            filePath: il.filePath,
            mimeType: il.mimeType,
            width: il.width,
            height: il.height,
            model: il.modelUsed,
            costUsd: il.costUsd,
            durationMs: il.durationMs,
            generatedAt: new Date().toISOString(),
          })
          .run();
      }
    }

    // Complete
    state.status = "completed";
    state.completedAt = new Date();

    db.update(jobs)
      .set({
        status: "completed",
        completedAt: new Date().toISOString(),
        totalCostUsd: state.totalCostUsd,
        qualityScore: state.qualityReview!.overallScore,
        qualityDecision: state.qualityReview!.decision,
        textRevisionCount: state.textRevisionCount,
      })
      .where(eq(jobs.id, jobId))
      .run();

    pipelineEvents.emit(jobId, "pipeline:state", {
      state: "completed",
      timestamp: new Date().toISOString(),
    });

    pipelineEvents.emit(jobId, "pipeline:complete", {
      state: "completed",
      qualityScore: state.qualityReview!.overallScore,
      qualityDecision: state.qualityReview!.decision,
      totalCostUsd: state.totalCostUsd,
      durationMs: Date.now() - state.startedAt.getTime(),
    });
  } catch (error) {
    const errorMessage = classifyError(error);

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
    setTimeout(() => {
      pipelineEvents.dispose(jobId);
      cancelledJobs.delete(jobId);
    }, 2000);
  }
}

// ============================================================
// Review Cycle (Agents 5+6 in parallel → quality gate)
// ============================================================

async function runReviewCycle(
  jobId: string,
  state: PipelineState,
  cancelledRef: { current: boolean },
) {
  checkCancellation(jobId, cancelledRef);
  await updateStatus(jobId, "reviewing", state);

  // Run agents 5 and 6 in parallel
  const ctx5 = createAgentContext(jobId, state, cancelledRef);
  const ctx6 = createAgentContext(jobId, state, cancelledRef);

  // Emit parallel start event
  pipelineEvents.emit(jobId, "agent:progress", {
    agent: "reviewing",
    progress: 0,
    message: "Running Quality Reviewer and Safety Reviewer in parallel",
  });

  const [qualityResult, safetyResult] = await Promise.all([
    runConfigAgent(qualityReviewerConfig, ctx5),
    runConfigAgent(safetyReviewerConfig, ctx6),
  ]);

  state.qualityReview = qualityResult.output;
  state.safetyReview = safetyResult.output;

  // Evaluate quality gate
  const gateResult = evaluateQualityGate(
    qualityResult.output,
    safetyResult.output,
    state.textRevisionCount,
  );

  pipelineEvents.emit(jobId, "agent:progress", {
    agent: "reviewing",
    progress: 100,
    message: `Quality gate: ${gateResult.decision} (score: ${gateResult.combinedScore})`,
  });

  return gateResult;
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

function countPhases(guide: { steps: { phaseStart: string | null }[] }): number {
  let count = 1; // at least one phase (default)
  for (const step of guide.steps) {
    if (step.phaseStart) count++;
  }
  return count;
}
