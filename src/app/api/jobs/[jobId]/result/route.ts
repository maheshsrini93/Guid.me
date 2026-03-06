import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs, generatedGuides, agentExecutions, generatedIllustrations } from "@/lib/db/schema";

/**
 * GET /api/jobs/[jobId]/result — Get completed job result.
 * Returns XML content, quality data, safety data, and generation metadata.
 */
export async function GET(
  request: NextRequest,
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

    // If Accept: application/xml, return raw XML
    const accept = request.headers.get("accept") ?? "";
    if (accept.includes("application/xml") || accept.includes("text/xml")) {
      const filename = sanitizeFilename(job.filename) + ".xml";
      return new Response(guide.xmlContent, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const parsedJsonContent = guide.jsonContent ? JSON.parse(guide.jsonContent) : null;
    const normalizedJsonContent = normalizeInstructionContent(parsedJsonContent);

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
        jsonContent: normalizedJsonContent,
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

type PartRef = {
  id: string;
  quantity: number;
};

function mergePartRefs(parts: unknown): unknown {
  if (!Array.isArray(parts)) return parts;

  const merged = new Map<string, PartRef>();

  for (const entry of parts) {
    if (!entry || typeof entry !== "object") continue;

    const part = entry as { id?: unknown; quantity?: unknown };
    const id = typeof part.id === "string" ? part.id : String(part.id ?? "N/A");
    const quantity = typeof part.quantity === "number" && Number.isFinite(part.quantity)
      ? part.quantity
      : 1;

    const existing = merged.get(id);
    if (existing) {
      existing.quantity += quantity;
      continue;
    }

    merged.set(id, { id, quantity });
  }

  return Array.from(merged.values());
}

function normalizeInstructionContent(content: unknown): unknown {
  if (!content || typeof content !== "object") return content;

  const instruction = content as {
    phases?: Array<{
      steps?: Array<{
        parts?: unknown;
      }>;
    }>;
  };

  if (!Array.isArray(instruction.phases)) return content;

  return {
    ...instruction,
    phases: instruction.phases.map((phase) => {
      if (!phase || typeof phase !== "object" || !Array.isArray(phase.steps)) {
        return phase;
      }

      return {
        ...phase,
        steps: phase.steps.map((step) => {
          if (!step || typeof step !== "object") return step;

          return {
            ...step,
            parts: mergePartRefs(step.parts),
          };
        }),
      };
    }),
  };
}

/** Strip extension and special characters from a filename for use in downloads */
function sanitizeFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, "") // remove extension
    .replace(/[^a-zA-Z0-9_\-. ]/g, "_") // replace special chars
    .replace(/\s+/g, "_") // collapse whitespace
    .substring(0, 100); // truncate
}
