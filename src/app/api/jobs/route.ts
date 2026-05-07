import { NextRequest, NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import path from "path";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { generateId } from "@/lib/utils/ulid";
import {
  saveFile,
  ensureStorageDir,
  getPrimarySourcePath,
  getAuxiliarySourcePath,
} from "@/lib/utils/file-storage";
import { config } from "@/lib/config";
import { runPipeline } from "@/lib/orchestrator/orchestrator";

type SourceKind = "pdf" | "docx" | "step" | "step+explode-video";

interface PrimaryClassification {
  kind: "pdf" | "docx" | "step";
  /** Filename extension to use when persisting to disk (no leading dot) */
  ext: string;
  /** Canonical MIME type to record in the DB / pass to the orchestrator */
  mimeType: string;
}

const DOC_MIME_PDF = "application/pdf";
const DOC_MIME_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const STEP_CANONICAL_MIME = "model/step";
// Browsers commonly serve STEP as application/octet-stream; we accept either
// when the extension confirms the format.
const STEP_MIME_TYPES = new Set([
  "model/step",
  "application/step",
  "application/STEP",
]);
const STEP_EXTENSIONS = new Set([".step", ".stp"]);

const AUX_VIDEO_EXTENSIONS = new Set([".mp4", ".jt"]);
const AUX_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "model/jt",
  "application/octet-stream",
]);

/**
 * POST /api/jobs — Create a new generation job.
 *
 * Accepts multipart form data with:
 * - `file` (required): the primary source. PDF, DOCX, or STEP.
 * - `auxiliaryFile` (optional): only valid when `file` is STEP. Currently MP4
 *   or JT explode-view animation.
 *
 * Validates these combinations:
 *   pdf | docx                  → standalone
 *   step                        → standalone (CAD geometry-inferred fallback)
 *   step + (mp4 | jt)           → CAD with authored explode video
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const auxiliaryFile = formData.get("auxiliaryFile") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Upload a PDF, DOCX, or STEP file." },
        { status: 400 },
      );
    }

    // Classify the primary file (MIME first, fall through to extension for STEP).
    const primary = classifyPrimary(file);
    if (!primary) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${file.type || file.name}. Upload a PDF, DOCX, or STEP file.`,
        },
        { status: 400 },
      );
    }

    // Auxiliary uploads are only meaningful for STEP primaries.
    if (auxiliaryFile && primary.kind !== "step") {
      return NextResponse.json(
        {
          error:
            "Auxiliary files are only supported with STEP uploads. Remove the auxiliary file or change the primary to STEP.",
        },
        { status: 400 },
      );
    }

    let auxClassification: { ext: string; mimeType: string } | null = null;
    if (auxiliaryFile) {
      auxClassification = classifyAuxiliary(auxiliaryFile);
      if (!auxClassification) {
        return NextResponse.json(
          {
            error: `Unsupported auxiliary file type: ${auxiliaryFile.type || auxiliaryFile.name}. Upload an MP4 or JT explode video.`,
          },
          { status: 400 },
        );
      }
    }

    // Size validation: one budget for primary, one for auxiliary (videos are
    // typically larger so we allow up to 2× the configured cap).
    const maxPrimaryBytes = config.maxFileSizeMb * 1024 * 1024;
    if (file.size > maxPrimaryBytes) {
      return NextResponse.json(
        {
          error: `Primary file too large. Maximum size is ${config.maxFileSizeMb}MB.`,
        },
        { status: 400 },
      );
    }
    const maxAuxBytes = config.maxFileSizeMb * 2 * 1024 * 1024;
    if (auxiliaryFile && auxiliaryFile.size > maxAuxBytes) {
      return NextResponse.json(
        {
          error: `Auxiliary file too large. Maximum size is ${config.maxFileSizeMb * 2}MB.`,
        },
        { status: 400 },
      );
    }

    // Create job
    const jobId = generateId();
    await ensureStorageDir();

    // Persist primary + optional auxiliary under storage/jobs/{jobId}/source/.
    const primaryPath = getPrimarySourcePath(jobId, primary.ext);
    await saveFile(primaryPath, Buffer.from(await file.arrayBuffer()));

    let auxiliaryPath: string | null = null;
    let auxiliaryMimeType: string | null = null;
    if (auxiliaryFile && auxClassification) {
      auxiliaryPath = getAuxiliarySourcePath(jobId, auxClassification.ext);
      await saveFile(
        auxiliaryPath,
        Buffer.from(await auxiliaryFile.arrayBuffer()),
      );
      auxiliaryMimeType = auxClassification.mimeType;
    }

    const sourceKind: SourceKind =
      primary.kind === "step"
        ? auxiliaryPath
          ? "step+explode-video"
          : "step"
        : primary.kind;

    // Parse optional config from form data
    const documentName = (formData.get("documentName") as string) || file.name;
    const domain = (formData.get("domain") as string) || "general";
    const qualityThreshold = parseInt(
      (formData.get("qualityThreshold") as string) ||
        String(config.qualityThreshold),
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
        mimeType: primary.mimeType,
        fileSize: file.size,
        filePath: primaryPath,
        sourceKind,
        auxiliaryPath: auxiliaryPath ?? null,
        auxiliaryMimeType: auxiliaryMimeType ?? null,
        documentName,
        domain,
        qualityThreshold,
        generateIllustrations,
        createdAt: now,
      })
      .run();

    // Start pipeline asynchronously (fire-and-forget)
    runPipeline(jobId, primaryPath, primary.mimeType).catch((err) => {
      console.error(`[Pipeline ${jobId}] Unhandled error:`, err);
    });

    return NextResponse.json({ jobId, sourceKind }, { status: 201 });
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
    const offset = Math.max(
      parseInt(searchParams.get("offset") ?? "0", 10) || 0,
      0,
    );

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
        sourceKind: jobs.sourceKind,
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

// ============================================================
// File classification helpers
// ============================================================

function classifyPrimary(file: File): PrimaryClassification | null {
  const ext = path.extname(file.name).toLowerCase();

  if (file.type === DOC_MIME_PDF || ext === ".pdf") {
    return { kind: "pdf", ext: "pdf", mimeType: DOC_MIME_PDF };
  }
  if (file.type === DOC_MIME_DOCX || ext === ".docx") {
    return { kind: "docx", ext: "docx", mimeType: DOC_MIME_DOCX };
  }
  if (STEP_MIME_TYPES.has(file.type) || STEP_EXTENSIONS.has(ext)) {
    // Strip leading dot; default to "step" when the upload had no extension.
    const cleanExt = ext ? ext.slice(1) : "step";
    return { kind: "step", ext: cleanExt, mimeType: STEP_CANONICAL_MIME };
  }
  return null;
}

function classifyAuxiliary(
  file: File,
): { ext: string; mimeType: string } | null {
  const ext = path.extname(file.name).toLowerCase();
  if (!AUX_VIDEO_EXTENSIONS.has(ext) && !AUX_VIDEO_MIME_TYPES.has(file.type)) {
    return null;
  }
  if (!AUX_VIDEO_EXTENSIONS.has(ext)) {
    // MIME accepted but extension unknown — refuse rather than guess.
    return null;
  }
  // Canonicalize the MIME so the source-adapter sees a stable value.
  const mimeType =
    ext === ".mp4" ? "video/mp4" : ext === ".jt" ? "model/jt" : file.type;
  return { ext: ext.slice(1), mimeType };
}
