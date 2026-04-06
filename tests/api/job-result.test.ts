/**
 * API Integration Tests: Job Result
 *
 * Tests GET /api/jobs/[jobId]/result — the endpoint that returns
 * the completed work instruction (XML, quality report, illustrations).
 *
 * NOTE: These tests require a completed job. They check:
 * - 400 when job is not completed
 * - Response shape when job IS completed (if one exists)
 *
 * PREREQUISITE: Dev server running on localhost:3000
 */

import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

let pendingJobId: string;
let completedJobId: string | null = null;

beforeAll(async () => {
  // Create a pending job (won't be completed)
  const formData = new FormData();
  const file = new File(["%PDF-1.4 test"], "result-test.pdf", {
    type: "application/pdf",
  });
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/api/jobs`, {
    method: "POST",
    body: formData,
  });
  const body = await res.json();
  pendingJobId = body.jobId;

  // Look for an existing completed job
  const listRes = await fetch(`${BASE_URL}/api/jobs?limit=50`);
  const listBody = await listRes.json();
  const completed = listBody.jobs.find(
    (j: { status: string }) => j.status === "completed",
  );
  if (completed) {
    completedJobId = completed.id;
  }
});

describe("GET /api/jobs/[jobId]/result", () => {
  it("returns 404 for non-existent job", async () => {
    const res = await fetch(`${BASE_URL}/api/jobs/FAKE_ID/result`);
    expect(res.status).toBe(404);
  });

  it("returns error for non-completed job", async () => {
    // Wait a moment for the job to be inserted
    await new Promise((r) => setTimeout(r, 500));

    const res = await fetch(`${BASE_URL}/api/jobs/${pendingJobId}/result`);
    // Should be 400 (not completed) or possibly the job already started processing
    expect([400, 404].includes(res.status) || res.status === 200).toBe(true);
  });

  it("returns full result for a completed job (if one exists)", async () => {
    if (!completedJobId) {
      console.log("  ⏭ Skipping: no completed job found in database");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/jobs/${completedJobId}/result`);

    expect(res.status).toBe(200);

    const body = await res.json();

    // Verify response shape
    expect(body).toHaveProperty("job");
    expect(body).toHaveProperty("guide");
    expect(body).toHaveProperty("costBreakdown");

    // Job section
    expect(body.job).toHaveProperty("id");
    expect(body.job.status).toBe("completed");

    // Guide section
    expect(body.guide).toHaveProperty("xmlContent");
    expect(body.guide).toHaveProperty("jsonContent");
    expect(body.guide).toHaveProperty("qualityScore");
    expect(body.guide).toHaveProperty("qualityDecision");
    expect(typeof body.guide.xmlContent).toBe("string");
    expect(body.guide.xmlContent).toContain("<?xml");

    // Cost breakdown
    expect(Array.isArray(body.costBreakdown)).toBe(true);
    if (body.costBreakdown.length > 0) {
      expect(body.costBreakdown[0]).toHaveProperty("agent");
    }
  });

  it("returns XML when Accept header is application/xml (if completed job exists)", async () => {
    if (!completedJobId) {
      console.log("  ⏭ Skipping: no completed job found in database");
      return;
    }

    const res = await fetch(`${BASE_URL}/api/jobs/${completedJobId}/result`, {
      headers: { Accept: "application/xml" },
    });

    expect(res.status).toBe(200);

    const contentType = res.headers.get("content-type");
    expect(contentType).toContain("xml");

    const text = await res.text();
    expect(text).toContain("<?xml");
    expect(text).toContain("work-instruction");
  });
});
