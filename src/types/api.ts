import type { PipelineStatus } from "./pipeline";
import type { QualityIssue, SafetyIssue } from "./agents";

// ============================================================
// API Request/Response Types
// ============================================================

export interface CreateJobRequest {
  file: File;
  documentName?: string;
  domain?: string;
  qualityThreshold?: number;
  generateIllustrations?: boolean;
}

export interface CreateJobResponse {
  jobId: string;
  status: "pending";
  createdAt: string;
}

export interface JobStatusResponse {
  job: {
    id: string;
    status: PipelineStatus;
    filename: string;
    documentName: string | null;
    domain: string;
    pageCount: number | null;
    currentAgent: string | null;
    qualityScore: number | null;
    qualityDecision: string | null;
    qualityThreshold: number;
    totalCostUsd: number;
    textRevisionCount: number;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
  };
}

export interface JobListResponse {
  jobs: {
    id: string;
    status: PipelineStatus;
    filename: string;
    documentName: string | null;
    qualityScore: number | null;
    qualityDecision: string | null;
    totalCostUsd: number;
    createdAt: string;
    completedAt: string | null;
  }[];
  total: number;
}

export interface JobResultResponse {
  guide: {
    title: string;
    stepCount: number;
    phaseCount: number;
    qualityScore: number;
    qualityDecision: string;
    safetyLevel: string;
    estimatedMinutes: number;
    domain: string;
  };
  xml: string;
  illustrations: {
    stepNumber: number;
    url: string;
  }[];
  quality: {
    score: number;
    decision: string;
    issues: QualityIssue[];
    safetyPassed: boolean;
    safetyIssues: SafetyIssue[];
  };
  cost: {
    totalUsd: number;
    breakdown: Record<string, number>;
  };
  metadata: {
    processingTimeMs: number;
    textRevisionLoops: number;
    modelsUsed: string[];
  };
}

export type SSEEventData =
  | { event: "pipeline:state"; data: { state: PipelineStatus; timestamp: string } }
  | { event: "agent:start"; data: { agent: string; startedAt: string; parallel?: boolean; parallelWith?: string } }
  | { event: "agent:progress"; data: { agent: string; progress: number; message: string } }
  | { event: "agent:complete"; data: { agent: string; durationMs: number; costUsd: number; summary: string } }
  | { event: "pipeline:cost"; data: { totalUsd: number; breakdown: Record<string, number> } }
  | { event: "pipeline:error"; data: { error: string; agent?: string; recoverable: boolean } }
  | { event: "pipeline:complete"; data: { state: "completed"; qualityScore: number; qualityDecision: string; totalCostUsd: number; durationMs: number } };
