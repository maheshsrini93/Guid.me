import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir, readdir, stat, copyFile, readFile as fsReadFile } from "fs/promises";
import path from "path";
import { config } from "@/lib/config";
import { getPagesDir, getDoclingOutputDir } from "@/lib/utils/file-storage";
import type { Frame } from "@/types/agents";
import type { AgentContext } from "../types";

const execFileAsync = promisify(execFile);

let _doclingAvailable: boolean | null = null;

/** Check if Docling is installed on PATH. Cached after first probe. */
export async function isDoclingAvailable(): Promise<boolean> {
  if (_doclingAvailable !== null) return _doclingAvailable;
  try {
    await execFileAsync("docling", ["--version"]);
    _doclingAvailable = true;
  } catch {
    _doclingAvailable = false;
  }
  return _doclingAvailable;
}

/**
 * Run Docling on the input file. Returns rendered frames + Markdown context.
 * `frames` may be empty if Docling produced no images — callers should check
 * `frames.length` and fall back to a format-specific renderer in that case
 * (Markdown is still useful as cross-page context). Throws on hard Docling
 * failures so callers can fall back via try/catch.
 */
export async function runDocling(
  filePath: string,
  jobId: string,
  context: AgentContext,
): Promise<{ frames: Frame[]; doclingMarkdown?: string }> {
  const pagesDir = getPagesDir(jobId);
  const doclingOutDir = getDoclingOutputDir(jobId);
  await mkdir(pagesDir, { recursive: true });
  await mkdir(doclingOutDir, { recursive: true });

  context.reportProgress(10, "Running Docling document extraction");

  await execFileAsync(
    "docling",
    [
      filePath,
      "--to", "md",
      "--image-export-mode", "referenced",
      "--pipeline", config.doclingPipeline,
      "--output", doclingOutDir,
    ],
    { timeout: 120_000 },
  );

  context.reportProgress(50, "Processing Docling output");

  // Docling outputs into a subdirectory named after the input file stem
  const stem = path.basename(filePath, path.extname(filePath));
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

  // Collect referenced images from main dir and optional images/ subdirectory
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

  if (imageFiles.length === 0) {
    // No images produced — return Markdown only; caller falls back to a
    // format-specific renderer (e.g. pdftoppm for PDF, mammoth for DOCX).
    return { frames: [], doclingMarkdown };
  }

  // Copy images to the standard pages directory
  const frames: Frame[] = [];
  for (let i = 0; i < imageFiles.length; i++) {
    const destName = `page-${String(i + 1).padStart(2, "0")}.png`;
    const destPath = path.join(pagesDir, destName);
    await copyFile(imageFiles[i], destPath);
    const { width, height } = await getImageDimensions(destPath);

    frames.push({
      frameNumber: i + 1,
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

  return { frames, doclingMarkdown };
}

/**
 * Read PNG/JPEG dimensions via the `file` command. Falls back to a default
 * A4-at-300dpi size if the command isn't available or doesn't report dimensions.
 */
export async function getImageDimensions(
  imagePath: string,
): Promise<{ width: number; height: number }> {
  try {
    const { stdout } = await execFileAsync("file", [imagePath]);
    const match = stdout.match(/(\d+)\s*x\s*(\d+)/);
    if (match) {
      return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
    }
  } catch {
    // Fallback
  }
  return { width: 2480, height: 3508 };
}
