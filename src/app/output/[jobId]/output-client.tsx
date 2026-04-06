"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileJson, Image as ImageIcon, LayoutList, ShieldCheck, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/shared/header";
import { InstructionViewer } from "@/components/output/instruction-viewer";
import { XmlViewer } from "@/components/output/xml-viewer";
import { IllustrationGallery } from "@/components/output/illustration-gallery";
import { QualityReport } from "@/components/output/quality-report";
import { CostBreakdown } from "@/components/output/cost-breakdown";

export function OutputPageClient({ jobId }: { jobId: string }) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/result`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch output data");
        const json = await res.json();

        // Transform API response into the shape components expect
        const costByAgent: Record<string, number> = {};
        let totalCost = 0;
        for (const entry of json.costBreakdown ?? []) {
          const name = entry.agent ?? "unknown";
          costByAgent[name] = (costByAgent[name] ?? 0) + (entry.costUsd ?? 0);
          totalCost += entry.costUsd ?? 0;
        }

        const startedAt = json.job?.createdAt ? new Date(json.job.createdAt).getTime() : 0;
        const completedAt = json.job?.completedAt ? new Date(json.job.completedAt).getTime() : 0;

        // Derive a readable title from the filename (strip extension, replace separators)
        const displayTitle = (json.job?.filename ?? "")
          .replace(/\.[^.]+$/, "")          // remove extension
          .replace(/__.*$/, "")             // remove IKEA article suffix
          .replace(/[-_]+/g, " ")           // separators → spaces
          .replace(/\b\w/g, (c: string) => c.toUpperCase()) // title case
          .trim();

        const transformed = {
          ...json,
          displayTitle: displayTitle || json.guide?.title || "Untitled",
          xml: json.guide?.xmlContent ?? "",
          quality: {
            score: json.guide?.qualityScore ?? 0,
            decision: json.guide?.qualityDecision ?? "unknown",
            issues: json.guide?.qualityIssues ?? [],
            safetyPassed: !(json.guide?.safetyIssues ?? []).some((i: any) => i.coverage === "undocumented"),
            safetyIssues: json.guide?.safetyIssues ?? [],
          },
          cost: {
            totalUsd: totalCost || json.job?.totalCostUsd || 0,
            breakdown: costByAgent,
          },
          metadata: {
            processingTimeMs: completedAt && startedAt ? completedAt - startedAt : 0,
            textRevisionLoops: json.guide?.textRevisionLoops ?? 0,
            modelsUsed: json.guide?.modelsUsed ?? [],
          },
        };
        setData(transformed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };
    if (jobId) fetchData();
  }, [jobId]);

  const handleDownloadXml = () => {
    if (!data?.xml) return;
    const blob = new Blob([data.xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(data.displayTitle ?? "output").replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Header />
        <div className="container mx-auto max-w-4xl px-4 py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold">Failed to load output</h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button asChild className="mt-6">
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Top Bar */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                Jobs
              </Link>
              <span>/</span>
              <span className="font-mono">{jobId}</span>
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">{data.displayTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link href={`/pipeline/${jobId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Pipeline
              </Link>
            </Button>
            <Button onClick={handleDownloadXml}>
              <Download className="mr-2 h-4 w-4" /> Export XML
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-none border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Quality Score</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold">{data.quality?.score ?? "—"}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
          </div>
          <div className="rounded-none border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Safety Level</p>
            <p className="mt-2 text-3xl font-bold capitalize">{data.guide?.safetyLevel ?? "—"}</p>
          </div>
          <div className="rounded-none border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Structure</p>
            <p className="mt-2 text-3xl font-bold">
              {data.guide?.phaseCount ?? 0} <span className="text-base font-normal text-muted-foreground">sections</span>
            </p>
          </div>
          <div className="rounded-none border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Cost</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">${(data.cost?.totalUsd ?? 0).toFixed(2)}</p>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="instruction" className="w-full">
          <TabsList className="mb-6 w-full justify-start overflow-x-auto rounded-none border-b bg-transparent p-0">
            <TabsTrigger
              value="instruction"
              className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <LayoutList className="mr-2 h-4 w-4" /> Instruction
            </TabsTrigger>
            <TabsTrigger
              value="xml"
              className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <FileJson className="mr-2 h-4 w-4" /> XML Output
            </TabsTrigger>
            <TabsTrigger
              value="illustrations"
              className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <ImageIcon className="mr-2 h-4 w-4" /> Illustrations
            </TabsTrigger>
            <TabsTrigger
              value="quality"
              className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <ShieldCheck className="mr-2 h-4 w-4" /> Quality & Safety
            </TabsTrigger>
            <TabsTrigger
              value="cost"
              className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <DollarSign className="mr-2 h-4 w-4" /> Cost Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="instruction" className="mt-0 outline-none">
            <InstructionViewer data={data.guide?.jsonContent} jobId={jobId} />
          </TabsContent>
          <TabsContent value="xml" className="mt-0 outline-none">
            <XmlViewer xml={data.xml} />
          </TabsContent>
          <TabsContent value="illustrations" className="mt-0 outline-none">
            <IllustrationGallery jobId={jobId} steps={data.guide?.jsonContent?.phases?.flatMap((p: any) => p.steps) ?? []} />
          </TabsContent>
          <TabsContent value="quality" className="mt-0 outline-none">
            <QualityReport quality={data.quality} />
          </TabsContent>
          <TabsContent value="cost" className="mt-0 outline-none">
            <CostBreakdown cost={data.cost} metadata={data.metadata} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
