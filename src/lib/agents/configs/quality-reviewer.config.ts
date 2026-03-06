import { PRO_MODEL } from "@/lib/gemini/models";
import type { QualityReviewResult } from "@/types/agents";
import { AgentValidationError, type AgentConfig } from "../types";
import { qualityReviewerSchema } from "../schemas/quality-reviewer.schema";
import {
  PROMPT_VERSION,
  buildQualityReviewerSystemPrompt,
  buildQualityReviewerUserPrompt,
} from "../prompts/quality-reviewer";

export const qualityReviewerConfig: AgentConfig<QualityReviewResult> = {
  name: "quality-reviewer",
  displayName: "Quality Reviewer",
  executionOrder: 5,
  defaultModel: PRO_MODEL,

  generationOptions: {
    temperature: 0.3,
    maxOutputTokens: 16384,
  },

  responseSchema: qualityReviewerSchema,

  retryConfig: {
    maxAttempts: 3,
    timeoutMs: 90_000, // Pro model may be slower
  },

  promptVersion: PROMPT_VERSION,
  invocationMode: "single",

  buildSystemPrompt: buildQualityReviewerSystemPrompt,
  buildUserPrompt: buildQualityReviewerUserPrompt,

  validateInput(state) {
    if (!state.enforcedGuide) {
      throw new AgentValidationError(
        "quality-reviewer",
        "No enforced guide available. Guideline Enforcer must run first.",
      );
    }
    if (!state.enforcedGuide.steps.length) {
      throw new AgentValidationError(
        "quality-reviewer",
        "Enforced guide has no steps.",
      );
    }
  },

  parseOutput(raw) {
    return raw as QualityReviewResult;
  },

  summarize(output) {
    const errorCount = output.issues.filter((i) => i.severity === "error").length;
    const warnCount = output.issues.filter((i) => i.severity === "warning").length;
    return `Score: ${output.overallScore}/100 (${output.decision}), ${errorCount} error(s), ${warnCount} warning(s)`;
  },
};
