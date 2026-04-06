import path from "path";
import { generateImageWithRetry } from "@/lib/gemini/client";
import { IMAGE_MODEL, IMAGE_PRO_MODEL } from "@/lib/gemini/models";
import { saveFile, getIllustrationsDir } from "@/lib/utils/file-storage";
import { generateId } from "@/lib/utils/ulid";
import type { GeneratedIllustration, StructuredPartRef } from "@/types/agents";
import {
  AgentValidationError,
  PipelineCancelledError,
  type AgentContext,
  type AgentName,
  type AgentResult,
} from "./types";
import {
  PROMPT_VERSION as ILLUSTRATION_PROMPT_VERSION,
  buildPartLabelMap,
  buildStepPrompt,
  scoreStepComplexity,
} from "./prompts/illustration-generator";

/**
 * Agent 7: Illustration Generator.
 *
 * Generates one isometric technical illustration per assembly step
 * using Gemini Flash Image. Manages its own lifecycle since it makes
 * real API calls with per-step cost tracking (unlike pure code agents).
 */
class IllustrationGeneratorAgent {
  name: AgentName = "illustration-generator";
  displayName = "Illustration Generator";
  executionOrder = 7;

  async run(
    context: AgentContext,
  ): Promise<AgentResult<GeneratedIllustration[]>> {
    const startedAt = new Date();
    const executionId = generateId();

    // 1. Check cancellation
    if (context.isCancelled()) {
      throw new PipelineCancelledError(context.jobId);
    }

    // 2. Validate input
    const state = context.pipelineState;
    if (!state.enforcedGuide) {
      throw new AgentValidationError(
        "illustration-generator",
        "No enforced guide available.",
      );
    }

    const guide = state.enforcedGuide;
    const steps = guide.steps;
    const totalSteps = steps.length;

    // 3. Emit agent:start
    context.emit("agent:start", {
      agent: this.name,
      startedAt: startedAt.toISOString(),
    });

    try {
      // 4. Build part label map (consistent across all steps)
      const partLabelMap = buildPartLabelMap(steps);

      // 5. Product name and color palette from guide metadata
      const productName =
        guide.guideMetadata.purposeStatement || "assembly product";
      const colorPalette = guide.guideMetadata.colorPalette;

      // 6. Generate illustrations per step
      const illustrations: GeneratedIllustration[] = [];
      let totalCostUsd = 0;
      const illustrationsDir = getIllustrationsDir(context.jobId);

      // Track accumulated parts for active/inactive highlighting (IL-006)
      const accumulatedParts: StructuredPartRef[] = [];

      for (let i = 0; i < totalSteps; i++) {
        // Check cancellation between steps
        if (context.isCancelled()) {
          throw new PipelineCancelledError(context.jobId);
        }

        const step = steps[i];
        const progressPct = Math.round(((i + 0.5) / totalSteps) * 100);

        context.reportProgress(
          progressPct,
          `Generating illustration ${i + 1} of ${totalSteps}...`,
        );

        const stepStart = Date.now();

        // Score complexity and pick model (IL-018)
        const complexity = scoreStepComplexity(step);
        const model =
          complexity === "complex" ? IMAGE_PRO_MODEL : IMAGE_MODEL;

        // Build prompt (v2.0: system instruction + color palette + conditional sections)
        const prompt = buildStepPrompt(
          step,
          i,
          totalSteps,
          partLabelMap,
          productName,
          accumulatedParts,
          i > 0 ? colorPalette : undefined,
        );

        // Generate image with retry (IL-004: up to 3 attempts)
        const result = await generateImageWithRetry(prompt, {
          model,
          temperature: 0.4,
          maxRetries: 3,
        });

        const stepDuration = Date.now() - stepStart;

        // Save to storage
        const filename = `step-${String(step.stepNumber).padStart(3, "0")}.png`;
        const filePath = path.join(illustrationsDir, filename);
        await saveFile(filePath, result.imageBuffer);

        // Record per-step cost
        context.recordCost({
          agent: this.name,
          model,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: result.costUsd,
          durationMs: stepDuration,
          timestamp: new Date(),
        });

        totalCostUsd += result.costUsd;

        // Build illustration record
        illustrations.push({
          stepNumber: step.stepNumber,
          imageBuffer: result.imageBuffer,
          mimeType: "image/png",
          filePath,
          modelUsed: model,
          width: 1024,
          height: 1024,
          costUsd: result.costUsd,
          durationMs: stepDuration,
          complexity,
          attempt: result.attempt,
        });

        // Update accumulated parts for next step's inactive rendering
        for (const part of step.parts) {
          if (!accumulatedParts.some((p) => p.id === part.id)) {
            accumulatedParts.push(part);
          }
        }
      }

      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      // 7. Persist execution record
      await context.persistExecution({
        id: executionId,
        jobId: context.jobId,
        agentName: this.name,
        executionOrder: this.executionOrder,
        model: IMAGE_MODEL,
        wasEscalation: false,
        promptSent: `Generated ${totalSteps} illustrations`,
        responseReceived: `${illustrations.length} PNGs saved`,
        structuredOutput: JSON.stringify(
          illustrations.map((il) => ({
            stepNumber: il.stepNumber,
            filePath: il.filePath,
            costUsd: il.costUsd,
            durationMs: il.durationMs,
          })),
        ),
        inputTokens: 0,
        outputTokens: 0,
        costUsd: totalCostUsd,
        promptVersion: ILLUSTRATION_PROMPT_VERSION,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs,
        status: "completed",
        errorMessage: null,
      });

      // 8. Emit agent:complete
      context.emit("agent:complete", {
        agent: this.name,
        durationMs,
        costUsd: totalCostUsd,
        summary: `Generated ${illustrations.length} illustrations ($${totalCostUsd.toFixed(2)})`,
      });

      // 9. Return result
      return {
        output: illustrations,
        durationMs,
        costUsd: totalCostUsd,
        model: IMAGE_MODEL,
        wasEscalation: false,
        inputTokens: 0,
        outputTokens: 0,
      };
    } catch (error) {
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Persist failed record
      await context.persistExecution({
        id: executionId,
        jobId: context.jobId,
        agentName: this.name,
        executionOrder: this.executionOrder,
        model: IMAGE_MODEL,
        wasEscalation: false,
        promptSent: null,
        responseReceived: null,
        structuredOutput: null,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        promptVersion: ILLUSTRATION_PROMPT_VERSION,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs,
        status: "failed",
        errorMessage,
      });

      // Emit error
      context.emit("pipeline:error", {
        error: errorMessage,
        agent: this.name,
        recoverable: false,
      });

      throw error;
    }
  }
}

export const illustrationGenerator = new IllustrationGeneratorAgent();
