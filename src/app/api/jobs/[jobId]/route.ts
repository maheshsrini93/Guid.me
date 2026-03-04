import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs, agentExecutions } from "@/lib/db/schema";

/**
 * GET /api/jobs/[jobId] — Get job status with agent execution summaries.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    const job = db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .get();

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 },
      );
    }

    // Get agent execution summaries
    const executions = db
      .select({
        id: agentExecutions.id,
        agentName: agentExecutions.agentName,
        model: agentExecutions.model,
        wasEscalation: agentExecutions.wasEscalation,
        inputTokens: agentExecutions.inputTokens,
        outputTokens: agentExecutions.outputTokens,
        costUsd: agentExecutions.costUsd,
        startedAt: agentExecutions.startedAt,
        completedAt: agentExecutions.completedAt,
        durationMs: agentExecutions.durationMs,
        status: agentExecutions.status,
        errorMessage: agentExecutions.errorMessage,
        executionOrder: agentExecutions.executionOrder,
      })
      .from(agentExecutions)
      .where(eq(agentExecutions.jobId, jobId))
      .all();

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        filename: job.filename,
        documentName: job.documentName,
        mimeType: job.mimeType,
        fileSize: job.fileSize,
        domain: job.domain,
        pageCount: job.pageCount,
        qualityScore: job.qualityScore,
        qualityDecision: job.qualityDecision,
        qualityThreshold: job.qualityThreshold,
        generateIllustrations: job.generateIllustrations,
        totalCostUsd: job.totalCostUsd,
        textRevisionCount: job.textRevisionCount,
        currentAgent: job.currentAgent,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        errorMessage: job.errorMessage,
      },
      executions,
    });
  } catch (error) {
    console.error("[GET /api/jobs/[jobId]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
