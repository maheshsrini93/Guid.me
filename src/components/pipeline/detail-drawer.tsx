"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgentName } from "@/lib/agents/types";
import type { AgentState } from "@/hooks/use-event-source";
import { AGENT_VISUALS, AGENT_ORDER, formatDuration, formatCost } from "./agent-card";

// ============================================================
// Types
// ============================================================

interface AgentExecution {
  id: string;
  agentName: string;
  model: string | null;
  wasEscalation: boolean;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  status: string;
  errorMessage: string | null;
  executionOrder: number;
  promptSent?: string | null;
  responseReceived?: string | null;
}

interface DetailDrawerProps {
  agent: AgentState | null;
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================
// Collapsible Section
// ============================================================

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-md">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        {title}
        <span className="text-xs text-muted-foreground">
          {isOpen ? "Collapse" : "Expand"}
        </span>
      </button>
      {isOpen && (
        <div className="px-3 py-2 border-t">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Component
// ============================================================

export function DetailDrawer({
  agent,
  jobId,
  open,
  onOpenChange,
}: DetailDrawerProps) {
  const [execution, setExecution] = useState<AgentExecution | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !agent || agent.status === "idle") {
      setExecution(null);
      return;
    }

    setLoading(true);
    fetch(`/api/jobs/${jobId}`)
      .then((res) => res.json())
      .then((data) => {
        const exec = data.executions?.find(
          (e: AgentExecution) => e.agentName === agent.name,
        );
        setExecution(exec || null);
      })
      .catch(() => setExecution(null))
      .finally(() => setLoading(false));
  }, [open, agent, jobId]);

  if (!agent) return null;

  const visuals = AGENT_VISUALS[agent.name];
  const Icon = visuals.icon;
  const order = AGENT_ORDER[agent.name];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-[90vw] sm:max-w-[480px] overflow-y-auto"
      >
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg",
                visuals.bgColor,
              )}
            >
              <Icon className={cn("w-5 h-5", visuals.iconColor)} />
            </div>
            <div>
              <SheetTitle>
                {order}. {agent.displayName}
              </SheetTitle>
              <SheetDescription>
                {execution?.model || "Code agent"}
                {execution?.wasEscalation && (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    Escalated
                  </Badge>
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge
              variant={
                agent.status === "complete"
                  ? "secondary"
                  : agent.status === "error"
                    ? "destructive"
                    : "default"
              }
            >
              {agent.status === "complete"
                ? "Completed"
                : agent.status === "error"
                  ? "Failed"
                  : agent.status === "active"
                    ? "Running"
                    : "Idle"}
            </Badge>
          </div>

          {/* Token Usage */}
          {execution && (execution.inputTokens > 0 || execution.outputTokens > 0) && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">Input</div>
                <div className="font-mono text-sm">
                  {execution.inputTokens.toLocaleString()}
                </div>
              </div>
              <div className="rounded-md border p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">Output</div>
                <div className="font-mono text-sm">
                  {execution.outputTokens.toLocaleString()}
                </div>
              </div>
              <div className="rounded-md border p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">Total</div>
                <div className="font-mono text-sm">
                  {(
                    execution.inputTokens + execution.outputTokens
                  ).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Timing & Cost */}
          <div className="grid grid-cols-2 gap-3">
            {execution?.durationMs != null && (
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground mb-1">Duration</div>
                <div className="font-mono text-sm">
                  {formatDuration(execution.durationMs)}
                </div>
              </div>
            )}
            {execution?.costUsd != null && (
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground mb-1">Cost</div>
                <div className="font-mono text-sm">
                  {formatCost(execution.costUsd)}
                </div>
              </div>
            )}
          </div>

          {/* Prompt Sent */}
          {execution?.promptSent && (
            <CollapsibleSection title="Prompt Sent">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words max-h-64 overflow-y-auto text-muted-foreground">
                {execution.promptSent}
              </pre>
            </CollapsibleSection>
          )}

          {/* Response Received */}
          {execution?.responseReceived && (
            <CollapsibleSection title="Response Received">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words max-h-64 overflow-y-auto text-muted-foreground">
                {execution.responseReceived}
              </pre>
            </CollapsibleSection>
          )}

          {/* Error Message */}
          {(agent.status === "error" || execution?.errorMessage) && (
            <div className="rounded-md border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-3">
              <div className="text-xs font-medium text-rose-600 dark:text-rose-400 mb-1">
                Error
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                {execution?.errorMessage || agent.message}
              </p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent" />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
