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
}

export function PhaseSection({
  phase,
  phaseIndex,
  jobId,
  partsMap,
  illustrationSteps,
  showInlineIllustrations,
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
        {phase.steps.map((step, stepIndex) => (
          <StepCard
            key={`phase-${phaseIndex}-step-${step.number}-${stepIndex}`}
            step={step}
            jobId={jobId}
            partsMap={partsMap}
            hasIllustration={illustrationSteps.has(step.number)}
            showInlineIllustration={showInlineIllustrations}
          />
        ))}
      </div>
    </section>
  );
}
