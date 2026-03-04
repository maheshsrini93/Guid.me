/**
 * Demo Mode Manager.
 * Replays pre-cached results with realistic timing when DEMO_MODE=true.
 * Emits identical SSE events to the live pipeline.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs, generatedGuides, generatedIllustrations, agentExecutions } from "@/lib/db/schema";
import { generateId } from "@/lib/utils/ulid";
import { pipelineEvents } from "@/lib/orchestrator/event-emitter";
import { PipelineCancelledError } from "@/lib/agents/types";
import type { PipelineStatus, AgentCostRecord } from "@/types/pipeline";
import {
  DEMO_EXTRACTED_DOCUMENT,
  DEMO_PAGE_EXTRACTIONS,
  DEMO_COMPOSED_GUIDE,
  DEMO_ENFORCED_GUIDE,
  DEMO_QUALITY_REVIEW,
  DEMO_SAFETY_REVIEW,
  DEMO_XML_CONTENT,
  DEMO_COST_RECORDS,
  DEMO_TOTAL_COST,
} from "./demo-data";
import { getAgentTiming, sleep } from "./demo-timing";

/** Track cancellation per demo job */
const demoCancelledJobs = new Map<string, { current: boolean }>();

export function cancelDemoPipeline(jobId: string): void {
  const ref = demoCancelledJobs.get(jobId);
  if (ref) ref.current = true;
}

/**
 * Run the full pipeline in demo mode with cached results + realistic timing.
 */
export async function runDemoPipeline(jobId: string): Promise<void> {
  const cancelledRef = { current: false };
  demoCancelledJobs.set(jobId, cancelledRef);
  const startedAt = Date.now();

  const costs: AgentCostRecord[] = [];
  let totalCostUsd = 0;

  try {
    // ── Agent 1: Document Extractor ────────────────────────
    await simulateAgent(jobId, cancelledRef, "extracting", "document-extractor", costs, () => {
      totalCostUsd += 0;
      return [
        { progress: 30, message: "Extracting pages from PDF" },
        { progress: 70, message: "Converting pages to images" },
        { progress: 100, message: `Extracted ${DEMO_EXTRACTED_DOCUMENT.pageCount} pages` },
      ];
    }, 0, `Extracted ${DEMO_EXTRACTED_DOCUMENT.pageCount} pages`);

    // ── Agent 2: Vision Analyzer ───────────────────────────
    await simulateAgent(jobId, cancelledRef, "analyzing", "vision-analyzer", costs, () => {
      totalCostUsd += 0.06;
      return [
        { progress: 25, message: "Analyzing page 1 of 4" },
        { progress: 50, message: "Analyzing page 2 of 4" },
        { progress: 75, message: "Analyzing page 3 of 4" },
        { progress: 100, message: "Analyzing page 4 of 4" },
      ];
    }, 0.06, `Analyzed 4 pages, extracted ${DEMO_PAGE_EXTRACTIONS.reduce((sum, p) => sum + p.steps.length, 0)} observations`);

    // ── Agent 3: Instruction Composer ──────────────────────
    await simulateAgent(jobId, cancelledRef, "composing", "instruction-composer", costs, () => {
      totalCostUsd += 0.02;
      return [
        { progress: 30, message: "Merging page observations" },
        { progress: 70, message: "Composing instruction steps" },
        { progress: 100, message: "Composed 6 steps in 3 phases" },
      ];
    }, 0.02, "Composed 6 steps in 3 phases");

    // ── Agent 4: Guideline Enforcer ────────────────────────
    await simulateAgent(jobId, cancelledRef, "enforcing", "guideline-enforcer", costs, () => {
      totalCostUsd += 0.03;
      return [
        { progress: 30, message: "Loading work instruction guidelines" },
        { progress: 70, message: "Enforcing verb-first structure + part IDs" },
        { progress: 100, message: "All 6 steps guideline-compliant" },
      ];
    }, 0.03, "All 6 steps guideline-compliant");

    // ── Agents 5+6: Review (parallel) ──────────────────────
    checkCancelled(jobId, cancelledRef);
    updateDemoStatus(jobId, "reviewing");

    const timing5 = getAgentTiming("quality-reviewer");
    const timing6 = getAgentTiming("safety-reviewer");

    // Start both agents
    pipelineEvents.emit(jobId, "agent:start", {
      agent: "quality-reviewer",
      startedAt: new Date().toISOString(),
    });
    pipelineEvents.emit(jobId, "agent:start", {
      agent: "safety-reviewer",
      startedAt: new Date().toISOString(),
    });

    // Simulate parallel progress
    const maxDuration = Math.max(timing5.durationMs, timing6.durationMs);
    const parallelSteps = 4;
    for (let i = 1; i <= parallelSteps; i++) {
      checkCancelled(jobId, cancelledRef);
      await sleep(maxDuration / parallelSteps);
      const pct = Math.round((i / parallelSteps) * 100);
      pipelineEvents.emit(jobId, "agent:progress", {
        agent: "quality-reviewer",
        progress: pct,
        message: pct < 100 ? "Reviewing instruction quality" : "Quality review complete",
      });
      pipelineEvents.emit(jobId, "agent:progress", {
        agent: "safety-reviewer",
        progress: pct,
        message: pct < 100 ? "Reviewing safety compliance" : "Safety review complete",
      });
    }

    // Complete both
    totalCostUsd += 0.08 + 0.04;
    pipelineEvents.emit(jobId, "agent:complete", {
      agent: "quality-reviewer",
      durationMs: timing5.durationMs,
      costUsd: 0.08,
      summary: `Score: ${DEMO_QUALITY_REVIEW.overallScore}/100 — ${DEMO_QUALITY_REVIEW.decision}`,
    });
    pipelineEvents.emit(jobId, "agent:complete", {
      agent: "safety-reviewer",
      durationMs: timing6.durationMs,
      costUsd: 0.04,
      summary: `Safety: ${DEMO_SAFETY_REVIEW.recommendedSafetyLevel} — ${DEMO_SAFETY_REVIEW.issues.length} issues`,
    });

    recordDemoCost(jobId, costs, totalCostUsd, DEMO_COST_RECORDS[4]);
    recordDemoCost(jobId, costs, totalCostUsd, DEMO_COST_RECORDS[5]);

    // Persist execution records for reviewers
    const reviewStartedAt = new Date().toISOString();
    db.insert(agentExecutions).values({
      id: generateId(), jobId, agentName: "quality-reviewer", executionOrder: 5,
      model: "gemini-2.5-pro", wasEscalation: false, promptSent: "[demo mode]",
      responseReceived: "[demo mode]", structuredOutput: null,
      inputTokens: 9200, outputTokens: 2100, costUsd: 0.08,
      startedAt: reviewStartedAt, completedAt: new Date().toISOString(),
      durationMs: timing5.durationMs, status: "completed", errorMessage: null,
    }).run();
    db.insert(agentExecutions).values({
      id: generateId(), jobId, agentName: "safety-reviewer", executionOrder: 6,
      model: "gemini-2.5-pro", wasEscalation: false, promptSent: "[demo mode]",
      responseReceived: "[demo mode]", structuredOutput: null,
      inputTokens: 6800, outputTokens: 1500, costUsd: 0.04,
      startedAt: reviewStartedAt, completedAt: new Date().toISOString(),
      durationMs: timing6.durationMs, status: "completed", errorMessage: null,
    }).run();

    pipelineEvents.emit(jobId, "agent:progress", {
      agent: "reviewing",
      progress: 100,
      message: `Quality gate: ${DEMO_QUALITY_REVIEW.decision} (score: ${DEMO_QUALITY_REVIEW.overallScore})`,
    });

    // ── Agent 7: Illustration Generator ────────────────────
    await simulateAgent(jobId, cancelledRef, "illustrating", "illustration-generator", costs, () => {
      totalCostUsd += 0.24;
      return [
        { progress: 17, message: "Generating illustration for step 1" },
        { progress: 33, message: "Generating illustration for step 2" },
        { progress: 50, message: "Generating illustration for step 3" },
        { progress: 67, message: "Generating illustration for step 4" },
        { progress: 83, message: "Generating illustration for step 5" },
        { progress: 100, message: "Generated 6 illustrations" },
      ];
    }, 0.24, "Generated 6 illustrations");

    // ── Agent 8: XML Assembler ─────────────────────────────
    await simulateAgent(jobId, cancelledRef, "assembling", "xml-assembler", costs, () => {
      totalCostUsd += 0;
      return [
        { progress: 50, message: "Building XML document" },
        { progress: 100, message: "Assembly complete" },
      ];
    }, 0, `Assembled XML: ${(Buffer.byteLength(DEMO_XML_CONTENT, "utf-8") / 1024).toFixed(1)} KB`);

    // ── Persist demo guide to DB ───────────────────────────
    const guideId = generateId();
    db.insert(generatedGuides)
      .values({
        id: guideId,
        jobId,
        xmlContent: DEMO_XML_CONTENT,
        jsonContent: JSON.stringify(DEMO_ENFORCED_GUIDE),
        xmlFilePath: null,
        qualityScore: DEMO_QUALITY_REVIEW.overallScore,
        qualityDecision: DEMO_QUALITY_REVIEW.decision,
        qualityIssues: JSON.stringify(DEMO_QUALITY_REVIEW.issues),
        safetyIssues: JSON.stringify(DEMO_SAFETY_REVIEW.issues),
        stepCount: DEMO_ENFORCED_GUIDE.steps.length,
        phaseCount: 3,
        title: DEMO_ENFORCED_GUIDE.guideMetadata.purposeStatement,
        domain: "consumer",
        estimatedMinutes: DEMO_ENFORCED_GUIDE.guideMetadata.estimatedMinutes,
        safetyLevel: DEMO_SAFETY_REVIEW.recommendedSafetyLevel,
        modelsUsed: JSON.stringify(["gemini-2.5-flash", "gemini-2.5-pro"]),
        textRevisionLoops: 0,
        totalCostUsd: DEMO_TOTAL_COST,
        generatedAt: new Date().toISOString(),
      })
      .run();

    // ── Persist demo illustration records ──────────────────
    for (const step of DEMO_ENFORCED_GUIDE.steps) {
      db.insert(generatedIllustrations)
        .values({
          id: generateId(),
          jobId,
          guideId,
          stepNumber: step.stepNumber,
          filePath: `demo/illustrations/step-${String(step.stepNumber).padStart(3, "0")}.png`,
          mimeType: "image/png",
          width: 512,
          height: 512,
          model: "gemini-2.5-flash-preview-image-generation",
          costUsd: 0.04,
          durationMs: 2000,
          generatedAt: new Date().toISOString(),
        })
        .run();
    }

    // ── Complete ───────────────────────────────────────────
    const durationMs = Date.now() - startedAt;

    db.update(jobs)
      .set({
        status: "completed",
        completedAt: new Date().toISOString(),
        totalCostUsd: DEMO_TOTAL_COST,
        qualityScore: DEMO_QUALITY_REVIEW.overallScore,
        qualityDecision: DEMO_QUALITY_REVIEW.decision,
        textRevisionCount: 0,
      })
      .where(eq(jobs.id, jobId))
      .run();

    pipelineEvents.emit(jobId, "pipeline:state", {
      state: "completed",
      timestamp: new Date().toISOString(),
    });

    pipelineEvents.emit(jobId, "pipeline:complete", {
      state: "completed",
      qualityScore: DEMO_QUALITY_REVIEW.overallScore,
      qualityDecision: DEMO_QUALITY_REVIEW.decision,
      totalCostUsd: DEMO_TOTAL_COST,
      durationMs,
    });
  } catch (error) {
    if (error instanceof PipelineCancelledError) {
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      db.update(jobs)
        .set({
          status: "failed",
          completedAt: new Date().toISOString(),
          errorMessage,
          totalCostUsd,
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
      demoCancelledJobs.delete(jobId);
    }, 2000);
  }
}

// ============================================================
// Helpers
// ============================================================

function checkCancelled(jobId: string, ref: { current: boolean }): void {
  if (ref.current) throw new PipelineCancelledError(jobId);
}

function updateDemoStatus(jobId: string, status: PipelineStatus): void {
  db.update(jobs)
    .set({
      status,
      currentAgent: status,
      ...(status === "extracting" ? { startedAt: new Date().toISOString() } : {}),
    })
    .where(eq(jobs.id, jobId))
    .run();

  pipelineEvents.emit(jobId, "pipeline:state", {
    state: status,
    timestamp: new Date().toISOString(),
  });
}

function recordDemoCost(
  jobId: string,
  costs: AgentCostRecord[],
  totalCostUsd: number,
  record: { agent: string; model: string; costUsd: number; inputTokens: number; outputTokens: number },
): void {
  const costRecord: AgentCostRecord = {
    agent: record.agent,
    model: record.model,
    costUsd: record.costUsd,
    inputTokens: record.inputTokens,
    outputTokens: record.outputTokens,
    durationMs: 0,
    timestamp: new Date(),
  };
  costs.push(costRecord);

  const breakdown: Record<string, number> = {};
  for (const c of costs) {
    breakdown[c.agent] = (breakdown[c.agent] ?? 0) + c.costUsd;
  }
  pipelineEvents.emit(jobId, "pipeline:cost", {
    totalUsd: totalCostUsd,
    breakdown,
  });

  db.update(jobs)
    .set({ totalCostUsd })
    .where(eq(jobs.id, jobId))
    .run();
}

async function simulateAgent(
  jobId: string,
  cancelledRef: { current: boolean },
  pipelineStatus: PipelineStatus,
  agentName: string,
  costs: AgentCostRecord[],
  getProgressSteps: () => { progress: number; message: string }[],
  agentCost: number,
  summary: string,
): Promise<void> {
  checkCancelled(jobId, cancelledRef);
  updateDemoStatus(jobId, pipelineStatus);

  const timing = getAgentTiming(agentName);
  await sleep(timing.startDelayMs);

  // Emit start
  const startedAt = new Date();
  pipelineEvents.emit(jobId, "agent:start", {
    agent: agentName,
    startedAt: startedAt.toISOString(),
  });

  // Progress steps
  const steps = getProgressSteps();
  const stepDelay = timing.durationMs / steps.length;

  for (const step of steps) {
    checkCancelled(jobId, cancelledRef);
    await sleep(stepDelay);
    pipelineEvents.emit(jobId, "agent:progress", {
      agent: agentName,
      progress: step.progress,
      message: step.message,
    });
  }

  // Record cost
  const costRecord = DEMO_COST_RECORDS.find(c => c.agent === agentName);
  if (costRecord) {
    let runningTotal = 0;
    for (const c of costs) runningTotal += c.costUsd;
    runningTotal += agentCost;
    recordDemoCost(jobId, costs, runningTotal, costRecord);
  }

  // Persist execution record
  db.insert(agentExecutions)
    .values({
      id: generateId(),
      jobId,
      agentName,
      executionOrder: getExecutionOrder(agentName),
      model: costRecord?.model ?? "code",
      wasEscalation: false,
      promptSent: "[demo mode]",
      responseReceived: "[demo mode]",
      structuredOutput: null,
      inputTokens: costRecord?.inputTokens ?? 0,
      outputTokens: costRecord?.outputTokens ?? 0,
      costUsd: agentCost,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: timing.durationMs,
      status: "completed",
      errorMessage: null,
    })
    .run();

  // Emit complete
  pipelineEvents.emit(jobId, "agent:complete", {
    agent: agentName,
    durationMs: timing.durationMs,
    costUsd: agentCost,
    summary,
  });
}

function getExecutionOrder(agent: string): number {
  const order: Record<string, number> = {
    "document-extractor": 1,
    "vision-analyzer": 2,
    "instruction-composer": 3,
    "guideline-enforcer": 4,
    "quality-reviewer": 5,
    "safety-reviewer": 6,
    "illustration-generator": 7,
    "xml-assembler": 8,
  };
  return order[agent] ?? 0;
}
