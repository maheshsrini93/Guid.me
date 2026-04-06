"use client";

import { useState } from "react";
import { AlertTriangle, Clock, Users, Wrench, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function InstructionViewer({ data }: { data: any }) {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  if (!data) return null;

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="sticky top-20 hidden w-64 shrink-0 lg:block">
        <div className="rounded-none border bg-card p-4">
          <h3 className="mb-4 font-semibold">Table of Contents</h3>
          <div className="space-y-4">
            {data.phases.map((phase: any, i: number) => (
              <div key={i}>
                <h4 className="mb-2 text-sm font-medium text-muted-foreground">{phase.name}</h4>
                <ul className="space-y-1 border-l-2 border-muted pl-3">
                  {phase.steps.map((step: any) => (
                    <li key={step.number}>
                      <a
                        href={`#step-${step.number}`}
                        className={cn(
                          "block py-1 text-sm transition-colors hover:text-primary",
                          activeStep === step.number ? "font-medium text-primary" : "text-muted-foreground"
                        )}
                        onClick={() => setActiveStep(step.number)}
                      >
                        {step.number}. {step.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
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
            <div className="space-y-3">
              <h3 className="font-semibold">General Safety Warnings</h3>
              {data.safetyWarnings.map((warning: any, i: number) => (
                <div key={i} className={cn(
                  "flex items-start gap-3 border-l-4 p-4",
                  warning.severity === "danger" ? "border-red-500 bg-red-500/10 text-red-900 dark:text-red-200" :
                  warning.severity === "warning" ? "border-orange-500 bg-orange-500/10 text-orange-900 dark:text-orange-200" :
                  "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                )}>
                  <AlertTriangle className={cn(
                    "mt-0.5 h-5 w-5 shrink-0",
                    warning.severity === "danger" ? "text-red-500" :
                    warning.severity === "warning" ? "text-orange-500" :
                    "text-amber-500"
                  )} />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{warning.severity}</p>
                    <p className="text-sm font-medium">{warning.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-12">
          {data.phases.map((phase: any, i: number) => (
            <div key={i} className="space-y-6">
              <h2 className="border-b pb-2 text-2xl font-bold tracking-tight">{phase.name}</h2>

              <div className="space-y-6">
                {phase.steps.map((step: any) => (
                  <div
                    key={step.number}
                    id={`step-${step.number}`}
                    className="group relative rounded-none border bg-card p-6 transition-colors hover:border-primary/50"
                  >
                    <div className="absolute -left-3 -top-3 flex h-8 w-8 items-center justify-center rounded-none bg-primary text-sm font-bold text-primary-foreground shadow-sm">
                      {step.number}
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
