"use client";

import { useMemo } from "react";
import type { XmlWorkInstruction, XmlPart } from "@/types/xml";
import { InstructionToc } from "./instruction-toc";
import { InstructionContent } from "./instruction-content";

interface InstructionViewerProps {
  data: XmlWorkInstruction;
  jobId: string;
  illustrationSteps: Set<number>;
}

export function InstructionViewer({ data, jobId, illustrationSteps }: InstructionViewerProps) {
  const partsMap = useMemo(() => {
    const map = new Map<string, XmlPart>();
    if (data.partsList) {
      for (const p of data.partsList) map.set(p.id, p);
    }
    return map;
  }, [data.partsList]);

  return (
    <div className="relative">
      <div className="flex gap-6">
        <aside className="hidden lg:block w-56 flex-shrink-0 sticky top-4 self-start">
          <div className="border rounded-lg bg-white dark:bg-slate-900 shadow-sm">
            <InstructionToc data={data} activeStepNumber={null} />
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <InstructionContent
            data={data}
            jobId={jobId}
            partsMap={partsMap}
            illustrationSteps={illustrationSteps}
            showInlineIllustrations={true}
          />
        </div>
      </div>
    </div>
  );
}
