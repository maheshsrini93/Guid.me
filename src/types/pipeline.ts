import type {
  ExtractedDocument,
  RawPageExtraction,
  ComposedGuide,
  EnforcedGuide,
  QualityReviewResult,
  SafetyReviewResult,
  GeneratedIllustration,
  XmlAssemblerOutput,
} from "./agents";

// ============================================================
// Pipeline Status
// ============================================================

export type PipelineStatus =
  | "pending"
  | "extracting"
  | "analyzing"
  | "composing"
  | "enforcing"
  | "reviewing"
  | "revising"
  | "illustrating"
  | "assembling"
  | "completed"
  | "failed"
  | "cancelled";

// ============================================================
// Pipeline State (Orchestrator)
// ============================================================

export interface PipelineState {
  /** Unique job identifier */
  jobId: string;
  /** Current pipeline status */
  status: PipelineStatus;

  // --- Input ---
  /** Path to the uploaded document */
  documentPath: string;
  /** Document MIME type */
  documentMimeType: string;

  // --- Agent Outputs (populated as pipeline progresses) ---
  extractedDocument?: ExtractedDocument;
  pageExtractions?: RawPageExtraction[];
  composedGuide?: ComposedGuide;
  enforcedGuide?: EnforcedGuide;
  qualityReview?: QualityReviewResult;
  safetyReview?: SafetyReviewResult;
  illustrations?: GeneratedIllustration[];
  xmlOutput?: XmlAssemblerOutput;

  // --- Loop Tracking ---
  /** Text revision count (max 2) */
  textRevisionCount: number;

  // --- Cost Tracking ---
  /** Per-agent cost records */
  costs: AgentCostRecord[];
  /** Running total cost */
  totalCostUsd: number;

  // --- Timing ---
  startedAt: Date;
  completedAt?: Date;
  lastProgressAt: Date;

  // --- Error ---
  error?: string;
}

export interface AgentCostRecord {
  /** Agent identifier */
  agent: string;
  /** Model used */
  model: string;
  /** Input tokens consumed */
  inputTokens: number;
  /** Output tokens produced */
  outputTokens: number;
  /** Cost in USD */
  costUsd: number;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** When this execution happened */
  timestamp: Date;
}

// ============================================================
// SSE Event Types
// ============================================================

export interface PipelineStateEvent {
  type: "pipeline:state";
  data: {
    state: PipelineStatus;
    timestamp: string;
  };
}

export interface AgentStartEvent {
  type: "agent:start";
  data: {
    agent: string;
    startedAt: string;
    parallel?: boolean;
    parallelWith?: string;
  };
}

export interface AgentProgressEvent {
  type: "agent:progress";
  data: {
    agent: string;
    progress: number;
    message: string;
  };
}

export interface AgentCompleteEvent {
  type: "agent:complete";
  data: {
    agent: string;
    durationMs: number;
    costUsd: number;
    summary: string;
    outputPreview?: object;
  };
}

export interface PipelineCostEvent {
  type: "pipeline:cost";
  data: {
    totalUsd: number;
    breakdown: Record<string, number>;
  };
}

export interface PipelineErrorEvent {
  type: "pipeline:error";
  data: {
    error: string;
    agent?: string;
    recoverable: boolean;
  };
}

export interface PipelineCompleteEvent {
  type: "pipeline:complete";
  data: {
    state: "completed";
    qualityScore: number;
    qualityDecision: string;
    totalCostUsd: number;
    durationMs: number;
  };
}

export type SSEEvent =
  | PipelineStateEvent
  | AgentStartEvent
  | AgentProgressEvent
  | AgentCompleteEvent
  | PipelineCostEvent
  | PipelineErrorEvent
  | PipelineCompleteEvent;
