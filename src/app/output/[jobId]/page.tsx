"use client";

import { useEffect, useState, useMemo, memo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  Shield,
  Layers,
  Info,
  Image as ImageIcon,
} from "lucide-react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { IllustrationGallery } from "@/components/output/illustration-gallery";
import { InstructionViewer } from "@/components/output/instruction-viewer";
import type { XmlWorkInstruction } from "@/types/xml";

interface JobResult {
  job: {
    id: string;
    filename: string;
    domain: string;
    status: string;
    createdAt: string;
    completedAt: string;
    totalCostUsd: number;
    textRevisionCount: number;
  };
  guide: {
    xmlContent: string;
    jsonContent: unknown;
    qualityScore: number;
    qualityDecision: string;
    qualityIssues: QualityIssue[];
    safetyIssues: SafetyIssue[];
    stepCount: number;
    phaseCount: number;
    title: string;
    estimatedMinutes: number;
    safetyLevel: string;
    modelsUsed: string[];
    textRevisionLoops: number;
    totalCostUsd: number;
    generatedAt: string;
  };
  illustrations: IllustrationEntry[];
  costBreakdown: CostEntry[];
}

interface IllustrationEntry {
  stepNumber: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  model: string | null;
  costUsd: number | null;
  durationMs: number | null;
}

interface QualityIssue {
  severity: "error" | "warning" | "info";
  category: string;
  stepNumber: number | null;
  description: string;
  responsibleAgent: string;
  suggestedFix: string | null;
}

interface SafetyIssue {
  severity: "warning" | "critical";
  stepNumber: number | null;
  hazardType: string;
  description: string;
  requiredAction: string;
}

interface CostEntry {
  agent: string;
  model: string | null;
  costUsd: number | null;
  durationMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
}

type Tab = "instruction" | "xml" | "illustrations" | "quality" | "cost";

export default function OutputReviewPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [result, setResult] = useState<JobResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("instruction");

  useEffect(() => {
    async function fetchResult() {
      try {
        const res = await fetch(`/api/jobs/${jobId}/result`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.message || data.error || "Failed to load result");
          return;
        }
        const data = await res.json();
        setResult(data);
      } catch {
        setError("Failed to fetch result");
      } finally {
        setLoading(false);
      }
    }
    fetchResult();
  }, [jobId]);

  function handleDownloadXml() {
    if (!result?.guide.xmlContent) return;
    const blob = new Blob([result.guide.xmlContent], {
      type: "application/xml",
    });
    const url = URL.createObjectURL(blob);
    const baseName = result.job.filename
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_\-. ]/g, "_")
      .replace(/\s+/g, "_");
    const timestamp = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}_${timestamp}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header jobId={jobId} />
        <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <div className="space-y-4">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
            <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
            <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mt-6" />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    const isInProgress = error.toLowerCase().includes("not yet completed") || error.toLowerCase().includes("not completed") || error.toLowerCase().includes("still running") || error.toLowerCase().includes("in progress");
    return (
      <div className="min-h-screen bg-background">
        <Header jobId={jobId} />
        <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          {isInProgress ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950 p-6">
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500" />
                </div>
                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                  Pipeline is still in progress. Results will be available once all agents complete.
                </p>
              </div>
              <div className="mt-4">
                <Link
                  href={`/pipeline/${jobId}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 underline underline-offset-4"
                >
                  View Pipeline Monitor
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950 p-6">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <XCircle className="w-5 h-5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
              <div className="mt-4 flex gap-3">
                <Link
                  href={`/pipeline/${jobId}`}
                  className="text-sm text-indigo-600 hover:text-indigo-700 underline underline-offset-4"
                >
                  View Pipeline
                </Link>
                <Link
                  href="/"
                  className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
                >
                  Back to Upload
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  if (!result) return null;

  const { job, guide, illustrations, costBreakdown } = result;

  return (
    <div className="min-h-screen bg-background">
      <Header jobId={jobId} />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {/* Title + Actions */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold leading-tight">
              Output Review
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {guide.title || job.filename}
            </p>
          </div>
          <button
            onClick={handleDownloadXml}
            className="flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-4 rounded-md font-medium text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export XML
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <SummaryCard
            icon={<ScoreIcon score={guide.qualityScore} />}
            label="Quality Score"
            value={`${guide.qualityScore}/100`}
            sub={guide.qualityDecision}
          />
          <SummaryCard
            icon={<Shield className="w-5 h-5 text-amber-500" />}
            label="Safety Level"
            value={guide.safetyLevel}
            sub={`${guide.safetyIssues.length} issue(s)`}
          />
          <SummaryCard
            icon={<Layers className="w-5 h-5 text-violet-500" />}
            label="Steps"
            value={String(guide.stepCount)}
            sub={`${guide.phaseCount} phase(s)`}
          />
          <SummaryCard
            icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
            label="Total Cost"
            value={`$${(guide.totalCostUsd ?? 0).toFixed(2)}`}
            sub={`${guide.textRevisionLoops} revision(s)`}
          />
        </div>

        {/* Tabs */}
        <div className="mt-8 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <nav className="flex gap-4 sm:gap-6 min-w-max">
            <TabButton
              active={activeTab === "instruction"}
              onClick={() => setActiveTab("instruction")}
              icon={<Layers className="w-4 h-4" />}
              label="Work Instruction"
            />
            <TabButton
              active={activeTab === "xml"}
              onClick={() => setActiveTab("xml")}
              icon={<FileText className="w-4 h-4" />}
              label="XML Output"
            />
            <TabButton
              active={activeTab === "illustrations"}
              onClick={() => setActiveTab("illustrations")}
              icon={<ImageIcon className="w-4 h-4" />}
              label={`Illustrations${illustrations.length > 0 ? ` (${illustrations.length})` : ""}`}
            />
            <TabButton
              active={activeTab === "quality"}
              onClick={() => setActiveTab("quality")}
              icon={<CheckCircle className="w-4 h-4" />}
              label="Quality Report"
            />
            <TabButton
              active={activeTab === "cost"}
              onClick={() => setActiveTab("cost")}
              icon={<DollarSign className="w-4 h-4" />}
              label="Cost Breakdown"
            />
          </nav>
        </div>

        {/* Tab content */}
        <div className="mt-6">
          {activeTab === "instruction" && (
            guide.jsonContent ? (
              <MemoizedInstructionTab
                jsonContent={guide.jsonContent as XmlWorkInstruction}
                jobId={jobId}
                illustrations={illustrations}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No structured content available. View the XML tab instead.
              </div>
            )
          )}
          {activeTab === "xml" && <XmlViewer xml={guide.xmlContent} />}
          {activeTab === "illustrations" && (
            <IllustrationGallery
              jobId={jobId}
              illustrations={illustrations.map((il) => {
                // Try to find step title from JSON content
                const json = guide.jsonContent as Record<string, unknown> | null;
                const phases = (json?.phases as Array<{ steps?: Array<{ number: number; title?: string; instruction?: string }> }>) ?? [];
                let title: string | undefined;
                let instruction: string | undefined;
                for (const phase of phases) {
                  const step = phase.steps?.find((s) => s.number === il.stepNumber);
                  if (step) {
                    title = step.title;
                    instruction = step.instruction;
                    break;
                  }
                }
                return {
                  stepNumber: il.stepNumber,
                  title,
                  instruction,
                };
              })}
            />
          )}
          {activeTab === "quality" && (
            <QualityReport
              qualityScore={guide.qualityScore}
              qualityDecision={guide.qualityDecision}
              qualityIssues={guide.qualityIssues}
              safetyIssues={guide.safetyIssues}
              safetyLevel={guide.safetyLevel}
              revisionLoops={guide.textRevisionLoops}
            />
          )}
          {activeTab === "cost" && (
            <CostBreakdown
              entries={costBreakdown}
              totalCost={guide.totalCostUsd ?? 0}
              modelsUsed={guide.modelsUsed}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ============================================================
// Header
// ============================================================

function Header({ jobId }: { jobId: string }) {
  return (
    <header className="border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <span className="text-sm text-muted-foreground">|</span>
        <Link
          href={`/pipeline/${jobId}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View Pipeline
        </Link>
      </div>
    </header>
  );
}

// ============================================================
// Summary Card
// ============================================================

function SummaryCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-slate-50/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-semibold mt-2 font-mono">{value}</p>
      <p className="text-xs text-muted-foreground capitalize">{sub}</p>
    </div>
  );
}

function ScoreIcon({ score }: { score: number }) {
  if (score >= 85) return <CheckCircle className="w-5 h-5 text-emerald-500" />;
  if (score >= 70)
    return <AlertTriangle className="w-5 h-5 text-amber-500" />;
  return <XCircle className="w-5 h-5 text-rose-500" />;
}

// ============================================================
// Tab Button
// ============================================================

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 pt-1 pb-3 px-3 text-sm font-medium transition-colors ${
        active
          ? "border-b-[3px] border-indigo-600 text-indigo-600"
          : "border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-t-md"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ============================================================
// XML Viewer Tab
// ============================================================

function XmlViewer({ xml }: { xml: string }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg border bg-slate-50 dark:bg-slate-900 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-sm font-medium">work-instruction.xml</span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>
      {expanded && (
        <pre className="p-4 overflow-auto max-h-[600px] font-mono text-[13px] leading-relaxed text-slate-800 dark:text-slate-200 border-l-4 border-l-indigo-200 dark:border-l-indigo-800">
          {highlightXml(xml)}
        </pre>
      )}
    </div>
  );
}

function highlightXml(xml: string): React.ReactNode {
  // Simple XML syntax highlighting using spans
  const lines = xml.split("\n");
  return lines.map((line, i) => (
    <div key={i} className="flex">
      <span className="select-none text-slate-500 dark:text-slate-600 w-10 text-right mr-4 flex-shrink-0">
        {i + 1}
      </span>
      <span
        dangerouslySetInnerHTML={{
          __html: line
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            // Tags
            .replace(
              /&lt;(\/?[\w:-]+)/g,
              '&lt;<span class="text-indigo-600 dark:text-indigo-400">$1</span>',
            )
            // Attributes
            .replace(
              /\b([\w:-]+)=&quot;/g,
              '<span class="text-violet-600 dark:text-violet-400">$1</span>=&quot;',
            )
            // Attribute values
            .replace(
              /&quot;([^&]*)&quot;/g,
              '&quot;<span class="text-emerald-600 dark:text-emerald-400">$1</span>&quot;',
            ),
        }}
      />
    </div>
  ));
}

// ============================================================
// Quality Report Tab
// ============================================================

function QualityReport({
  qualityScore,
  qualityDecision,
  qualityIssues,
  safetyIssues,
  safetyLevel,
  revisionLoops,
}: {
  qualityScore: number;
  qualityDecision: string;
  qualityIssues: QualityIssue[];
  safetyIssues: SafetyIssue[];
  safetyLevel: string;
  revisionLoops: number;
}) {
  const errorCount = qualityIssues.filter((i) => i.severity === "error").length;
  const warnCount = qualityIssues.filter((i) => i.severity === "warning").length;
  const infoCount = qualityIssues.filter((i) => i.severity === "info").length;

  return (
    <div className="space-y-6">
      {/* Score overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50/80 dark:bg-slate-900 border rounded-lg p-6 shadow-sm text-center">
          <div className={cn(
            "inline-flex items-center justify-center w-20 h-20 rounded-full border-4 mb-3",
            qualityScore >= 85 ? "border-emerald-500 text-emerald-600" :
            qualityScore >= 70 ? "border-amber-500 text-amber-600" :
            "border-rose-500 text-rose-600"
          )}>
            <span className="text-2xl font-bold font-mono">{qualityScore}</span>
          </div>
          <p className="text-sm font-medium">Overall Score</p>
          <p className="text-xs text-muted-foreground capitalize mt-1">
            {qualityDecision}
          </p>
        </div>

        <div className="bg-slate-50/80 dark:bg-slate-900 border rounded-lg p-6 shadow-sm">
          <p className="text-sm font-medium mb-3">Issue Summary</p>
          <div className="space-y-2">
            <IssueBadge severity="error" count={errorCount} />
            <IssueBadge severity="warning" count={warnCount} />
            <IssueBadge severity="info" count={infoCount} />
          </div>
        </div>

        <div className="bg-slate-50/80 dark:bg-slate-900 border rounded-lg p-6 shadow-sm">
          <p className="text-sm font-medium mb-3">Review Details</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Safety Level</span>
              <span className="font-medium capitalize">{safetyLevel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Revision Loops</span>
              <span className="font-mono">{revisionLoops}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Safety Issues</span>
              <span className="font-mono">{safetyIssues.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quality issues list */}
      {qualityIssues.length > 0 && (
        <div className="bg-slate-50/80 dark:bg-slate-900 border rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b">
            <span className="text-sm font-medium">Quality Issues ({qualityIssues.length})</span>
          </div>
          <div className="divide-y">
            {qualityIssues.map((issue, i) => (
              <div key={i} className={cn(
                "px-4 py-3 flex items-start gap-3 border-l-4",
                issue.severity === "error" ? "border-l-rose-400" :
                issue.severity === "warning" ? "border-l-amber-400" :
                "border-l-slate-300 dark:border-l-slate-600"
              )}>
                <SeverityIcon severity={issue.severity} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {issue.category}
                    </span>
                    {issue.stepNumber !== null && (
                      <span className="text-xs text-muted-foreground">
                        Step {issue.stepNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-1">{issue.description}</p>
                  {issue.suggestedFix && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Fix: {issue.suggestedFix}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety issues list */}
      {safetyIssues.length > 0 && (
        <div className="bg-slate-50/80 dark:bg-slate-900 border rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b">
            <span className="text-sm font-medium">Safety Issues ({safetyIssues.length})</span>
          </div>
          <div className="divide-y">
            {safetyIssues.map((issue, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3">
                <SeverityIcon
                  severity={issue.severity === "critical" ? "error" : "warning"}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {issue.hazardType}
                    </span>
                    {issue.stepNumber !== null && (
                      <span className="text-xs text-muted-foreground">
                        Step {issue.stepNumber}
                      </span>
                    )}
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        issue.severity === "critical"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                      }`}
                    >
                      {issue.severity}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{issue.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Required: {issue.requiredAction}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IssueBadge({
  severity,
  count,
}: {
  severity: "error" | "warning" | "info";
  count: number;
}) {
  const colors = {
    error: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    info: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <SeverityIcon severity={severity} />
        <span className="text-sm capitalize">{severity}s</span>
      </div>
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full font-mono ${colors[severity]}`}
      >
        {count}
      </span>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: "error" | "warning" | "info" }) {
  if (severity === "error")
    return <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />;
  if (severity === "warning")
    return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
  return <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />;
}

// ============================================================
// Cost Breakdown Tab
// ============================================================

function CostBreakdown({
  entries,
  totalCost,
  modelsUsed,
}: {
  entries: CostEntry[];
  totalCost: number;
  modelsUsed: string[];
}) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-50/80 dark:bg-slate-900 border rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <span className="text-sm font-medium">Per-Agent Cost</span>
          <span className="font-mono text-sm font-semibold text-indigo-600">
            ${totalCost.toFixed(4)}
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 dark:bg-slate-800/50">
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                Agent
              </th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                Model
              </th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                Tokens
              </th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                Duration
              </th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                Cost
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map((entry, i) => (
              <tr key={i} className="even:bg-slate-50 dark:even:bg-slate-800/30">
                <td className="px-4 py-2.5 font-semibold">{formatAgentName(entry.agent)}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                  {entry.model ?? "code"}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs">
                  {((entry.inputTokens ?? 0) + (entry.outputTokens ?? 0)).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs">
                  {entry.durationMs ? `${(entry.durationMs / 1000).toFixed(1)}s` : "-"}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-indigo-600 dark:text-indigo-400">
                  ${(entry.costUsd ?? 0).toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-50/80 dark:bg-slate-900 border rounded-lg p-4 shadow-sm">
        <p className="text-sm font-medium mb-2">Models Used</p>
        <div className="flex flex-wrap gap-2">
          {modelsUsed.map((model, idx) => (
            <span
              key={`${model}-${idx}`}
              className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded"
            >
              {model}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatAgentName(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ============================================================
// Memoized Instruction Tab (prevents infinite re-render loop)
// ============================================================

const MemoizedInstructionTab = memo(function MemoizedInstructionTab({
  jsonContent,
  jobId,
  illustrations,
}: {
  jsonContent: XmlWorkInstruction;
  jobId: string;
  illustrations: IllustrationEntry[];
}) {
  const illustrationSteps = useMemo(
    () => new Set(illustrations.map((il) => il.stepNumber)),
    [illustrations],
  );

  return (
    <InstructionViewer
      data={jsonContent}
      jobId={jobId}
      illustrationSteps={illustrationSteps}
    />
  );
});
