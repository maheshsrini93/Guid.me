import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { agentExecutions, jobs } from "@/lib/db/schema";
import { pipelineEvents } from "@/lib/orchestrator/event-emitter";
import type { PipelineState, AgentCostRecord } from "@/types/pipeline";
import type { AgentContext, AgentExecutionRecord, AgentName } from "./types";

/** Map pipeline status to agent name for progress reporting */
const STATUS_TO_AGENT: Record<string, AgentName> = {
  extracting: "document-extractor",
  analyzing: "vision-analyzer",
  composing: "instruction-composer",
  enforcing: "guideline-enforcer",
  reviewing: "quality-reviewer",
  revising: "guideline-enforcer",
  illustrating: "illustration-generator",
  assembling: "xml-assembler",
};

/**
 * Create an AgentContext that bridges both config-driven and code agents
 * to SSE events, DB persistence, and cost tracking.
 */
export function createAgentContext(
  jobId: string,
  state: PipelineState,
  cancelledRef: { current: boolean },
): AgentContext {
  const controller = new AbortController();

  // If cancelled, abort immediately
  if (cancelledRef.current) {
    controller.abort();
  }

  return {
    jobId,
    pipelineState: state,

    emit(type: string, data: unknown) {
      pipelineEvents.emit(jobId, type, data);
    },

    reportProgress(progress: number, message: string) {
      const agentName = STATUS_TO_AGENT[state.status] ?? state.status;
      pipelineEvents.emit(jobId, "agent:progress", {
        agent: agentName,
        progress,
        message,
      });
    },

    recordCost(cost: AgentCostRecord) {
      state.costs.push(cost);
      state.totalCostUsd += cost.costUsd;

      // Emit cost update to SSE
      const breakdown: Record<string, number> = {};
      for (const c of state.costs) {
        breakdown[c.agent] = (breakdown[c.agent] ?? 0) + c.costUsd;
      }
      pipelineEvents.emit(jobId, "pipeline:cost", {
        totalUsd: state.totalCostUsd,
        breakdown,
      });

      // Update job cost in DB (fire-and-forget)
      db.update(jobs)
        .set({ totalCostUsd: state.totalCostUsd })
        .where(eq(jobs.id, jobId))
        .run();
    },

    async persistExecution(record: AgentExecutionRecord) {
      await db.insert(agentExecutions).values({
        id: record.id,
        jobId: record.jobId,
        agentName: record.agentName,
        executionOrder: record.executionOrder,
        model: record.model,
        wasEscalation: record.wasEscalation,
        promptSent: record.promptSent,
        responseReceived: record.responseReceived,
        structuredOutput: record.structuredOutput,
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        costUsd: record.costUsd,
        startedAt: record.startedAt,
        completedAt: record.completedAt,
        durationMs: record.durationMs,
        status: record.status,
        errorMessage: record.errorMessage,
      });
    },

    isCancelled() {
      return cancelledRef.current;
    },

    signal: controller.signal,
  };
}
