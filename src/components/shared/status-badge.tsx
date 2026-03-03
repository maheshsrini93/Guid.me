import { Badge } from "@/components/ui/badge";
import type { PipelineStatus } from "@/types/pipeline";

const statusConfig: Record<
  PipelineStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pending", variant: "secondary" },
  extracting: { label: "Extracting", variant: "default" },
  analyzing: { label: "Analyzing", variant: "default" },
  composing: { label: "Composing", variant: "default" },
  enforcing: { label: "Enforcing", variant: "default" },
  reviewing: { label: "Reviewing", variant: "default" },
  revising: { label: "Revising", variant: "outline" },
  illustrating: { label: "Illustrating", variant: "default" },
  assembling: { label: "Assembling", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export function StatusBadge({ status }: { status: PipelineStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
