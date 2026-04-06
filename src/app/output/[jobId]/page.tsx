import { OutputPageClient } from "./output-client";

export default async function OutputPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return <OutputPageClient jobId={jobId} />;
}
