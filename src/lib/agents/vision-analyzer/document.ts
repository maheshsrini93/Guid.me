/**
 * Vision Analyzer — document path (PDF/DOCX).
 *
 * Wraps `runConfigAgent()` with the per-page vision config that already
 * existed before Phase 6. No behavior change vs the pre-dispatcher world; the
 * file moved here so the vision-analyzer module is self-contained.
 *
 * Selected by the dispatcher when `state.extractedSource.structuredMetadata`
 * is absent (i.e. the source adapter produced page rasters but no CAD-aware
 * metadata).
 */
import { PRO_MODEL } from "@/lib/gemini/models";
import type { PipelineState } from "@/types/pipeline";
import type { RawFrameExtraction } from "@/types/agents";
import {
  AgentValidationError,
  type AgentConfig,
  type AgentContext,
  type AgentResult,
} from "../types";
import { runConfigAgent } from "../runner";
import { documentVisionSchema } from "./document.schema";
import {
  DOCUMENT_VISION_PROMPT_VERSION,
  buildDocumentVisionSystemPrompt,
  buildDocumentVisionUserPrompt,
} from "./document.prompt";
import type { VisionAnalyzerImpl } from "./types";

export const documentVisionConfig: AgentConfig<RawFrameExtraction[]> = {
  name: "vision-analyzer",
  displayName: "Vision Analyzer",
  executionOrder: 2,
  defaultModel: PRO_MODEL,
  escalationModel: PRO_MODEL,

  generationOptions: {
    temperature: 1.0,
    maxOutputTokens: 8192,
  },

  responseSchema: documentVisionSchema,

  retryConfig: {
    maxAttempts: 3,
    timeoutMs: 90_000, // Vision calls can be slower
  },

  escalationRules: [
    {
      name: "high-arrow-count",
      check: (pages) =>
        pages.some((p) => p.pageIndicators.arrowCount >= 5),
    },
    {
      name: "hinge-or-rotation",
      check: (pages) =>
        pages.some((p) => p.pageIndicators.hasHingeOrRotation),
    },
    {
      name: "fastener-ambiguity",
      check: (pages) =>
        pages.some((p) => p.pageIndicators.hasFastenerAmbiguity),
    },
    {
      name: "low-confidence",
      check: (pages) =>
        pages.some((p) => p.steps.some((s) => s.confidence < 0.7)),
    },
    {
      name: "has-sub-steps",
      check: (pages) =>
        pages.some((p) => p.pageIndicators.hasSubSteps === true),
    },
  ],

  promptVersion: DOCUMENT_VISION_PROMPT_VERSION,
  usesVision: true,
  invocationMode: "per-page",

  buildSystemPrompt: buildDocumentVisionSystemPrompt,
  buildUserPrompt: buildDocumentVisionUserPrompt,

  validateInput(state) {
    if (!state.extractedSource) {
      throw new AgentValidationError(
        "vision-analyzer",
        "No extracted source available. Source Adapter must run first.",
      );
    }
    if (!state.extractedSource.frames.length) {
      throw new AgentValidationError(
        "vision-analyzer",
        "Extracted source has no frames.",
      );
    }
  },

  parseOutput(raw) {
    if (Array.isArray(raw)) {
      return raw as RawFrameExtraction[];
    }
    return [raw as RawFrameExtraction];
  },

  summarize(output) {
    const totalSteps = output.reduce((sum, p) => sum + p.steps.length, 0);
    const partsPages = output.filter((p) => p.pageIndicators.isPartsPage).length;
    const pageTypes = output
      .map((p) => p.pageType)
      .filter(Boolean)
      .reduce((acc, t) => {
        acc[t!] = (acc[t!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    const typeStr = Object.entries(pageTypes)
      .map(([t, n]) => `${n} ${t}`)
      .join(", ");
    return `Analyzed ${output.length} pages: ${totalSteps} steps found, ${partsPages} parts page(s)${typeStr ? ` (${typeStr})` : ""}`;
  },
};

export const documentVisionImpl: VisionAnalyzerImpl = {
  name: "document",

  canHandle(state: PipelineState): boolean {
    // Document path runs whenever the extracted source has no CAD-aware
    // metadata. Source kind detection happens in the source adapter; we just
    // observe its output.
    return !!state.extractedSource && !state.extractedSource.structuredMetadata;
  },

  run(ctx: AgentContext): Promise<AgentResult<RawFrameExtraction[]>> {
    return runConfigAgent(documentVisionConfig, ctx);
  },
};
