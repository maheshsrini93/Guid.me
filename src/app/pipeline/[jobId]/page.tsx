export default async function PipelineMonitorPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold tracking-tight">Pipeline Monitor</h1>
      <p className="mt-2 text-muted-foreground">Job: {jobId}</p>
      <p className="mt-6 text-sm text-muted-foreground">
        Pipeline Monitor view — coming in Phase 2
      </p>
    </main>
  );
}
