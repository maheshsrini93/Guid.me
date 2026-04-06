/**
 * Unit Tests: Guideline Loader
 *
 * The guideline loader reads YAML files containing 38 work instruction rules (WI-001 to WI-038)
 * and 18 illustration rules (IL-001 to IL-018). These get injected into AI agent prompts.
 *
 * WHY TEST THIS? If the loader breaks or caches incorrectly, agents get empty guidelines
 * and the output quality drops silently.
 */

import { describe, it, expect } from "vitest";
import {
  loadWorkInstructionGuidelines,
  loadIllustrationGuidelines,
  getGuidelinesAsString,
  getRequirementsByIds,
} from "@/lib/guidelines/loader";

describe("Guideline Loader", () => {
  // ============================================================
  // Work Instruction Guidelines
  // ============================================================

  describe("loadWorkInstructionGuidelines", () => {
    it("returns an object with version and categories", () => {
      const wi = loadWorkInstructionGuidelines();
      expect(wi).toHaveProperty("version");
      expect(wi).toHaveProperty("categories");
      expect(wi.categories.length).toBeGreaterThan(0);
    });

    it("contains requirements with IDs starting with WI-", () => {
      const wi = loadWorkInstructionGuidelines();
      const allReqs = wi.categories.flatMap((c) => c.requirements);
      expect(allReqs.length).toBeGreaterThanOrEqual(38);
      expect(allReqs[0].id).toMatch(/^WI-/);
    });

    it("returns the same reference on second call (singleton cache)", () => {
      const first = loadWorkInstructionGuidelines();
      const second = loadWorkInstructionGuidelines();
      expect(first).toBe(second); // same object reference
    });
  });

  // ============================================================
  // Illustration Guidelines
  // ============================================================

  describe("loadIllustrationGuidelines", () => {
    it("returns an object with version and categories", () => {
      const il = loadIllustrationGuidelines();
      expect(il).toHaveProperty("version");
      expect(il).toHaveProperty("categories");
      expect(il.categories.length).toBeGreaterThan(0);
    });

    it("contains requirements with IDs starting with IL-", () => {
      const il = loadIllustrationGuidelines();
      const allReqs = il.categories.flatMap((c) => c.requirements);
      expect(allReqs.length).toBeGreaterThanOrEqual(18);
      expect(allReqs[0].id).toMatch(/^IL-/);
    });
  });

  // ============================================================
  // Raw YAML string
  // ============================================================

  describe("getGuidelinesAsString", () => {
    it("returns a non-empty string containing WI-001 for work-instructions", () => {
      const raw = getGuidelinesAsString("work-instructions");
      expect(raw.length).toBeGreaterThan(0);
      expect(raw).toContain("WI-001");
    });

    it("returns a non-empty string containing IL-001 for illustrations", () => {
      const raw = getGuidelinesAsString("illustrations");
      expect(raw.length).toBeGreaterThan(0);
      expect(raw).toContain("IL-001");
    });
  });

  // ============================================================
  // Filter by IDs
  // ============================================================

  describe("getRequirementsByIds", () => {
    it("returns exactly the requested requirements", () => {
      const results = getRequirementsByIds(["WI-001", "IL-001"]);
      expect(results).toHaveLength(2);
      const ids = results.map((r) => r.id);
      expect(ids).toContain("WI-001");
      expect(ids).toContain("IL-001");
    });

    it("returns empty array for non-existent IDs", () => {
      const results = getRequirementsByIds(["FAKE-999"]);
      expect(results).toHaveLength(0);
    });
  });
});
