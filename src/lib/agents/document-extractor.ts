import { execFile } from "child_process";
import { promisify } from "util";
import { readdir, stat } from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import { saveFile, getPagesDir } from "@/lib/utils/file-storage";
import type { PipelineState } from "@/types/pipeline";
import type {
  DocumentExtractorInput,
  ExtractedDocument,
  ExtractedPage,
} from "@/types/agents";
import { BaseCodeAgent } from "./base-code-agent";
import { AgentValidationError } from "./types";
import type { AgentContext, AgentName } from "./types";

const execFileAsync = promisify(execFile);

export class DocumentExtractor extends BaseCodeAgent<
  DocumentExtractorInput,
  ExtractedDocument
> {
  name: AgentName = "document-extractor";
  displayName = "Document Extractor";
  executionOrder = 1;

  validateInput(state: PipelineState): DocumentExtractorInput {
    if (!state.documentPath) {
      throw new AgentValidationError(
        "document-extractor",
        "No document path provided.",
      );
    }
    if (!state.documentMimeType) {
      throw new AgentValidationError(
        "document-extractor",
        "No document MIME type provided.",
      );
    }

    const validMimes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validMimes.includes(state.documentMimeType)) {
      throw new AgentValidationError(
        "document-extractor",
        `Unsupported MIME type: ${state.documentMimeType}. Expected PDF or DOCX.`,
      );
    }

    return {
      filePath: state.documentPath,
      mimeType: state.documentMimeType as DocumentExtractorInput["mimeType"],
      jobId: state.jobId,
    };
  }

  async execute(
    input: DocumentExtractorInput,
    context: AgentContext,
  ): Promise<ExtractedDocument> {
    const startTime = Date.now();
    const filename = path.basename(input.filePath);

    if (input.mimeType === "application/pdf") {
      return this.extractPdf(input, context, filename, startTime);
    } else {
      return this.extractDocx(input, context, filename, startTime);
    }
  }

  summarize(output: ExtractedDocument): string {
    return `Extracted ${output.pageCount} pages from ${output.filename} (${output.format})`;
  }

  // ============================================================
  // PDF extraction via pdftoppm
  // ============================================================

  private async extractPdf(
    input: DocumentExtractorInput,
    context: AgentContext,
    filename: string,
    startTime: number,
  ): Promise<ExtractedDocument> {
    const pagesDir = getPagesDir(input.jobId);

    // Run pdftoppm to convert PDF pages to PNG images at 300 DPI
    const outputPrefix = path.join(pagesDir, "page");
    await execFileAsync("pdftoppm", [
      "-png",
      "-r",
      "300",
      input.filePath,
      outputPrefix,
    ]);

    // Read generated PNG files
    const files = await readdir(pagesDir);
    const pngFiles = files
      .filter((f) => f.endsWith(".png"))
      .sort(); // pdftoppm names them page-01.png, page-02.png, etc.

    const pages: ExtractedPage[] = [];
    for (let i = 0; i < pngFiles.length; i++) {
      const imagePath = path.join(pagesDir, pngFiles[i]);
      const { width, height } = await this.getImageDimensions(imagePath);

      pages.push({
        pageNumber: i + 1,
        imagePath,
        width,
        height,
        mimeType: "image/png",
      });

      context.reportProgress(
        Math.round(((i + 1) / pngFiles.length) * 100),
        `Extracting page ${i + 1} of ${pngFiles.length}`,
      );
    }

    return {
      filename,
      format: "pdf",
      pageCount: pages.length,
      pages,
      durationMs: Date.now() - startTime,
    };
  }

  // ============================================================
  // DOCX extraction via mammoth
  // ============================================================

  private async extractDocx(
    input: DocumentExtractorInput,
    context: AgentContext,
    filename: string,
    startTime: number,
  ): Promise<ExtractedDocument> {
    const pagesDir = getPagesDir(input.jobId);

    context.reportProgress(25, "Converting DOCX to HTML");

    // Convert DOCX to HTML and extract images
    const result = await mammoth.convertToHtml(
      { path: input.filePath },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          const imageBuffer = await image.read("base64");
          const ext = image.contentType.split("/")[1] ?? "png";
          const imgFilename = `image-${Date.now()}.${ext}`;
          const imgPath = path.join(pagesDir, imgFilename);
          await saveFile(imgPath, Buffer.from(imageBuffer, "base64"));
          return { src: imgPath };
        }),
      },
    );

    context.reportProgress(75, "Extracting images from DOCX");

    // Read extracted images
    let files: string[];
    try {
      files = await readdir(pagesDir);
    } catch {
      files = [];
    }
    const imageFiles = files
      .filter((f) => /\.(png|jpe?g)$/i.test(f))
      .sort();

    const pages: ExtractedPage[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const imagePath = path.join(pagesDir, imageFiles[i]);
      const { width, height } = await this.getImageDimensions(imagePath);
      const ext = path.extname(imageFiles[i]).toLowerCase();

      pages.push({
        pageNumber: i + 1,
        imagePath,
        width,
        height,
        mimeType: ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png",
      });
    }

    context.reportProgress(100, "DOCX extraction complete");

    return {
      filename,
      format: "docx",
      pageCount: Math.max(pages.length, 1),
      pages,
      textContent: result.value,
      durationMs: Date.now() - startTime,
    };
  }

  // ============================================================
  // Image dimension helper
  // ============================================================

  private async getImageDimensions(
    imagePath: string,
  ): Promise<{ width: number; height: number }> {
    // Use file command or basic heuristic for PNG dimensions
    try {
      const { stdout } = await execFileAsync("file", [imagePath]);
      // file output for PNG: "image.png: PNG image data, 2480 x 3508, ..."
      const match = stdout.match(/(\d+)\s*x\s*(\d+)/);
      if (match) {
        return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
      }
    } catch {
      // Fallback
    }
    // Default dimensions if we can't detect
    return { width: 2480, height: 3508 };
  }
}

/** Singleton instance */
export const documentExtractor = new DocumentExtractor();
