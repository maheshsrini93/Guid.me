"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { AgentState } from "@/hooks/use-event-source";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <button
        type="button"
        className="flex w-full items-center gap-2 text-sm font-medium hover:text-foreground/80"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {title}
      </button>
      {open && children}
    </div>
  );
}

export function DetailDrawer({ agent, open, onOpenChange }: { agent: AgentState | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!agent) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg" showCloseButton={false}>
        <SheetHeader>
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="text-lg">{agent.displayName}</SheetTitle>
            <div className="flex items-center gap-2">
              <Badge variant={agent.status === "complete" ? "default" : agent.status === "error" ? "destructive" : "secondary"}>
                {agent.status}
              </Badge>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                <span className="sr-only">Close</span>
              </button>
            </div>
          </div>
          <SheetDescription>Agent execution details and metrics.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-4">
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

          {agent.promptSent ? (
            <CollapsibleSection title="Input Prompt">
              <div className="max-h-64 overflow-y-auto rounded-none bg-muted p-3 font-mono text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {agent.promptSent}
              </div>
            </CollapsibleSection>
          ) : null}

          {agent.responseReceived ? (
            <CollapsibleSection title="Output Response">
              <div className="max-h-64 overflow-y-auto rounded-none bg-muted p-3 font-mono text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {agent.responseReceived}
              </div>
            </CollapsibleSection>
          ) : null}

          {!agent.promptSent && !agent.responseReceived && (
            <div className="space-y-2 opacity-50">
              <h4 className="text-sm font-medium">Prompt & Response</h4>
              <div className="rounded-none border border-dashed p-4 text-center text-sm text-muted-foreground">
                {agent.status === "idle" || agent.status === "active"
                  ? "Available after agent completes."
                  : "Detailed logs are available in the full output view."}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
