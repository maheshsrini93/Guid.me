import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir, readdir, stat, copyFile, readFile as fsReadFile } from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import { config } from "@/lib/config";
import { saveFile, getPagesDir, getDoclingOutputDir } from "@/lib/utils/file-storage";
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

    // Try Docling first (handles both PDF and DOCX)
    if (await this.isDoclingAvailable()) {
      try {
        return await this.extractWithDocling(input, context, filename, startTime);
      } catch (err) {
        console.warn(`[DocumentExtractor] Docling failed, falling back to legacy: ${err}`);
      }
    }

    // Legacy fallback
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
  // Docling extraction (PDF + DOCX, with structured Markdown)
  // ============================================================

  private doclingAvailable: boolean | null = null;

  private async isDoclingAvailable(): Promise<boolean> {
    if (this.doclingAvailable !== null) return this.doclingAvailable;
    try {
      await execFileAsync("docling", ["--version"]);
      this.doclingAvailable = true;
    } catch {
      this.doclingAvailable = false;
    }
    return this.doclingAvailable;
  }

  private async extractWithDocling(
    input: DocumentExtractorInput,
    context: AgentContext,
    filename: string,
    startTime: number,
  ): Promise<ExtractedDocument> {
    const pagesDir = getPagesDir(input.jobId);
    const doclingOutDir = getDoclingOutputDir(input.jobId);
    await mkdir(pagesDir, { recursive: true });
    await mkdir(doclingOutDir, { recursive: true });

    context.reportProgress(10, "Running Docling document extraction");

    await execFileAsync("docling", [
      input.filePath,
      "--to", "md",
      "--image-export-mode", "referenced",
      "--pipeline", config.doclingPipeline,
      "--output", doclingOutDir,
    ], { timeout: 120_000 });

    context.reportProgress(50, "Processing Docling output");

    // Docling outputs into a subdirectory named after the input file stem
    const stem = path.basename(input.filePath, path.extname(input.filePath));
    const subDir = path.join(doclingOutDir, stem);
    let actualOutDir: string;
    try {
      const s = await stat(subDir);
      actualOutDir = s.isDirectory() ? subDir : doclingOutDir;
    } catch {
      actualOutDir = doclingOutDir;
    }

    // Read Markdown output
    let doclingMarkdown: string | undefined;
    try {
      const allFiles = await readdir(actualOutDir);
      const mdFile = allFiles.find((f) => f.endsWith(".md"));
      if (mdFile) {
        doclingMarkdown = await fsReadFile(path.join(actualOutDir, mdFile), "utf-8");
      }
    } catch {
      // Markdown is optional context — not fatal
    }

    // Collect referenced images and copy to our pages directory
    // Docling may output images in the main dir or an "images" subdirectory
    const imageDirs = [actualOutDir];
    try {
      const imagesSubDir = path.join(actualOutDir, "images");
      const s = await stat(imagesSubDir);
      if (s.isDirectory()) imageDirs.push(imagesSubDir);
    } catch {
      // No images subdirectory
    }

    const imageFiles: string[] = [];
    for (const dir of imageDirs) {
      const files = await readdir(dir);
      for (const f of files) {
        if (/\.(png|jpe?g|tiff?|bmp|webp)$/i.test(f)) {
          imageFiles.push(path.join(dir, f));
        }
      }
    }
    imageFiles.sort();

    // If Docling produced no images, fall back to pdftoppm for images only
    if (imageFiles.length === 0 && input.mimeType === "application/pdf") {
      context.reportProgress(60, "No images from Docling, extracting pages with pdftoppm");
      const outputPrefix = path.join(pagesDir, "page");
      await execFileAsync("pdftoppm", ["-png", "-r", "300", input.filePath, outputPrefix]);

      const pngFiles = (await readdir(pagesDir)).filter((f) => f.endsWith(".png")).sort();
      const pages: ExtractedPage[] = [];
      for (let i = 0; i < pngFiles.length; i++) {
        const imagePath = path.join(pagesDir, pngFiles[i]);
        const { width, height } = await this.getImageDimensions(imagePath);
        pages.push({ pageNumber: i + 1, imagePath, width, height, mimeType: "image/png" });
      }

      return {
        filename,
        format: input.mimeType === "application/pdf" ? "pdf" : "docx",
        pageCount: pages.length,
        pages,
        doclingMarkdown,
        durationMs: Date.now() - startTime,
      };
    }

    // Copy images to our standard pages directory
    const pages: ExtractedPage[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const destName = `page-${String(i + 1).padStart(2, "0")}.png`;
      const destPath = path.join(pagesDir, destName);
      await copyFile(imageFiles[i], destPath);
      const { width, height } = await this.getImageDimensions(destPath);

      pages.push({
        pageNumber: i + 1,
        imagePath: destPath,
        width,
        height,
        mimeType: "image/png",
      });

      context.reportProgress(
        50 + Math.round(((i + 1) / imageFiles.length) * 45),
        `Processing page ${i + 1} of ${imageFiles.length}`,
      );
    }

    const format = input.mimeType === "application/pdf" ? "pdf" : "docx";
    return {
      filename,
      format,
      pageCount: pages.length,
      pages,
      doclingMarkdown,
      durationMs: Date.now() - startTime,
    };
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
    await mkdir(pagesDir, { recursive: true });

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
    await mkdir(pagesDir, { recursive: true });

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
