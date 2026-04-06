/**
 * Test Fixtures: EnforcedGuide and related types (v2.0)
 *
 * These fixtures provide well-formed test data for unit tests.
 * The "valid" guide passes all 32 validators with zero flags.
 * Helper functions create "broken" variants with one defect each.
 */

import type {
  EnforcedGuide,
  EnforcedStep,
  GuideMetadata,
  SafetyCallout,
  StructuredPartRef,
  BeforeYouBegin,
  FinishingUp,
  TermGlossaryEntry,
  EnforcementSummary,
  QualityReviewResult,
  SafetyReviewResult,
  QualityIssue,
  SafetyIssue,
} from "@/types/agents";
import type { XmlWorkInstruction } from "@/types/xml";

// ============================================================
// Valid EnforcedGuide (passes all 32 validators)
// ============================================================

export function makeValidStep(overrides: Partial<EnforcedStep> = {}): EnforcedStep {
  return {
    stepNumber: 1,
    title: "Insert the wooden dowels",
    primaryVerb: "Insert",
    instruction: "Insert the wooden dowel (A, ×2) into the pre-drilled holes on the side panel.",
    subNotes: ["Tap each dowel flush using a rubber mallet."],
    parts: [{ name: "Wooden dowel", id: "A", quantity: 2 }],
    toolsRequired: ["Rubber mallet"],
    safetyCallouts: [],
    twoPersonRequired: false,
    confirmationCue: "Dowels sit flush with the panel surface.",
    difficultyFlag: null,
    isCheckpoint: false,
    checkpointNote: null,
    dryingTimeMinutes: null,
    transitionNote: null,
    phaseStart: "Frame Assembly",
    sourcePdfPages: [3],
    complexity: "simple",
    confidence: 0.9,
    needsReview: false,
    illustrationPrompt: "Isometric 30° view, white background. Show a hand inserting a wooden dowel into a pre-drilled hole on a light birch side panel. Dowel at full color, panel muted. Blue downward arrow indicating insertion direction.",
    illustrationComplexity: "simple",
    ...overrides,
  };
}

export function makeValidStep2(overrides: Partial<EnforcedStep> = {}): EnforcedStep {
  return {
    stepNumber: 2,
    title: "Attach the shelf bracket",
    primaryVerb: "Attach",
    instruction: "Attach the shelf bracket (B, ×1) to the side panel using the cam lock.",
    subNotes: ["Tighten clockwise until you hear a click."],
    parts: [{ name: "Shelf bracket", id: "B", quantity: 1 }],
    toolsRequired: ["Phillips screwdriver"],
    safetyCallouts: [],
    twoPersonRequired: false,
    confirmationCue: "Cam lock clicks into locked position.",
    difficultyFlag: null,
    isCheckpoint: false,
    checkpointNote: null,
    dryingTimeMinutes: null,
    transitionNote: "Continue with the same side panel.",
    phaseStart: null,
    sourcePdfPages: [4],
    complexity: "simple",
    confidence: 0.85,
    needsReview: false,
    illustrationPrompt: "Isometric 30° view, white background. Show shelf bracket being attached to side panel with cam lock. Bracket at full color, panel muted. Clockwise rotation arrow in green.",
    illustrationComplexity: "simple",
    ...overrides,
  };
}

export function makeValidMetadata(overrides: Partial<GuideMetadata> = {}): GuideMetadata {
  return {
    title: "Assemble the KALLAX Bookshelf",
    safetyLevel: "low",
    estimatedMinutes: 30,
    dryingTimeMinutes: null,
    personsRequired: 1,
    twoPersonSteps: [],
    skillLevel: "basic_hand_tools",
    purposeStatement: "To assemble the KALLAX bookshelf unit following the manufacturer instructions.",
    safetyGear: [],
    tools: {
      included: [{ name: "Allen key", quantity: 1 }],
      userProvided: [{ name: "Phillips screwdriver", quantity: 1 }, { name: "Rubber mallet", quantity: 1 }],
    },
    colorPalette: {
      woodPanels: "#D4A574",
      hardware: "#C0C0C0",
      backing: "#F5F5DC",
      plastic: "#FFFFFF",
    },
    ...overrides,
  };
}

export function makeValidBeforeYouBegin(overrides: Partial<BeforeYouBegin> = {}): BeforeYouBegin {
  return {
    workspace: "Clear, flat surface at least 2m × 2m. Use packaging cardboard to protect the floor.",
    preconditions: ["Verify all parts against the parts list before starting."],
    commonMistakes: [
      "Installing shelves upside-down — check the dowel hole alignment.",
      "Over-tightening cam locks — stop when you feel resistance.",
    ],
    ...overrides,
  };
}

export function makeValidFinishingUp(overrides: Partial<FinishingUp> = {}): FinishingUp {
  return {
    tightenCheck: "Go back and check all cam locks are fully engaged.",
    wallAnchoring: null,
    levelCheck: "Place a level on top to verify the unit is even.",
    cleanup: "Remove packaging materials and wipe surfaces with a dry cloth.",
    usageTips: ["Distribute weight evenly across shelves.", "Do not exceed 13 kg per shelf."],
    ...overrides,
  };
}

export function makeValidEnforcementSummary(overrides: Partial<EnforcementSummary> = {}): EnforcementSummary {
  return {
    totalSteps: 2,
    stepsRewritten: 2,
    safetyCalloutsAdded: 0,
    twoPersonStepsFlagged: 0,
    needsReviewCount: 0,
    rulesApplied: ["WI-022", "WI-024", "WI-025", "WI-026"],
    ...overrides,
  };
}

export function makeValidGuide(overrides: Partial<EnforcedGuide> = {}): EnforcedGuide {
  return {
    steps: [makeValidStep(), makeValidStep2()],
    guideMetadata: makeValidMetadata(),
    beforeYouBegin: makeValidBeforeYouBegin(),
    finishingUp: makeValidFinishingUp(),
    terminologyGlossary: [
      { term: "cam lock", definition: "Rotating fastener that locks with a quarter-turn" },
      { term: "dowel", definition: "Cylindrical wooden pin for alignment" },
    ],
    enforcementSummary: makeValidEnforcementSummary(),
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
      title: "Assemble the KALLAX Bookshelf",
      domain: "furniture",
      safetyLevel: "low",
      estimatedMinutes: 30,
      personsRequired: 1,
      skillLevel: "basic_hand_tools",
      purpose: "To assemble the KALLAX bookshelf unit.",
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
