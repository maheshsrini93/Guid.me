"use client";

import type { AgentState } from "@/hooks/use-event-source";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export function DetailDrawer({ agent, open, onOpenChange }: { agent: AgentState | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!agent) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle>{agent.displayName}</SheetTitle>
            <Badge variant={agent.status === "complete" ? "default" : agent.status === "error" ? "destructive" : "secondary"}>
              {agent.status}
            </Badge>
          </div>
          <SheetDescription>Agent execution details and metrics.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-none border p-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Duration</p>
              <p className="mt-1 font-mono text-lg">{agent.durationMs ? `${(agent.durationMs / 1000).toFixed(2)}s` : "--"}</p>
            </div>
            <div className="rounded-none border p-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Cost</p>
              <p className="mt-1 font-mono text-lg text-emerald-600 dark:text-emerald-400">
                {agent.costUsd !== undefined ? `$${agent.costUsd.toFixed(4)}` : "--"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Status Message</h4>
            <div className="rounded-none bg-muted p-3 font-mono text-sm text-muted-foreground">{agent.message || "No message"}</div>
          </div>

          {agent.summary && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Execution Summary</h4>
              <div className="rounded-none border p-4 text-sm leading-relaxed">{agent.summary}</div>
            </div>
          )}

          <div className="space-y-2 opacity-50">
            <h4 className="text-sm font-medium">Prompt & Response</h4>
            <div className="rounded-none border border-dashed p-4 text-center text-sm text-muted-foreground">
              Detailed logs are available in the full output view.
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
