/**
 * API Integration Tests: Job Status
 *
 * Tests GET /api/jobs/[jobId] — the endpoint that the Pipeline Monitor
 * polls for job details and agent execution history.
 *
 * PREREQUISITE: Dev server running on localhost:3000
 */

import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

let testJobId: string;

beforeAll(async () => {
  // Create a job for testing
  const formData = new FormData();
  const file = new File(["%PDF-1.4 test"], "status-test.pdf", {
    type: "application/pdf",
  });
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/api/jobs`, {
    method: "POST",
    body: formData,
  });

  const body = await res.json();
  testJobId = body.jobId;
});

describe("GET /api/jobs/[jobId]", () => {
  it("returns job details for an existing job", async () => {
    const res = await fetch(`${BASE_URL}/api/jobs/${testJobId}`);

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("job");
    expect(body).toHaveProperty("executions");
    expect(body.job.id).toBe(testJobId);
    expect(body.job).toHaveProperty("status");
    expect(body.job).toHaveProperty("filename");
    expect(body.job).toHaveProperty("domain");
    expect(body.job).toHaveProperty("mimeType");
    expect(body.job).toHaveProperty("fileSize");
    expect(body.job).toHaveProperty("qualityThreshold");
    expect(body.job).toHaveProperty("totalCostUsd");
    expect(body.job).toHaveProperty("createdAt");
    expect(Array.isArray(body.executions)).toBe(true);
  });

  it("returns 404 for a non-existent job", async () => {
    const res = await fetch(`${BASE_URL}/api/jobs/NONEXISTENT_JOB_ID`);

    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body.error).toContain("not found");
  });
});
