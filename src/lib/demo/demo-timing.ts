/**
 * Realistic timing delays for demo mode.
 * Matches approximate production latency per agent.
 */

import type { AgentName } from "@/lib/agents/types";

/** Per-agent timing configuration (in milliseconds) */
interface AgentTiming {
  /** Delay before emitting agent:start */
  startDelayMs: number;
  /** Duration to simulate (spread across progress updates) */
  durationMs: number;
  /** Number of progress updates to emit */
  progressSteps: number;
}

export const DEMO_AGENT_TIMING: Record<string, AgentTiming> = {
  "document-extractor": { startDelayMs: 300, durationMs: 1200, progressSteps: 3 },
  "vision-analyzer": { startDelayMs: 200, durationMs: 8000, progressSteps: 4 },
  "instruction-composer": { startDelayMs: 200, durationMs: 3000, progressSteps: 3 },
  "guideline-enforcer": { startDelayMs: 200, durationMs: 4000, progressSteps: 3 },
  "quality-reviewer": { startDelayMs: 200, durationMs: 5000, progressSteps: 3 },
  "safety-reviewer": { startDelayMs: 200, durationMs: 4500, progressSteps: 3 },
  "illustration-generator": { startDelayMs: 200, durationMs: 12000, progressSteps: 6 },
  "xml-assembler": { startDelayMs: 200, durationMs: 800, progressSteps: 2 },
};

export function getAgentTiming(agent: string): AgentTiming {
  return DEMO_AGENT_TIMING[agent] ?? { startDelayMs: 200, durationMs: 2000, progressSteps: 2 };
}

/** Sleep utility */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
