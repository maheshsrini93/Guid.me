import { PRO_MODEL } from "@/lib/gemini/models";
import type { EnforcedGuide } from "@/types/agents";
import { AgentValidationError, type AgentConfig } from "../types";
import { guidelineEnforcerSchema } from "../schemas/guideline-enforcer.schema";
import {
  PROMPT_VERSION,
  buildGuidelineEnforcerSystemPrompt,
  buildGuidelineEnforcerUserPrompt,
} from "../prompts/guideline-enforcer";

export const guidelineEnforcerConfig: AgentConfig<EnforcedGuide> = {
  name: "guideline-enforcer",
  displayName: "Guideline Enforcer",
  executionOrder: 4,
  defaultModel: PRO_MODEL,

  generationOptions: {
    temperature: 0.1, // Near-deterministic for compliance rewriting
    maxOutputTokens: 65536,
  },

  responseSchema: guidelineEnforcerSchema,

  retryConfig: {
    maxAttempts: 3,
    timeoutMs: 120_000,
  },

  promptVersion: PROMPT_VERSION,
  invocationMode: "single",

  buildSystemPrompt: buildGuidelineEnforcerSystemPrompt,
  buildUserPrompt: buildGuidelineEnforcerUserPrompt,

  validateInput(state) {
    if (!state.composedGuide) {
      throw new AgentValidationError(
        "guideline-enforcer",
        "No composed guide available. Instruction Composer must run first.",
      );
    }
    if (!state.composedGuide.steps.length) {
      throw new AgentValidationError(
        "guideline-enforcer",
        "Composed guide has no steps.",
      );
    }
  },

  parseOutput(raw) {
    return raw as EnforcedGuide;
  },

  summarize(output) {
    const verbs = new Set(output.steps.map((s) => s.primaryVerb));
    const safetyCount = output.steps.reduce((n, s) => n + s.safetyCallouts.length, 0);
    const reviewCount = output.steps.filter((s) => s.needsReview).length;
    return `Enforced ${output.steps.length} steps using ${verbs.size} verb(s), ${safetyCount} safety callout(s), ${reviewCount} needs-review, safety: ${output.guideMetadata.safetyLevel}`;
  },
};
