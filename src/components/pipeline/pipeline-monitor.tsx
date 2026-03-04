"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEventSource, AGENT_REGISTRY } from "@/hooks/use-event-source";
import type { AgentName } from "@/lib/agents/types";
import { AgentCard } from "./agent-card";
import { PipelineProgress } from "./pipeline-progress";
import { CostTicker } from "./cost-ticker";
import { DetailDrawer } from "./detail-drawer";
import { StatusBadge } from "@/components/shared/status-badge";

interface PipelineMonitorProps {
  jobId: string;
}

function formatElapsed(startMs: number): string {
  const elapsed = Math.floor((Date.now() - startMs) / 1000);
  const min = Math.floor(elapsed / 60);
  const sec = elapsed % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function PipelineMonitor({ jobId }: PipelineMonitorProps) {
  const state = useEventSource(jobId);
  const [selectedAgent, setSelectedAgent] = useState<AgentName | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [elapsed, setElapsed] = useState("0:00");
  const [startTime] = useState(() => Date.now());
  const [cancelling, setCancelling] = useState(false);

  // Elapsed timer
  useEffect(() => {
    if (
      state.status === "completed" ||
      state.status === "failed" ||
      state.status === "cancelled"
    ) {
      return;
    }

    const interval = setInterval(() => {
      setElapsed(formatElapsed(startTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [state.status, startTime]);

  const handleCardClick = (agentName: AgentName) => {
    setSelectedAgent(agentName);
    setDrawerOpen(true);
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await fetch(`/api/jobs/${jobId}/cancel`, { method: "POST" });
    } catch {
      // ignore
    } finally {
      setCancelling(false);
    }
  };

  const isTerminal =
    state.status === "completed" ||
    state.status === "failed" ||
    state.status === "cancelled";

  const isRunning = !isTerminal && state.status !== "pending";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            {/* Elapsed timer */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="font-mono tabular-nums">{elapsed}</span>
            </div>

            {/* Cost ticker */}
            <CostTicker totalCost={state.totalCost} />

            {/* Status badge */}
            <StatusBadge status={state.status} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        {/* Pipeline title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">
              Pipeline Monitor
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Job {jobId.substring(0, 8)}...
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isRunning && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={cancelling}
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                {cancelling ? "Cancelling..." : "Cancel"}
              </Button>
            )}

            {state.status === "completed" && (
              <Button size="sm" asChild>
                <Link href={`/output/${jobId}`}>
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  View Output
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Progress stepper */}
        <div className="mb-8">
          <PipelineProgress agents={state.agents} />
        </div>

        {/* Completion banner */}
        {state.status === "completed" && state.qualityScore != null && (
          <div className="mb-6 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-500 text-white">
                {state.qualityScore}/100
              </Badge>
              <span className="text-sm font-medium">
                Pipeline completed
                {state.qualityDecision && ` — ${state.qualityDecision}`}
              </span>
            </div>
            {state.durationMs != null && (
              <span className="text-sm text-muted-foreground font-mono">
                {(state.durationMs / 1000).toFixed(1)}s total
              </span>
            )}
          </div>
        )}

        {/* Cancelled banner */}
        {state.status === "cancelled" && (
          <div className="mb-6 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Pipeline cancelled by user
            </span>
          </div>
        )}

        {/* Error banner */}
        {state.status === "failed" && state.error && (
          <div className="mb-6 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-4">
            <p className="text-sm text-rose-700 dark:text-rose-300">
              {state.error}
            </p>
          </div>
        )}

        {/* Agent cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {AGENT_REGISTRY.map(({ name }) => (
            <AgentCard
              key={name}
              agent={state.agents[name]}
              onClick={() => handleCardClick(name)}
            />
          ))}
        </div>

        {/* Connection indicator */}
        {!state.isConnected && isRunning && (
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Reconnecting to pipeline...
            </p>
          </div>
        )}
      </main>

      {/* Detail drawer */}
      <DetailDrawer
        agent={selectedAgent ? state.agents[selectedAgent] : null}
        jobId={jobId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
