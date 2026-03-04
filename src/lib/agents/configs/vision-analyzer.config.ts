import { FLASH_MODEL, PRO_MODEL } from "@/lib/gemini/models";
import type { RawPageExtraction } from "@/types/agents";
import { AgentValidationError, type AgentConfig } from "../types";
import { visionAnalyzerSchema } from "../schemas/vision-analyzer.schema";
import {
  buildVisionAnalyzerSystemPrompt,
  buildVisionAnalyzerUserPrompt,
} from "../prompts/vision-analyzer";

export const visionAnalyzerConfig: AgentConfig<RawPageExtraction[]> = {
  name: "vision-analyzer",
  displayName: "Vision Analyzer",
  executionOrder: 2,
  defaultModel: FLASH_MODEL,
  escalationModel: PRO_MODEL,

  generationOptions: {
    temperature: 0.3,
    maxOutputTokens: 8192,
  },

  responseSchema: visionAnalyzerSchema,

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
  ],

  usesVision: true,
  invocationMode: "per-page",

  buildSystemPrompt: buildVisionAnalyzerSystemPrompt,
  buildUserPrompt: buildVisionAnalyzerUserPrompt,

  validateInput(state) {
    if (!state.extractedDocument) {
      throw new AgentValidationError(
        "vision-analyzer",
        "No extracted document available. Document Extractor must run first.",
      );
    }
    if (!state.extractedDocument.pages.length) {
      throw new AgentValidationError(
        "vision-analyzer",
        "Extracted document has no pages.",
      );
    }
  },

  parseOutput(raw) {
    // In per-page mode, raw is an array of per-page results
    if (Array.isArray(raw)) {
      return raw as RawPageExtraction[];
    }
    // Single page result — wrap in array
    return [raw as RawPageExtraction];
  },

  summarize(output) {
    const totalSteps = output.reduce((sum, p) => sum + p.steps.length, 0);
    const partsPages = output.filter((p) => p.pageIndicators.isPartsPage).length;
    return `Analyzed ${output.length} pages: ${totalSteps} steps found, ${partsPages} parts page(s)`;
  },
};
