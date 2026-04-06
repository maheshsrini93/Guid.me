/**
 * Unit Tests: Validator Registry (22 validators)
 *
 * Validators scan a completed guide and produce "quality flags" — informational
 * markers that indicate issues like unapproved verbs, long sentences, or missing safety.
 * They don't block the pipeline; they inform the quality reviewer.
 *
 * WHY TEST THIS? False positives waste revision cycles. False negatives let bad output ship.
 */

import { describe, it, expect } from "vitest";
import { validateGuide, summarizeFlags } from "@/lib/quality/validator-registry";
import {
  makeValidGuide,
  makeValidStep,
  makeValidStep2,
  makeValidMetadata,
} from "../fixtures/enforced-guide";

describe("validateGuide", () => {
  // ============================================================
  // Golden path: valid guide should produce minimal flags
  // ============================================================

  it("produces zero error flags for a perfectly valid guide", () => {
    const guide = makeValidGuide();
    const flags = validateGuide(guide);
    const errors = flags.filter((f) => f.severity === "error");
    expect(errors).toHaveLength(0);
  });

  // ============================================================
  // Validator 1: Unapproved verbs
  // ============================================================

  it("flags unapproved primary verb", () => {
    const guide = makeValidGuide({
      steps: [
        makeValidStep({ primaryVerb: "Do" as any }),
        makeValidStep2(),
      ],
    });

    const flags = validateGuide(guide);
    const verbFlags = flags.filter((f) => f.validator === "unapproved-verb");
    expect(verbFlags.length).toBeGreaterThanOrEqual(1);
    expect(verbFlags[0].severity).toBe("error");
    expect(verbFlags[0].message).toContain("Do");
  });

  // ============================================================
  // Validator 2: Verb-first sentences
  // ============================================================

  it("flags instruction that does not start with an approved verb", () => {
    const guide = makeValidGuide({
      steps: [
        makeValidStep({ instruction: "The screw goes into the hole." }),
        makeValidStep2(),
      ],
    });

    const flags = validateGuide(guide);
    const verbFirstFlags = flags.filter((f) => f.validator === "verb-first-sentence");
    expect(verbFirstFlags.length).toBeGreaterThanOrEqual(1);
    expect(verbFirstFlags[0].severity).toBe("error");
  });

  // ============================================================
  // Validator 3: Sentence length
  // ============================================================

  it("flags sentences longer than 20 words", () => {
    const longInstruction =
      "Insert the wooden dowel into the pre-drilled hole on the left side of the main panel ensuring it is flush with the surface edge completely.";
    const guide = makeValidGuide({
      steps: [
        makeValidStep({ instruction: longInstruction }),
        makeValidStep2(),
      ],
    });

    const flags = validateGuide(guide);
    const lengthFlags = flags.filter((f) => f.validator === "sentence-length");
    expect(lengthFlags.length).toBeGreaterThanOrEqual(1);
    expect(lengthFlags[0].severity).toBe("warning");
  });

  // ============================================================
  // Validator 4: Missing parts references
  // ============================================================

  it("flags parts not referenced in instruction", () => {
    const guide = makeValidGuide({
      steps: [
        makeValidStep({
          instruction: "Insert the piece into the hole.",
          parts: [{ name: "Wooden dowel", id: "A", quantity: 2 }],
        }),
        makeValidStep2(),
      ],
    });

    const flags = validateGuide(guide);
    const partFlags = flags.filter((f) => f.validator === "missing-parts-ref");
    expect(partFlags.length).toBeGreaterThanOrEqual(1);
    expect(partFlags[0].message).toContain("A");
  });

  // ============================================================
  // Validator 5: Missing quantity
  // ============================================================

  it("flags parts with zero or missing quantity", () => {
    const guide = makeValidGuide({
      steps: [
        makeValidStep({
          parts: [{ name: "Wooden dowel", id: "A", quantity: 0 }],
        }),
        makeValidStep2(),
      ],
    });

    const flags = validateGuide(guide);
    const qtyFlags = flags.filter((f) => f.validator === "missing-quantity");
    expect(qtyFlags.length).toBeGreaterThanOrEqual(1);
  });

  // ============================================================
  // Validator 6: Part ID format
  // ============================================================

  it("flags parts with empty ID", () => {
    const guide = makeValidGuide({
      steps: [
        makeValidStep({
          parts: [{ name: "Wooden dowel", id: "", quantity: 2 }],
        }),
        makeValidStep2(),
      ],
    });

    const flags = validateGuide(guide);
    const idFlags = flags.filter((f) => f.validator === "part-id-format");
    expect(idFlags.length).toBeGreaterThanOrEqual(1);
    expect(idFlags[0].severity).toBe("error");
  });

  // ============================================================
  // Validator 7: Missing safety warning for hazardous ops
  // ============================================================

  it("flags hazardous instruction without safety callout", () => {
    const guide = makeValidGuide({
      steps: [
        makeValidStep({
          instruction: "Insert the sharp metal bracket into the slot.",
          safetyCallout: null,
        }),
        makeValidStep2(),
      ],
    });

    const flags = validateGuide(guide);
    const safetyFlags = flags.filter((f) => f.validator === "missing-safety-warning");
    expect(safetyFlags.length).toBeGreaterThanOrEqual(1);
    expect(safetyFlags[0].severity).toBe("error");
  });

  // ============================================================
  // Validator 8: Two-person consistency
  // ============================================================

  it("flags instruction mentioning two people but twoPersonRequired is false", () => {
    const guide = makeValidGuide({
      steps: [
        makeValidStep({
          instruction: "Insert the panel with a partner holding the other end.",
          twoPersonRequired: false,
        }),
        makeValidStep2(),
      ],
    });

    const flags = validateGuide(guide);
    const twoPersonFlags = flags.filter((f) => f.validator === "two-person-consistency");
    expect(twoPersonFlags.length).toBeGreaterThanOrEqual(1);
    expect(twoPersonFlags[0].severity).toBe("warning");
  });

  // ============================================================
  // Validator 9: Step numbering sequential
  // ============================================================

  it("flags non-sequential step numbers", () => {
    const guide = makeValidGuide({
      steps: [
        makeValidStep({ stepNumber: 1 }),
        makeValidStep2({ stepNumber: 3 }), // gap: should be 2
      ],
    });

    const flags = validateGuide(guide);
    const numFlags = flags.filter((f) => f.validator === "step-numbering");
    expect(numFlags.length).toBeGreaterThanOrEqual(1);
  });

  // ============================================================
  // Validator 10: Empty instruction
  // ============================================================

  it("flags empty instruction", () => {
    const guide = makeValidGuide({
      steps: [
        makeValidStep({ instruction: "" }),
        makeValidStep2(),
      ],
    });

    const flags = validateGuide(guide);
    const emptyFlags = flags.filter((f) => f.validator === "empty-instruction");
    expect(emptyFlags.length).toBeGreaterThanOrEqual(1);
    expect(emptyFlags[0].severity).toBe("error");
  });

  // ============================================================
  // Validator 11: Confidence range
  // ============================================================

  it("flags confidence outside valid range [0, 1]", () => {
    const guide = makeValidGuide({
      steps: [
        makeValidStep({ confidence: 1.5 }),
        makeValidStep2(),
      ],
    });

    const flags = validateGuide(guide);
    const confFlags = flags.filter((f) => f.validator === "confidence-range");
    expect(confFlags.length).toBeGreaterThanOrEqual(1);
  });

  // ============================================================
  // Validator 12: Low confidence
  // ============================================================

  it("flags steps with low confidence (< 0.5)", () => {
    const guide = makeValidGuide({
      steps: [
        makeValidStep({ confidence: 0.3 }),
        makeValidStep2(),
      ],
    });

    const flags = validateGuide(guide);
    const lowConfFlags = flags.filter((f) => f.validator === "low-confidence");
    expect(lowConfFlags.length).toBeGreaterThanOrEqual(1);
    expect(lowConfFlags[0].message).toContain("0.3");
  });

  // ============================================================
  // Validator 13: Passive voice
  // ============================================================

  it("flags possible passive voice in instruction", () => {
    const guide = makeValidGuide({
      steps: [
        makeValidStep({
          instruction: "Insert the screw that is being tightened by the bracket.",
        }),
        makeValidStep2(),
      ],
    });

    const flags = validateGuide(guide);
    const passiveFlags = flags.filter((f) => f.validator === "passive-voice");
    expect(passiveFlags.length).toBeGreaterThanOrEqual(1);
  });

  // ============================================================
  // Validator 14: Metadata completeness
  // ============================================================

  it("flags missing purpose statement", () => {
    const guide = makeValidGuide({
      guideMetadata: makeValidMetadata({ purposeStatement: "" }),
    });

    const flags = validateGuide(guide);
    const metaFlags = flags.filter((f) => f.validator === "metadata-completeness");
    expect(metaFlags.length).toBeGreaterThanOrEqual(1);
    expect(metaFlags[0].severity).toBe("error");
  });

  // ============================================================
  // Validator 15: Safety level consistency
  // ============================================================

  it("flags danger callout with safety level 'low'", () => {
    const guide = makeValidGuide({
      steps: [
        makeValidStep({
          safetyCallout: { severity: "danger", text: "Risk of electric shock." },
        }),
        makeValidStep2(),
      ],
      guideMetadata: makeValidMetadata({ safetyLevel: "low" }),
    });

    const flags = validateGuide(guide);
    const levelFlags = flags.filter((f) => f.validator === "safety-level-consistency");
    expect(levelFlags.length).toBeGreaterThanOrEqual(1);
    expect(levelFlags[0].severity).toBe("error");
  });

  // ============================================================
  // Validator 22: Minimum step count
  // ============================================================

  it("flags guide with only 1 step", () => {
    const guide = makeValidGuide({
      steps: [makeValidStep()],
    });

    const flags = validateGuide(guide);
    const minFlags = flags.filter((f) => f.validator === "minimum-steps");
    expect(minFlags.length).toBeGreaterThanOrEqual(1);
    expect(minFlags[0].severity).toBe("warning");
  });
});

// ============================================================
// summarizeFlags
// ============================================================

describe("summarizeFlags", () => {
  it("counts errors, warnings, and info correctly", () => {
    const flags = [
      { validator: "a", severity: "error" as const, stepNumber: 1, message: "err" },
      { validator: "b", severity: "warning" as const, stepNumber: 2, message: "warn" },
      { validator: "c", severity: "warning" as const, stepNumber: 3, message: "warn2" },
      { validator: "d", severity: "info" as const, stepNumber: null, message: "info" },
    ];

    const summary = summarizeFlags(flags);
    expect(summary.errors).toBe(1);
    expect(summary.warnings).toBe(2);
    expect(summary.info).toBe(1);
    expect(summary.total).toBe(4);
  });

  it("returns all zeros for empty flag list", () => {
    const summary = summarizeFlags([]);
    expect(summary.total).toBe(0);
  });
});
