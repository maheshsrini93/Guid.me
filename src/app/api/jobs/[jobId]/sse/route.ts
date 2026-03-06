import { NextRequest } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs, agentExecutions } from "@/lib/db/schema";
import { createSSEStream } from "@/lib/utils/sse";
import { pipelineEvents } from "@/lib/orchestrator/event-emitter";

/**
 * GET /api/jobs/[jobId]/sse — Server-Sent Events stream for pipeline updates.
 *
 * Events: pipeline:state, agent:start, agent:progress, agent:complete,
 *         pipeline:cost, pipeline:error, pipeline:complete
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  // Verify job exists
  const job = db
    .select({
      id: jobs.id,
      status: jobs.status,
      currentAgent: jobs.currentAgent,
      totalCostUsd: jobs.totalCostUsd,
      errorMessage: jobs.errorMessage,
    })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .get();

  if (!job) {
    return new Response(JSON.stringify({ error: "Job not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { stream, sendEvent, close } = createSSEStream();

  const terminalStates = ["completed", "failed", "cancelled"];

  // Hydrate completed agents from DB so the UI always shows correct state,
  // regardless of event buffer timing (critical for retries)
  const completedExecs = db
    .select({
      agentName: agentExecutions.agentName,
      startedAt: agentExecutions.startedAt,
      durationMs: agentExecutions.durationMs,
      costUsd: agentExecutions.costUsd,
    })
    .from(agentExecutions)
    .where(
      and(
        eq(agentExecutions.jobId, jobId),
        eq(agentExecutions.status, "completed"),
      ),
    )
    .orderBy(asc(agentExecutions.executionOrder))
    .all();

  // Emit completed agent events from DB (idempotent — UI reducer handles duplicates)
  const emittedAgents = new Set<string>();
  for (const exec of completedExecs) {
    // Skip duplicates (e.g. multiple executions of same agent from revision loops)
    if (emittedAgents.has(exec.agentName)) continue;
    emittedAgents.add(exec.agentName);

    sendEvent("agent:start", {
      agent: exec.agentName,
      startedAt: exec.startedAt,
    });
    sendEvent("agent:complete", {
      agent: exec.agentName,
      durationMs: exec.durationMs ?? 0,
      costUsd: exec.costUsd ?? 0,
      summary: "Restored from previous run",
    });
  }

  // Emit current cost if any
  if (job.totalCostUsd && job.totalCostUsd > 0) {
    sendEvent("pipeline:cost", {
      totalUsd: job.totalCostUsd,
      breakdown: {},
    });
  }

  // Emit agent:start for the currently running agent (so it shows as active)
  const STATUS_TO_AGENT: Record<string, string> = {
    extracting: "document-extractor",
    analyzing: "vision-analyzer",
    composing: "instruction-composer",
    enforcing: "guideline-enforcer",
    reviewing: "quality-reviewer",
    illustrating: "illustration-generator",
    assembling: "xml-assembler",
  };
  const activeAgent = STATUS_TO_AGENT[job.status ?? ""];
  if (activeAgent && !emittedAgents.has(activeAgent)) {
    sendEvent("agent:start", {
      agent: activeAgent,
      startedAt: new Date().toISOString(),
    });
  }

  // Emit current pipeline status
  sendEvent("pipeline:state", {
    state: job.status,
    timestamp: new Date().toISOString(),
  });

  // If job is already terminal, send error info if applicable and close
  if (terminalStates.includes(job.status)) {
    if (job.status === "failed" && job.errorMessage) {
      sendEvent("pipeline:error", {
        error: job.errorMessage,
        recoverable: false,
      });
    }
    setTimeout(() => close(), 100);
  } else {
    // Subscribe to live pipeline events (buffer replay may send duplicates — UI handles it)
    const unsubscribe = pipelineEvents.subscribe(jobId, (type, data) => {
      sendEvent(type, data);

      // Close stream on terminal events
      if (
        type === "pipeline:complete" ||
        type === "pipeline:error" ||
        (type === "pipeline:state" &&
          typeof data === "object" &&
          data !== null &&
          "state" in data &&
          terminalStates.includes((data as { state: string }).state))
      ) {
        setTimeout(() => {
          unsubscribe();
          close();
        }, 500);
      }
    });
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
