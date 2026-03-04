"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { X, ZoomIn, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { XmlStep } from "@/types/xml";

interface InstructionIllustrationProps {
  jobId: string;
  activeStep: XmlStep | null;
  hasIllustration: boolean;
}

export function InstructionIllustration({
  jobId,
  activeStep,
  hasIllustration,
}: InstructionIllustrationProps) {
  const [loaded, setLoaded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [prevStepNumber, setPrevStepNumber] = useState<number | null>(null);

  // Reset loaded state when step changes
  if (activeStep?.number !== prevStepNumber) {
    setPrevStepNumber(activeStep?.number ?? null);
    setLoaded(false);
  }

  const handleLoad = useCallback(() => setLoaded(true), []);

  if (!activeStep) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <ImageIcon className="w-10 h-10 mb-2 opacity-40" />
        <p className="text-xs">Hover or scroll to a step to see its illustration</p>
      </div>
    );
  }

  if (!hasIllustration) {
    return (
      <div className="space-y-3">
        <StepLabel step={activeStep} />
        <div className="flex flex-col items-center justify-center h-48 border rounded-lg bg-slate-50 dark:bg-slate-800/50 text-muted-foreground">
          <ImageIcon className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-xs">No illustration for this step</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <StepLabel step={activeStep} />

        {/* Image container */}
        <div className="relative border rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800/50 group cursor-pointer"
          onClick={() => setLightboxOpen(true)}
        >
          <div className="relative aspect-square">
            {/* Shimmer */}
            {!loaded && (
              <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700">
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
              </div>
            )}
            <Image
              src={`/api/jobs/${jobId}/illustrations/${activeStep.number}`}
              alt={`Step ${activeStep.number} illustration`}
              fill
              className={cn("object-contain p-3 transition-opacity", loaded ? "opacity-100" : "opacity-0")}
              sizes="288px"
              onLoad={handleLoad}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-2">{activeStep.instruction}</p>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] bg-white dark:bg-slate-900 rounded-lg overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-sm font-medium">
                  {activeStep.number}
                </span>
                <div>
                  <p className="text-sm font-medium">{activeStep.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{activeStep.instruction}</p>
                </div>
              </div>
              <button
                onClick={() => setLightboxOpen(false)}
                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="relative aspect-square max-h-[calc(90vh-80px)] bg-slate-50 dark:bg-slate-800">
              <Image
                src={`/api/jobs/${jobId}/illustrations/${activeStep.number}`}
                alt={`Step ${activeStep.number} illustration`}
                fill
                className="object-contain p-4"
                sizes="(max-width: 768px) 100vw, 768px"
                priority
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StepLabel({ step }: { step: XmlStep }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
        {step.number}
      </span>
      <span className="text-sm font-medium truncate">{step.title}</span>
    </div>
  );
}
