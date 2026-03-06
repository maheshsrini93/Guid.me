import { generateTextWithSchema, generateTextWithVision } from "@/lib/gemini/client";
import type { StructuredGenerationResult } from "@/lib/gemini/client";
import { waitForSlot } from "@/lib/gemini/rate-limiter";
import { readFile } from "@/lib/utils/file-storage";
import { generateId } from "@/lib/utils/ulid";
import { withRetry } from "./retry";
import { PipelineCancelledError, classifyError } from "./types";
import type { AgentConfig, AgentContext, AgentResult } from "./types";

/**
 * Generic runner for config-driven LLM agents (agents 2-7).
 *
 * Handles:
 * - Input validation (Layer 1)
 * - SSE lifecycle events
 * - Gemini API calls with retry + escalation
 * - Response parsing (Layer 2 via responseSchema)
 * - Cost recording + DB persistence
 * - Single, per-page, and per-step invocation modes
 */
export async function runConfigAgent<TOutput>(
  config: AgentConfig<TOutput>,
  context: AgentContext,
): Promise<AgentResult<TOutput>> {
  const startedAt = new Date();
  const executionId = generateId();

  // 1. Check cancellation
  if (context.isCancelled()) {
    throw new PipelineCancelledError(context.jobId);
  }

  // 2. Validate input (Layer 1)
  config.validateInput(context.pipelineState);

  // 3. Emit agent:start
  context.emit("agent:start", {
    agent: config.name,
    startedAt: startedAt.toISOString(),
  });

  try {
    let output: TOutput;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCost = 0;
    let wasEscalation = false;
    let modelUsed = config.defaultModel;

    if (config.invocationMode === "per-page" && config.usesVision) {
      // Per-page mode: iterate over extracted pages
      output = await runPerPage(
        config,
        context,
        (tokens) => {
          totalInputTokens += tokens.inputTokens;
          totalOutputTokens += tokens.outputTokens;
          totalCost += tokens.costUsd;
          if (tokens.wasEscalation) wasEscalation = true;
          if (tokens.model) modelUsed = tokens.model;
        },
      );
    } else {
      // Single mode: one API call
      const result = await runSingle(config, context);
      output = result.output;
      totalInputTokens = result.inputTokens;
      totalOutputTokens = result.outputTokens;
      totalCost = result.costUsd;
      wasEscalation = result.wasEscalation;
      modelUsed = result.model;
    }

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    // Record cost
    context.recordCost({
      agent: config.name,
      model: modelUsed,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      costUsd: totalCost,
      durationMs,
      timestamp: completedAt,
    });

    // Persist execution record
    const systemPrompt = config.buildSystemPrompt();
    const userPrompt = config.buildUserPrompt(context.pipelineState);
    await context.persistExecution({
      id: executionId,
      jobId: context.jobId,
      agentName: config.name,
      executionOrder: config.executionOrder,
      model: modelUsed,
      wasEscalation,
      promptSent: `[system]\n${systemPrompt}\n\n[user]\n${userPrompt}`.slice(0, 10_000),
      responseReceived: JSON.stringify(output).slice(0, 10_000),
      structuredOutput: JSON.stringify(output),
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      costUsd: totalCost,
      promptVersion: config.promptVersion,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs,
      status: "completed",
      errorMessage: null,
    });

    // Emit agent:complete
    context.emit("agent:complete", {
      agent: config.name,
      durationMs,
      costUsd: totalCost,
      summary: config.summarize(output),
    });

    return {
      output,
      durationMs,
      costUsd: totalCost,
      model: modelUsed,
      wasEscalation,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    };
  } catch (error) {
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();
    let errorMessage = error instanceof Error ? error.message : String(error);
    // Include root cause for exhausted errors
    if (error instanceof Error && error.cause instanceof Error) {
      errorMessage += ` (cause: ${error.cause.message})`;
    }

    // Persist failed record
    await context.persistExecution({
      id: executionId,
      jobId: context.jobId,
      agentName: config.name,
      executionOrder: config.executionOrder,
      model: config.defaultModel,
      wasEscalation: false,
      promptSent: null,
      responseReceived: null,
      structuredOutput: null,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      promptVersion: config.promptVersion,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs,
      status: "failed",
      errorMessage,
    });

    context.emit("pipeline:error", {
      error: classifyError(error),
      agent: config.name,
      recoverable: false,
    });

    throw error;
  }
}

// ============================================================
// Single invocation mode
// ============================================================

interface SingleResult<T> {
  output: T;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  wasEscalation: boolean;
  model: string;
}

async function runSingle<TOutput>(
  config: AgentConfig<TOutput>,
  context: AgentContext,
): Promise<SingleResult<TOutput>> {
  const systemPrompt = config.buildSystemPrompt();
  const userPrompt = config.buildUserPrompt(context.pipelineState);

  // Call with retry
  const result = await withRetry(
    config.name,
    async () => {
      await waitForSlot(config.defaultModel);
      return generateTextWithSchema<TOutput>(
        config.defaultModel,
        systemPrompt,
        userPrompt,
        config.responseSchema,
        config.generationOptions,
      );
    },
    {
      retryConfig: config.retryConfig,
      isCancelled: () => context.isCancelled(),
    },
  );

  let output = config.parseOutput(result.parsed);
  let wasEscalation = false;
  let model = config.defaultModel;

  // Check escalation rules
  if (config.escalationModel && config.escalationRules?.length) {
    const shouldEscalate = config.escalationRules.some((rule) => rule.check(output));
    if (shouldEscalate) {
      wasEscalation = true;
      model = config.escalationModel;

      context.reportProgress(50, `Escalating to ${model} for higher accuracy`);

      const escalatedResult = await withRetry(
        config.name,
        async () => {
          await waitForSlot(config.escalationModel!);
          return generateTextWithSchema<TOutput>(
            config.escalationModel!,
            systemPrompt,
            userPrompt,
            config.responseSchema,
            config.generationOptions,
          );
        },
        {
          retryConfig: config.retryConfig,
          isCancelled: () => context.isCancelled(),
        },
      );

      output = config.parseOutput(escalatedResult.parsed);

      return {
        output,
        inputTokens: result.inputTokens + escalatedResult.inputTokens,
        outputTokens: result.outputTokens + escalatedResult.outputTokens,
        costUsd: result.costUsd + escalatedResult.costUsd,
        wasEscalation: true,
        model,
      };
    }
  }

  return {
    output,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    costUsd: result.costUsd,
    wasEscalation,
    model,
  };
}

// ============================================================
// Per-page invocation mode (Agent 2: Vision Analyzer)
// ============================================================

interface PageTokens {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  wasEscalation: boolean;
  model: string;
}

async function runPerPage<TOutput>(
  config: AgentConfig<TOutput>,
  context: AgentContext,
  onPageTokens: (tokens: PageTokens) => void,
): Promise<TOutput> {
  const pages = context.pipelineState.extractedDocument?.pages;
  if (!pages || pages.length === 0) {
    throw new Error("No extracted pages available for per-page processing");
  }

  const systemPrompt = config.buildSystemPrompt();
  const pageResults: unknown[] = [];

  for (let i = 0; i < pages.length; i++) {
    if (context.isCancelled()) {
      throw new PipelineCancelledError(context.jobId);
    }

    const page = pages[i];
    const progress = Math.round(((i + 1) / pages.length) * 100);
    context.reportProgress(progress, `Analyzing page ${i + 1} of ${pages.length}`);

    const userPrompt = config.buildUserPrompt(context.pipelineState, {
      pageNumber: page.pageNumber,
      totalPages: pages.length,
    });

    // Read the page image
    const imageData = await readFile(page.imagePath);

    // Call Gemini Vision with retry
    let result = await withRetry(
      config.name,
      async () => {
        await waitForSlot(config.defaultModel);
        return generateTextWithVision(
          config.defaultModel,
          systemPrompt,
          userPrompt,
          { data: imageData, mimeType: page.mimeType },
          config.responseSchema,
          config.generationOptions,
        ) as Promise<StructuredGenerationResult<unknown>>;
      },
      {
        retryConfig: config.retryConfig,
        isCancelled: () => context.isCancelled(),
      },
    );

    let pageOutput = result.parsed;
    let wasEscalation = false;
    let model = config.defaultModel;

    // Check per-page escalation rules
    if (config.escalationModel && config.escalationRules?.length) {
      // Parse to check escalation
      const parsed = config.parseOutput(pageOutput as TOutput);
      const shouldEscalate = config.escalationRules.some((rule) => rule.check(parsed));

      if (shouldEscalate) {
        wasEscalation = true;
        model = config.escalationModel;

        context.reportProgress(
          progress,
          `Page ${i + 1}: escalating to ${model}`,
        );

        const escalatedResult = await withRetry(
          config.name,
          async () => {
            await waitForSlot(config.escalationModel!);
            return generateTextWithVision(
              config.escalationModel!,
              systemPrompt,
              userPrompt,
              { data: imageData, mimeType: page.mimeType },
              config.responseSchema,
              config.generationOptions,
            ) as Promise<StructuredGenerationResult<unknown>>;
          },
          {
            retryConfig: config.retryConfig,
            isCancelled: () => context.isCancelled(),
          },
        );

        pageOutput = escalatedResult.parsed;

        onPageTokens({
          inputTokens: result.inputTokens + escalatedResult.inputTokens,
          outputTokens: result.outputTokens + escalatedResult.outputTokens,
          costUsd: result.costUsd + escalatedResult.costUsd,
          wasEscalation: true,
          model,
        });

        pageResults.push(pageOutput);
        continue;
      }
    }

    onPageTokens({
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd: result.costUsd,
      wasEscalation,
      model,
    });

    pageResults.push(pageOutput);
  }

  // The per-page config's parseOutput handles the array aggregation
  return config.parseOutput(pageResults as unknown as TOutput);
}
