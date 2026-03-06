"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ZoomIn, Image as ImageIcon } from "lucide-react";
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
  const [lightboxOpen, setLightboxOpen] = useState(false);

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

        {/* Key by step number so the preview remounts when the active step changes */}
        <StepImage
          key={activeStep.number}
          jobId={jobId}
          step={activeStep}
          onOpenLightbox={() => setLightboxOpen(true)}
        />

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

/** Inner component keyed by step number to reset image internals on step change. */
function StepImage({
  jobId,
  step,
  onOpenLightbox,
}: {
  jobId: string;
  step: XmlStep;
  onOpenLightbox: () => void;
}) {
  return (
    <div
      className="relative border rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800/50 group cursor-pointer"
      onClick={onOpenLightbox}
    >
      <div className="relative aspect-square">
        <Image
          src={`/api/jobs/${jobId}/illustrations/${step.number}`}
          alt={`Step ${step.number} illustration`}
          fill
          className="object-contain p-3"
          sizes="288px"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
        </div>
      </div>
    </div>
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
