import path from "path";
import { generateImageWithRetry } from "@/lib/gemini/client";
import { IMAGE_MODEL, IMAGE_PRO_MODEL } from "@/lib/gemini/models";
import { saveFile, getIllustrationsDir } from "@/lib/utils/file-storage";
import type {
  ExtractedSource,
  GeneratedIllustration,
  StructuredPartRef,
} from "@/types/agents";
import { PipelineCancelledError } from "../types";
import {
  PROMPT_VERSION,
  buildPartLabelMap,
  buildStepPrompt,
  scoreStepComplexity,
} from "../prompts/illustration-generator";
import type { IllustrationRendererImpl, RenderInput, RenderOutput } from "./types";

/**
 * Gemini Flash Image sub-impl. Original Phase 4 behavior, unchanged.
 * Acts as the fallback for any source without `structuredMetadata` —
 * i.e. PDF and DOCX inputs.
 */
class GeminiIllustrationRenderer implements IllustrationRendererImpl {
  readonly name = "gemini";

  canHandle(_extractedSource: ExtractedSource | undefined): boolean {
    // Last-resort fallback. CAD impl is registered before this in the
    // dispatcher's IMPLS array and short-circuits when structuredMetadata
    // is present.
    return true;
  }

  async render(input: RenderInput): Promise<RenderOutput> {
    const { guide, jobId, context } = input;
    const steps = guide.steps;
    const totalSteps = steps.length;

    const partLabelMap = buildPartLabelMap(steps);
    const productName =
      guide.guideMetadata.purposeStatement || "assembly product";
    const colorPalette = guide.guideMetadata.colorPalette;

    const illustrations: GeneratedIllustration[] = [];
    let totalCostUsd = 0;
    const illustrationsDir = getIllustrationsDir(jobId);
    const accumulatedParts: StructuredPartRef[] = [];

    for (let i = 0; i < totalSteps; i++) {
      if (context.isCancelled()) {
        throw new PipelineCancelledError(jobId);
      }

      const step = steps[i];
      const progressPct = Math.round(((i + 0.5) / totalSteps) * 100);

      context.reportProgress(
        progressPct,
        `Generating illustration ${i + 1} of ${totalSteps}...`,
      );

      const stepStart = Date.now();
      const complexity = scoreStepComplexity(step);
      const model = complexity === "complex" ? IMAGE_PRO_MODEL : IMAGE_MODEL;

      const prompt = buildStepPrompt(
        step,
        i,
        totalSteps,
        partLabelMap,
        productName,
        accumulatedParts,
        i > 0 ? colorPalette : undefined,
      );

      const result = await generateImageWithRetry(prompt, {
        model,
        temperature: 0.4,
        maxRetries: 3,
      });

      const stepDuration = Date.now() - stepStart;

      const filename = `step-${String(step.stepNumber).padStart(3, "0")}.png`;
      const filePath = path.join(illustrationsDir, filename);
      await saveFile(filePath, result.imageBuffer);

      context.recordCost({
        agent: "illustration-renderer",
        model,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: result.costUsd,
        durationMs: stepDuration,
        timestamp: new Date(),
      });

      totalCostUsd += result.costUsd;

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

      // Accumulate parts so the next step can fade them in the illustration
      // (IL-008). Mirrors the original Phase 4 behavior.
      for (const part of step.parts) {
        if (!accumulatedParts.some((p) => p.id === part.id)) {
          accumulatedParts.push(part);
        }
      }
    }

    return {
      illustrations,
      totalCostUsd,
      primaryModel: IMAGE_MODEL,
      promptVersion: PROMPT_VERSION,
    };
  }
}

export const geminiRenderer = new GeminiIllustrationRenderer();
