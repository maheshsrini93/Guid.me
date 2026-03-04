import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs, generatedIllustrations } from "@/lib/db/schema";
import { readFile, fileExists } from "@/lib/utils/file-storage";

/**
 * GET /api/jobs/[jobId]/illustrations/[step]
 * Serve a generated illustration PNG for a specific step.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string; step: string }> },
) {
  const { jobId, step } = await params;
  const stepNumber = parseInt(step, 10);

  if (isNaN(stepNumber) || stepNumber < 1) {
    return NextResponse.json(
      { error: "Invalid step number" },
      { status: 400 },
    );
  }

  // Verify job exists
  const job = db.select().from(jobs).where(eq(jobs.id, jobId)).get();
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Find illustration record
  const illustration = db
    .select()
    .from(generatedIllustrations)
    .where(
      and(
        eq(generatedIllustrations.jobId, jobId),
        eq(generatedIllustrations.stepNumber, stepNumber),
      ),
    )
    .get();

  if (!illustration) {
    return NextResponse.json(
      { error: "Illustration not found for this step" },
      { status: 404 },
    );
  }

  // Read and serve the image file
  const exists = await fileExists(illustration.filePath);
  if (!exists) {
    return NextResponse.json(
      { error: "Illustration file not found on disk" },
      { status: 404 },
    );
  }

  const imageBuffer = await readFile(illustration.filePath);

  return new Response(new Uint8Array(imageBuffer), {
    headers: {
      "Content-Type": illustration.mimeType,
      "Content-Length": String(imageBuffer.length),
      "Cache-Control": "public, max-age=86400",
    },
  });
}
