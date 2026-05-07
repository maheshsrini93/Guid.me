import path from "path";
import type { PipelineState } from "@/types/pipeline";
import type { SourceAdapterInput, ExtractedSource } from "@/types/agents";
import { BaseCodeAgent } from "../base-code-agent";
import { AgentValidationError } from "../types";
import type { AgentContext, AgentName } from "../types";
import type { SourceAdapterImpl } from "./types";
import { pdfImpl } from "./pdf";
import { docxImpl } from "./docx";
import { cadImpl } from "./cad";

const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "model/step",
  "application/step",
  "application/STEP",
  // Browsers commonly hand STEP files over as octet-stream — allowed when
  // the extension confirms it (see acceptsByExtension).
  "application/octet-stream",
]);
const STEP_EXTENSIONS = [".step", ".stp"];

/**
 * Registered sub-implementations, walked in order. The first whose `canHandle`
 * returns true handles the input. See ADR-0001 for the dispatch contract.
 */
const IMPLS: SourceAdapterImpl[] = [pdfImpl, docxImpl, cadImpl];

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
    const ext = path.extname(state.documentPath).toLowerCase();
    const mimeAccepted = ACCEPTED_MIME_TYPES.has(state.documentMimeType);
    const extAccepted = STEP_EXTENSIONS.includes(ext);
    if (!mimeAccepted && !extAccepted) {
      throw new AgentValidationError(
        "source-adapter",
        `Unsupported input: ${state.documentMimeType} (${ext}). Expected PDF, DOCX, or STEP.`,
      );
    }

    return {
      filePath: state.documentPath,
      mimeType: state.documentMimeType,
      jobId: state.jobId,
      auxiliaryPath: state.auxiliaryPath,
      auxiliaryMimeType: state.auxiliaryMimeType,
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
        `No source-adapter sub-implementation handles input: mime=${input.mimeType} ext=${path.extname(input.filePath)}`,
      );
    }
    return impl.extract(input, context);
  }

  summarize(output: ExtractedSource): string {
    const base = `Extracted ${output.documentMetadata.pageCount} ${output.structuredMetadata ? "frames" : "pages"} from ${output.documentMetadata.filename} (${output.documentMetadata.format})`;
    if (output.structuredMetadata) {
      const parts = output.structuredMetadata.partsCatalog.length;
      const seq = output.structuredMetadata.sequenceSource;
      const conf = (output.structuredMetadata.sequenceConfidence * 100).toFixed(0);
      return `${base}; ${parts} components, sequence=${seq} (${conf}% confidence)`;
    }
    return base;
  }
}

/** Singleton instance */
export const sourceAdapter = new SourceAdapter();
