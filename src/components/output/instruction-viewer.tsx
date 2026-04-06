"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, Clock, Users, Wrench, Package, ZoomIn, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const SEVERITY_COLORS: Record<string, { border: string; bg: string; text: string; icon: string; badge: string }> = {
  danger: { border: "border-red-500", bg: "bg-red-500/10", text: "text-red-900 dark:text-red-200", icon: "text-red-500", badge: "bg-red-500/20 text-red-500" },
  warning: { border: "border-orange-500", bg: "bg-orange-500/10", text: "text-orange-900 dark:text-orange-200", icon: "text-orange-500", badge: "bg-orange-500/20 text-orange-500" },
  caution: { border: "border-amber-500", bg: "bg-amber-500/10", text: "text-amber-900 dark:text-amber-200", icon: "text-amber-500", badge: "bg-amber-500/20 text-amber-500" },
};

function getSeverityColors(severity: string) {
  return SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.caution;
}

function SafetyWarningsSection({ warnings }: { warnings: any[] }) {
  const [expanded, setExpanded] = useState(false);

  // Count by severity
  const counts: Record<string, number> = {};
  for (const w of warnings) {
    const sev = w.severity ?? "caution";
    counts[sev] = (counts[sev] ?? 0) + 1;
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between py-1 text-left"
      >
        <h3 className="font-semibold">General Safety Warnings</h3>
        <div className="flex items-center gap-2">
          {!expanded &&
            Object.entries(counts).map(([sev, count]) => {
              const colors = getSeverityColors(sev);
              return (
                <span
                  key={sev}
                  className={cn("rounded px-2 py-0.5 text-xs font-semibold uppercase", colors.badge)}
                >
                  {count} {sev}
                </span>
              );
            })}
          <ChevronDown
            className={cn("h-5 w-5 text-muted-foreground transition-transform", expanded && "rotate-180")}
          />
        </div>
      </button>

      {expanded && (
        <div className="space-y-3">
          {warnings.map((warning: any, i: number) => {
            const colors = getSeverityColors(warning.severity);
            return (
              <div key={i} className={cn("flex items-start gap-3 border-l-4 p-4", colors.border, colors.bg, colors.text)}>
                <AlertTriangle className={cn("mt-0.5 h-5 w-5 shrink-0", colors.icon)} />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{warning.severity}</p>
                  <p className="text-sm font-medium">{warning.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({ sectionNumber, name, stepCount, children }: { sectionNumber: number; name: string; stepCount: number; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between border-b pb-2 text-left"
      >
        <h2 className="text-2xl font-bold tracking-tight">
          <span className="text-muted-foreground">Section {sectionNumber}:</span> {name}
        </h2>
        <div className="flex items-center gap-2">
          {!expanded && (
            <span className="rounded bg-muted px-2 py-0.5 text-sm text-muted-foreground">
              {stepCount} {stepCount === 1 ? "step" : "steps"}
            </span>
          )}
          <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </div>
      </button>
      {expanded && children}
    </div>
  );
}

function StepIllustration({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group/img relative mt-6 block max-w-sm cursor-pointer overflow-hidden rounded-none border bg-muted/30 transition-colors hover:border-primary/50"
      >
        <img src={src} alt={alt} className="w-full object-contain" loading="lazy" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover/img:bg-black/30">
          <ZoomIn className="h-6 w-6 text-white opacity-0 transition-opacity group-hover/img:opacity-100" />
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl overflow-hidden rounded-none border-none bg-black/95 p-0">
          <VisuallyHidden><DialogTitle>Illustration</DialogTitle></VisuallyHidden>
          <div className="relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-20 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
            >
              <X className="h-5 w-5" />
            </button>
            <img src={src} alt={alt} className="w-full object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function InstructionViewer({ data, jobId }: { data: any; jobId?: string }) {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  if (!data) return null;

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="sticky top-20 hidden w-64 shrink-0 lg:block">
        <div className="rounded-none border bg-card p-4">
          <h3 className="mb-4 font-semibold">Table of Contents</h3>
          <div className="space-y-4">
            {data.phases.map((section: any, sIdx: number) => {
              const sectionNum = sIdx + 1;
              return (
                <div key={sIdx}>
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">{sectionNum}. {section.name}</h4>
                  <ul className="space-y-1 border-l-2 border-muted pl-3">
                    {section.steps.map((step: any, stepIdx: number) => (
                      <li key={step.number}>
                        <a
                          href={`#step-${step.number}`}
                          className={cn(
                            "block py-1 text-sm transition-colors hover:text-primary",
                            activeStep === step.number ? "font-medium text-primary" : "text-muted-foreground"
                          )}
                          onClick={() => setActiveStep(step.number)}
                        >
                          {sectionNum}.{stepIdx + 1} {step.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-12">
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="uppercase">{data.metadata.domain}</Badge>
            <Badge variant={data.metadata.safetyLevel === "high" ? "destructive" : "secondary"} className="uppercase">
              Safety: {data.metadata.safetyLevel}
            </Badge>
            <Badge variant="outline" className="uppercase">Skill: {data.metadata.skillLevel.replace(/_/g, " ")}</Badge>
          </div>

          <p className="text-lg text-muted-foreground">{data.metadata.purpose}</p>

          <div className="flex flex-wrap gap-6 border-y py-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span><strong className="font-medium text-foreground">{data.metadata.estimatedMinutes}</strong> mins estimated</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span><strong className="font-medium text-foreground">{data.metadata.personsRequired}</strong> person(s) required</span>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-4 flex items-center gap-2 font-semibold">
                <Package className="h-4 w-4" /> Parts Required
              </h3>
              <div className="rounded-none border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">ID</th>
                      <th className="px-4 py-2 text-left font-medium">Name</th>
                      <th className="px-4 py-2 text-right font-medium">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.partsList.map((part: any) => (
                      <tr key={part.id}>
                        <td className="px-4 py-2 font-mono text-muted-foreground">{part.id}</td>
                        <td className="px-4 py-2">{part.name}</td>
                        <td className="px-4 py-2 text-right font-medium">{part.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 className="mb-4 flex items-center gap-2 font-semibold">
                <Wrench className="h-4 w-4" /> Tools Required
              </h3>
              <ul className="space-y-2">
                {data.toolsRequired.map((tool: any, i: number) => (
                  <li key={i} className="flex items-center justify-between rounded-none border p-3 text-sm">
                    <span>{tool.name}</span>
                    {tool.required ? (
                      <Badge variant="default" className="text-[10px]">Required</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Optional</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {data.safetyWarnings.length > 0 && (
            <SafetyWarningsSection warnings={data.safetyWarnings} />
          )}
        </div>

        <div className="space-y-12">
          {data.phases.map((section: any, sIdx: number) => {
            const sectionNum = sIdx + 1;
            return (
            <CollapsibleSection key={sIdx} sectionNumber={sectionNum} name={section.name} stepCount={section.steps.length}>
              <div className="space-y-6">
                {section.steps.map((step: any, stepIdx: number) => {
                  const stepLabel = `${sectionNum}.${stepIdx + 1}`;
                  return (
                  <div
                    key={step.number}
                    id={`step-${step.number}`}
                    className="group relative rounded-none border bg-card p-6 transition-colors hover:border-primary/50"
                  >
                    <div className="absolute -left-3 -top-3 flex h-8 min-w-8 items-center justify-center rounded-none bg-primary px-2 text-sm font-bold text-primary-foreground shadow-sm">
                      {stepLabel}
                    </div>

                    <div className="ml-2">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                        <h3 className="text-xl font-semibold">{step.title}</h3>
                        <div className="flex gap-2">
                          {step.twoPersonRequired && (
                            <Badge variant="secondary" className="gap-1">
                              <Users className="h-3 w-3" /> 2 Persons
                            </Badge>
                          )}
                          {step.confidence < 90 && (
                            <Badge variant="outline" className="border-amber-500/50 text-amber-500">
                              AI Confidence: {step.confidence}%
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <p className="text-base leading-relaxed">{step.instruction}</p>
                      </div>

                      {step.safety.length > 0 && (
                        <div className="mt-6 space-y-2">
                          {step.safety.map((s: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="font-medium uppercase">{s.severity}:</span> {s.text}
                            </div>
                          ))}
                        </div>
                      )}

                      {(step.parts.length > 0 || step.tools.length > 0) && (
                        <div className="mt-6 flex flex-wrap gap-4 border-t pt-4">
                          {step.parts.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <div className="flex gap-2">
                                {step.parts.map((p: any, idx: number) => (
                                  <Badge key={idx} variant="outline" className="font-mono">
                                    {p.id} <span className="ml-1 text-muted-foreground">x{p.quantity}</span>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {step.tools.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Wrench className="h-4 w-4 text-muted-foreground" />
                              <div className="flex gap-2">
                                {step.tools.map((t: any, idx: number) => (
                                  <Badge key={idx} variant="secondary">{t.name}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {jobId && (
                        <StepIllustration
                          src={`/api/jobs/${jobId}/illustrations/${step.number}`}
                          alt={`Illustration for Step ${step.number}: ${step.title}`}
                        />
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </CollapsibleSection>
            );
          })}
        </div>
      </div>
    </div>
  );
}
