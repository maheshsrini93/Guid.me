import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
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
    .select({ id: jobs.id, status: jobs.status })
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

  // Send current state as initial event
  sendEvent("pipeline:state", {
    state: job.status,
    timestamp: new Date().toISOString(),
  });

  // If job is already terminal, close immediately after sending state
  const terminalStates = ["completed", "failed", "cancelled"];
  if (terminalStates.includes(job.status)) {
    setTimeout(() => close(), 100);
  } else {
    // Subscribe to pipeline events
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
