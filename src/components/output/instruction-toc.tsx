"use client";

import { cn } from "@/lib/utils";
import type { XmlWorkInstruction } from "@/types/xml";

interface InstructionTocProps {
  data: XmlWorkInstruction;
  activeStepNumber: number | null;
}

export function InstructionToc({ data, activeStepNumber }: InstructionTocProps) {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="overflow-y-auto max-h-[calc(100vh-6rem)] py-4 pr-2">
      {/* Title */}
      <p className="text-sm font-semibold text-foreground mb-3 line-clamp-2 px-2">
        {data.metadata.title}
      </p>

      {/* Overview link */}
      <button
        onClick={() => scrollTo("procedure-header")}
        className={cn(
          "w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors",
          activeStepNumber === null
            ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-l-2 border-indigo-600"
            : "text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-slate-800"
        )}
      >
        Overview
      </button>

      {/* Phases + Steps */}
      <div className="mt-3 space-y-3">
        {data.phases.map((phase, pi) => (
          <div key={pi}>
            <button
              onClick={() => scrollTo(`phase-${pi}`)}
              className="w-full text-left px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
            >
              {phase.name}
            </button>
            <div className="mt-1 space-y-0.5">
              {phase.steps.map((step) => (
                <button
                  key={step.number}
                  onClick={() => scrollTo(`step-${step.number}`)}
                  className={cn(
                    "w-full text-left pl-4 pr-2 py-1 text-sm rounded-md transition-colors",
                    activeStepNumber === step.number
                      ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-l-2 border-indigo-600"
                      : "text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  <span className="font-mono text-xs mr-1.5">{step.number}.</span>
                  <span className="truncate">{step.title}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
