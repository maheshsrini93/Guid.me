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
