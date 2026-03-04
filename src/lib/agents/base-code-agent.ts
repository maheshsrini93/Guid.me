import { generateId } from "@/lib/utils/ulid";
import type { PipelineState } from "@/types/pipeline";
import type { AgentContext, AgentName, AgentResult } from "./types";
import { PipelineCancelledError } from "./types";

/**
 * Abstract base class for code-only agents (no LLM calls).
 * Used by Agent 1 (Document Extractor) and Agent 8 (XML Assembler).
 */
export abstract class BaseCodeAgent<TInput, TOutput> {
  abstract name: AgentName;
  abstract displayName: string;
  abstract executionOrder: number;

  /** Extract and validate the input from PipelineState. Throw on invalid input. */
  abstract validateInput(state: PipelineState): TInput;

  /** Core execution logic implemented by subclass. */
  abstract execute(input: TInput, context: AgentContext): Promise<TOutput>;

  /** Return a short summary of the output for SSE events. */
  abstract summarize(output: TOutput): string;

  /**
   * Run the agent with full lifecycle:
   * 1. Check cancellation
   * 2. Validate input (Layer 1)
   * 3. Emit agent:start
   * 4. Execute (subclass logic)
   * 5. Record cost ($0, model: "code")
   * 6. Persist to agent_executions
   * 7. Emit agent:complete
   * 8. Return AgentResult
   */
  async run(context: AgentContext): Promise<AgentResult<TOutput>> {
    const startedAt = new Date();
    const executionId = generateId();

    // 1. Check cancellation
    if (context.isCancelled()) {
      throw new PipelineCancelledError(context.jobId);
    }

    // 2. Validate input
    const input = this.validateInput(context.pipelineState);

    // 3. Emit agent:start
    context.emit("agent:start", {
      agent: this.name,
      startedAt: startedAt.toISOString(),
    });

    try {
      // 4. Execute
      const output = await this.execute(input, context);

      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      // 5. Record cost ($0 for code agents)
      context.recordCost({
        agent: this.name,
        model: "code",
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        durationMs,
        timestamp: completedAt,
      });

      // 6. Persist execution record
      await context.persistExecution({
        id: executionId,
        jobId: context.jobId,
        agentName: this.name,
        executionOrder: this.executionOrder,
        model: null,
        wasEscalation: false,
        promptSent: null,
        responseReceived: null,
        structuredOutput: JSON.stringify(output),
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs,
        status: "completed",
        errorMessage: null,
      });

      // 7. Emit agent:complete
      context.emit("agent:complete", {
        agent: this.name,
        durationMs,
        costUsd: 0,
        summary: this.summarize(output),
      });

      // 8. Return result
      return {
        output,
        durationMs,
        costUsd: 0,
        model: null,
        wasEscalation: false,
        inputTokens: 0,
        outputTokens: 0,
      };
    } catch (error) {
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Persist failed record
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
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs,
        status: "failed",
        errorMessage,
      });

      // Emit error event
      context.emit("pipeline:error", {
        error: errorMessage,
        agent: this.name,
        recoverable: false,
      });

      throw error;
    }
  }
}
