import type {
  EnforcedGuide,
  ExtractedSource,
  GeneratedIllustration,
} from "@/types/agents";
import type { AgentContext } from "../types";

/**
 * Sub-implementation contract for the Illustration Renderer (Agent 7).
 *
 * Each impl handles one input class — Gemini Flash Image for PDF/DOCX,
 * three.js + programmatic overlays for CAD. The dispatcher in `index.ts`
 * walks the registered IMPLS array and invokes the first impl whose
 * `canHandle()` returns true. See ADR-0002.
 */
export interface IllustrationRendererImpl {
  /** Sub-impl identifier — used in logs, summaries, execution records (e.g. "gemini", "cad"). */
  readonly name: string;
  /** Whether this impl can render illustrations for the given source. */
  canHandle(extractedSource: ExtractedSource | undefined): boolean;
  /** Generate per-step illustrations and return the unified shape. */
  render(input: RenderInput): Promise<RenderOutput>;
}

export interface RenderInput {
  /** Enforced guide whose steps need illustrations */
  guide: EnforcedGuide;
  /** Extracted source from Agent 1 (CAD impl reads `structuredMetadata`) */
  extractedSource: ExtractedSource;
  /** Job identifier — used for storage paths */
  jobId: string;
  /**
   * Agent context — sub-impls call `recordCost`, `reportProgress`, `isCancelled`
   * directly so per-step progress reaches the UI live (without buffering).
   */
  context: AgentContext;
}

export interface RenderOutput {
  /** One entry per step, in step order. */
  illustrations: GeneratedIllustration[];
  /** Sum of per-step costs. Zero for the CAD impl. */
  totalCostUsd: number;
  /** Primary model used. Recorded against `agent_executions.model`. */
  primaryModel: string;
  /** Sub-impl prompt/version. Recorded against `agent_executions.promptVersion`. */
  promptVersion: string;
}
