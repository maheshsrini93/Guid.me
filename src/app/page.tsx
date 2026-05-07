"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  Settings,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Box,
  Film,
  Info,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/shared/header";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDistanceToNow } from "date-fns";

interface Job {
  id: string;
  status: string;
  filename: string;
  documentName: string;
  qualityScore?: number;
  qualityDecision?: string;
  totalCostUsd?: number;
  createdAt: string;
  completedAt?: string;
}

type PrimaryKind = "pdf" | "docx" | "step";

const PRIMARY_ACCEPT = ".pdf,.docx,.step,.stp";
const AUX_ACCEPT = ".mp4,.jt";
const PRIMARY_MAX_MB = 50;
const AUX_MAX_MB = 100;

const STEP_EXTENSIONS = [".step", ".stp"];
const AUX_VIDEO_EXTENSIONS = [".mp4", ".jt"];

function classifyPrimary(file: File): PrimaryKind | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  )
    return "docx";
  if (STEP_EXTENSIONS.some((ext) => name.endsWith(ext))) return "step";
  return null;
}

function isValidAuxiliary(file: File): boolean {
  const name = file.name.toLowerCase();
  return AUX_VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export default function Page() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [auxiliaryFile, setAuxiliaryFile] = useState<File | null>(null);
  const [isDraggingPrimary, setIsDraggingPrimary] = useState(false);
  const [isDraggingAux, setIsDraggingAux] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  const [domain, setDomain] = useState("general");
  const [qualityThreshold, setQualityThreshold] = useState("85");

  const primaryKind = file ? classifyPrimary(file) : null;
  const isStep = primaryKind === "step";

  useEffect(() => {
    fetchJobs();
  }, []);

  // If the user swaps a STEP file for a PDF/DOCX, drop any auxiliary they
  // already attached — it's only meaningful for STEP primaries.
  useEffect(() => {
    if (!isStep && auxiliaryFile) {
      setAuxiliaryFile(null);
    }
  }, [isStep, auxiliaryFile]);

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/jobs", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const handleDropPrimary = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPrimary(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleDropAux = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingAux(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetAuxiliary(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleAuxFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetAuxiliary(e.target.files[0]);
    }
  };

  const validateAndSetFile = (candidate: File) => {
    const kind = classifyPrimary(candidate);
    if (!kind) {
      alert("Please upload a PDF, DOCX, or STEP (.step / .stp) file.");
      return;
    }
    if (candidate.size > PRIMARY_MAX_MB * 1024 * 1024) {
      alert(`File size must be less than ${PRIMARY_MAX_MB}MB.`);
      return;
    }
    setFile(candidate);
  };

  const validateAndSetAuxiliary = (candidate: File) => {
    if (!isValidAuxiliary(candidate)) {
      alert("Explode view must be an MP4 or JT file.");
      return;
    }
    if (candidate.size > AUX_MAX_MB * 1024 * 1024) {
      alert(`Explode view must be less than ${AUX_MAX_MB}MB.`);
      return;
    }
    setAuxiliaryFile(candidate);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (isStep && auxiliaryFile) {
        formData.append("auxiliaryFile", auxiliaryFile);
      }
      formData.append("domain", domain);
      formData.append("qualityThreshold", qualityThreshold);

      const res = await fetch("/api/jobs", {
        method: "POST",
        body: formData,
        cache: "no-store",
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP error ${res.status}`);
      }
      const data = await res.json();

      if (data.jobId) {
        router.push(`/pipeline/${data.jobId}`);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to start job. Please try again.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Turn Manuals into <span className="text-primary">Intelligent Guides</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Upload a PDF, DOCX, or STEP assembly. Our 8-agent AI pipeline will automatically extract, structure, and illustrate a complete work instruction.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-3 space-y-4">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload Document
                </CardTitle>
                <CardDescription>
                  PDF, DOCX, or STEP (.step / .stp). Max {PRIMARY_MAX_MB}MB.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
                    isDraggingPrimary
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:bg-accent/50"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingPrimary(true);
                  }}
                  onDragLeave={() => setIsDraggingPrimary(false)}
                  onDrop={handleDropPrimary}
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept={PRIMARY_ACCEPT}
                    onChange={handleFileChange}
                  />

                  {file ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        {isStep ? (
                          <Box className="h-8 w-8 text-primary" />
                        ) : (
                          <FileText className="h-8 w-8 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                          {primaryKind && (
                            <>
                              {" · "}
                              <span className="uppercase">{primaryKind}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="mt-2"
                      >
                        Change File
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-lg font-medium">Click to upload or drag and drop</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          PDF, DOCX, or STEP up to {PRIMARY_MAX_MB}MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {isStep && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Film className="h-5 w-5 text-primary" />
                    Explode View (optional)
                  </CardTitle>
                  <CardDescription>
                    MP4 or JT animation showing the assembly sequence. Skip this to use the geometry-inferred fallback.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div
                    className={`relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                      isDraggingAux
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:bg-accent/50"
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingAux(true);
                    }}
                    onDragLeave={() => setIsDraggingAux(false)}
                    onDrop={handleDropAux}
                    onClick={() =>
                      document.getElementById("aux-upload")?.click()
                    }
                  >
                    <input
                      id="aux-upload"
                      type="file"
                      className="hidden"
                      accept={AUX_ACCEPT}
                      onChange={handleAuxFileChange}
                    />

                    {auxiliaryFile ? (
                      <div className="flex w-full items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Film className="h-5 w-5 shrink-0 text-primary" />
                          <div className="min-w-0 text-left">
                            <p className="truncate text-sm font-medium">
                              {auxiliaryFile.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(auxiliaryFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove explode video"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAuxiliaryFile(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Film className="h-6 w-6 text-muted-foreground" />
                        <p className="text-sm">
                          Drop an MP4 or JT, or click to upload
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Up to {AUX_MAX_MB}MB
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>
                      No explode view? Guid renders multi-view orthographics and asks Gemini Pro to propose a build order. The output page flags the inferred sequence so you can verify it before use.
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="md:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Configuration
                </CardTitle>
                <CardDescription>Set parameters for the AI pipeline.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Industry Domain</label>
                  <Select value={domain} onValueChange={setDomain}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select domain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Assembly</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing / Machinery</SelectItem>
                      <SelectItem value="furniture">Furniture & Home</SelectItem>
                      <SelectItem value="automotive">Automotive</SelectItem>
                      <SelectItem value="aerospace">Aerospace</SelectItem>
                      <SelectItem value="semiconductor">Semiconductor</SelectItem>
                      <SelectItem value="pharmaceutical">Pharmaceutical</SelectItem>
                      <SelectItem value="consumer">Consumer Electronics</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Helps the AI use correct terminology.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium leading-none">Quality Threshold</label>
                    <span className="font-mono text-sm text-primary">{qualityThreshold}%</span>
                  </div>
                  <Input
                    type="range"
                    min="50"
                    max="100"
                    value={qualityThreshold}
                    onChange={(e) => setQualityThreshold(e.target.value)}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
                  />
                  <p className="text-xs text-muted-foreground">Minimum score required to pass Quality Review.</p>
                </div>

                <div className="pt-4">
                  <Button className="w-full" size="lg" disabled={!file || isSubmitting} onClick={handleSubmit}>
                    {isSubmitting ? "Starting Pipeline..." : "Start Generation"}
                    {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-16">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Recent Jobs</h2>
            <Button variant="outline" size="sm" onClick={fetchJobs}>
              Refresh
            </Button>
          </div>

          <div className="rounded-none border bg-card">
            {isLoadingJobs ? (
              <div className="flex flex-col space-y-4 p-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                      <div className="space-y-2">
                        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                    <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-center">
                <FileText className="mb-4 h-10 w-10 text-muted-foreground/50" />
                <h3 className="text-lg font-medium">No jobs yet</h3>
                <p className="text-sm text-muted-foreground">Upload a document to get started.</p>
              </div>
            ) : (
              <div className="divide-y">
                {jobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 transition-colors hover:bg-accent/50 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {job.status === "completed" ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : job.status === "failed" ? (
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        ) : (
                          <Clock className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{job.documentName || job.filename}</h4>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span>{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
                          <span>·</span>
                          <span className="font-mono text-xs">{job.id}</span>
                          {job.totalCostUsd !== undefined && (
                            <>
                              <span>·</span>
                              <span>${job.totalCostUsd.toFixed(2)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <StatusBadge status={job.status} className="hidden sm:inline-flex" />
                      <Button variant="secondary" size="sm" onClick={() => router.push(job.status === "completed" ? `/output/${job.id}` : `/pipeline/${job.id}`)}>
                        {job.status === "completed" ? "View Output" : "Monitor Pipeline"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
