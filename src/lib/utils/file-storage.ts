import { mkdir, writeFile, readFile as fsReadFile, access } from "fs/promises";
import path from "path";
import { config } from "@/lib/config";

function base(): string {
  return config.storagePath;
}

/** Ensure all storage directories exist */
export async function ensureStorageDir(): Promise<void> {
  const dirs = [
    base(),
    path.join(base(), "uploads"),
    path.join(base(), "jobs"),
    path.join(base(), "cache"),
  ];
  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
  }
}

export function getUploadPath(jobId: string, filename: string): string {
  return path.join(base(), "uploads", jobId, filename);
}

export function getJobDir(jobId: string): string {
  return path.join(base(), "jobs", jobId);
}

export function getPagesDir(jobId: string): string {
  return path.join(base(), "jobs", jobId, "pages");
}

export function getDoclingOutputDir(jobId: string): string {
  return path.join(base(), "jobs", jobId, "docling-output");
}

export function getIllustrationsDir(jobId: string): string {
  return path.join(base(), "jobs", jobId, "illustrations");
}

export function getOutputPath(jobId: string): string {
  return path.join(base(), "jobs", jobId, "output.xml");
}

/** Write data to a file, creating parent directories as needed */
export async function saveFile(
  filePath: string,
  data: Buffer | string,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
}

/** Read a file and return its contents as a Buffer */
export async function readFile(filePath: string): Promise<Buffer> {
  return fsReadFile(filePath);
}

/** Check if a file exists */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
