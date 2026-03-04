"use client";

import type { XmlPhase, XmlPart } from "@/types/xml";
import { StepCard } from "./step-card";

interface PhaseSectionProps {
  phase: XmlPhase;
  phaseIndex: number;
  jobId: string;
  partsMap: Map<string, XmlPart>;
  illustrationSteps: Set<number>;
  showInlineIllustrations: boolean;
  onStepHover: (stepNumber: number | null) => void;
}

export function PhaseSection({
  phase,
  phaseIndex,
  jobId,
  partsMap,
  illustrationSteps,
  showInlineIllustrations,
  onStepHover,
}: PhaseSectionProps) {
  return (
    <section id={`phase-${phaseIndex}`} className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
          Phase {phaseIndex + 1}
        </span>
        {phase.name}
      </h3>

      <div className="space-y-3">
        {phase.steps.map((step) => (
          <StepCard
            key={step.number}
            step={step}
            jobId={jobId}
            partsMap={partsMap}
            hasIllustration={illustrationSteps.has(step.number)}
            showInlineIllustration={showInlineIllustrations}
            onHoverStart={() => onStepHover(step.number)}
            onHoverEnd={() => onStepHover(null)}
          />
        ))}
      </div>
    </section>
  );
}
