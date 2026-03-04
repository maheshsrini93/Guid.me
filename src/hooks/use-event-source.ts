"use client";

import { useEffect, useRef, useCallback, useReducer } from "react";
import type { PipelineStatus, SSEEvent } from "@/types/pipeline";
import type { AgentName } from "@/lib/agents/types";

// ============================================================
// Agent State
// ============================================================

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
}

// ============================================================
// Pipeline Monitor State
// ============================================================

export interface PipelineMonitorState {
  status: PipelineStatus;
  agents: Record<AgentName, AgentState>;
  totalCost: number;
  costBreakdown: Record<string, number>;
  error?: string;
  errorAgent?: string;
  isConnected: boolean;
  qualityScore?: number;
  qualityDecision?: string;
  durationMs?: number;
}

// ============================================================
// Agent Registry (display info)
// ============================================================

const AGENT_REGISTRY: {
  name: AgentName;
  displayName: string;
}[] = [
  { name: "document-extractor", displayName: "Document Extractor" },
  { name: "vision-analyzer", displayName: "Vision Analyzer" },
  { name: "instruction-composer", displayName: "Instruction Composer" },
  { name: "guideline-enforcer", displayName: "Guideline Enforcer" },
  { name: "quality-reviewer", displayName: "Quality Reviewer" },
  { name: "safety-reviewer", displayName: "Safety Reviewer" },
  { name: "illustration-generator", displayName: "Illustration Generator" },
  { name: "xml-assembler", displayName: "XML Assembler" },
];

function createInitialAgents(): Record<AgentName, AgentState> {
  const agents: Partial<Record<AgentName, AgentState>> = {};
  for (const { name, displayName } of AGENT_REGISTRY) {
    agents[name] = {
      name,
      displayName,
      status: "idle",
      progress: 0,
      message: "",
    };
  }
  return agents as Record<AgentName, AgentState>;
}

// ============================================================
// Reducer
// ============================================================

type Action =
  | { type: "CONNECTED" }
  | { type: "DISCONNECTED" }
  | { type: "SSE_EVENT"; event: SSEEvent }
  | { type: "RESET" };

function createInitialState(): PipelineMonitorState {
  return {
    status: "pending",
    agents: createInitialAgents(),
    totalCost: 0,
    costBreakdown: {},
    isConnected: false,
  };
}

function reducer(
  state: PipelineMonitorState,
  action: Action,
): PipelineMonitorState {
  switch (action.type) {
    case "CONNECTED":
      return { ...state, isConnected: true };

    case "DISCONNECTED":
      return { ...state, isConnected: false };

    case "RESET":
      return createInitialState();

    case "SSE_EVENT":
      return handleSSEEvent(state, action.event);
  }
}

function handleSSEEvent(
  state: PipelineMonitorState,
  event: SSEEvent,
): PipelineMonitorState {
  switch (event.type) {
    case "pipeline:state":
      return { ...state, status: event.data.state };

    case "agent:start": {
      const agentName = event.data.agent as AgentName;
      const agent = state.agents[agentName];
      if (!agent) return state;
      return {
        ...state,
        agents: {
          ...state.agents,
          [agentName]: {
            ...agent,
            status: "active",
            progress: 0,
            message: "Starting...",
            startedAt: event.data.startedAt,
          },
        },
      };
    }

    case "agent:progress": {
      const agentName = event.data.agent as AgentName;
      const agent = state.agents[agentName];
      if (!agent) return state;
      return {
        ...state,
        agents: {
          ...state.agents,
          [agentName]: {
            ...agent,
            progress: event.data.progress,
            message: event.data.message,
          },
        },
      };
    }

    case "agent:complete": {
      const agentName = event.data.agent as AgentName;
      const agent = state.agents[agentName];
      if (!agent) return state;
      return {
        ...state,
        agents: {
          ...state.agents,
          [agentName]: {
            ...agent,
            status: "complete",
            progress: 100,
            message: event.data.summary,
            durationMs: event.data.durationMs,
            costUsd: event.data.costUsd,
            summary: event.data.summary,
          },
        },
      };
    }

    case "pipeline:cost":
      return {
        ...state,
        totalCost: event.data.totalUsd,
        costBreakdown: event.data.breakdown,
      };

    case "pipeline:error": {
      const errorAgent = event.data.agent as AgentName | undefined;
      const newAgents = { ...state.agents };
      if (errorAgent && newAgents[errorAgent]) {
        newAgents[errorAgent] = {
          ...newAgents[errorAgent],
          status: "error",
          message: event.data.error,
        };
      }
      return {
        ...state,
        agents: newAgents,
        error: event.data.error,
        errorAgent: event.data.agent,
        status: event.data.recoverable ? state.status : "failed",
      };
    }

    case "pipeline:complete":
      return {
        ...state,
        status: "completed",
        totalCost: event.data.totalCostUsd,
        qualityScore: event.data.qualityScore,
        qualityDecision: event.data.qualityDecision,
        durationMs: event.data.durationMs,
      };

    default:
      return state;
  }
}

// ============================================================
// Hook
// ============================================================

export function useEventSource(jobId: string | null) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000;

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const connect = useCallback(
    (id: string) => {
      cleanup();

      const es = new EventSource(`/api/jobs/${id}/sse`);
      eventSourceRef.current = es;

      es.onopen = () => {
        reconnectAttemptRef.current = 0;
        dispatch({ type: "CONNECTED" });
      };

      es.onerror = () => {
        dispatch({ type: "DISCONNECTED" });

        // Don't reconnect if we hit max attempts or if the state is terminal
        if (reconnectAttemptRef.current >= maxReconnectAttempts) return;

        const delay =
          baseReconnectDelay * Math.pow(2, reconnectAttemptRef.current);
        reconnectAttemptRef.current++;

        reconnectTimeoutRef.current = setTimeout(() => {
          connect(id);
        }, delay);
      };

      // Listen for all typed events
      const eventTypes = [
        "pipeline:state",
        "agent:start",
        "agent:progress",
        "agent:complete",
        "pipeline:cost",
        "pipeline:error",
        "pipeline:complete",
      ];

      for (const eventType of eventTypes) {
        es.addEventListener(eventType, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            dispatch({
              type: "SSE_EVENT",
              event: { type: eventType, data } as SSEEvent,
            });
          } catch {
            // Ignore malformed events
          }
        });
      }
    },
    [cleanup],
  );

  useEffect(() => {
    if (!jobId) {
      cleanup();
      dispatch({ type: "RESET" });
      return;
    }

    connect(jobId);
    return cleanup;
  }, [jobId, connect, cleanup]);

  return state;
}

export { AGENT_REGISTRY };
