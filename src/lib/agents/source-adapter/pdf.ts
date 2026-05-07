import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir, readdir } from "fs/promises";
import path from "path";
import { getPagesDir } from "@/lib/utils/file-storage";
import type {
  SourceAdapterInput,
  ExtractedSource,
  Frame,
} from "@/types/agents";
import type { AgentContext } from "../types";
import type { SourceAdapterImpl } from "./types";
import { isDoclingAvailable, runDocling, getImageDimensions } from "./shared";

const execFileAsync = promisify(execFile);

export const pdfImpl: SourceAdapterImpl = {
  name: "pdf",

  canHandle(input: SourceAdapterInput): boolean {
    return input.mimeType === "application/pdf";
  },

  async extract(
    input: SourceAdapterInput,
    context: AgentContext,
  ): Promise<ExtractedSource> {
    const startTime = Date.now();
    const filename = path.basename(input.filePath);

    // Try Docling first; falls back to pdftoppm if Docling isn't available
    // or didn't produce images.
    if (await isDoclingAvailable()) {
      try {
        const result = await runDocling(input.filePath, input.jobId, context);
        if (result.frames.length > 0) {
          return {
            frames: result.frames,
            documentMetadata: {
              filename,
              format: "pdf",
              pageCount: result.frames.length,
              doclingMarkdown: result.doclingMarkdown,
            },
            durationMs: Date.now() - startTime,
          };
        }
        // Docling produced no images — fall through to pdftoppm, preserving Markdown.
        return await extractWithPdftoppm(input, context, filename, startTime, result.doclingMarkdown);
      } catch (err) {
        console.warn(`[SourceAdapter:pdf] Docling failed, falling back to pdftoppm: ${err}`);
      }
    }

    return extractWithPdftoppm(input, context, filename, startTime);
  },
};

async function extractWithPdftoppm(
  input: SourceAdapterInput,
  context: AgentContext,
  filename: string,
  startTime: number,
  doclingMarkdown?: string,
): Promise<ExtractedSource> {
  const pagesDir = getPagesDir(input.jobId);
  await mkdir(pagesDir, { recursive: true });

  // Convert PDF pages to PNG images at 300 DPI
  const outputPrefix = path.join(pagesDir, "page");
  await execFileAsync("pdftoppm", [
    "-png",
    "-r",
    "300",
    input.filePath,
    outputPrefix,
  ]);

  const files = await readdir(pagesDir);
  const pngFiles = files
    .filter((f) => f.endsWith(".png"))
    .sort(); // pdftoppm names them page-01.png, page-02.png, etc.

  const frames: Frame[] = [];
  for (let i = 0; i < pngFiles.length; i++) {
    const imagePath = path.join(pagesDir, pngFiles[i]);
    const { width, height } = await getImageDimensions(imagePath);

    frames.push({
      frameNumber: i + 1,
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
    frames,
    documentMetadata: {
      filename,
      format: "pdf",
      pageCount: frames.length,
      doclingMarkdown,
    },
    durationMs: Date.now() - startTime,
  };
}
