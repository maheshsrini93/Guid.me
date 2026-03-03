export default async function OutputReviewPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold tracking-tight">Output Review</h1>
      <p className="mt-2 text-muted-foreground">Job: {jobId}</p>
      <p className="mt-6 text-sm text-muted-foreground">
        Output Review view — coming in Phase 3
      </p>
    </main>
  );
}
