/**
 * Unit Tests: Quality Gate
 *
 * The quality gate decides the fate of a guide: approved, revise, or hold.
 * It uses a weighted formula: combined = 70% quality + 30% safety.
 *
 * WHY TEST THIS? Wrong math here means either:
 *   - Good guides get rejected (waste revision cycles + API $)
 *   - Bad guides get approved (bad output shipped to user)
 */

import { describe, it, expect, vi } from "vitest";
import { evaluateQualityGate } from "@/lib/quality/quality-gate";
import {
  makeQualityReview,
  makeSafetyReview,
  makeQualityIssue,
  makeSafetyIssue,
} from "../fixtures/enforced-guide";

// The quality gate reads config.qualityThreshold and config.maxRevisionLoops.
// We mock the config module to control these values in tests.
vi.mock("@/lib/config", () => ({
  config: {
    qualityThreshold: 85,
    maxRevisionLoops: 2,
  },
}));

describe("evaluateQualityGate", () => {
  // ============================================================
  // Decision: Approved
  // ============================================================

  it("approves when combined score >= threshold", () => {
    // Quality 90, no safety issues → safety 100
    // Combined = 90*0.7 + 100*0.3 = 63 + 30 = 93 → >= 85 → approved
    const result = evaluateQualityGate(
      makeQualityReview({ overallScore: 90 }),
      makeSafetyReview(),
      0,
    );

    expect(result.decision).toBe("approved");
    expect(result.combinedScore).toBe(93);
    expect(result.revisionFeedback).toBeNull();
  });

  // ============================================================
  // Decision: Revise
  // ============================================================

  it("requests revision when score is 70-84 and can still revise", () => {
    // Quality 75, safety 100 → combined = 75*0.7 + 100*0.3 = 52.5+30 = 82.5 → 83
    // 83 >= 70, 83 < 85, canRevise=true → revise
    const result = evaluateQualityGate(
      makeQualityReview({ overallScore: 75 }),
      makeSafetyReview(),
      0, // first attempt, can revise
    );

    expect(result.decision).toBe("revise");
    expect(result.combinedScore).toBe(83);
    expect(result.canRevise).toBe(true);
    expect(result.revisionFeedback).not.toBeNull();
  });

  // ============================================================
  // Decision: Force-approve (can't revise anymore)
  // ============================================================

  it("force-approves when score is 70-84 but max revisions reached", () => {
    // Same score as above, but revisionCount=2 (max)
    const result = evaluateQualityGate(
      makeQualityReview({ overallScore: 75 }),
      makeSafetyReview(),
      2, // max revisions reached
    );

    expect(result.decision).toBe("approved"); // force-approved
    expect(result.canRevise).toBe(false);
    expect(result.revisionFeedback).toBeNull(); // no feedback since not revising
  });

  // ============================================================
  // Decision: Hold
  // ============================================================

  it("holds when combined score < 70", () => {
    // Quality 50, safety failed with critical issues
    // Safety score: 100 - 15 - 15 = 70, but safetyPassed=false → capped at 50
    // Combined = 50*0.7 + 50*0.3 = 35+15 = 50 → < 70 → hold
    const result = evaluateQualityGate(
      makeQualityReview({ overallScore: 50 }),
      makeSafetyReview({
        safetyPassed: false,
        issues: [
          makeSafetyIssue({ severity: "critical" }),
          makeSafetyIssue({ severity: "critical", stepNumber: 2 }),
        ],
      }),
      0,
    );

    expect(result.decision).toBe("hold");
    expect(result.combinedScore).toBeLessThan(70);
  });

  // ============================================================
  // Safety score calculation
  // ============================================================

  it("deducts 15 per critical issue and 5 per non-critical", () => {
    const result = evaluateQualityGate(
      makeQualityReview({ overallScore: 90 }),
      makeSafetyReview({
        safetyPassed: true,
        issues: [
          makeSafetyIssue({ severity: "critical" }), // -15 → 85
          makeSafetyIssue({ severity: "warning" }),   // -5 → 80
        ],
      }),
      0,
    );

    expect(result.safetyScore).toBe(80);
  });

  it("caps safety score at 50 when safetyPassed is false", () => {
    const result = evaluateQualityGate(
      makeQualityReview({ overallScore: 90 }),
      makeSafetyReview({
        safetyPassed: false,
        issues: [], // even with no issues, if safety failed → cap at 50
      }),
      0,
    );

    expect(result.safetyScore).toBeLessThanOrEqual(50);
  });

  it("never goes below 0", () => {
    const result = evaluateQualityGate(
      makeQualityReview({ overallScore: 90 }),
      makeSafetyReview({
        safetyPassed: false,
        issues: Array(10).fill(makeSafetyIssue({ severity: "critical" })),
      }),
      0,
    );

    expect(result.safetyScore).toBeGreaterThanOrEqual(0);
  });

  // ============================================================
  // Revision feedback content
  // ============================================================

  it("includes quality issues in revision feedback", () => {
    const result = evaluateQualityGate(
      makeQualityReview({
        overallScore: 75,
        issues: [
          makeQualityIssue({ severity: "error", description: "Bad verb usage" }),
        ],
      }),
      makeSafetyReview(),
      0,
    );

    expect(result.decision).toBe("revise");
    expect(result.revisionFeedback).toContain("Bad verb usage");
  });

  it("includes critical safety issues in revision feedback", () => {
    const result = evaluateQualityGate(
      makeQualityReview({ overallScore: 75 }),
      makeSafetyReview({
        safetyPassed: true,
        issues: [
          makeSafetyIssue({
            severity: "critical",
            description: "Missing electrical warning",
            requiredAction: "Add danger callout",
          }),
        ],
      }),
      0,
    );

    expect(result.decision).toBe("revise");
    expect(result.revisionFeedback).toContain("Missing electrical warning");
    expect(result.revisionFeedback).toContain("Add danger callout");
  });

  // ============================================================
  // Weighted score math
  // ============================================================

  it("correctly applies 70/30 weighting", () => {
    const result = evaluateQualityGate(
      makeQualityReview({ overallScore: 100 }),
      makeSafetyReview({ safetyPassed: true, issues: [] }),
      0,
    );

    // 100*0.7 + 100*0.3 = 100
    expect(result.combinedScore).toBe(100);
    expect(result.qualityScore).toBe(100);
    expect(result.safetyScore).toBe(100);
  });
});
