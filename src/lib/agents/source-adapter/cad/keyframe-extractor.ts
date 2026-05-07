/**
 * Explode-video keyframe extractor (T-079).
 *
 * An authored explode animation alternates between *motion* segments (parts
 * sliding apart along their assembly axes) and *stall* segments (the parts
 * are stationary, presenting the just-revealed sub-step). The stall frames
 * are what the engineer wants the viewer to *see*; the motion frames are
 * just transitions. So our keyframe strategy is:
 *
 *   1. ffmpeg sample the video at a moderate frame rate (default 10 fps).
 *   2. Compute mean-absolute-pixel-delta between consecutive sampled frames.
 *   3. Smooth the delta series and threshold it into motion vs. stall regions.
 *   4. For each *stall* region that follows a motion region, emit one frame
 *      from the middle of the stall — that's a keyframe.
 *   5. Always include the first and last frames as additional keyframes.
 *
 * The thresholds are tuned empirically against the demo asset (see T-094)
 * and the OSHW test corpus (T-096). They can be overridden via opts.
 */
import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir, readdir, readFile, unlink } from "fs/promises";
import path from "path";
import { PNG } from "pngjs";
import type { Frame } from "@/types/agents";
import { getJobDir } from "@/lib/utils/file-storage";

const execFileAsync = promisify(execFile);

export interface KeyframeOptions {
  /** ffmpeg sample rate in frames per second. Default 10. */
  sampleFps?: number;
  /** Width of the sampled thumbnails used for diffing. Default 480. */
  diffWidth?: number;
  /**
   * Per-pixel motion threshold (0-255 mean abs delta). Frames above this are
   * considered motion. Default 6.0 — empirically tuned for explode animations
   * with smooth background.
   */
  motionThreshold?: number;
  /**
   * Per-pixel stall threshold. Frames below this are considered stationary.
   * Default 1.5.
   */
  stallThreshold?: number;
  /**
   * Minimum stall duration in sampled frames to count as a real stall (avoids
   * picking up noise dips between two motion frames). Default 3.
   */
  minStallFrames?: number;
}

export interface ExtractedKeyframes {
  /** Final keyframes, ordered by timestamp */
  frames: Frame[];
  /** Source video's detected duration in seconds */
  durationSeconds: number;
  /** Total sampled frames before keyframe selection */
  sampledFrameCount: number;
}

const ACCEPTED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".jt", ".m4v"] as const;

let _ffmpegAvailable: boolean | null = null;

/** Cached ffmpeg binary probe. */
async function isFfmpegAvailable(): Promise<boolean> {
  if (_ffmpegAvailable !== null) return _ffmpegAvailable;
  try {
    await execFileAsync("ffmpeg", ["-version"]);
    _ffmpegAvailable = true;
  } catch {
    _ffmpegAvailable = false;
  }
  return _ffmpegAvailable;
}

/**
 * Extract motion-stall keyframes from an explode animation video.
 *
 * Throws if ffmpeg isn't available or if the video can't be probed.
 */
export async function extractKeyframes(
  videoPath: string,
  jobId: string,
  opts: KeyframeOptions = {},
): Promise<ExtractedKeyframes> {
  if (!(await isFfmpegAvailable())) {
    throw new Error(
      "ffmpeg binary not found on PATH. Install ffmpeg (e.g. `brew install ffmpeg`) " +
      "to enable explode-video keyframe extraction.",
    );
  }

  const ext = path.extname(videoPath).toLowerCase();
  if (!ACCEPTED_VIDEO_EXTENSIONS.includes(ext as typeof ACCEPTED_VIDEO_EXTENSIONS[number])) {
    throw new Error(
      `Unsupported video extension "${ext}". Accepted: ${ACCEPTED_VIDEO_EXTENSIONS.join(", ")}`,
    );
  }

  const sampleFps = opts.sampleFps ?? 10;
  const diffWidth = opts.diffWidth ?? 480;
  const motionThreshold = opts.motionThreshold ?? 6.0;
  const stallThreshold = opts.stallThreshold ?? 1.5;
  const minStallFrames = opts.minStallFrames ?? 3;

  const keyframesDir = path.join(getJobDir(jobId), "keyframes");
  const samplesDir = path.join(getJobDir(jobId), "keyframes-samples");
  await mkdir(keyframesDir, { recursive: true });
  await mkdir(samplesDir, { recursive: true });

  // 1. Sample the video at low resolution for fast diffing.
  const samplePattern = path.join(samplesDir, "sample-%05d.png");
  await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-i", videoPath,
      "-vf", `fps=${sampleFps},scale=${diffWidth}:-1`,
      "-q:v", "5",
      samplePattern,
    ],
    { timeout: 120_000 },
  );

  const sampleFiles = (await readdir(samplesDir))
    .filter((f) => f.endsWith(".png"))
    .sort();

  if (sampleFiles.length === 0) {
    throw new Error("ffmpeg produced no sampled frames — video may be unreadable");
  }

  // 2. Compute frame-difference series.
  const deltas = await computeDeltas(samplesDir, sampleFiles);

  // 3. Smooth deltas with a 3-frame box filter to reduce noise.
  const smoothed = smooth(deltas, 3);

  // 4. Pick keyframe sample-indices.
  const keyframeSampleIndices = pickKeyframeIndices(
    smoothed,
    motionThreshold,
    stallThreshold,
    minStallFrames,
  );

  // 5. Re-extract those keyframes at full resolution and write to keyframesDir.
  const frames: Frame[] = [];
  for (let i = 0; i < keyframeSampleIndices.length; i++) {
    const sampleIdx = keyframeSampleIndices[i];
    // sample timestamps: sample N (1-indexed in ffmpeg) => time = (N-1) / sampleFps
    const timeSec = sampleIdx / sampleFps;
    const outputPath = path.join(
      keyframesDir,
      `keyframe-${String(i + 1).padStart(3, "0")}.png`,
    );
    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-ss", timeSec.toFixed(3),
        "-i", videoPath,
        "-frames:v", "1",
        "-q:v", "2",
        outputPath,
      ],
      { timeout: 30_000 },
    );

    const { width, height } = await readPngSize(outputPath);
    frames.push({
      frameNumber: i + 1,
      imagePath: outputPath,
      width,
      height,
      mimeType: "image/png",
    });
  }

  // 6. Clean up the diff-resolution samples to save disk.
  for (const f of sampleFiles) {
    try {
      await unlink(path.join(samplesDir, f));
    } catch {
      /* best effort */
    }
  }

  const durationSeconds = sampleFiles.length / sampleFps;
  return {
    frames,
    durationSeconds,
    sampledFrameCount: sampleFiles.length,
  };
}

// ============================================================
// Diff computation
// ============================================================

/**
 * Compute mean absolute pixel delta between consecutive sampled frames.
 * Returns an array of length `sampleFiles.length`, where deltas[0] = 0
 * (no preceding frame to compare against).
 */
async function computeDeltas(samplesDir: string, sampleFiles: string[]): Promise<number[]> {
  const deltas: number[] = new Array(sampleFiles.length).fill(0);

  // Walk pairwise. Decoding all frames at once would balloon memory; instead
  // we slide a 2-frame window.
  let prevPixels: Buffer | null = null;
  for (let i = 0; i < sampleFiles.length; i++) {
    const png = await decodePng(path.join(samplesDir, sampleFiles[i]));
    const pixels = png.data;
    if (i > 0 && prevPixels && prevPixels.length === pixels.length) {
      deltas[i] = meanAbsDelta(prevPixels, pixels);
    }
    prevPixels = pixels;
  }
  return deltas;
}

async function decodePng(filePath: string): Promise<{ data: Buffer; width: number; height: number }> {
  const buf = await readFile(filePath);
  return new Promise((resolve, reject) => {
    new PNG().parse(buf, (err, data) => {
      if (err) return reject(err);
      resolve({ data: data.data, width: data.width, height: data.height });
    });
  });
}

async function readPngSize(filePath: string): Promise<{ width: number; height: number }> {
  // PNG header: bytes 16-19 = width (BE uint32), bytes 20-23 = height (BE uint32)
  const buf = await readFile(filePath);
  if (buf.length < 24 || buf.toString("ascii", 1, 4) !== "PNG") {
    return { width: 0, height: 0 };
  }
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

function meanAbsDelta(a: Buffer, b: Buffer): number {
  // pngjs decodes to RGBA. We compare RGB only (alpha is constant 255 for opaque).
  let sum = 0;
  let count = 0;
  for (let i = 0; i < a.length; i += 4) {
    sum += Math.abs(a[i] - b[i]);
    sum += Math.abs(a[i + 1] - b[i + 1]);
    sum += Math.abs(a[i + 2] - b[i + 2]);
    count += 3;
  }
  return count === 0 ? 0 : sum / count;
}

function smooth(series: number[], window: number): number[] {
  if (window <= 1) return series.slice();
  const half = Math.floor(window / 2);
  const out = new Array(series.length);
  for (let i = 0; i < series.length; i++) {
    let sum = 0;
    let n = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(series.length - 1, i + half); j++) {
      sum += series[j];
      n++;
    }
    out[i] = sum / n;
  }
  return out;
}

// ============================================================
// Keyframe selection
// ============================================================

/**
 * Walk the smoothed delta series and pick keyframe indices.
 *
 * State machine:
 *   - START → motion (when delta > motionThreshold)
 *   - motion → stall (when delta < stallThreshold for >= minStallFrames)
 *   - stall → motion (when delta > motionThreshold)
 *
 * For each motion → stall transition, emit one keyframe at the middle of
 * the stall. Always include the first frame; include the last frame if it's
 * not already a keyframe.
 */
/**
 * Exported for unit testing. Given a smoothed delta series, return the
 * sample-indices that should be emitted as keyframes.
 */
export function pickKeyframeIndices(
  deltas: number[],
  motionThreshold: number,
  stallThreshold: number,
  minStallFrames: number,
): number[] {
  const keyframes: number[] = [];
  if (deltas.length === 0) return keyframes;

  // Always include the first frame as the "initial state" keyframe.
  keyframes.push(0);

  let state: "init" | "motion" | "stall" = "init";
  let stallStart = -1;
  let sawMotion = false;

  for (let i = 1; i < deltas.length; i++) {
    const d = deltas[i];

    if (state === "init") {
      if (d > motionThreshold) {
        state = "motion";
        sawMotion = true;
      } else if (d < stallThreshold) {
        // Still in initial stall; do nothing.
      }
      continue;
    }

    if (state === "motion") {
      if (d < stallThreshold) {
        state = "stall";
        stallStart = i;
      }
      continue;
    }

    if (state === "stall") {
      if (d > motionThreshold) {
        // Stall ended — emit a keyframe at the midpoint of the stall.
        const stallEnd = i - 1;
        const stallLen = stallEnd - stallStart + 1;
        if (stallLen >= minStallFrames) {
          const mid = Math.floor((stallStart + stallEnd) / 2);
          if (mid !== keyframes[keyframes.length - 1]) {
            keyframes.push(mid);
          }
        }
        state = "motion";
        sawMotion = true;
      }
      continue;
    }
  }

  // Tail handling: if we ended in a stall after motion, include a final keyframe.
  if (state === "stall" && sawMotion && stallStart >= 0) {
    const last = deltas.length - 1;
    const stallLen = last - stallStart + 1;
    if (stallLen >= minStallFrames) {
      const mid = Math.floor((stallStart + last) / 2);
      if (mid !== keyframes[keyframes.length - 1]) {
        keyframes.push(mid);
      }
    }
  }

  // Always include the last frame so the "final assembled" state is captured.
  const lastIdx = deltas.length - 1;
  if (keyframes[keyframes.length - 1] !== lastIdx) {
    keyframes.push(lastIdx);
  }

  // If we never detected any motion, fall back to evenly-spaced samples so
  // the downstream pipeline still has something to work with.
  if (!sawMotion && keyframes.length <= 2 && deltas.length > 4) {
    const fallback: number[] = [];
    const targetCount = 6;
    for (let i = 0; i < targetCount; i++) {
      fallback.push(Math.round((i * (deltas.length - 1)) / (targetCount - 1)));
    }
    return Array.from(new Set(fallback));
  }

  return keyframes;
}
