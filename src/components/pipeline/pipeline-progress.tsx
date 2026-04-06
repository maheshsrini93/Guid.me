import type { AgentState, AgentName } from "@/hooks/use-event-source";
import { cn } from "@/lib/utils";

export function PipelineProgress({ agents, order }: { agents: Record<AgentName, AgentState>; order: AgentName[] }) {
  return (
    <div className="relative flex w-full items-center justify-between px-2">
      <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-muted" />

      {order.map((agentName, index) => {
        const agent = agents[agentName];
        const isComplete = agent.status === "complete";
        const isActive = agent.status === "active";
        const isError = agent.status === "error";
        const isPast = isComplete || isError;

        const nextAgent = order[index + 1] ? agents[order[index + 1]] : null;
        const showActiveLine = isActive || (isComplete && nextAgent?.status === "active");

        return (
          <div key={agentName} className="relative z-10 flex flex-col items-center">
            {index < order.length - 1 && (isPast || showActiveLine) && (
              <div
                className={cn(
                  "absolute left-1/2 top-1/2 h-0.5 -translate-y-1/2 bg-primary transition-all duration-500",
                  isComplete && nextAgent?.status !== "idle" ? "w-[calc(100vw/8)] sm:w-[calc(100vw/8)] md:w-24 lg:w-32" : "w-0",
                  showActiveLine && !isComplete && "w-[calc(100vw/16)] sm:w-[calc(100vw/16)] md:w-12 lg:w-16 bg-primary/50"
                )}
              />
            )}

            <div
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border-2 bg-background transition-colors",
                agent.status === "idle" && "border-muted-foreground/30",
                isActive && "border-primary ring-4 ring-primary/20",
                isComplete && "border-primary bg-primary",
                isError && "border-destructive bg-destructive"
              )}
            />

            <div className="absolute top-6 hidden w-24 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:block">
              {agent.displayName.split(" ")[0]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
