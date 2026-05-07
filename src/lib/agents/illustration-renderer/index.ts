import { generateId } from "@/lib/utils/ulid";
import type { GeneratedIllustration } from "@/types/agents";
import {
  AgentValidationError,
  PipelineCancelledError,
  type AgentContext,
  type AgentName,
  type AgentResult,
} from "../types";
import type { IllustrationRendererImpl } from "./types";
import { geminiRenderer } from "./gemini";
import { cadRenderer } from "./cad";

/**
 * Registered sub-implementations. Order matters: the dispatcher returns the
 * first impl whose `canHandle()` is true. Specific impls (CAD) are listed
 * before the catch-all Gemini fallback so CAD-aware sources never fall
 * through to the per-step Gemini Flash Image cost line.
 */
const IMPLS: IllustrationRendererImpl[] = [
  cadRenderer,
  geminiRenderer,
];

/**
 * Agent 7: Illustration Renderer.
 *
 * Polymorphic per ADR-0002. Dispatches on `state.extractedSource.structuredMetadata`:
 *   - present → CAD sub-impl (per-step three.js render + programmatic overlays, $0)
 *   - absent  → Gemini sub-impl (Flash Image per step, ~$0.04/image)
 *
 * This class owns the lifecycle (`agent:start` / `agent:complete` events,
 * DB persistence, error handling). Sub-impls own per-step generation and
 * report progress + cost via the shared `AgentContext`.
 */
class IllustrationRendererAgent {
  name: AgentName = "illustration-renderer";
  displayName = "Illustration Renderer";
  executionOrder = 7;

  async run(
    context: AgentContext,
  ): Promise<AgentResult<GeneratedIllustration[]>> {
    const startedAt = new Date();
    const executionId = generateId();

    if (context.isCancelled()) {
      throw new PipelineCancelledError(context.jobId);
    }

    const state = context.pipelineState;
    if (!state.enforcedGuide) {
      throw new AgentValidationError(
        "illustration-renderer",
        "No enforced guide available.",
      );
    }
    if (!state.extractedSource) {
      throw new AgentValidationError(
        "illustration-renderer",
        "No extracted source available.",
      );
    }

    const impl = IMPLS.find((i) => i.canHandle(state.extractedSource));
    if (!impl) {
      throw new AgentValidationError(
        "illustration-renderer",
        "No illustration renderer sub-implementation can handle this input.",
      );
    }

    context.emit("agent:start", {
      agent: this.name,
      startedAt: startedAt.toISOString(),
    });

    try {
      const result = await impl.render({
        guide: state.enforcedGuide,
        extractedSource: state.extractedSource,
        jobId: context.jobId,
        context,
      });

      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      await context.persistExecution({
        id: executionId,
        jobId: context.jobId,
        agentName: this.name,
        executionOrder: this.executionOrder,
        model: result.primaryModel,
        wasEscalation: false,
        promptSent: `Generated ${result.illustrations.length} illustrations via ${impl.name}`,
        responseReceived: `${result.illustrations.length} PNGs saved`,
        structuredOutput: JSON.stringify(
          result.illustrations.map((il) => ({
            stepNumber: il.stepNumber,
            filePath: il.filePath,
            costUsd: il.costUsd,
            durationMs: il.durationMs,
          })),
        ),
        inputTokens: 0,
        outputTokens: 0,
        costUsd: result.totalCostUsd,
        promptVersion: result.promptVersion,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs,
        status: "completed",
        errorMessage: null,
      });

      context.emit("agent:complete", {
        agent: this.name,
        durationMs,
        costUsd: result.totalCostUsd,
        summary: `Generated ${result.illustrations.length} illustrations ($${result.totalCostUsd.toFixed(2)}) [${impl.name}]`,
      });

      return {
        output: result.illustrations,
        durationMs,
        costUsd: result.totalCostUsd,
        model: result.primaryModel,
        wasEscalation: false,
        inputTokens: 0,
        outputTokens: 0,
      };
    } catch (error) {
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await context.persistExecution({
        id: executionId,
        jobId: context.jobId,
        agentName: this.name,
        executionOrder: this.executionOrder,
        model: null,
        wasEscalation: false,
        promptSent: null,
        responseReceived: null,
        structuredOutput: null,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        promptVersion: null,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs,
        status: "failed",
        errorMessage,
      });

      context.emit("pipeline:error", {
        error: errorMessage,
        agent: this.name,
        recoverable: false,
      });

      throw error;
    }
  }
}

export const illustrationRenderer = new IllustrationRendererAgent();
export type { IllustrationRendererImpl };
