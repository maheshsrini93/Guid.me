/**
 * API Integration Tests: Job CRUD
 *
 * These tests make real HTTP requests to the running dev server.
 * They test the contract between frontend and backend — if the response
 * shape changes, these tests catch it before the UI breaks.
 *
 * PREREQUISITE: Dev server must be running on localhost:3000
 * Run with: DEMO_MODE=true pnpm dev (in another terminal)
 *
 * WHY INTEGRATION TESTS?
 * Unit tests verify logic in isolation. Integration tests verify that
 * the pieces actually work together: routing → handler → database → response.
 */

import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

// Check if server is running before all tests
beforeAll(async () => {
  try {
    const res = await fetch(BASE_URL);
    if (!res.ok && res.status !== 304) {
      throw new Error(`Server returned ${res.status}`);
    }
  } catch {
    throw new Error(
      `Dev server not running at ${BASE_URL}. Start it with: DEMO_MODE=true pnpm dev`,
    );
  }
});

describe("POST /api/jobs", () => {
  it("creates a job with a valid PDF file and returns 201 + jobId", async () => {
    const formData = new FormData();
    const file = new File(["%PDF-1.4 test"], "test.pdf", {
      type: "application/pdf",
    });
    formData.append("file", file);
    formData.append("domain", "furniture");

    const res = await fetch(`${BASE_URL}/api/jobs`, {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body).toHaveProperty("jobId");
    expect(typeof body.jobId).toBe("string");
    expect(body.jobId.length).toBeGreaterThan(0);
  });

  it("returns 400 when no file is provided", async () => {
    const formData = new FormData();

    const res = await fetch(`${BASE_URL}/api/jobs`, {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body.error).toContain("No file");
  });

  it("returns 400 for unsupported MIME type", async () => {
    const formData = new FormData();
    const file = new File(["hello"], "test.txt", { type: "text/plain" });
    formData.append("file", file);

    const res = await fetch(`${BASE_URL}/api/jobs`, {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Unsupported");
  });
});

describe("GET /api/jobs", () => {
  it("returns a list of jobs with pagination metadata", async () => {
    const res = await fetch(`${BASE_URL}/api/jobs`);

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("jobs");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("limit");
    expect(body).toHaveProperty("offset");
    expect(Array.isArray(body.jobs)).toBe(true);
    expect(typeof body.total).toBe("number");
  });

  it("respects the limit parameter", async () => {
    const res = await fetch(`${BASE_URL}/api/jobs?limit=1`);
    const body = await res.json();

    expect(body.jobs.length).toBeLessThanOrEqual(1);
    expect(body.limit).toBe(1);
  });

  it("respects the offset parameter", async () => {
    const res = await fetch(`${BASE_URL}/api/jobs?offset=0&limit=2`);
    const body = await res.json();

    expect(body.offset).toBe(0);
  });

  it("each job has expected fields", async () => {
    const res = await fetch(`${BASE_URL}/api/jobs?limit=1`);
    const body = await res.json();

    if (body.jobs.length > 0) {
      const job = body.jobs[0];
      expect(job).toHaveProperty("id");
      expect(job).toHaveProperty("status");
      expect(job).toHaveProperty("filename");
      expect(job).toHaveProperty("domain");
      expect(job).toHaveProperty("createdAt");
    }
  });
});
