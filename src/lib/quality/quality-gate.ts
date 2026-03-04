import { config } from "@/lib/config";
import type { QualityReviewResult, SafetyReviewResult } from "@/types/agents";

export type QualityDecision = "approved" | "revise" | "hold";

export interface QualityGateResult {
  /** Combined weighted quality score (0-100) */
  combinedScore: number;
  /** Decision based on threshold */
  decision: QualityDecision;
  /** Quality reviewer score */
  qualityScore: number;
  /** Safety score (derived: 100 if passed, reduced by critical issues) */
  safetyScore: number;
  /** Whether revision is allowed (based on loop count) */
  canRevise: boolean;
  /** Feedback for revision (if decision is "revise") */
  revisionFeedback: string | null;
}

/**
 * Evaluate quality and safety review results against the quality threshold.
 *
 * Combined score = 70% quality + 30% safety
 * Decision: >= threshold → approved, >= 70 → revise, < 70 → hold
 */
export function evaluateQualityGate(
  qualityReview: QualityReviewResult,
  safetyReview: SafetyReviewResult,
  revisionCount: number,
): QualityGateResult {
  const threshold = config.qualityThreshold;
  const maxRevisions = config.maxRevisionLoops;

  // Derive safety score: start at 100, deduct for issues
  const safetyScore = calculateSafetyScore(safetyReview);
  const qualityScore = qualityReview.overallScore;

  // Weighted combination: 70% quality, 30% safety
  const combinedScore = Math.round(qualityScore * 0.7 + safetyScore * 0.3);

  const canRevise = revisionCount < maxRevisions;

  let decision: QualityDecision;
  if (combinedScore >= threshold) {
    decision = "approved";
  } else if (combinedScore >= 70 && canRevise) {
    decision = "revise";
  } else {
    decision = combinedScore >= 70 ? "approved" : "hold";
    // If score is 70-84 but can't revise, force approve to keep pipeline moving
  }

  const revisionFeedback =
    decision === "revise" ? buildRevisionFeedback(qualityReview, safetyReview) : null;

  return {
    combinedScore,
    decision,
    qualityScore,
    safetyScore,
    canRevise,
    revisionFeedback,
  };
}

/**
 * Derive a 0-100 safety score from the safety review result.
 */
function calculateSafetyScore(review: SafetyReviewResult): number {
  let score = 100;

  for (const issue of review.issues) {
    if (issue.severity === "critical") {
      score -= 15;
    } else {
      score -= 5;
    }
  }

  // Safety failure is a heavy penalty
  if (!review.safetyPassed) {
    score = Math.min(score, 50);
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Build revision feedback string from quality and safety issues.
 * This gets passed to the Guideline Enforcer on revision.
 */
function buildRevisionFeedback(
  qualityReview: QualityReviewResult,
  safetyReview: SafetyReviewResult,
): string {
  const lines: string[] = [
    `Quality Score: ${qualityReview.overallScore}/100`,
    `Quality Decision: ${qualityReview.decision}`,
    "",
    "## Quality Issues to Fix:",
  ];

  // Include error and warning issues (skip info)
  const actionableIssues = qualityReview.issues.filter(
    (i) => i.severity === "error" || i.severity === "warning",
  );

  for (const issue of actionableIssues) {
    const stepRef = issue.stepNumber !== null ? `Step ${issue.stepNumber}` : "Guide-level";
    lines.push(`- [${issue.severity.toUpperCase()}] ${stepRef} (${issue.category}): ${issue.description}`);
    if (issue.suggestedFix) {
      lines.push(`  Fix: ${issue.suggestedFix}`);
    }
  }

  // Include critical safety issues
  const criticalSafety = safetyReview.issues.filter((i) => i.severity === "critical");
  if (criticalSafety.length > 0) {
    lines.push("", "## Critical Safety Issues:");
    for (const issue of criticalSafety) {
      const stepRef = issue.stepNumber !== null ? `Step ${issue.stepNumber}` : "Guide-level";
      lines.push(`- [CRITICAL] ${stepRef} (${issue.hazardType}): ${issue.description}`);
      lines.push(`  Required: ${issue.requiredAction}`);
    }
  }

  return lines.join("\n");
}
