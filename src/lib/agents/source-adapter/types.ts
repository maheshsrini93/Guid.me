import type { SourceAdapterInput, ExtractedSource } from "@/types/agents";
import type { AgentContext } from "../types";

/**
 * Sub-implementation contract for the Source Adapter (Agent 1).
 *
 * Each impl handles one input class (PDF, DOCX, STEP, etc.). The dispatcher
 * in `index.ts` walks the registered IMPLS array and invokes the first one
 * whose `canHandle()` returns true. See ADR-0001.
 */
export interface SourceAdapterImpl {
  /** Sub-impl identifier — used in progress logs (e.g. "pdf", "docx", "cad"). */
  readonly name: string;

  /** Whether this impl can extract from the given input. */
  canHandle(input: SourceAdapterInput): boolean;

  /** Run the extraction. Must populate `frames` and `documentMetadata`; `structuredMetadata` is CAD-only. */
  extract(input: SourceAdapterInput, context: AgentContext): Promise<ExtractedSource>;
}
