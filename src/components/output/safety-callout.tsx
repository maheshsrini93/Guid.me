import { AlertTriangle, ShieldAlert, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SafetyCalloutProps {
  severity: string;
  text: string;
  compact?: boolean;
}

const config: Record<string, { bg: string; border: string; text: string; icon: typeof AlertTriangle }> = {
  danger: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800",
    text: "text-rose-700 dark:text-rose-300",
    icon: AlertOctagon,
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-300",
    icon: AlertTriangle,
  },
  caution: {
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
    border: "border-yellow-200 dark:border-yellow-800",
    text: "text-yellow-700 dark:text-yellow-300",
    icon: ShieldAlert,
  },
};

export function SafetyCallout({ severity, text, compact }: SafetyCalloutProps) {
  const c = config[severity] ?? config.caution;
  const Icon = c.icon;

  return (
    <div className={cn("rounded-md border", c.bg, c.border, compact ? "px-2.5 py-1.5" : "px-3 py-2")}>
      <div className="flex items-start gap-2">
        <Icon className={cn("flex-shrink-0 mt-0.5", c.text, compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
        <div className="flex-1 min-w-0">
          {!compact && (
            <span className={cn("text-xs font-semibold uppercase tracking-wide", c.text)}>
              {severity}
            </span>
          )}
          <p className={cn(c.text, compact ? "text-xs" : "text-sm mt-0.5")}>{text}</p>
        </div>
      </div>
    </div>
  );
}
