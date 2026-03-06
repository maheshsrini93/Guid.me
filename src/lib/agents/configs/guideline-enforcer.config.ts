import { FLASH_MODEL } from "@/lib/gemini/models";
import type { EnforcedGuide } from "@/types/agents";
import { AgentValidationError, type AgentConfig } from "../types";
import { guidelineEnforcerSchema } from "../schemas/guideline-enforcer.schema";
import {
  buildGuidelineEnforcerSystemPrompt,
  buildGuidelineEnforcerUserPrompt,
} from "../prompts/guideline-enforcer";

export const guidelineEnforcerConfig: AgentConfig<EnforcedGuide> = {
  name: "guideline-enforcer",
  displayName: "Guideline Enforcer",
  executionOrder: 4,
  defaultModel: FLASH_MODEL,
  // No escalation for Enforcer

  generationOptions: {
    temperature: 0.2, // Low temperature for deterministic compliance
    maxOutputTokens: 65536,
  },

  responseSchema: guidelineEnforcerSchema,

  retryConfig: {
    maxAttempts: 3,
    timeoutMs: 120_000,
  },

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
    const safetyCount = output.steps.filter((s) => s.safetyCallout).length;
    return `Enforced ${output.steps.length} steps using ${verbs.size} verb(s), ${safetyCount} safety callout(s), safety: ${output.guideMetadata.safetyLevel}`;
  },
};
