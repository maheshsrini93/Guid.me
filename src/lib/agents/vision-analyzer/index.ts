/**
 * Agent 2: Vision Analyzer (dispatcher).
 *
 * Polymorphic over input type. Today it dispatches between the document
 * (PDF/DOCX) impl and the CAD impl. The dispatch signal is the presence of
 * `state.extractedSource.structuredMetadata` — set by the source adapter
 * for CAD-aware sources only. See ADR-0001.
 *
 * Adding a new input type that reaches Agent 2 means dropping a new
 * `VisionAnalyzerImpl` into `IMPLS`. Agents 3-8 do not change.
 */
import type { RawFrameExtraction } from "@/types/agents";
import {
  AgentValidationError,
  type AgentContext,
  type AgentResult,
} from "../types";
import type { VisionAnalyzerImpl } from "./types";
import { documentVisionImpl } from "./document";
import { cadVisionImpl } from "./cad";

/**
 * Registered sub-implementations, walked in order. The first whose
 * `canHandle` returns true handles the input. Order matters: the CAD impl is
 * checked first so its tighter signal (presence of structuredMetadata) wins
 * over the broader document fallback.
 */
const IMPLS: VisionAnalyzerImpl[] = [cadVisionImpl, documentVisionImpl];

/**
 * Run the Vision Analyzer for the given pipeline state. The dispatcher
 * selects an impl based on the source adapter's output, then delegates.
 */
export async function runVisionAnalyzer(
  ctx: AgentContext,
): Promise<AgentResult<RawFrameExtraction[]>> {
  const impl = IMPLS.find((i) => i.canHandle(ctx.pipelineState));
  if (!impl) {
    throw new AgentValidationError(
      "vision-analyzer",
      "No vision-analyzer sub-implementation handles the current pipeline state. Source adapter must run first.",
    );
  }
  return impl.run(ctx);
}

// Re-export the document config so callers needing the schema/prompt for
// inspection or testing can still reach it. Kept under the new module path
// rather than the legacy `configs/vision-analyzer.config.ts` location.
export { documentVisionConfig } from "./document";
export { cadVisionImpl, documentVisionImpl };
export type { VisionAnalyzerImpl } from "./types";
