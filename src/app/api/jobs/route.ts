import { NextRequest, NextResponse } from "next/server";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { generateId } from "@/lib/utils/ulid";
import { saveFile, getUploadPath, ensureStorageDir } from "@/lib/utils/file-storage";
import { config } from "@/lib/config";
import { runPipeline } from "@/lib/orchestrator/orchestrator";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * POST /api/jobs — Create a new generation job.
 * Accepts multipart form data with a file upload.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Upload a PDF or DOCX file." },
        { status: 400 },
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${file.type}. Upload a PDF or DOCX file.`,
        },
        { status: 400 },
      );
    }

    // Validate file size
    const maxBytes = config.maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${config.maxFileSizeMb}MB.` },
        { status: 400 },
      );
    }

    // Create job
    const jobId = generateId();
    await ensureStorageDir();

    // Save file to storage
    const filePath = getUploadPath(jobId, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await saveFile(filePath, buffer);

    // Parse optional config from form data
    const documentName = (formData.get("documentName") as string) || file.name;
    const domain = (formData.get("domain") as string) || "general";
    const qualityThreshold = parseInt(
      (formData.get("qualityThreshold") as string) || String(config.qualityThreshold),
      10,
    );
    const generateIllustrations =
      (formData.get("generateIllustrations") as string) !== "false";

    // Insert job record
    const now = new Date().toISOString();
    db.insert(jobs)
      .values({
        id: jobId,
        status: "pending",
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        filePath,
        documentName,
        domain,
        qualityThreshold,
        generateIllustrations,
        createdAt: now,
      })
      .run();

    // Start pipeline asynchronously (fire-and-forget)
    runPipeline(jobId, filePath, file.type).catch((err) => {
      console.error(`[Pipeline ${jobId}] Unhandled error:`, err);
    });

    return NextResponse.json({ jobId }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/jobs] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/jobs — List all jobs, newest first.
 * Supports pagination via ?limit=N&offset=N query params.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 1),
      100,
    );
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

    // Total count for pagination
    const countResult = db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .get();
    const total = countResult?.count ?? 0;

    const allJobs = db
      .select({
        id: jobs.id,
        status: jobs.status,
        filename: jobs.filename,
        documentName: jobs.documentName,
        domain: jobs.domain,
        pageCount: jobs.pageCount,
        qualityScore: jobs.qualityScore,
        qualityDecision: jobs.qualityDecision,
        totalCostUsd: jobs.totalCostUsd,
        createdAt: jobs.createdAt,
        startedAt: jobs.startedAt,
        completedAt: jobs.completedAt,
        currentAgent: jobs.currentAgent,
        errorMessage: jobs.errorMessage,
      })
      .from(jobs)
      .orderBy(desc(jobs.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return NextResponse.json({
      jobs: allJobs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[GET /api/jobs] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
