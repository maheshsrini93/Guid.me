import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs, generatedGuides, agentExecutions, generatedIllustrations } from "@/lib/db/schema";

/**
 * GET /api/jobs/[jobId]/result — Get completed job result.
 * Returns XML content, quality data, safety data, and generation metadata.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    const job = db.select().from(jobs).where(eq(jobs.id, jobId)).get();

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "completed") {
      return NextResponse.json(
        {
          error: "Job not completed",
          status: job.status,
          message: `Job is currently in "${job.status}" state. Results are only available for completed jobs.`,
        },
        { status: 400 },
      );
    }

    const guide = db
      .select()
      .from(generatedGuides)
      .where(eq(generatedGuides.jobId, jobId))
      .get();

    if (!guide) {
      return NextResponse.json(
        { error: "Guide not found for this job" },
        { status: 404 },
      );
    }

    // Get agent executions for cost breakdown
    const executions = db
      .select()
      .from(agentExecutions)
      .where(eq(agentExecutions.jobId, jobId))
      .all();

    // Get illustrations
    const illustrations = db
      .select()
      .from(generatedIllustrations)
      .where(eq(generatedIllustrations.jobId, jobId))
      .all();

    const costBreakdown = executions.map((exec) => ({
      agent: exec.agentName,
      model: exec.model,
      costUsd: exec.costUsd,
      durationMs: exec.durationMs,
      inputTokens: exec.inputTokens,
      outputTokens: exec.outputTokens,
    }));

    return NextResponse.json({
      job: {
        id: job.id,
        filename: job.filename,
        domain: job.domain,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        totalCostUsd: job.totalCostUsd,
        textRevisionCount: job.textRevisionCount,
      },
      guide: {
        xmlContent: guide.xmlContent,
        jsonContent: guide.jsonContent ? JSON.parse(guide.jsonContent) : null,
        qualityScore: guide.qualityScore,
        qualityDecision: guide.qualityDecision,
        qualityIssues: guide.qualityIssues ? JSON.parse(guide.qualityIssues) : [],
        safetyIssues: guide.safetyIssues ? JSON.parse(guide.safetyIssues) : [],
        stepCount: guide.stepCount,
        phaseCount: guide.phaseCount,
        title: guide.title,
        estimatedMinutes: guide.estimatedMinutes,
        safetyLevel: guide.safetyLevel,
        modelsUsed: guide.modelsUsed ? JSON.parse(guide.modelsUsed) : [],
        textRevisionLoops: guide.textRevisionLoops,
        totalCostUsd: guide.totalCostUsd,
        generatedAt: guide.generatedAt,
      },
      illustrations: illustrations.map((il) => ({
        stepNumber: il.stepNumber,
        mimeType: il.mimeType,
        width: il.width,
        height: il.height,
        model: il.model,
        costUsd: il.costUsd,
        durationMs: il.durationMs,
      })),
      costBreakdown,
    });
  } catch (error) {
    console.error("[GET /api/jobs/[jobId]/result] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
