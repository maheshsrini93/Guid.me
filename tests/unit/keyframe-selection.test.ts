/**
 * Unit Tests: keyframe selection (T-079)
 *
 * The full extractor shells out to ffmpeg and decodes PNGs. Here we test the
 * pure decision algorithm in isolation: given a synthetic delta series,
 * `pickKeyframeIndices` should pick frames at motion-stall midpoints.
 */
import { describe, it, expect } from "vitest";
import { pickKeyframeIndices } from "@/lib/agents/source-adapter/cad/keyframe-extractor";

const MOTION = 6;
const STALL = 1.5;
const MIN_STALL = 3;

describe("pickKeyframeIndices", () => {
  it("always emits the first frame", () => {
    const deltas = [0, 0, 0, 0, 0];
    const result = pickKeyframeIndices(deltas, MOTION, STALL, MIN_STALL);
    expect(result[0]).toBe(0);
  });

  it("emits a keyframe at the midpoint of a motion → stall transition", () => {
    // 3 motion frames followed by 5 stall frames => stall mid is at index 5
    const deltas = [0, 10, 8, 9, 0.2, 0.3, 0.1, 0.2, 0.5];
    const result = pickKeyframeIndices(deltas, MOTION, STALL, MIN_STALL);
    // Should include 0 (first), the stall midpoint, and the last frame
    expect(result).toContain(0);
    expect(result).toContain(deltas.length - 1);
    // Mid of stall (indices 4..8) is roughly index 6
    expect(result.some((i) => i >= 5 && i <= 7)).toBe(true);
  });

  it("emits multiple keyframes for repeated motion → stall cycles", () => {
    // motion → stall → motion → stall pattern
    const deltas = [
      0, 8, 7, 0.2, 0.1, 0.2, 0.3, // first stall (idx 3..6)
      9, 8, 0.1, 0.2, 0.1, 0.3,    // second stall (idx 9..12)
    ];
    const result = pickKeyframeIndices(deltas, MOTION, STALL, MIN_STALL);
    // Expected: first (0), end of first stall, end of second stall, last
    expect(result.length).toBeGreaterThanOrEqual(3);
    // No duplicate indices
    expect(new Set(result).size).toBe(result.length);
    // Sorted ascending
    expect([...result].sort((a, b) => a - b)).toEqual(result);
  });

  it("ignores stalls shorter than minStallFrames", () => {
    // brief 1-frame "stall" inside motion shouldn't count
    const deltas = [0, 9, 8, 0.5, 9, 8, 7];
    const result = pickKeyframeIndices(deltas, MOTION, STALL, MIN_STALL);
    // Only first + last (no real stall observed)
    expect(result).toEqual([0, deltas.length - 1]);
  });

  it("falls back to evenly-spaced samples when no motion is detected", () => {
    // All low-delta frames — likely a static reference video
    const deltas = new Array(20).fill(0.1);
    const result = pickKeyframeIndices(deltas, MOTION, STALL, MIN_STALL);
    expect(result.length).toBeGreaterThanOrEqual(4);
    expect(result[0]).toBe(0);
    expect(result[result.length - 1]).toBe(deltas.length - 1);
  });

  it("includes the final frame as the assembled-state keyframe", () => {
    const deltas = [0, 8, 7, 0.1, 0.2, 0.1, 0.2];
    const result = pickKeyframeIndices(deltas, MOTION, STALL, MIN_STALL);
    expect(result[result.length - 1]).toBe(deltas.length - 1);
  });

  it("handles empty input safely", () => {
    expect(pickKeyframeIndices([], MOTION, STALL, MIN_STALL)).toEqual([]);
  });
});
