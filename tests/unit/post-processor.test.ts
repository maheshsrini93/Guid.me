/**
 * Unit Tests: Post-Processor (9 deterministic transforms)
 *
 * The post-processor applies rule-based corrections AFTER the AI returns its response.
 * No AI involved — these are pure functions that enforce formatting, consistency, and style.
 *
 * WHY TEST THIS? These transforms run on every guide. A bug here silently corrupts output.
 */

import { describe, it, expect } from "vitest";
import { postProcess } from "@/lib/guidelines/post-processor";
import { makeValidGuide, makeValidStep, makeValidMetadata } from "../fixtures/enforced-guide";

describe("postProcess", () => {
  // ============================================================
  // Transform 1: Verb-first enforcement
  // ============================================================

  describe("Transform 1: Verb-first enforcement", () => {
    it("prepends the primary verb when instruction does not start with an approved verb", () => {
      const guide = makeValidGuide({
        steps: [
          makeValidStep({
            instruction: "The dowel should be inserted into the hole.",
            primaryVerb: "Insert",
          }),
          makeValidStep({ stepNumber: 2 }),
        ],
      });

      const result = postProcess(guide);
      // Should prepend "Insert" and lowercase the first char of original
      expect(result.steps[0].instruction).toMatch(/^Insert /);
    });

    it("leaves instruction untouched when it already starts with an approved verb", () => {
      const guide = makeValidGuide({
        steps: [
          makeValidStep({
            instruction: "Insert the dowel into the hole.",
            primaryVerb: "Insert",
          }),
          makeValidStep({ stepNumber: 2 }),
        ],
      });

      const result = postProcess(guide);
      expect(result.steps[0].instruction).toMatch(/^Insert /);
    });
  });

  // ============================================================
  // Transform 2: Sentence length enforcement
  // ============================================================

  describe("Transform 2: Sentence length enforcement", () => {
    it("splits sentences longer than 20 words at the midpoint", () => {
      // Build a 24-word sentence
      const longSentence =
        "Insert the wooden dowel into the pre-drilled hole on the left side of the main panel ensuring it is flush with the surface edge.";
      const wordCount = longSentence.split(/\s+/).length;
      expect(wordCount).toBeGreaterThan(20);

      const guide = makeValidGuide({
        steps: [
          makeValidStep({
            instruction: longSentence,
            primaryVerb: "Insert",
            parts: [],
          }),
          makeValidStep({ stepNumber: 2 }),
        ],
      });

      const result = postProcess(guide);
      // After splitting, each resulting sentence should be <= 20 words
      const sentences = result.steps[0].instruction.split(/(?<=[.!?])\s+/);
      for (const s of sentences) {
        const wc = s.trim().split(/\s+/).length;
        expect(wc).toBeLessThanOrEqual(20);
      }
    });

    it("does not split sentences that are 20 words or fewer", () => {
      const shortSentence = "Insert the dowel into the hole.";
      const guide = makeValidGuide({
        steps: [
          makeValidStep({
            instruction: shortSentence,
            primaryVerb: "Insert",
            parts: [],
          }),
          makeValidStep({ stepNumber: 2 }),
        ],
      });

      const result = postProcess(guide);
      // Should not introduce extra periods from splitting
      const periodCount = (result.steps[0].instruction.match(/\./g) || []).length;
      expect(periodCount).toBe(1);
    });
  });

  // ============================================================
  // Transform 3: Part ID insertion
  // ============================================================

  describe("Transform 3: Part ID insertion", () => {
    it("adds part reference format when part name appears without it", () => {
      const guide = makeValidGuide({
        steps: [
          makeValidStep({
            instruction: "Insert the wooden dowel into the hole.",
            primaryVerb: "Insert",
            parts: [{ name: "wooden dowel", id: "A", quantity: 2 }],
          }),
          makeValidStep({ stepNumber: 2 }),
        ],
      });

      const result = postProcess(guide);
      expect(result.steps[0].instruction).toContain("(A, ×2)");
    });

    it("does not double-insert when reference is already present", () => {
      const guide = makeValidGuide({
        steps: [
          makeValidStep({
            instruction: "Insert the wooden dowel (A, ×2) into the hole.",
            primaryVerb: "Insert",
            parts: [{ name: "wooden dowel", id: "A", quantity: 2 }],
          }),
          makeValidStep({ stepNumber: 2 }),
        ],
      });

      const result = postProcess(guide);
      // Count occurrences of "(A, ×2)" — should be exactly 1
      const matches = result.steps[0].instruction.match(/\(A, ×2\)/g);
      expect(matches?.length).toBe(1);
    });
  });

  // ============================================================
  // Transform 4: Safety tag normalization
  // ============================================================

  describe("Transform 4: Safety tag normalization", () => {
    it("upgrades severity to 'danger' when text mentions 'electric shock'", () => {
      const guide = makeValidGuide({
        steps: [
          makeValidStep({
            safetyCallout: { severity: "caution", text: "risk of electric shock" },
          }),
          makeValidStep({ stepNumber: 2 }),
        ],
      });

      const result = postProcess(guide);
      expect(result.steps[0].safetyCallout?.severity).toBe("danger");
    });

    it("upgrades severity to 'warning' when text mentions 'heavy'", () => {
      const guide = makeValidGuide({
        steps: [
          makeValidStep({
            safetyCallout: { severity: "caution", text: "heavy component" },
          }),
          makeValidStep({ stepNumber: 2 }),
        ],
      });

      const result = postProcess(guide);
      expect(result.steps[0].safetyCallout?.severity).toBe("warning");
    });

    it("appends a period if text does not end with one", () => {
      const guide = makeValidGuide({
        steps: [
          makeValidStep({
            safetyCallout: { severity: "caution", text: "handle with care" },
          }),
          makeValidStep({ stepNumber: 2 }),
        ],
      });

      const result = postProcess(guide);
      expect(result.steps[0].safetyCallout?.text).toMatch(/\.$/);
    });

    it("capitalizes the first letter of the text", () => {
      const guide = makeValidGuide({
        steps: [
          makeValidStep({
            safetyCallout: { severity: "caution", text: "handle with care." },
          }),
          makeValidStep({ stepNumber: 2 }),
        ],
      });

      const result = postProcess(guide);
      expect(result.steps[0].safetyCallout?.text).toMatch(/^H/);
    });
  });

  // ============================================================
  // Transform 5: Whitespace cleanup
  // ============================================================

  describe("Transform 5: Whitespace cleanup", () => {
    it("collapses multiple spaces into one", () => {
      const guide = makeValidGuide({
        steps: [
          makeValidStep({
            instruction: "Insert  the   dowel    into the hole.",
            parts: [],
          }),
          makeValidStep({ stepNumber: 2 }),
        ],
      });

      const result = postProcess(guide);
      expect(result.steps[0].instruction).not.toMatch(/  /);
    });

    it("removes spaces before periods and commas", () => {
      const guide = makeValidGuide({
        steps: [
          makeValidStep({
            instruction: "Insert the dowel , then press it .",
            parts: [],
          }),
          makeValidStep({ stepNumber: 2 }),
        ],
      });

      const result = postProcess(guide);
      expect(result.steps[0].instruction).not.toMatch(/\s+\./);
      expect(result.steps[0].instruction).not.toMatch(/\s+,/);
    });
  });

  // ============================================================
  // Transform 6: Metric unit enforcement
  // ============================================================

  describe("Transform 6: Metric unit enforcement", () => {
    it("converts inches to mm", () => {
      const guide = makeValidGuide({
        steps: [
          makeValidStep({
            instruction: "Insert the 3 inch screw into the hole.",
            parts: [],
          }),
          makeValidStep({ stepNumber: 2 }),
        ],
      });

      const result = postProcess(guide);
      expect(result.steps[0].instruction).toContain("76 mm");
      expect(result.steps[0].instruction).not.toContain("inch");
    });

    it("converts lbs to kg", () => {
      const guide = makeValidGuide({
        steps: [
          makeValidStep({
            instruction: "Lift the 10 lbs panel carefully.",
            parts: [],
          }),
          makeValidStep({ stepNumber: 2 }),
        ],
      });

      const result = postProcess(guide);
      expect(result.steps[0].instruction).toContain("kg");
      expect(result.steps[0].instruction).not.toContain("lbs");
    });

    it("converts feet to mm", () => {
      const guide = makeValidGuide({
        steps: [
          makeValidStep({
            instruction: "Position the panel 2 feet from the wall.",
            parts: [],
          }),
          makeValidStep({ stepNumber: 2 }),
        ],
      });

      const result = postProcess(guide);
      expect(result.steps[0].instruction).toContain("610 mm");
      expect(result.steps[0].instruction).not.toMatch(/feet/);
    });
  });

  // ============================================================
  // Transform 8: Sentence case enforcement
  // ============================================================

  describe("Transform 8: Sentence case enforcement", () => {
    it("capitalizes the first letter of each sentence", () => {
      const guide = makeValidGuide({
        steps: [
          makeValidStep({
            instruction: "insert the dowel. press it firmly.",
            primaryVerb: "Insert",
            parts: [],
          }),
          makeValidStep({ stepNumber: 2 }),
        ],
      });

      const result = postProcess(guide);
      // After verb-first + sentence case, should start with uppercase
      expect(result.steps[0].instruction).toMatch(/^[A-Z]/);
    });
  });

  // ============================================================
  // Transform 9: Hazard keyword detection
  // ============================================================

  describe("Transform 9: Hazard keyword detection", () => {
    it("auto-generates a safety callout when 'heavy' is found and no callout exists", () => {
      const guide = makeValidGuide({
        steps: [
          makeValidStep({
            instruction: "Lift the heavy panel onto the frame.",
            primaryVerb: "Lift",
            safetyCallout: null,
            parts: [],
          }),
          makeValidStep({ stepNumber: 2 }),
        ],
      });

      const result = postProcess(guide);
      expect(result.steps[0].safetyCallout).not.toBeNull();
      expect(result.steps[0].safetyCallout?.severity).toBe("warning");
      expect(result.steps[0].safetyCallout?.text).toContain("Heavy");
    });

    it("auto-generates a danger callout for electrical keywords", () => {
      const guide = makeValidGuide({
        steps: [
          makeValidStep({
            instruction: "Attach the electrical wire to the terminal.",
            primaryVerb: "Attach",
            safetyCallout: null,
            parts: [],
          }),
          makeValidStep({ stepNumber: 2 }),
        ],
      });

      const result = postProcess(guide);
      expect(result.steps[0].safetyCallout).not.toBeNull();
      expect(result.steps[0].safetyCallout?.severity).toBe("danger");
    });

    it("does not overwrite an existing safety callout", () => {
      const existingCallout = { severity: "caution" as const, text: "Be careful." };
      const guide = makeValidGuide({
        steps: [
          makeValidStep({
            instruction: "Lift the heavy panel onto the frame.",
            primaryVerb: "Lift",
            safetyCallout: existingCallout,
            parts: [],
          }),
          makeValidStep({ stepNumber: 2 }),
        ],
      });

      const result = postProcess(guide);
      // Should normalize the existing callout (upgrade to warning) but not replace it
      expect(result.steps[0].safetyCallout?.text).toBe("Be careful.");
    });
  });

  // ============================================================
  // Full pipeline: all transforms applied together
  // ============================================================

  describe("Full pipeline", () => {
    it("does not mutate the input guide", () => {
      const guide = makeValidGuide();
      const originalInstruction = guide.steps[0].instruction;

      postProcess(guide);

      expect(guide.steps[0].instruction).toBe(originalInstruction);
    });

    it("applies all transforms without interference on a valid guide", () => {
      const guide = makeValidGuide();
      const result = postProcess(guide);

      // Should still have 2 steps
      expect(result.steps).toHaveLength(2);
      // Each instruction should start with an approved verb
      expect(result.steps[0].instruction).toMatch(/^(Insert|Attach|Tighten|Slide|Place|Align|Press|Push|Lower|Lift|Flip|Screw|Snap|Hook|Position|Secure)/);
      expect(result.steps[1].instruction).toMatch(/^(Insert|Attach|Tighten|Slide|Place|Align|Press|Push|Lower|Lift|Flip|Screw|Snap|Hook|Position|Secure)/);
    });
  });
});
