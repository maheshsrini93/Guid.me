"use client";

import Image from "next/image";
import { Users, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { XmlStep, XmlPart } from "@/types/xml";
import { SafetyCallout } from "./safety-callout";

interface StepCardProps {
  step: XmlStep;
  jobId: string;
  partsMap: Map<string, XmlPart>;
  hasIllustration: boolean;
  showInlineIllustration: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

export function StepCard({
  step,
  jobId,
  partsMap,
  hasIllustration,
  showInlineIllustration,
  onHoverStart,
  onHoverEnd,
}: StepCardProps) {
  return (
    <div
      id={`step-${step.number}`}
      data-step-number={step.number}
      className="group rounded-lg border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow p-4"
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      <div className="flex items-start gap-3">
        {/* Step number badge */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-semibold">
          {step.number}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          <h4 className="font-medium text-foreground leading-snug">{step.title}</h4>

          {/* Instruction */}
          <p className="text-sm text-muted-foreground leading-relaxed">{step.instruction}</p>

          {/* Parts badges */}
          {step.parts.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {step.parts.map((p) => {
                const part = partsMap.get(p.id);
                return (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded"
                  >
                    {part?.name ?? p.id}
                    {p.quantity > 1 && <span className="font-mono">&times;{p.quantity}</span>}
                  </span>
                );
              })}
            </div>
          )}

          {/* Tools */}
          {step.tools.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wrench className="w-3 h-3" />
              {step.tools.map((t) => t.name).join(", ")}
            </div>
          )}

          {/* Two-person indicator */}
          {step.twoPersonRequired && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <Users className="w-3.5 h-3.5" />
              Two-person step
            </div>
          )}

          {/* Safety callouts */}
          {step.safety.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {step.safety.map((s, i) => (
                <SafetyCallout key={i} severity={s.severity} text={s.text} compact />
              ))}
            </div>
          )}

          {/* Inline illustration (mobile/tablet — hidden on lg where right panel shows) */}
          {showInlineIllustration && hasIllustration && (
            <div className="mt-3 rounded-md overflow-hidden border bg-slate-50 dark:bg-slate-800 lg:hidden">
              <div className="relative aspect-[4/3]">
                <Image
                  src={`/api/jobs/${jobId}/illustrations/${step.number}`}
                  alt={`Step ${step.number} illustration`}
                  fill
                  className="object-contain p-2"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confidence indicator */}
      {step.confidence < 0.8 && (
        <div className={cn(
          "mt-3 text-xs text-muted-foreground flex items-center gap-1",
          step.confidence < 0.6 && "text-amber-500"
        )}>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
          Confidence: {Math.round(step.confidence * 100)}%
        </div>
      )}
    </div>
  );
}
