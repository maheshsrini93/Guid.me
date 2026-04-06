"use client";

import {
  FileText,
  Eye,
  Pen,
  Shield,
  CheckCircle,
  AlertTriangle,
  Image,
  Code,
  Check,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { AgentName } from "@/lib/agents/types";
import type { AgentState } from "@/hooks/use-event-source";

// ============================================================
// Agent Visual Config
// ============================================================

interface AgentVisualConfig {
  icon: LucideIcon;
  color: string;
  borderColor: string;
  iconColor: string;
  bgColor: string;
}

const AGENT_VISUALS: Record<AgentName, AgentVisualConfig> = {
  "document-extractor": {
    icon: FileText,
    color: "slate",
    borderColor: "border-l-slate-500",
    iconColor: "text-slate-500",
    bgColor: "bg-slate-50 dark:bg-slate-900/50",
  },
  "vision-analyzer": {
    icon: Eye,
    color: "blue",
    borderColor: "border-l-blue-500",
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-900/50",
  },
  "instruction-composer": {
    icon: Pen,
    color: "violet",
    borderColor: "border-l-violet-500",
    iconColor: "text-violet-500",
    bgColor: "bg-violet-50 dark:bg-violet-900/50",
  },
  "guideline-enforcer": {
    icon: Shield,
    color: "indigo",
    borderColor: "border-l-indigo-500",
    iconColor: "text-indigo-500",
    bgColor: "bg-indigo-50 dark:bg-indigo-900/50",
  },
  "quality-reviewer": {
    icon: CheckCircle,
    color: "emerald",
    borderColor: "border-l-emerald-500",
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/50",
  },
  "safety-reviewer": {
    icon: AlertTriangle,
    color: "amber",
    borderColor: "border-l-amber-500",
    iconColor: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-900/50",
  },
  "illustration-generator": {
    icon: Image,
    color: "fuchsia",
    borderColor: "border-l-fuchsia-500",
    iconColor: "text-fuchsia-500",
    bgColor: "bg-fuchsia-50 dark:bg-fuchsia-900/50",
  },
  "xml-assembler": {
    icon: Code,
    color: "cyan",
    borderColor: "border-l-cyan-500",
    iconColor: "text-cyan-500",
    bgColor: "bg-cyan-50 dark:bg-cyan-900/50",
  },
};

const AGENT_ORDER: Record<AgentName, number> = {
  "document-extractor": 1,
  "vision-analyzer": 2,
  "instruction-composer": 3,
  "guideline-enforcer": 4,
  "quality-reviewer": 5,
  "safety-reviewer": 6,
  "illustration-generator": 7,
  "xml-assembler": 8,
};

// ============================================================
// Component
// ============================================================

interface AgentCardProps {
  agent: AgentState;
  onClick?: () => void;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const visuals = AGENT_VISUALS[agent.name];
  const order = AGENT_ORDER[agent.name];
  const Icon = visuals.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border bg-card p-4 transition-all duration-200",
        "hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
        agent.status === "idle" &&
          "border-solid border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50",
        agent.status === "active" &&
          `border-l-4 ${visuals.borderColor} border-slate-200 dark:border-slate-800 shadow-sm`,
        agent.status === "complete" &&
          "border-emerald-200 dark:border-emerald-800 border-l-4 border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20",
        agent.status === "error" &&
          "border-l-4 border-l-rose-500 border-slate-200 dark:border-slate-800",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        {/* Status indicator */}
        <div
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-md",
            agent.status === "idle" && "bg-slate-100 dark:bg-slate-800",
            agent.status === "active" && visuals.bgColor,
            agent.status === "complete" &&
              "bg-emerald-50 dark:bg-emerald-900/50",
            agent.status === "error" && "bg-rose-50 dark:bg-rose-900/50",
          )}
        >
          {agent.status === "complete" ? (
            <Check className="w-4 h-4 text-emerald-500" />
          ) : agent.status === "error" ? (
            <XCircle className="w-4 h-4 text-rose-500" />
          ) : (
            <Icon
              className={cn(
                "w-4 h-4",
                agent.status === "idle"
                  ? "text-slate-400 dark:text-slate-600"
                  : visuals.iconColor,
              )}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">
              {order}
            </span>
            <span className="text-sm font-medium truncate">
              {agent.displayName}
            </span>
          </div>
        </div>

        {/* Active pulse dot */}
        {agent.status === "active" && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
          </span>
        )}
      </div>

      {/* Progress bar (active only) */}
      {agent.status === "active" && (
        <div className="mb-2">
          <Progress value={agent.progress} className="h-1" />
        </div>
      )}

      {/* Status message */}
      {agent.message && agent.status !== "idle" && (
        <p
          className={cn(
            "text-xs",
            agent.status === "error"
              ? "text-rose-700 dark:text-rose-300 line-clamp-2"
              : "text-muted-foreground truncate",
          )}
        >
          {agent.message}
        </p>
      )}

      {/* Badges (complete only) */}
      {agent.status === "complete" && (
        <div className="flex items-center gap-3 mt-2">
          {agent.durationMs != null && (
            <span className="text-xs text-muted-foreground font-mono">
              {formatDuration(agent.durationMs)}
            </span>
          )}
          {agent.costUsd != null && (
            <span className="text-xs text-muted-foreground font-mono">
              {formatCost(agent.costUsd)}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

export { AGENT_VISUALS, AGENT_ORDER, formatDuration, formatCost };
