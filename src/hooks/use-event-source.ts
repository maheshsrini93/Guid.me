"use client";

import { useEffect, useReducer, useRef } from "react";

export type PipelineStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type AgentName =
  | "document-extractor"
  | "vision-analyzer"
  | "instruction-composer"
  | "guideline-enforcer"
  | "quality-reviewer"
  | "safety-reviewer"
  | "illustration-generator"
  | "xml-assembler";

export interface AgentState {
  name: AgentName;
  displayName: string;
  status: "idle" | "active" | "complete" | "error";
  progress: number;
  message: string;
  durationMs?: number;
  costUsd?: number;
  summary?: string;
  startedAt?: string;
  promptSent?: string;
  responseReceived?: string;
}

export interface PipelineMonitorState {
  status: PipelineStatus;
  agents: Record<AgentName, AgentState>;
  totalCost: number;
  costBreakdown: Record<string, number>;
  error?: string;
  errorAgent?: AgentName;
  isConnected: boolean;
  qualityScore?: number;
  qualityDecision?: string;
  durationMs?: number;
}

type Action =
  | { type: "CONNECT" }
  | { type: "DISCONNECT" }
  | { type: "PIPELINE_STATE"; payload: { state: PipelineStatus; timestamp: string } }
  | { type: "AGENT_START"; payload: { agent: AgentName; startedAt: string; parallel?: boolean } }
  | { type: "AGENT_PROGRESS"; payload: { agent: AgentName; progress: number; message: string } }
  | { type: "AGENT_COMPLETE"; payload: { agent: AgentName; durationMs: number; costUsd: number; summary: string } }
  | { type: "PIPELINE_COST"; payload: { totalUsd: number; breakdown: Record<string, number> } }
  | { type: "PIPELINE_ERROR"; payload: { error: string; agent?: AgentName; recoverable: boolean } }
  | { type: "PIPELINE_COMPLETE"; payload: { state: "completed"; qualityScore: number; qualityDecision: string; totalCostUsd: number; durationMs: number } };

const initialAgents: Record<AgentName, AgentState> = {
  "document-extractor": { name: "document-extractor", displayName: "Document Extractor", status: "idle", progress: 0, message: "Waiting to start" },
  "vision-analyzer": { name: "vision-analyzer", displayName: "Vision Analyzer", status: "idle", progress: 0, message: "Waiting to start" },
  "instruction-composer": { name: "instruction-composer", displayName: "Instruction Composer", status: "idle", progress: 0, message: "Waiting to start" },
  "guideline-enforcer": { name: "guideline-enforcer", displayName: "Guideline Enforcer", status: "idle", progress: 0, message: "Waiting to start" },
  "quality-reviewer": { name: "quality-reviewer", displayName: "Quality Reviewer", status: "idle", progress: 0, message: "Waiting to start" },
  "safety-reviewer": { name: "safety-reviewer", displayName: "Safety Reviewer", status: "idle", progress: 0, message: "Waiting to start" },
  "illustration-generator": { name: "illustration-generator", displayName: "Illustration Generator", status: "idle", progress: 0, message: "Waiting to start" },
  "xml-assembler": { name: "xml-assembler", displayName: "XML Assembler", status: "idle", progress: 0, message: "Waiting to start" },
};

const initialState: PipelineMonitorState = {
  status: "pending",
  agents: initialAgents,
  totalCost: 0,
  costBreakdown: {},
  isConnected: false,
};

function reducer(state: PipelineMonitorState, action: Action): PipelineMonitorState {
  switch (action.type) {
    case "CONNECT":
      return { ...state, isConnected: true };
    case "DISCONNECT":
      return { ...state, isConnected: false };
    case "PIPELINE_STATE":
      return { ...state, status: action.payload.state };
    case "AGENT_START":
      return {
        ...state,
        agents: {
          ...state.agents,
          [action.payload.agent]: {
            ...state.agents[action.payload.agent],
            status: "active",
            startedAt: action.payload.startedAt,
            message: "Starting...",
          },
        },
      };
    case "AGENT_PROGRESS":
      return {
        ...state,
        agents: {
          ...state.agents,
          [action.payload.agent]: {
            ...state.agents[action.payload.agent],
            progress: action.payload.progress,
            message: action.payload.message,
          },
        },
      };
    case "AGENT_COMPLETE":
      return {
        ...state,
        agents: {
          ...state.agents,
          [action.payload.agent]: {
            ...state.agents[action.payload.agent],
            status: "complete",
            progress: 100,
            durationMs: action.payload.durationMs,
            costUsd: action.payload.costUsd,
            summary: action.payload.summary,
          },
        },
      };
    case "PIPELINE_COST":
      return {
        ...state,
        totalCost: action.payload.totalUsd,
        costBreakdown: action.payload.breakdown,
      };
    case "PIPELINE_ERROR":
      return {
        ...state,
        status: "failed",
        error: action.payload.error,
        errorAgent: action.payload.agent,
        agents: action.payload.agent
          ? {
              ...state.agents,
              [action.payload.agent]: {
                ...state.agents[action.payload.agent],
                status: "error",
                message: action.payload.error,
              },
            }
          : state.agents,
      };
    case "PIPELINE_COMPLETE": {
      // Mark any agents still active/idle as complete so progress shows 100%
      const completedAgents = { ...state.agents };
      for (const key of Object.keys(completedAgents) as AgentName[]) {
        const a = completedAgents[key];
        if (a.status === "active" || a.status === "idle") {
          completedAgents[key] = {
            ...a,
            status: "complete",
            progress: 100,
            message: a.status === "idle" ? "Skipped" : "Completed",
          };
        }
      }
      return {
        ...state,
        status: "completed",
        agents: completedAgents,
        qualityScore: action.payload.qualityScore,
        qualityDecision: action.payload.qualityDecision,
        totalCost: action.payload.totalCostUsd,
        durationMs: action.payload.durationMs,
      };
    }
    default:
      return state;
  }
}

export function useEventSource(url: string | null) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const reconnectCount = useRef(0);
  const maxReconnects = 5;

  useEffect(() => {
    if (!url) return;

    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      const urlWithCacheBuster = url.includes("?") ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
      eventSource = new EventSource(urlWithCacheBuster);

      eventSource.onopen = () => {
        dispatch({ type: "CONNECT" });
        reconnectCount.current = 0;
      };

      eventSource.onerror = () => {
        dispatch({ type: "DISCONNECT" });
        eventSource?.close();

        if (reconnectCount.current < maxReconnects) {
          const delay = Math.pow(2, reconnectCount.current) * 1000;
          reconnectCount.current++;
          reconnectTimer = setTimeout(connect, delay);
        } else {
          dispatch({
            type: "PIPELINE_ERROR",
            payload: { error: "Connection lost. Max reconnection attempts reached.", recoverable: false },
          });
        }
      };

      const addListener = (event: string, type: Action["type"]) => {
        eventSource?.addEventListener(event, (e) => {
          try {
            const payload = JSON.parse((e as MessageEvent).data);
            dispatch({ type, payload } as Action);
          } catch (err) {
            console.error(`Failed to parse ${event} event:`, err);
          }
        });
      };

      addListener("pipeline:state", "PIPELINE_STATE");
      addListener("agent:start", "AGENT_START");
      addListener("agent:progress", "AGENT_PROGRESS");
      addListener("agent:complete", "AGENT_COMPLETE");
      addListener("pipeline:cost", "PIPELINE_COST");
      addListener("pipeline:error", "PIPELINE_ERROR");
      addListener("pipeline:complete", "PIPELINE_COMPLETE");
    };

    connect();

    return () => {
      eventSource?.close();
      clearTimeout(reconnectTimer);
    };
  }, [url]);

  return state;
}
