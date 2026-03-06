import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { resumePipeline } from "@/lib/orchestrator/orchestrator";

/**
 * POST /api/jobs/[jobId]/retry — Retry a failed pipeline from the last checkpoint.
 * Reads completed agent outputs from DB and resumes from the failure point.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  const job = db
    .select({ id: jobs.id, status: jobs.status })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .get();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "failed") {
    return NextResponse.json(
      { error: `Cannot retry job in "${job.status}" state. Only failed jobs can be retried.` },
      { status: 400 },
    );
  }

  // Start resume asynchronously (fire-and-forget)
  resumePipeline(jobId).catch((err) => {
    console.error(`[Pipeline ${jobId}] Unhandled resume error:`, err);
  });

  return NextResponse.json({ jobId, status: "retrying" }, { status: 200 });
}
