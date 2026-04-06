"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, RefreshCw, XCircle } from "lucide-react";
import { useEventSource, type AgentName, type AgentState } from "@/hooks/use-event-source";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { AgentCard } from "./agent-card";
import { PipelineProgress } from "./pipeline-progress";
import { CostTicker } from "./cost-ticker";
import { DetailDrawer } from "./detail-drawer";

const AGENT_ORDER: AgentName[] = [
  "document-extractor",
  "vision-analyzer",
  "instruction-composer",
  "guideline-enforcer",
  "quality-reviewer",
  "safety-reviewer",
  "illustration-generator",
  "xml-assembler",
];

export function PipelineMonitor({ jobId }: { jobId: string }) {
  const router = useRouter();
  const state = useEventSource(`/api/jobs/${jobId}/sse`);
  const [selectedAgent, setSelectedAgent] = useState<AgentState | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (state.status === "running") {
      const interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [state.status]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleCancel = async () => {
    await fetch(`/api/jobs/${jobId}/cancel`, { method: "POST", cache: "no-store" });
  };

  const handleRetry = async () => {
    await fetch(`/api/jobs/${jobId}/retry`, { method: "POST", cache: "no-store" });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Pipeline Monitor</h1>
            <StatusBadge status={state.status} />
            {!state.isConnected && state.status !== "completed" && state.status !== "failed" && (
              <span className="flex items-center text-sm text-amber-500">
                <span className="mr-1.5 flex h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                Reconnecting...
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-sm text-muted-foreground">Job ID: {jobId}</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Elapsed</span>
            <span className="font-mono text-xl font-semibold">{formatTime(elapsed)}</span>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="flex flex-col items-end">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Cost</span>
            <CostTicker value={state.totalCost} />
          </div>

          <div className="ml-4 flex items-center gap-2">
            {state.status === "running" && (
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <XCircle className="mr-2 h-4 w-4" /> Cancel
              </Button>
            )}
            {state.status === "failed" && (
              <Button variant="outline" size="sm" onClick={handleRetry}>
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </Button>
            )}
            {state.status === "completed" && (
              <Button size="sm" onClick={() => router.push(`/output/${jobId}`)}>
                View Output <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {state.status === "completed" && (
        <div className="flex items-center justify-between rounded-none border border-primary/20 bg-primary/5 p-4 text-primary">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
              <ArrowRight className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium">Pipeline completed successfully</p>
              <p className="text-sm opacity-80">
                Quality Score: {state.qualityScore} • Decision: <span className="uppercase">{state.qualityDecision}</span>
              </p>
            </div>
          </div>
          <Button onClick={() => router.push(`/output/${jobId}`)}>View Output</Button>
        </div>
      )}

      {state.status === "failed" && (
        <div className="flex items-start gap-3 rounded-none border border-destructive/20 bg-destructive/5 p-4 text-destructive">
          <AlertCircle className="mt-0.5 h-5 w-5" />
          <div>
            <p className="font-medium">Pipeline failed</p>
            <p className="text-sm opacity-80">{state.error || "An unknown error occurred during processing."}</p>
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <PipelineProgress agents={state.agents} order={AGENT_ORDER} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {AGENT_ORDER.map((agentName) => (
          <AgentCard key={agentName} agent={state.agents[agentName]} onClick={() => setSelectedAgent(state.agents[agentName])} />
        ))}
      </div>

      <DetailDrawer agent={selectedAgent} open={!!selectedAgent} onOpenChange={(open) => !open && setSelectedAgent(null)} />
    </div>
  );
}
