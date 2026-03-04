"use client";

import type { XmlWorkInstruction, XmlPart } from "@/types/xml";
import { ProcedureHeader } from "./procedure-header";
import { PhaseSection } from "./phase-section";

interface InstructionContentProps {
  data: XmlWorkInstruction;
  jobId: string;
  partsMap: Map<string, XmlPart>;
  illustrationSteps: Set<number>;
  showInlineIllustrations: boolean;
  onStepHover: (stepNumber: number | null) => void;
}

export function InstructionContent({
  data,
  jobId,
  partsMap,
  illustrationSteps,
  showInlineIllustrations,
  onStepHover,
}: InstructionContentProps) {
  return (
    <div className="space-y-8">
      <ProcedureHeader data={data} />

      <hr className="border-slate-200 dark:border-slate-800" />

      {data.phases.map((phase, pi) => (
        <PhaseSection
          key={pi}
          phase={phase}
          phaseIndex={pi}
          jobId={jobId}
          partsMap={partsMap}
          illustrationSteps={illustrationSteps}
          showInlineIllustrations={showInlineIllustrations}
          onStepHover={onStepHover}
        />
      ))}
    </div>
  );
}
