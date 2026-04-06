"use client";

import { cn } from "@/lib/utils";
import { AGENT_REGISTRY, type AgentState } from "@/hooks/use-event-source";
import type { AgentName } from "@/lib/agents/types";
import { AGENT_VISUALS } from "./agent-card";

interface PipelineProgressProps {
  agents: Record<AgentName, AgentState>;
}

function getStepStatus(agent: AgentState): "idle" | "active" | "complete" | "error" {
  return agent.status;
}

export function PipelineProgress({ agents }: PipelineProgressProps) {
  return (
    <div className="flex items-center gap-1 w-full">
      {AGENT_REGISTRY.map(({ name }, index) => {
        const agent = agents[name];
        const status = getStepStatus(agent);
        const visuals = AGENT_VISUALS[name];
        const isLast = index === AGENT_REGISTRY.length - 1;

        return (
          <div key={name} className="flex items-center flex-1 last:flex-none">
            {/* Dot */}
            <div className="relative flex items-center justify-center">
              <div
                className={cn(
                  "w-3 h-3 rounded-full border-2 transition-all duration-200",
                  status === "idle" &&
                    "border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700",
                  status === "active" &&
                    "border-indigo-500 bg-indigo-500",
                  status === "complete" &&
                    "border-emerald-500 bg-emerald-500",
                  status === "error" &&
                    "border-rose-500 bg-rose-500",
                )}
              />
              {status === "active" && (
                <span className="absolute inset-0 rounded-full animate-ping bg-indigo-400 opacity-50" />
              )}
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className="flex-1 h-1 mx-1">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    status === "complete"
                      ? "bg-emerald-500"
                      : "bg-slate-200 dark:bg-slate-700",
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
