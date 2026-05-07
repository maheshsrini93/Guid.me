import type { PipelineState } from "@/types/pipeline";
import type { StructuredPartRef } from "@/types/agents";

export const PROMPT_VERSION = "instruction-composer@1.1";

export function buildInstructionComposerSystemPrompt(): string {
  return `You are a technical writer specializing in assembly instructions. Your job is to transform raw page-by-page extraction data into a coherent, well-structured assembly guide.

## Your Task
Given raw extractions from each page of an assembly document, produce:
1. **Ordered steps** — Merge, reorder, and renumber steps into a logical assembly sequence
2. **Parts overview** — Consolidated parts list from all pages
3. **Tools required** — All tools referenced across all steps
4. **Phase boundaries** — Group steps into logical phases (e.g., "Frame Assembly", "Shelf Installation")
5. **Metadata** — Estimated time, persons required, skill level, purpose statement

## Rules
- **Renumber steps** sequentially from 1 — do not preserve original page-based numbering.
- **Merge split steps** — If a step spans two pages, combine into one step.
- **Deduplicate parts** — Consolidate the parts list (sum quantities for duplicates).
- **Write clear instructions** — Transform raw observations into readable, imperative sentences.
- **Preserve all safety warnings** — Never drop caution/warning indicators.
- **Set phase boundaries** — Group related steps (e.g., all steps for one sub-assembly).
- **Add transition notes** — Brief context when moving between phases or sub-assemblies.
- **Estimate time** — Based on step count and complexity (simple: ~2 min/step, complex: ~5 min/step).
- **Persons required** — Default 1 unless two-person icons were detected.
- **Skill level** — "none" if no tools, "basic_hand_tools" if screwdriver/wrench, "power_tools_recommended" if drill/saw.
- **Purpose statement** — One sentence describing what is being assembled.
- Keep spatial details (orientation, alignment) from the source extractions.
- Preserve confidence scores from source — use the minimum confidence across merged steps.

## Authoritative Parts Catalog (CAD inputs only)
When a "## Authoritative Parts Catalog" section appears in the user prompt, treat it as ground truth:
- Use the exact \`id\` values as \`partNumber\` and the exact \`name\` values as \`partName\` in every step and in \`partsOverview\`. Do not invent new IDs or rename Components.
- Every Component in the catalog SHOULD appear in at least one step. Do not introduce parts that are not in the catalog.
- The catalog is ordered by build sequence — your step ordering must follow this order. Vision-extracted observations are supplementary context only; if they conflict with the catalog, the catalog wins.
- Use the catalog \`quantity\` for the parts overview total. Per-step quantities still come from what is installed in that step.`;
}

export function buildInstructionComposerUserPrompt(state: PipelineState): string {
  const extractions = state.frameExtractions;
  const doc = state.extractedSource?.documentMetadata;
  const structured = state.extractedSource?.structuredMetadata;

  const sections: string[] = [];

  sections.push(`Transform these raw page extractions into a structured assembly guide.

## Document Info
- Filename: ${doc?.filename ?? "unknown"}
- Page count: ${doc?.pageCount ?? 0}`);

  if (structured) {
    sections.push(buildStructuredMetadataSection(structured));
  }

  sections.push(`## Raw Page Extractions
${JSON.stringify(extractions, null, 2)}

Compose a complete, well-ordered guide following the system instructions. Return the structured guide as specified in the response schema.`);

  return sections.join("\n\n");
}

function buildStructuredMetadataSection(structured: {
  partsCatalog: StructuredPartRef[];
  sourceFormat: string;
  sequenceSource: "explode-video" | "geometry-inferred";
  sequenceConfidence: number;
}): string {
  const lines: string[] = [];
  lines.push("## Authoritative Parts Catalog");
  lines.push(
    `Source: CAD (${structured.sourceFormat}). Sequence ${structured.sequenceSource} @ ${(structured.sequenceConfidence * 100).toFixed(0)}% confidence.`,
  );
  lines.push(
    "Use these exact IDs/names. Order your steps to follow this sequence.",
  );
  lines.push("");
  lines.push("| # | id | name | qty | parentAssemblyPath |");
  lines.push("|---|----|------|-----|--------------------|");
  structured.partsCatalog.forEach((p, i) => {
    const path = p.parentAssemblyPath ?? "";
    lines.push(`| ${i + 1} | ${p.id} | ${p.name} | ${p.quantity} | ${path} |`);
  });
  return lines.join("\n");
}
