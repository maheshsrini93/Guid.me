import type { PipelineState } from "@/types/pipeline";
import type { SourceAdapterInput, ExtractedSource } from "@/types/agents";
import { BaseCodeAgent } from "../base-code-agent";
import { AgentValidationError } from "../types";
import type { AgentContext, AgentName } from "../types";
import type { SourceAdapterImpl } from "./types";
import { pdfImpl } from "./pdf";
import { docxImpl } from "./docx";

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

/**
 * Registered sub-implementations, walked in order. The first whose `canHandle`
 * returns true handles the input. Phase 6 adds `cadImpl` here (T-082).
 *
 * See ADR-0001 for the dispatch contract.
 */
const IMPLS: SourceAdapterImpl[] = [pdfImpl, docxImpl];

/**
 * Agent 1: Source Adapter (formerly Document Extractor).
 *
 * Polymorphic over input type. Today it dispatches between PDF and DOCX
 * sub-implementations. Adding a new input type means dropping a new
 * `SourceAdapterImpl` into `IMPLS` — agents 2-8 do not change.
 */
export class SourceAdapter extends BaseCodeAgent<
  SourceAdapterInput,
  ExtractedSource
> {
  name: AgentName = "source-adapter";
  displayName = "Source Adapter";
  executionOrder = 1;

  validateInput(state: PipelineState): SourceAdapterInput {
    if (!state.documentPath) {
      throw new AgentValidationError("source-adapter", "No document path provided.");
    }
    if (!state.documentMimeType) {
      throw new AgentValidationError("source-adapter", "No document MIME type provided.");
    }
    if (!ACCEPTED_MIME_TYPES.includes(state.documentMimeType as typeof ACCEPTED_MIME_TYPES[number])) {
      throw new AgentValidationError(
        "source-adapter",
        `Unsupported MIME type: ${state.documentMimeType}. Expected PDF or DOCX.`,
      );
    }

    return {
      filePath: state.documentPath,
      mimeType: state.documentMimeType as SourceAdapterInput["mimeType"],
      jobId: state.jobId,
    };
  }

  async execute(
    input: SourceAdapterInput,
    context: AgentContext,
  ): Promise<ExtractedSource> {
    const impl = IMPLS.find((i) => i.canHandle(input));
    if (!impl) {
      throw new AgentValidationError(
        "source-adapter",
        `No source-adapter sub-implementation handles MIME type: ${input.mimeType}`,
      );
    }
    return impl.extract(input, context);
  }

  summarize(output: ExtractedSource): string {
    return `Extracted ${output.documentMetadata.pageCount} pages from ${output.documentMetadata.filename} (${output.documentMetadata.format})`;
  }
}

/** Singleton instance */
export const sourceAdapter = new SourceAdapter();
