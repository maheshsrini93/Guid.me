import { PipelineMonitor } from "@/components/pipeline/pipeline-monitor";
import { Header } from "@/components/shared/header";

export default async function PipelinePage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;

  return (
    <>
      <Header />
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <PipelineMonitor jobId={jobId} />
      </div>
    </>
  );
}
