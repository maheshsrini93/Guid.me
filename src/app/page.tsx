"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Header } from "@/components/shared/header";
import { StatusBadge } from "@/components/shared/status-badge";
import type { PipelineStatus } from "@/types/pipeline";

interface RecentJob {
  id: string;
  status: PipelineStatus;
  filename: string;
  domain: string | null;
  qualityScore: number | null;
  totalCostUsd: number | null;
  createdAt: string;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE_MB = 50;

const DOMAINS = [
  { value: "semiconductor", label: "Semiconductor Manufacturing" },
  { value: "automotive", label: "Automotive" },
  { value: "aerospace", label: "Aerospace" },
  { value: "pharmaceutical", label: "Pharmaceutical" },
  { value: "consumer", label: "Consumer Electronics" },
  { value: "furniture", label: "Furniture Assembly" },
  { value: "general", label: "General" },
];

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [domain, setDomain] = useState("general");
  const [qualityThreshold, setQualityThreshold] = useState(85);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data) => setRecentJobs(data.jobs || []))
      .catch(() => {})
      .finally(() => setJobsLoading(false));
  }, []);

  const validateFile = useCallback((f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return "Only PDF and DOCX files are supported.";
    }
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `File exceeds the maximum size of ${MAX_FILE_SIZE_MB} MB.`;
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (f: File) => {
      const validationError = validateFile(f);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      setFile(f);
    },
    [validateFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) handleFile(selectedFile);
    },
    [handleFile],
  );

  const handleSubmit = async () => {
    if (!file) return;

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("domain", domain);
      formData.append("qualityThreshold", String(qualityThreshold));

      const res = await fetch("/api/jobs", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create job.");
        return;
      }

      const { jobId } = await res.json();
      router.push(`/pipeline/${jobId}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-xl mx-auto px-4 py-16">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-semibold leading-tight">
            AI-Powered Work Instruction Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Upload a PDF or DOCX, watch 8 AI agents transform it into
            structured work instructions.
          </p>
        </div>

        {/* Dropzone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200",
            dragOver
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20"
              : file
                ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10"
                : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900",
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleInputChange}
            className="hidden"
          />

          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-emerald-500" />
              <div className="text-left">
                <p className="text-sm font-medium truncate max-w-xs">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setError(null);
                }}
                className="ml-2 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">
                Drop your document here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse — PDF or DOCX, up to {MAX_FILE_SIZE_MB} MB
              </p>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-rose-600 dark:text-rose-400 mt-3">
            {error}
          </p>
        )}

        {/* Configuration */}
        <div className="mt-8 space-y-4">
          {/* Domain */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Domain</label>
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {DOMAINS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quality threshold */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Quality Threshold
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={50}
                max={100}
                value={qualityThreshold}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 50 && val <= 100) {
                    setQualityThreshold(val);
                  }
                }}
                className="w-20 font-mono"
              />
              <span className="text-xs text-muted-foreground">
                Minimum score for auto-approval (50-100)
              </span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!file || submitting}
          className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white h-11"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating job...
            </>
          ) : (
            "Generate Work Instructions"
          )}
        </Button>

        {/* Recent Jobs */}
        <div className="mt-16">
          <h2 className="text-lg font-semibold mb-4">Recent Jobs</h2>

          {/* Loading skeleton */}
          {jobsLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!jobsLoading && recentJobs.length === 0 && (
            <div className="text-center py-10 border border-dashed rounded-lg">
              <FileText className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No recent jobs — upload your first document above
              </p>
            </div>
          )}

          {/* Job list */}
          {!jobsLoading && recentJobs.length > 0 && (
            <div className="space-y-2">
              {recentJobs.slice(0, 10).map((job) => (
                <Link
                  key={job.id}
                  href={
                    job.status === "completed"
                      ? `/output/${job.id}`
                      : `/pipeline/${job.id}`
                  }
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors"
                >
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {job.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(job.createdAt)}
                      {job.domain && job.domain !== "general" && ` — ${job.domain}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {job.qualityScore != null && (
                      <span className="text-xs font-mono text-muted-foreground">
                        {job.qualityScore}/100
                      </span>
                    )}
                    {job.totalCostUsd != null && job.totalCostUsd > 0 && (
                      <span className="text-xs font-mono text-muted-foreground">
                        ${job.totalCostUsd.toFixed(2)}
                      </span>
                    )}
                    <StatusBadge status={job.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
