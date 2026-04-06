/**
 * API Integration Tests: SSE Event Stream
 *
 * Tests GET /api/jobs/[jobId]/sse — the Server-Sent Events endpoint
 * that pushes real-time pipeline updates to the frontend.
 *
 * SSE is the backbone of the Pipeline Monitor — if events stop flowing
 * or come in the wrong format, the UI goes dark.
 *
 * PREREQUISITE: Dev server running on localhost:3000 with DEMO_MODE=true
 *
 * WHY TEST SSE?
 * SSE is tricky — it's a long-lived HTTP connection with a custom text format.
 * Events must be properly formatted as "event: type\ndata: json\n\n".
 * The stream must eventually close. Events must come in the right order.
 */

import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

describe("GET /api/jobs/[jobId]/sse", () => {
  it("connects and receives SSE events for a new job", async () => {
    // Create a fresh job so we can watch its SSE stream
    const formData = new FormData();
    const file = new File(["%PDF-1.4 test"], "sse-test.pdf", {
      type: "application/pdf",
    });
    formData.append("file", file);

    const createRes = await fetch(`${BASE_URL}/api/jobs`, {
      method: "POST",
      body: formData,
    });
    const { jobId } = await createRes.json();

    // Connect to SSE stream
    const sseRes = await fetch(`${BASE_URL}/api/jobs/${jobId}/sse`);
    expect(sseRes.status).toBe(200);

    const contentType = sseRes.headers.get("content-type");
    expect(contentType).toContain("text/event-stream");

    // Read some events from the stream (with a timeout)
    const reader = sseRes.body!.getReader();
    const decoder = new TextDecoder();
    const events: { type: string; data: string }[] = [];
    const startTime = Date.now();
    const TIMEOUT_MS = 60_000; // 60 seconds — demo pipeline takes ~35s

    try {
      while (Date.now() - startTime < TIMEOUT_MS) {
        const { done, value } = await Promise.race([
          reader.read(),
          new Promise<{ done: true; value: undefined }>((resolve) =>
            setTimeout(() => resolve({ done: true, value: undefined }), TIMEOUT_MS),
          ),
        ]);

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE events from chunk
        const lines = chunk.split("\n");
        let currentType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentType = line.slice(7).trim();
          } else if (line.startsWith("data: ") && currentType) {
            events.push({ type: currentType, data: line.slice(6).trim() });
            currentType = "";
          }
        }

        // Check if pipeline completed
        const hasComplete = events.some(
          (e) => e.type === "pipeline:complete" || e.type === "pipeline:error",
        );
        if (hasComplete) break;
      }
    } finally {
      reader.cancel().catch(() => {});
    }

    // Verify we received events
    expect(events.length).toBeGreaterThan(0);

    // Verify event types we expect
    const eventTypes = events.map((e) => e.type);
    expect(eventTypes).toContain("pipeline:state");

    // Verify all data payloads are valid JSON
    for (const event of events) {
      expect(() => JSON.parse(event.data)).not.toThrow();
    }

    // If pipeline completed, verify we got agent lifecycle events
    if (eventTypes.includes("pipeline:complete")) {
      const hasAgentEvents = eventTypes.includes("agent:start") || eventTypes.includes("agent:complete");
      expect(hasAgentEvents).toBe(true);
    }
  }, 90_000); // 90 second timeout for this test

  it("returns events for a completed job (buffered replay)", async () => {
    // Find a completed job
    const listRes = await fetch(`${BASE_URL}/api/jobs?limit=50`);
    const { jobs: allJobs } = await listRes.json();
    const completedJob = allJobs.find(
      (j: { status: string }) => j.status === "completed",
    );

    if (!completedJob) {
      console.log("  ⏭ Skipping: no completed job for buffer replay test");
      return;
    }

    // Connect to SSE — should get buffered events replayed immediately
    const sseRes = await fetch(`${BASE_URL}/api/jobs/${completedJob.id}/sse`);
    expect(sseRes.status).toBe(200);

    const reader = sseRes.body!.getReader();
    const decoder = new TextDecoder();
    let allText = "";

    // Read for a few seconds (buffered events come fast)
    const endTime = Date.now() + 5000;
    try {
      while (Date.now() < endTime) {
        const { done, value } = await Promise.race([
          reader.read(),
          new Promise<{ done: true; value: undefined }>((resolve) =>
            setTimeout(() => resolve({ done: true, value: undefined }), 5000),
          ),
        ]);

        if (done) break;
        allText += decoder.decode(value, { stream: true });
      }
    } finally {
      reader.cancel().catch(() => {});
    }

    // Should have received some events
    expect(allText.length).toBeGreaterThan(0);
    expect(allText).toContain("event:");
    expect(allText).toContain("data:");
  }, 15_000);
});
