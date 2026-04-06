/**
 * Unit Tests: XML Builder
 *
 * The XML builder converts structured data into the canonical XML output.
 * It must produce well-formed XML with proper escaping, namespaces, and nesting.
 *
 * WHY TEST THIS? The XML is the primary deliverable of the whole pipeline.
 * Malformed XML or missed escaping breaks downstream consumers.
 */

import { describe, it, expect } from "vitest";
import { buildXml } from "@/lib/xml/builder";
import { makeXmlWorkInstruction } from "../fixtures/enforced-guide";

describe("buildXml", () => {
  // ============================================================
  // Well-formed XML
  // ============================================================

  it("produces XML starting with the standard declaration", () => {
    const xml = buildXml(makeXmlWorkInstruction());
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });

  it("wraps output in <work-instruction> with correct namespace", () => {
    const xml = buildXml(makeXmlWorkInstruction());
    expect(xml).toContain('xmlns="urn:guid:work-instruction:1.0"');
    expect(xml).toContain("</work-instruction>");
  });

  // ============================================================
  // XML escaping
  // ============================================================

  it("escapes special characters in text content", () => {
    const data = makeXmlWorkInstruction();
    data.metadata.title = 'KALLAX "Best" <Shelf> & More';

    const xml = buildXml(data);
    expect(xml).toContain("&lt;Shelf&gt;");
    expect(xml).toContain("&amp; More");
    expect(xml).toContain("&quot;Best&quot;");
  });

  it("escapes apostrophes", () => {
    const data = makeXmlWorkInstruction();
    data.metadata.purpose = "Assemble the user's bookshelf";

    const xml = buildXml(data);
    expect(xml).toContain("&apos;s bookshelf");
  });

  // ============================================================
  // Parts list rendering
  // ============================================================

  it("renders all parts with id, name, and quantity attributes", () => {
    const xml = buildXml(makeXmlWorkInstruction());
    expect(xml).toContain('<part id="A" name="Wooden dowel" quantity="8" />');
    expect(xml).toContain('<part id="B" name="Shelf bracket" quantity="4" />');
  });

  // ============================================================
  // Tools rendering
  // ============================================================

  it("renders tools with required/optional category", () => {
    const xml = buildXml(makeXmlWorkInstruction());
    expect(xml).toContain('category="required"');
    expect(xml).toContain('category="optional"');
    expect(xml).toContain("Phillips screwdriver");
    expect(xml).toContain("Rubber mallet");
  });

  // ============================================================
  // Phase/step nesting
  // ============================================================

  it("nests steps inside phases correctly", () => {
    const xml = buildXml(makeXmlWorkInstruction());
    expect(xml).toContain('<phase name="Frame Assembly">');
    expect(xml).toContain('<step number="1">');
    expect(xml).toContain('<step number="2">');
    expect(xml).toContain("</phase>");
  });

  // ============================================================
  // Illustration references
  // ============================================================

  it("includes illustration ref when present", () => {
    const xml = buildXml(makeXmlWorkInstruction());
    expect(xml).toContain('<illustration ref=');
  });

  it("omits illustration element when null", () => {
    // Step 2 has illustrationSrc: null
    const xml = buildXml(makeXmlWorkInstruction());
    // The second step should not have an illustration ref
    const step2Section = xml.split('<step number="2">')[1]?.split("</step>")[0];
    expect(step2Section).not.toContain("<illustration");
  });

  // ============================================================
  // Two-person required
  // ============================================================

  it("includes <two-person-required> when true", () => {
    const data = makeXmlWorkInstruction();
    data.phases[0].steps[0].twoPersonRequired = true;

    const xml = buildXml(data);
    expect(xml).toContain("<two-person-required>true</two-person-required>");
  });

  it("omits <two-person-required> when false", () => {
    const xml = buildXml(makeXmlWorkInstruction());
    expect(xml).not.toContain("<two-person-required>");
  });

  // ============================================================
  // Generation metadata
  // ============================================================

  it("renders generation metadata with job ID and cost", () => {
    const xml = buildXml(makeXmlWorkInstruction());
    expect(xml).toContain("<job-id>01HWTEST000000000000000000</job-id>");
    expect(xml).toContain("<total-cost>0.930000</total-cost>");
    expect(xml).toContain("<quality-score>90</quality-score>");
    expect(xml).toContain("<quality-decision>approved</quality-decision>");
  });

  it("renders models used", () => {
    const xml = buildXml(makeXmlWorkInstruction());
    expect(xml).toContain("<model>gemini-2.5-flash</model>");
    expect(xml).toContain("<model>gemini-2.5-pro</model>");
  });

  // ============================================================
  // Quality flags in metadata
  // ============================================================

  it("renders quality flags when present", () => {
    const data = makeXmlWorkInstruction();
    data.generationMetadata.qualityFlags = [
      { severity: "warning", step: 1, description: "Sentence too long" },
      { severity: "error", step: null, description: "Missing purpose" },
    ];

    const xml = buildXml(data);
    expect(xml).toContain('<flag severity="warning" step="1">Sentence too long</flag>');
    expect(xml).toContain('<flag severity="error">Missing purpose</flag>');
  });

  it("omits quality-flags section when empty", () => {
    const data = makeXmlWorkInstruction();
    data.generationMetadata.qualityFlags = [];

    const xml = buildXml(data);
    expect(xml).not.toContain("<quality-flags>");
  });

  // ============================================================
  // Safety warnings
  // ============================================================

  it("renders safety warnings with severity", () => {
    const xml = buildXml(makeXmlWorkInstruction());
    expect(xml).toContain('<warning severity="caution">');
    expect(xml).toContain("soft surface");
  });

  // ============================================================
  // Source pages
  // ============================================================

  it("renders source pages as comma-separated list", () => {
    const data = makeXmlWorkInstruction();
    data.phases[0].steps[0].sourcePages = [3, 4];

    const xml = buildXml(data);
    expect(xml).toContain("<source-pages>3,4</source-pages>");
  });
});
