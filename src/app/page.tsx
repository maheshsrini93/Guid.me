"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Settings, ArrowRight, Clock, CheckCircle2, AlertCircle } from "lucide-react";
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

export default function Page() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  const [domain, setDomain] = useState("general");
  const [qualityThreshold, setQualityThreshold] = useState("85");

  useEffect(() => {
    fetchJobs();
  }, []);

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(file.type)) {
      alert("Please upload a PDF or DOCX file.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert("File size must be less than 50MB.");
      return;
    }
    setFile(file);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("domain", domain);
      formData.append("qualityThreshold", qualityThreshold);

      const res = await fetch("/api/jobs", {
        method: "POST",
        body: formData,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();

      if (data.jobId) {
        router.push(`/pipeline/${data.jobId}`);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to start job. Please try again.");
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
            Upload any technical document, PDF, or DOCX. Our 8-agent AI pipeline will automatically extract, structure, and illustrate a complete work instruction.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-3">
            <Card className="h-full border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload Document
                </CardTitle>
                <CardDescription>Drag and drop your PDF or DOCX file here (max 50MB).</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
                    isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:bg-accent/50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  <input id="file-upload" type="file" className="hidden" accept=".pdf,.docx" onChange={handleFileChange} />

                  {file ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <FileText className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
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
                        <p className="mt-1 text-sm text-muted-foreground">PDF or DOCX up to 50MB</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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
