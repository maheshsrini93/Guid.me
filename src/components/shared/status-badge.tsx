import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const getStatusConfig = () => {
    switch (status.toLowerCase()) {
      case "pending":
      case "idle":
        return { label: "Pending", className: "bg-muted text-muted-foreground hover:bg-muted" };
      case "running":
      case "active":
      case "extracting":
      case "analyzing":
      case "composing":
      case "enforcing":
      case "reviewing":
      case "revising":
      case "illustrating":
      case "assembling":
        return { label: "Running", className: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20" };
      case "completed":
      case "complete":
        return { label: "Completed", className: "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20" };
      case "failed":
      case "error":
        return { label: "Failed", className: "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20" };
      case "cancelled":
        return { label: "Cancelled", className: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20" };
      default:
        return { label: status, className: "bg-muted text-muted-foreground" };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge variant="outline" className={cn("capitalize", config.className, className)}>
      {config.label}
    </Badge>
  );
}
