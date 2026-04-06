"use client";

import { FileText, Eye, Pen, Shield, CheckCircle, AlertTriangle, Image as ImageIcon, Code, Loader2 } from "lucide-react";
import type { AgentState, AgentName } from "@/hooks/use-event-source";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const AGENT_CONFIG: Record<AgentName, { icon: React.ElementType; color: string; bg: string }> = {
  "document-extractor": { icon: FileText, color: "text-slate-500", bg: "bg-slate-500/10" },
  "vision-analyzer": { icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
  "instruction-composer": { icon: Pen, color: "text-violet-500", bg: "bg-violet-500/10" },
  "guideline-enforcer": { icon: Shield, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  "quality-reviewer": { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  "safety-reviewer": { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  "illustration-generator": { icon: ImageIcon, color: "text-fuchsia-500", bg: "bg-fuchsia-500/10" },
  "xml-assembler": { icon: Code, color: "text-cyan-500", bg: "bg-cyan-500/10" },
};

export function AgentCard({ agent, onClick }: { agent: AgentState; onClick: () => void }) {
  const config = AGENT_CONFIG[agent.name];
  const Icon = config.icon;

  const isIdle = agent.status === "idle";
  const isActive = agent.status === "active";
  const isComplete = agent.status === "complete";
  const isError = agent.status === "error";

  return (
    <Card
      className={cn(
        "relative cursor-pointer overflow-hidden transition-all hover:border-primary/50 hover:shadow-md",
        isActive && "border-primary/50 shadow-sm ring-1 ring-primary/20",
        isError && "border-destructive/50"
      )}
      onClick={onClick}
    >
      {isActive && (
        <div className="absolute inset-x-0 top-0 h-1 animate-pulse bg-gradient-to-r from-transparent via-primary to-transparent" />
      )}

      <CardContent className="p-5">
        <div className="mb-4 flex items-start justify-between">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-none", config.bg, config.color, isIdle && "bg-muted text-muted-foreground")}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex items-center gap-2">
            {isActive && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                isIdle && "bg-muted-foreground/30",
                isActive && "animate-pulse bg-primary",
                isComplete && "bg-emerald-500",
                isError && "bg-destructive"
              )}
            />
          </div>
        </div>

        <h3 className={cn("font-semibold tracking-tight", isIdle && "text-muted-foreground")}>{agent.displayName}</h3>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="line-clamp-1 flex-1 pr-2 text-muted-foreground" title={agent.message}>
              {agent.message}
            </span>
            {isActive && <span className="font-mono font-medium text-primary">{agent.progress}%</span>}
          </div>

          <Progress value={agent.progress} className={cn("h-1.5", isIdle && "opacity-30")} />

          <div className="flex items-center justify-between pt-1 text-xs font-medium">
            <span className={cn("text-muted-foreground", isComplete && "text-foreground")}>
              {agent.durationMs ? `${(agent.durationMs / 1000).toFixed(1)}s` : "--"}
            </span>
            <span className={cn("font-mono text-muted-foreground", isComplete && "text-emerald-600 dark:text-emerald-400")}>
              {agent.costUsd !== undefined ? `$${agent.costUsd.toFixed(4)}` : "--"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
