import type { PipelineState } from "@/types/pipeline";
import type { RawFrameExtraction } from "@/types/agents";
import type { AgentContext, AgentResult } from "../types";

/**
 * Sub-implementation contract for the Vision Analyzer (Agent 2).
 *
 * Each impl handles one input class. The dispatcher in `index.ts` walks the
 * registered IMPLS array and invokes the first one whose `canHandle()`
 * returns true. Both impls produce `AgentResult<RawFrameExtraction[]>` so the
 * pipeline state surface is uniform regardless of source kind.
 *
 * See ADR-0001 for the polymorphism contract: dispatch is on the presence of
 * `state.extractedSource.structuredMetadata`, not on input MIME type.
 */
export interface VisionAnalyzerImpl {
  /** Sub-impl identifier — used in progress logs (e.g. "document", "cad"). */
  readonly name: string;

  /** Whether this impl can analyze the given pipeline state's extracted source. */
  canHandle(state: PipelineState): boolean;

  /** Run the analysis. */
  run(ctx: AgentContext): Promise<AgentResult<RawFrameExtraction[]>>;
}
