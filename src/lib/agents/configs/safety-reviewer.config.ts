import { PRO_MODEL } from "@/lib/gemini/models";
import type { SafetyReviewResult } from "@/types/agents";
import { AgentValidationError, type AgentConfig } from "../types";
import { safetyReviewerSchema } from "../schemas/safety-reviewer.schema";
import {
  buildSafetyReviewerSystemPrompt,
  buildSafetyReviewerUserPrompt,
} from "../prompts/safety-reviewer";

export const safetyReviewerConfig: AgentConfig<SafetyReviewResult> = {
  name: "safety-reviewer",
  displayName: "Safety Reviewer",
  executionOrder: 6,
  defaultModel: PRO_MODEL,

  generationOptions: {
    temperature: 0.2, // Low temperature for precise safety assessment
    maxOutputTokens: 8192,
  },

  responseSchema: safetyReviewerSchema,

  retryConfig: {
    maxAttempts: 3,
    timeoutMs: 90_000,
  },

  invocationMode: "single",

  buildSystemPrompt: buildSafetyReviewerSystemPrompt,
  buildUserPrompt: buildSafetyReviewerUserPrompt,

  validateInput(state) {
    if (!state.enforcedGuide) {
      throw new AgentValidationError(
        "safety-reviewer",
        "No enforced guide available. Guideline Enforcer must run first.",
      );
    }
    if (!state.enforcedGuide.steps.length) {
      throw new AgentValidationError(
        "safety-reviewer",
        "Enforced guide has no steps.",
      );
    }
  },

  parseOutput(raw) {
    return raw as SafetyReviewResult;
  },

  summarize(output) {
    const criticalCount = output.issues.filter((i) => i.severity === "critical").length;
    const warnCount = output.issues.filter((i) => i.severity === "warning").length;
    return `Safety ${output.safetyPassed ? "PASSED" : "FAILED"}, level: ${output.recommendedSafetyLevel}, ${criticalCount} critical, ${warnCount} warning(s)`;
  },
};
