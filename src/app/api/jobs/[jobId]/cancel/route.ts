import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { cancelPipeline } from "@/lib/orchestrator/orchestrator";

/**
 * POST /api/jobs/[jobId]/cancel — Cancel a running pipeline.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    const job = db
      .select({ id: jobs.id, status: jobs.status })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .get();

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 },
      );
    }

    const terminalStates = ["completed", "failed", "cancelled"];
    if (terminalStates.includes(job.status)) {
      return NextResponse.json(
        { error: `Job is already ${job.status}` },
        { status: 409 },
      );
    }

    cancelPipeline(jobId);

    return NextResponse.json({ message: "Cancellation requested", jobId });
  } catch (error) {
    console.error("[POST /api/jobs/[jobId]/cancel] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
