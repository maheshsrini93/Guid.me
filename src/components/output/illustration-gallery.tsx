"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export function IllustrationGallery({ jobId, steps }: { jobId: string; steps: any[] }) {
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string; stepNumber: number } | null>(null);

  const illustrations = steps.map((step) => ({
    stepNumber: step.number,
    title: step.title,
    url: `/api/jobs/${jobId}/illustrations/${step.number}`,
  }));

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {illustrations.map((ill) => (
          <div
            key={ill.stepNumber}
            className="group cursor-pointer overflow-hidden rounded-none border bg-card transition-all hover:border-primary/50"
            onClick={() => setSelectedImage(ill)}
          >
            <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-muted">
              <img
                src={ill.url}
                alt={`Step ${ill.stepNumber}: ${ill.title}`}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-none bg-primary text-xs font-bold text-primary-foreground">
                  {ill.stepNumber}
                </span>
                <h4 className="line-clamp-1 font-medium">{ill.title}</h4>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl overflow-hidden rounded-none border-none bg-black/90 p-0">
          <VisuallyHidden><DialogTitle>Illustration Preview</DialogTitle></VisuallyHidden>
          {selectedImage && (
            <div className="relative flex h-[80vh] flex-col">
              <div className="absolute right-4 top-4 z-10">
                <button onClick={() => setSelectedImage(null)} className="rounded-full bg-black/50 p-2 text-white hover:bg-black/80">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-1 items-center justify-center p-8">
                <img
                  src={selectedImage.url}
                  alt={`Step ${selectedImage.stepNumber}: ${selectedImage.title}`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="bg-black/80 p-4 text-white">
                <p className="font-medium">Step {selectedImage.stepNumber}: {selectedImage.title}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
