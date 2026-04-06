/**
 * Test Fixtures: EnforcedGuide and related types
 *
 * These fixtures provide well-formed test data for unit tests.
 * The "valid" guide passes all 22 validators with zero flags.
 * Helper functions create "broken" variants with one defect each.
 */

import type {
  EnforcedGuide,
  EnforcedStep,
  GuideMetadata,
  SafetyCallout,
  StructuredPartRef,
  QualityReviewResult,
  SafetyReviewResult,
  QualityIssue,
  SafetyIssue,
} from "@/types/agents";
import type { XmlWorkInstruction } from "@/types/xml";

// ============================================================
// Valid EnforcedGuide (passes all 22 validators)
// ============================================================

export function makeValidStep(overrides: Partial<EnforcedStep> = {}): EnforcedStep {
  return {
    stepNumber: 1,
    title: "Insert the wooden dowels",
    primaryVerb: "Insert",
    instruction: "Insert the wooden dowel (A, ×2) into the pre-drilled holes on the side panel.",
    parts: [{ name: "Wooden dowel", id: "A", quantity: 2 }],
    safetyCallout: null,
    twoPersonRequired: false,
    transitionNote: null,
    phaseStart: "Frame Assembly",
    sourcePdfPages: [3],
    complexity: "simple",
    confidence: 0.9,
    ...overrides,
  };
}

export function makeValidStep2(overrides: Partial<EnforcedStep> = {}): EnforcedStep {
  return {
    stepNumber: 2,
    title: "Attach the shelf bracket",
    primaryVerb: "Attach",
    instruction: "Attach the shelf bracket (B, ×1) to the side panel using the cam lock.",
    parts: [{ name: "Shelf bracket", id: "B", quantity: 1 }],
    safetyCallout: null,
    twoPersonRequired: false,
    transitionNote: "Continue with the same side panel.",
    phaseStart: null,
    sourcePdfPages: [4],
    complexity: "simple",
    confidence: 0.85,
    ...overrides,
  };
}

export function makeValidMetadata(overrides: Partial<GuideMetadata> = {}): GuideMetadata {
  return {
    title: "Assemble the KALLAX Shelf Unit",
    safetyLevel: "low",
    estimatedMinutes: 30,
    personsRequired: 1,
    skillLevel: "basic_hand_tools",
    purposeStatement: "Assemble the KALLAX bookshelf unit following the manufacturer instructions.",
    ...overrides,
  };
}

export function makeValidGuide(overrides: Partial<EnforcedGuide> = {}): EnforcedGuide {
  return {
    steps: [makeValidStep(), makeValidStep2()],
    guideMetadata: makeValidMetadata(),
    ...overrides,
  };
}

// ============================================================
// Quality Review fixtures
// ============================================================

export function makeQualityReview(overrides: Partial<QualityReviewResult> = {}): QualityReviewResult {
  return {
    overallScore: 90,
    decision: "approved",
    issues: [],
    summary: "Guide meets all quality standards.",
    ...overrides,
  };
}

export function makeQualityIssue(overrides: Partial<QualityIssue> = {}): QualityIssue {
  return {
    severity: "warning",
    category: "verb_syntax",
    stepNumber: 1,
    description: "Step uses non-standard verb phrasing.",
    responsibleAgent: "enforcer",
    suggestedFix: "Rephrase to start with an approved verb.",
    ...overrides,
  };
}

// ============================================================
// Safety Review fixtures
// ============================================================

export function makeSafetyReview(overrides: Partial<SafetyReviewResult> = {}): SafetyReviewResult {
  return {
    safetyPassed: true,
    issues: [],
    recommendedSafetyLevel: "low",
    ...overrides,
  };
}

export function makeSafetyIssue(overrides: Partial<SafetyIssue> = {}): SafetyIssue {
  return {
    severity: "warning",
    coverage: "documented",
    stepNumber: 1,
    hazardType: "sharp_edge",
    description: "Sharp edges on metal bracket.",
    requiredAction: "Add safety callout about sharp edges.",
    ...overrides,
  };
}

// ============================================================
// XML Work Instruction fixture
// ============================================================

export function makeXmlWorkInstruction(overrides: Partial<XmlWorkInstruction> = {}): XmlWorkInstruction {
  return {
    metadata: {
      title: "KALLAX Bookshelf Assembly",
      domain: "furniture",
      safetyLevel: "low",
      estimatedMinutes: 30,
      personsRequired: 1,
      skillLevel: "basic_hand_tools",
      purpose: "Assemble the KALLAX bookshelf unit.",
      sourceDocument: {
        filename: "kallax-manual.pdf",
        format: "pdf",
        pageCount: 24,
      },
    },
    partsList: [
      { id: "A", name: "Wooden dowel", quantity: 8 },
      { id: "B", name: "Shelf bracket", quantity: 4 },
    ],
    toolsRequired: [
      { name: "Phillips screwdriver", required: true },
      { name: "Rubber mallet", required: false },
    ],
    safetyWarnings: [
      { severity: "caution", text: "Assemble on a soft surface to prevent scratching." },
    ],
    phases: [
      {
        name: "Frame Assembly",
        steps: [
          {
            number: 1,
            title: "Insert the wooden dowels",
            instruction: "Insert the wooden dowel into the pre-drilled holes.",
            parts: [{ id: "A", quantity: 2 }],
            tools: [{ name: "Rubber mallet" }],
            safety: [],
            illustrationSrc: "/api/jobs/test/illustrations/1",
            twoPersonRequired: false,
            complexity: "simple",
            confidence: 0.9,
            sourcePages: [3],
          },
          {
            number: 2,
            title: "Attach the shelf bracket",
            instruction: "Attach the shelf bracket to the side panel.",
            parts: [{ id: "B", quantity: 1 }],
            tools: [{ name: "Phillips screwdriver" }],
            safety: [],
            illustrationSrc: null,
            twoPersonRequired: false,
            complexity: "simple",
            confidence: 0.85,
            sourcePages: [4],
          },
        ],
      },
    ],
    generationMetadata: {
      jobId: "01HWTEST000000000000000000",
      generatedAt: "2026-03-04T12:00:00Z",
      qualityScore: 90,
      qualityDecision: "approved",
      totalCostUsd: 0.93,
      processingTimeMs: 45000,
      textRevisionLoops: 0,
      modelsUsed: ["gemini-2.5-flash", "gemini-2.5-pro"],
      qualityFlags: [],
    },
    ...overrides,
  };
}
