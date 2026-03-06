import type { GenerationConfig } from "@google/generative-ai";
import type { GenerateOptions } from "@/lib/gemini/client";
import type { PipelineState, AgentCostRecord } from "@/types/pipeline";

// ============================================================
// Agent Names
// ============================================================

export type AgentName =
  | "document-extractor"
  | "vision-analyzer"
  | "instruction-composer"
  | "guideline-enforcer"
  | "quality-reviewer"
  | "safety-reviewer"
  | "illustration-generator"
  | "xml-assembler";

// ============================================================
// Agent Context (shared by both patterns)
// ============================================================

export interface AgentContext {
  jobId: string;
  pipelineState: PipelineState;
  emit(type: string, data: unknown): void;
  reportProgress(progress: number, message: string): void;
  recordCost(cost: AgentCostRecord): void;
  persistExecution(record: AgentExecutionRecord): Promise<void>;
  isCancelled(): boolean;
  signal: AbortSignal;
}

// ============================================================
// Agent Execution Record (for DB persistence)
// ============================================================

export interface AgentExecutionRecord {
  id: string;
  jobId: string;
  agentName: AgentName;
  executionOrder: number;
  model: string | null;
  wasEscalation: boolean;
  promptSent: string | null;
  responseReceived: string | null;
  structuredOutput: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  promptVersion: string | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  status: "running" | "completed" | "failed";
  errorMessage: string | null;
}

// ============================================================
// Agent Result (unified return type)
// ============================================================

export interface AgentResult<T> {
  output: T;
  durationMs: number;
  costUsd: number;
  model: string | null;
  wasEscalation: boolean;
  inputTokens: number;
  outputTokens: number;
}

// ============================================================
// Retry Configuration
// ============================================================

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number;
  timeoutMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  jitterFactor: 0.25,
  timeoutMs: 60_000,
};

// ============================================================
// Escalation Rules
// ============================================================

export interface EscalationRule<TOutput> {
  name: string;
  check: (output: TOutput) => boolean;
}

// ============================================================
// Agent Config (config-driven LLM agents 2-7)
// ============================================================

export interface AgentConfig<TOutput> {
  name: AgentName;
  displayName: string;
  executionOrder: number;
  defaultModel: string;
  escalationModel?: string;
  generationOptions?: GenerateOptions;
  responseSchema: GenerationConfig["responseSchema"];
  retryConfig?: Partial<RetryConfig>;
  escalationRules?: EscalationRule<TOutput>[];
  usesVision?: boolean;
  generatesImages?: boolean;
  promptVersion: string;
  invocationMode: "single" | "per-page" | "per-step";
  buildSystemPrompt: () => string;
  buildUserPrompt: (state: PipelineState, context?: unknown) => string;
  validateInput: (state: PipelineState) => void;
  parseOutput: (raw: unknown) => TOutput;
  summarize: (output: TOutput) => string;
}

// ============================================================
// Errors
// ============================================================

export class AgentExhaustedError extends Error {
  constructor(
    public agentName: AgentName,
    public attempts: number,
    cause?: Error,
  ) {
    super(
      `Agent "${agentName}" exhausted all ${attempts} retry attempts`,
    );
    this.name = "AgentExhaustedError";
    this.cause = cause;
  }
}

export class AgentValidationError extends Error {
  constructor(
    public agentName: AgentName,
    message: string,
  ) {
    super(`Agent "${agentName}" input validation failed: ${message}`);
    this.name = "AgentValidationError";
  }
}

export class PipelineCancelledError extends Error {
  constructor(public jobId: string) {
    super(`Pipeline "${jobId}" was cancelled`);
    this.name = "PipelineCancelledError";
  }
}

// ============================================================
// User-friendly Error Classification
// ============================================================

/**
 * Classify an error into a user-friendly message.
 * Keeps technical details in the original error but provides
 * a clear summary for display in the UI.
 */
export function classifyError(error: unknown): string {
  if (error instanceof PipelineCancelledError) {
    return "Pipeline cancelled by user.";
  }
  if (error instanceof AgentExhaustedError) {
    const cause = error.cause instanceof Error ? error.cause.message : "";
    const causeLower = cause.toLowerCase();
    if (causeLower.includes("429") || causeLower.includes("rate limit")) {
      return `API rate limit reached after ${error.attempts} attempts. Try again in a few minutes.`;
    }
    if (causeLower.includes("timeout") || causeLower.includes("abort")) {
      return `Agent "${error.agentName}" timed out after ${error.attempts} attempts. The document may be too large.`;
    }
    if (causeLower.includes("quota") || causeLower.includes("billing")) {
      return `API quota exceeded. Check your Gemini API billing and quota limits.`;
    }
    if (cause) {
      return `Agent "${error.agentName}" failed after ${error.attempts} attempts: ${cause}`;
    }
    return `Agent "${error.agentName}" failed after ${error.attempts} attempts. Check your API key and try again.`;
  }
  if (error instanceof AgentValidationError) {
    return `Input validation failed: ${error.message}`;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("api key") || msg.includes("unauthorized") || msg.includes("401")) {
      return "Invalid or missing API key. Set GEMINI_API_KEY in your environment.";
    }
    if (msg.includes("rate limit") || msg.includes("429")) {
      return "API rate limit reached. Wait a moment and try again.";
    }
    if (msg.includes("timeout") || msg.includes("abort")) {
      return "Request timed out. The document may be too complex or the API is slow.";
    }
    if (msg.includes("network") || msg.includes("fetch failed") || msg.includes("econnrefused")) {
      return "Network error. Check your internet connection and try again.";
    }
    if (msg.includes("json") && msg.includes("parse")) {
      return "Received malformed response from AI model. Try again.";
    }
    if (msg.includes("response truncated") || msg.includes("max_tokens")) {
      return "AI response was too large and got truncated. The document may have too many pages or steps.";
    }
    if (msg.includes("no image") || msg.includes("no content")) {
      return "AI model returned empty response. Try again with a different document.";
    }
    if (msg.includes("poppler") || msg.includes("pdftoppm") || msg.includes("pdf extraction")) {
      if (msg.includes("could not write") || msg.includes("enoent")) {
        return "PDF extraction failed: output directory could not be created. Check storage permissions.";
      }
      return "PDF extraction tool not found. Install poppler: brew install poppler";
    }
    return error.message;
  }
  return String(error);
}
