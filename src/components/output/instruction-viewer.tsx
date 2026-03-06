"use client";

import { useRef, useMemo } from "react";
import type { XmlWorkInstruction, XmlPart, XmlStep } from "@/types/xml";
import { InstructionToc } from "./instruction-toc";
import { InstructionContent } from "./instruction-content";
import { InstructionIllustration } from "./instruction-illustration";

interface InstructionViewerProps {
  data: XmlWorkInstruction;
  jobId: string;
  illustrationSteps: Set<number>;
}

export function InstructionViewer({ data, jobId, illustrationSteps }: InstructionViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const partsMap = useMemo(() => {
    const map = new Map<string, XmlPart>();
    if (data.partsList) {
      for (const p of data.partsList) map.set(p.id, p);
    }
    return map;
  }, [data.partsList]);

  const stepsMap = useMemo(() => {
    const map = new Map<number, XmlStep>();
    if (data.phases) {
      for (const phase of data.phases) {
        for (const step of phase.steps) map.set(step.number, step);
      }
    }
    return map;
  }, [data.phases]);

  const defaultStepNumber = useMemo(
    () => data.phases?.[0]?.steps?.[0]?.number ?? null,
    [data.phases],
  );
  const effectiveStepNumber = defaultStepNumber;
  const effectiveStep = effectiveStepNumber != null ? stepsMap.get(effectiveStepNumber) ?? null : null;
  const effectiveHasIllustration = effectiveStepNumber != null ? illustrationSteps.has(effectiveStepNumber) : false;

  return (
    <div className="relative">
      <div className="flex gap-6">
        <aside className="hidden lg:block w-56 flex-shrink-0 sticky top-4 self-start">
          <div className="border rounded-lg bg-white dark:bg-slate-900 shadow-sm">
            <InstructionToc data={data} activeStepNumber={effectiveStepNumber} />
          </div>
        </aside>

        <div ref={contentRef} className="flex-1 min-w-0">
          <InstructionContent
            data={data}
            jobId={jobId}
            partsMap={partsMap}
            illustrationSteps={illustrationSteps}
            showInlineIllustrations={true}
          />
        </div>

        <aside className="hidden lg:block w-72 flex-shrink-0 sticky top-4 self-start">
          <div className="border rounded-lg bg-white dark:bg-slate-900 shadow-sm p-4">
            <InstructionIllustration
              jobId={jobId}
              activeStep={effectiveStep}
              hasIllustration={effectiveHasIllustration}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
