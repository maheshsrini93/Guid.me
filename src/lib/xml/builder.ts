import type {
  XmlWorkInstruction,
  XmlMetadata,
  XmlPart,
  XmlTool,
  XmlWarning,
  XmlPhase,
  XmlStep,
  XmlGenerationMetadata,
} from "@/types/xml";

const NAMESPACE = "urn:guid:work-instruction:1.0";

/**
 * Build canonical XML from the work instruction data structure.
 * Produces well-formed XML with proper escaping and indentation.
 */
export function buildXml(data: XmlWorkInstruction): string {
  const lines: string[] = [];

  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<work-instruction xmlns="${NAMESPACE}">`);

  // Metadata
  buildMetadata(lines, data.metadata);

  // Parts list
  buildPartsList(lines, data.partsList);

  // Tools required
  buildToolsRequired(lines, data.toolsRequired);

  // Safety warnings
  buildSafetyWarnings(lines, data.safetyWarnings);

  // Phases
  buildPhases(lines, data.phases);

  // Generation metadata
  buildGenerationMetadata(lines, data.generationMetadata);

  lines.push(`</work-instruction>`);

  return lines.join("\n");
}

// ============================================================
// Section Builders
// ============================================================

function buildMetadata(lines: string[], meta: XmlMetadata): void {
  lines.push(`  <metadata>`);
  lines.push(`    <title>${esc(meta.title)}</title>`);
  lines.push(`    <domain>${esc(meta.domain)}</domain>`);
  lines.push(`    <safety-level>${esc(meta.safetyLevel)}</safety-level>`);
  lines.push(`    <estimated-minutes>${meta.estimatedMinutes}</estimated-minutes>`);
  lines.push(`    <persons-required>${meta.personsRequired}</persons-required>`);
  lines.push(`    <skill-level>${esc(meta.skillLevel)}</skill-level>`);
  lines.push(`    <purpose>${esc(meta.purpose)}</purpose>`);
  lines.push(`    <source-document>`);
  lines.push(`      <filename>${esc(meta.sourceDocument.filename)}</filename>`);
  lines.push(`      <format>${esc(meta.sourceDocument.format)}</format>`);
  lines.push(`      <page-count>${meta.sourceDocument.pageCount}</page-count>`);
  lines.push(`    </source-document>`);
  lines.push(`  </metadata>`);
}

function buildPartsList(lines: string[], parts: XmlPart[]): void {
  lines.push(`  <parts-list>`);
  for (const part of parts) {
    lines.push(`    <part id="${esc(part.id)}" name="${esc(part.name)}" quantity="${part.quantity}" />`);
  }
  lines.push(`  </parts-list>`);
}

function buildToolsRequired(lines: string[], tools: XmlTool[]): void {
  lines.push(`  <tools-required>`);
  for (const tool of tools) {
    const category = tool.required ? "required" : "optional";
    lines.push(`    <tool category="${category}">${esc(tool.name)}</tool>`);
  }
  lines.push(`  </tools-required>`);
}

function buildSafetyWarnings(lines: string[], warnings: XmlWarning[]): void {
  lines.push(`  <safety-warnings>`);
  for (const warning of warnings) {
    lines.push(`    <warning severity="${esc(warning.severity)}">${esc(warning.text)}</warning>`);
  }
  lines.push(`  </safety-warnings>`);
}

function buildPhases(lines: string[], phases: XmlPhase[]): void {
  lines.push(`  <phases>`);
  for (const phase of phases) {
    lines.push(`    <phase name="${esc(phase.name)}">`);
    for (const step of phase.steps) {
      buildStep(lines, step);
    }
    lines.push(`    </phase>`);
  }
  lines.push(`  </phases>`);
}

function buildStep(lines: string[], step: XmlStep): void {
  lines.push(`      <step number="${step.number}">`);
  lines.push(`        <title>${esc(step.title)}</title>`);
  lines.push(`        <instruction>${esc(step.instruction)}</instruction>`);

  // Parts
  if (step.parts.length > 0) {
    lines.push(`        <parts>`);
    for (const part of step.parts) {
      lines.push(`          <part-ref id="${esc(part.id)}" quantity="${part.quantity}" />`);
    }
    lines.push(`        </parts>`);
  }

  // Tools
  if (step.tools.length > 0) {
    lines.push(`        <tools>`);
    for (const tool of step.tools) {
      lines.push(`          <tool-ref>${esc(tool.name)}</tool-ref>`);
    }
    lines.push(`        </tools>`);
  }

  // Safety
  if (step.safety.length > 0) {
    lines.push(`        <safety>`);
    for (const warning of step.safety) {
      lines.push(`          <warning severity="${esc(warning.severity)}">${esc(warning.text)}</warning>`);
    }
    lines.push(`        </safety>`);
  }

  // Illustration
  if (step.illustrationSrc) {
    lines.push(`        <illustration ref="${esc(step.illustrationSrc)}" />`);
  }

  // Flags
  if (step.twoPersonRequired) {
    lines.push(`        <two-person-required>true</two-person-required>`);
  }
  lines.push(`        <complexity>${step.complexity}</complexity>`);
  lines.push(`        <confidence>${step.confidence}</confidence>`);

  // Source pages
  if (step.sourcePages.length > 0) {
    lines.push(`        <source-pages>${step.sourcePages.join(",")}</source-pages>`);
  }

  lines.push(`      </step>`);
}

function buildGenerationMetadata(lines: string[], meta: XmlGenerationMetadata): void {
  lines.push(`  <generation-metadata>`);
  lines.push(`    <job-id>${esc(meta.jobId)}</job-id>`);
  lines.push(`    <generated-at>${esc(meta.generatedAt)}</generated-at>`);
  lines.push(`    <quality-score>${meta.qualityScore}</quality-score>`);
  lines.push(`    <quality-decision>${esc(meta.qualityDecision)}</quality-decision>`);
  lines.push(`    <total-cost>${meta.totalCostUsd.toFixed(6)}</total-cost>`);
  lines.push(`    <processing-time-ms>${meta.processingTimeMs}</processing-time-ms>`);
  lines.push(`    <text-revision-loops>${meta.textRevisionLoops}</text-revision-loops>`);
  lines.push(`    <models-used>`);
  for (const model of meta.modelsUsed) {
    lines.push(`      <model>${esc(model)}</model>`);
  }
  lines.push(`    </models-used>`);

  if (meta.qualityFlags.length > 0) {
    lines.push(`    <quality-flags>`);
    for (const flag of meta.qualityFlags) {
      const stepAttr = flag.step !== null ? ` step="${flag.step}"` : "";
      lines.push(`      <flag severity="${esc(flag.severity)}"${stepAttr}>${esc(flag.description)}</flag>`);
    }
    lines.push(`    </quality-flags>`);
  }

  lines.push(`  </generation-metadata>`);
}

// ============================================================
// XML Escaping
// ============================================================

function esc(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
