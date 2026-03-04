import { PipelineMonitor } from "@/components/pipeline/pipeline-monitor";

export default async function PipelineMonitorPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  return <PipelineMonitor jobId={jobId} />;
}
