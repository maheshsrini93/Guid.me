import type { AgentState, AgentName } from "@/hooks/use-event-source";
import { cn } from "@/lib/utils";

export function PipelineProgress({ agents, order }: { agents: Record<AgentName, AgentState>; order: AgentName[] }) {
  const total = order.length;

  // Calculate progress line width as percentage
  let completedCount = 0;
  let activeIndex = -1;
  for (let i = 0; i < total; i++) {
    const status = agents[order[i]].status;
    if (status === "complete" || status === "error") {
      completedCount = i + 1;
    } else if (status === "active" && activeIndex === -1) {
      activeIndex = i;
    }
  }

  // Progress as fraction of gaps between dots
  let progressPercent = (completedCount / (total - 1)) * 100;
  // If there's an active agent beyond completed ones, extend halfway to it
  if (activeIndex > completedCount) {
    progressPercent = ((completedCount + 0.5) / (total - 1)) * 100;
  }
  progressPercent = Math.min(progressPercent, 100);

  return (
    <div className="relative flex w-full items-center justify-between px-2">
      {/* Background line — spans from first dot to last dot */}
      <div className="absolute left-2 right-2 top-1/2 h-0.5 -translate-y-1/2 bg-muted" />
      {/* Active progress line — same origin, width as fraction of dot span */}
      <div
        className="absolute left-2 top-1/2 h-0.5 -translate-y-1/2 bg-primary transition-all duration-500"
        style={{ width: `calc(${progressPercent} / 100 * (100% - 1rem))` }}
      />

      {order.map((agentName) => {
        const agent = agents[agentName];
        const isComplete = agent.status === "complete";
        const isActive = agent.status === "active";
        const isError = agent.status === "error";

        return (
          <div key={agentName} className="relative z-10 flex flex-col items-center">
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
