import { mkdir, readdir } from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import { saveFile, getPagesDir } from "@/lib/utils/file-storage";
import type {
  SourceAdapterInput,
  ExtractedSource,
  Frame,
} from "@/types/agents";
import type { AgentContext } from "../types";
import type { SourceAdapterImpl } from "./types";
import { isDoclingAvailable, runDocling, getImageDimensions } from "./shared";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const docxImpl: SourceAdapterImpl = {
  name: "docx",

  canHandle(input: SourceAdapterInput): boolean {
    return input.mimeType === DOCX_MIME;
  },

  async extract(
    input: SourceAdapterInput,
    context: AgentContext,
  ): Promise<ExtractedSource> {
    const startTime = Date.now();
    const filename = path.basename(input.filePath);

    // Try Docling first; falls back to mammoth if unavailable or empty.
    if (await isDoclingAvailable()) {
      try {
        const result = await runDocling(input.filePath, input.jobId, context);
        if (result.frames.length > 0) {
          return {
            frames: result.frames,
            documentMetadata: {
              filename,
              format: "docx",
              pageCount: result.frames.length,
              doclingMarkdown: result.doclingMarkdown,
            },
            durationMs: Date.now() - startTime,
          };
        }
        // Docling produced no images — fall through to mammoth, preserving Markdown.
        return await extractWithMammoth(input, context, filename, startTime, result.doclingMarkdown);
      } catch (err) {
        console.warn(`[SourceAdapter:docx] Docling failed, falling back to mammoth: ${err}`);
      }
    }

    return extractWithMammoth(input, context, filename, startTime);
  },
};

async function extractWithMammoth(
  input: SourceAdapterInput,
  context: AgentContext,
  filename: string,
  startTime: number,
  doclingMarkdown?: string,
): Promise<ExtractedSource> {
  const pagesDir = getPagesDir(input.jobId);
  await mkdir(pagesDir, { recursive: true });

  context.reportProgress(25, "Converting DOCX to HTML");

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

  let files: string[];
  try {
    files = await readdir(pagesDir);
  } catch {
    files = [];
  }
  const imageFiles = files.filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();

  const frames: Frame[] = [];
  for (let i = 0; i < imageFiles.length; i++) {
    const imagePath = path.join(pagesDir, imageFiles[i]);
    const { width, height } = await getImageDimensions(imagePath);
    const ext = path.extname(imageFiles[i]).toLowerCase();

    frames.push({
      frameNumber: i + 1,
      imagePath,
      width,
      height,
      mimeType: ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png",
    });
  }

  context.reportProgress(100, "DOCX extraction complete");

  return {
    frames,
    documentMetadata: {
      filename,
      format: "docx",
      pageCount: Math.max(frames.length, 1),
      textContent: result.value,
      doclingMarkdown,
    },
    durationMs: Date.now() - startTime,
  };
}
