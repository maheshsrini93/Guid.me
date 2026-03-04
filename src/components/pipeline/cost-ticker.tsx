"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CostTickerProps {
  totalCost: number;
}

export function CostTicker({ totalCost }: CostTickerProps) {
  const [flash, setFlash] = useState(false);
  const prevCostRef = useRef(totalCost);

  useEffect(() => {
    if (totalCost !== prevCostRef.current) {
      prevCostRef.current = totalCost;
      setFlash(true);
      const timeout = setTimeout(() => setFlash(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [totalCost]);

  return (
    <span
      className={cn(
        "font-mono text-sm tabular-nums transition-colors duration-300",
        flash
          ? "text-indigo-500"
          : "text-slate-900 dark:text-slate-50",
      )}
    >
      ${totalCost.toFixed(2)}
    </span>
  );
}
