import { FLASH_MODEL } from "@/lib/gemini/models";
import type { ComposedGuide } from "@/types/agents";
import { AgentValidationError, type AgentConfig } from "../types";
import { instructionComposerSchema } from "../schemas/instruction-composer.schema";
import {
  buildInstructionComposerSystemPrompt,
  buildInstructionComposerUserPrompt,
} from "../prompts/instruction-composer";

export const instructionComposerConfig: AgentConfig<ComposedGuide> = {
  name: "instruction-composer",
  displayName: "Instruction Composer",
  executionOrder: 3,
  defaultModel: FLASH_MODEL,
  // No escalation for Composer

  generationOptions: {
    temperature: 0.5,
    maxOutputTokens: 16384,
  },

  responseSchema: instructionComposerSchema,

  retryConfig: {
    maxAttempts: 3,
    timeoutMs: 60_000,
  },

  invocationMode: "single",

  buildSystemPrompt: buildInstructionComposerSystemPrompt,
  buildUserPrompt: buildInstructionComposerUserPrompt,

  validateInput(state) {
    if (!state.pageExtractions) {
      throw new AgentValidationError(
        "instruction-composer",
        "No page extractions available. Vision Analyzer must run first.",
      );
    }
    if (!state.pageExtractions.length) {
      throw new AgentValidationError(
        "instruction-composer",
        "Page extractions array is empty.",
      );
    }
  },

  parseOutput(raw) {
    return raw as ComposedGuide;
  },

  summarize(output) {
    const phases = output.phaseBoundaries.length;
    return `Composed ${output.steps.length} steps in ${phases} phase(s), ${output.partsOverview.length} parts, ~${output.metadata.estimatedMinutes} min`;
  },
};
