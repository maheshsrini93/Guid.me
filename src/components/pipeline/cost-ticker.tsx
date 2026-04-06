"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function CostTicker({ value }: { value: number }) {
  const [flash, setFlash] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (value > displayValue) {
      setFlash(true);
      setDisplayValue(value);
      const timer = setTimeout(() => setFlash(false), 500);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  return (
    <span
      className={cn(
        "font-mono text-xl font-semibold transition-colors duration-300",
        flash ? "text-emerald-500" : "text-foreground"
      )}
    >
      ${value.toFixed(4)}
    </span>
  );
}
