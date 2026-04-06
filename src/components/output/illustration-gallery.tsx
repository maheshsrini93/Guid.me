"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { X, ZoomIn, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface IllustrationData {
  stepNumber: number;
  title?: string;
  instruction?: string;
}

interface IllustrationGalleryProps {
  jobId: string;
  illustrations: IllustrationData[];
}

export function IllustrationGallery({
  jobId,
  illustrations,
}: IllustrationGalleryProps) {
  const [selected, setSelected] = useState<IllustrationData | null>(null);

  if (illustrations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <ImageIcon className="h-12 w-12 mb-3" />
        <p className="text-sm">No illustrations generated</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {illustrations.map((il, idx) => (
          <IllustrationCard
            key={`step-${il.stepNumber}-${idx}`}
            jobId={jobId}
            illustration={il}
            onSelect={() => setSelected(il)}
          />
        ))}
      </div>

      {/* Lightbox overlay */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[90vh] bg-white dark:bg-slate-900 rounded-lg overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/50 text-fuchsia-600 dark:text-fuchsia-400 text-sm font-medium">
                  {selected.stepNumber}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                    {selected.title || `Step ${selected.stepNumber}`}
                  </p>
                  {selected.instruction && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {selected.instruction}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            {/* Image */}
            <div className="relative aspect-square max-h-[calc(90vh-80px)] bg-slate-50 dark:bg-slate-800">
              <Image
                src={`/api/jobs/${jobId}/illustrations/${selected.stepNumber}`}
                alt={`Step ${selected.stepNumber} illustration`}
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

// ============================================================
// Illustration Card with shimmer placeholder
// ============================================================

function IllustrationCard({
  jobId,
  illustration: il,
  onSelect,
}: {
  jobId: string;
  illustration: IllustrationData;
  onSelect: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const handleLoad = useCallback(() => setLoaded(true), []);

  return (
    <button
      onClick={onSelect}
      className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
    >
      <div className="aspect-square relative bg-slate-50 dark:bg-slate-800">
        {/* Shimmer placeholder */}
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 bg-[length:200%_100%]">
            <div className="flex items-center justify-center h-full">
              <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
          </div>
        )}
        <Image
          src={`/api/jobs/${jobId}/illustrations/${il.stepNumber}`}
          alt={`Step ${il.stepNumber} illustration`}
          fill
          className={cn("object-contain p-2 transition-opacity", loaded ? "opacity-100" : "opacity-0")}
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          onLoad={handleLoad}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
        </div>
      </div>
      <div className="p-3.5 text-left bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/50 text-fuchsia-600 dark:text-fuchsia-400 text-xs font-medium">
            {il.stepNumber}
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
            {il.title || `Step ${il.stepNumber}`}
          </span>
        </div>
      </div>
    </button>
  );
}
