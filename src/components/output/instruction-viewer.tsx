"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { List } from "lucide-react";
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
  const [activeStepNumber, setActiveStepNumber] = useState<number | null>(null);
  const [hoveredStepNumber, setHoveredStepNumber] = useState<number | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Build parts lookup map
  const partsMap = useMemo(() => {
    const map = new Map<string, XmlPart>();
    for (const p of data.partsList) map.set(p.id, p);
    return map;
  }, [data.partsList]);

  // Build flat step lookup
  const stepsMap = useMemo(() => {
    const map = new Map<number, XmlStep>();
    for (const phase of data.phases) {
      for (const step of phase.steps) map.set(step.number, step);
    }
    return map;
  }, [data.phases]);

  // IntersectionObserver for scroll tracking
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const stepNum = Number(entry.target.getAttribute("data-step-number"));
            if (!isNaN(stepNum)) setActiveStepNumber(stepNum);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );

    const stepElements = container.querySelectorAll("[data-step-number]");
    stepElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [data]);

  const handleStepHover = useCallback((stepNumber: number | null) => {
    setHoveredStepNumber(stepNumber);
  }, []);

  // The effective step displayed in the illustration panel
  const effectiveStepNumber = hoveredStepNumber ?? activeStepNumber;
  const effectiveStep = effectiveStepNumber ? stepsMap.get(effectiveStepNumber) ?? null : null;
  const effectiveHasIllustration = effectiveStepNumber ? illustrationSteps.has(effectiveStepNumber) : false;

  return (
    <div className="relative">
      {/* Mobile TOC button */}
      <button
        onClick={() => setTocOpen(!tocOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
        aria-label="Table of contents"
      >
        <List className="w-5 h-5" />
      </button>

      {/* Mobile TOC overlay */}
      {tocOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setTocOpen(false)} />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-72 bg-white dark:bg-slate-900 shadow-xl border-r overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <span className="text-sm font-medium">Contents</span>
              <button
                onClick={() => setTocOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <InstructionToc data={data} activeStepNumber={activeStepNumber} />
          </div>
        </>
      )}

      {/* 3-pane layout */}
      <div className="flex gap-6">
        {/* Left TOC (desktop) */}
        <aside className="hidden lg:block w-56 flex-shrink-0 sticky top-4 self-start">
          <div className="border rounded-lg bg-white dark:bg-slate-900 shadow-sm">
            <InstructionToc data={data} activeStepNumber={activeStepNumber} />
          </div>
        </aside>

        {/* Center content */}
        <div ref={contentRef} className="flex-1 min-w-0">
          <InstructionContent
            data={data}
            jobId={jobId}
            partsMap={partsMap}
            illustrationSteps={illustrationSteps}
            showInlineIllustrations={true}
            onStepHover={handleStepHover}
          />
        </div>

        {/* Right illustration panel (desktop) */}
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
