"use client";

import { CheckCircle2, AlertTriangle, Info, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function QualityReport({ quality }: { quality: any }) {
  if (!quality) return null;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col items-center justify-center rounded-none border bg-card p-8 text-center">
          <div className="relative mb-4 flex h-32 w-32 items-center justify-center rounded-full border-8 border-muted">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className={cn(
                  quality.score >= 90 ? "text-emerald-500" : quality.score >= 70 ? "text-amber-500" : "text-destructive"
                )}
                strokeDasharray={`${quality.score * 2.89} 289`}
              />
            </svg>
            <span className="text-4xl font-bold">{quality.score}</span>
          </div>
          <h3 className="text-xl font-semibold">Quality Score</h3>
          <Badge variant={quality.decision === "approved" ? "default" : "destructive"} className="mt-2 text-sm uppercase">
            {quality.decision}
          </Badge>
        </div>

        <div className="flex flex-col items-center justify-center rounded-none border bg-card p-8 text-center">
          <div
            className={cn(
              "mb-4 flex h-24 w-24 items-center justify-center rounded-full",
              quality.safetyPassed ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
            )}
          >
            {quality.safetyPassed ? <ShieldCheck className="h-12 w-12" /> : <ShieldAlert className="h-12 w-12" />}
          </div>
          <h3 className="text-xl font-semibold">Safety Review</h3>
          <Badge
            variant={quality.safetyPassed ? "outline" : "destructive"}
            className={cn("mt-2 text-sm uppercase", quality.safetyPassed && "border-emerald-500 text-emerald-500")}
          >
            {quality.safetyPassed ? "Passed" : "Failed"}
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="border-b pb-2 text-xl font-semibold">Quality Issues</h3>

        {quality.issues.length === 0 ? (
          <div className="flex items-center gap-3 rounded-none border border-emerald-500/20 bg-emerald-500/5 p-4 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-medium">No quality issues found. The instruction meets all guidelines.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quality.issues.map((issue: any, i: number) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-4 rounded-none border p-4",
                  issue.severity === "error"
                    ? "border-destructive/50 bg-destructive/5"
                    : issue.severity === "warning"
                      ? "border-amber-500/50 bg-amber-500/5"
                      : "border-blue-500/50 bg-blue-500/5"
                )}
              >
                <div className="mt-0.5">
                  {issue.severity === "error" ? (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  ) : issue.severity === "warning" ? (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Info className="h-5 w-5 text-blue-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {issue.severity}
                    </Badge>
                    <span className="text-sm font-medium text-muted-foreground">{issue.category}</span>
                    {issue.stepNumber && <span className="text-sm font-medium text-muted-foreground">· Step {issue.stepNumber}</span>}
                  </div>
                  <p className="mt-2 font-medium">{issue.description}</p>
                  {issue.suggestedFix && (
                    <div className="mt-3 rounded-none bg-background/50 p-3 text-sm">
                      <span className="font-semibold">Suggested Fix:</span> {issue.suggestedFix}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {quality.safetyIssues && quality.safetyIssues.length > 0 && (
        <div className="space-y-6">
          <h3 className="border-b pb-2 text-xl font-semibold">Safety Hazards</h3>
          <div className="space-y-4">
            {quality.safetyIssues.map((issue: any, i: number) => {
              const isUndocumented = issue.coverage === "undocumented";
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-4 rounded-none border p-4",
                    isUndocumented
                      ? "border-destructive/50 bg-destructive/5"
                      : "border-emerald-500/20 bg-emerald-500/5"
                  )}
                >
                  {isUndocumented ? (
                    <ShieldAlert className="mt-0.5 h-5 w-5 text-destructive" />
                  ) : (
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-500" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isUndocumented ? "destructive" : "outline"}
                        className={cn("text-[10px] uppercase", !isUndocumented && "border-emerald-500 text-emerald-500")}
                      >
                        {isUndocumented ? "undocumented" : "documented"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {issue.severity}
                      </Badge>
                      <span className="text-sm font-medium text-muted-foreground">{issue.hazardType}</span>
                      {issue.stepNumber && <span className="text-sm font-medium text-muted-foreground">· Step {issue.stepNumber}</span>}
                    </div>
                    <p className="mt-2 font-medium text-foreground">{issue.description}</p>
                    <div className={cn(
                      "mt-3 rounded-none p-3 text-sm",
                      isUndocumented ? "bg-destructive/10" : "bg-emerald-500/5"
                    )}>
                      <span className="font-semibold">Required Action:</span> {issue.requiredAction}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
