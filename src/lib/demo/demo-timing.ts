/**
 * Realistic timing delays for demo mode.
 * Matches approximate production latency per agent.
 */

/** Per-agent timing configuration (in milliseconds) */
interface AgentTiming {
  /** Delay before emitting agent:start */
  startDelayMs: number;
  /** Duration to simulate (spread across progress updates) */
  durationMs: number;
  /** Number of progress updates to emit */
  progressSteps: number;
}

/** PDF / DOCX path (Phase 1-5 default). */
export const DEMO_AGENT_TIMING: Record<string, AgentTiming> = {
  "source-adapter": { startDelayMs: 300, durationMs: 1200, progressSteps: 3 },
  "vision-analyzer": { startDelayMs: 200, durationMs: 8000, progressSteps: 4 },
  "instruction-composer": { startDelayMs: 200, durationMs: 3000, progressSteps: 3 },
  "guideline-enforcer": { startDelayMs: 200, durationMs: 4000, progressSteps: 3 },
  "quality-reviewer": { startDelayMs: 200, durationMs: 5000, progressSteps: 3 },
  "safety-reviewer": { startDelayMs: 200, durationMs: 4500, progressSteps: 3 },
  "illustration-renderer": { startDelayMs: 200, durationMs: 12000, progressSteps: 6 },
  "xml-assembler": { startDelayMs: 200, durationMs: 800, progressSteps: 2 },
};

/**
 * CAD path (Phase 6).
 *
 * - Source Adapter is longer: STEP parse + ffmpeg keyframe extraction + three.js
 *   multi-view render (or sequence inference on the fallback path).
 * - Vision Analyzer is faster: per-keyframe-pair diffs with a trimmed prompt
 *   instead of per-page full extraction.
 * - Illustration Renderer is much faster: three.js + overlays, no Gemini round-trips.
 */
export const DEMO_AGENT_TIMING_CAD: Record<string, AgentTiming> = {
  "source-adapter": { startDelayMs: 300, durationMs: 6500, progressSteps: 4 },
  "vision-analyzer": { startDelayMs: 200, durationMs: 4500, progressSteps: 5 },
  "instruction-composer": { startDelayMs: 200, durationMs: 2800, progressSteps: 3 },
  "guideline-enforcer": { startDelayMs: 200, durationMs: 3800, progressSteps: 3 },
  "quality-reviewer": { startDelayMs: 200, durationMs: 5000, progressSteps: 3 },
  "safety-reviewer": { startDelayMs: 200, durationMs: 4500, progressSteps: 3 },
  "illustration-renderer": { startDelayMs: 200, durationMs: 4000, progressSteps: 5 },
  "xml-assembler": { startDelayMs: 200, durationMs: 800, progressSteps: 2 },
};

export function getAgentTiming(agent: string, kind: "document" | "cad" = "document"): AgentTiming {
  const table = kind === "cad" ? DEMO_AGENT_TIMING_CAD : DEMO_AGENT_TIMING;
  return table[agent] ?? { startDelayMs: 200, durationMs: 2000, progressSteps: 2 };
}

/** Sleep utility */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
