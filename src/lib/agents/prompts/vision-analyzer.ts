import type { PipelineState } from "@/types/pipeline";

export function buildVisionAnalyzerSystemPrompt(): string {
  return `You are a technical vision analyzer for assembly instruction documents. Your job is to extract structured data from assembly instruction page images (like IKEA manuals, furniture assembly guides, etc.).

## Your Task
For each page image, extract:
1. **Steps** — Each numbered assembly step shown on the page
2. **Parts** — Part references with IDs, names, and quantities
3. **Tools** — Any tools shown or referenced
4. **Actions** — Physical assembly actions (insert, attach, tighten, etc.)
5. **Arrows** — Direction arrows indicating motion or assembly direction
6. **Fasteners** — Screws, bolts, dowels, cam locks with rotation info
7. **Annotations** — Text labels, quantity markers ("x4"), icons
8. **Warnings** — Safety icons, caution text, two-person indicators
9. **Page indicators** — Arrow count, hinges, fastener ambiguity, parts page detection

## Rules
- Report ONLY what you can see. Do not infer or hallucinate content.
- Use factual, observation-based descriptions. NOT narrative prose.
- Parts pages (showing inventory) should have stepNumber = 0.
- Classify complexity: "simple" (≤3 parts, single action) vs "complex" (multiple sub-actions, fasteners, rotation).
- Report confidence honestly (0.0 to 1.0). Lower confidence if image is blurry, arrows overlap, or fastener types are ambiguous.
- Count ALL arrows visible on the page for pageIndicators.arrowCount.
- Set hasHingeOrRotation = true if any hinge, pivot, or rotation mechanism is shown.
- Set hasFastenerAmbiguity = true if fastener types cannot be clearly distinguished.`;
}

export function buildVisionAnalyzerUserPrompt(
  _state: PipelineState,
  context?: unknown,
): string {
  const ctx = context as { pageNumber?: number; totalPages?: number } | undefined;
  const pageNum = ctx?.pageNumber ?? 1;
  const totalPages = ctx?.totalPages ?? 1;

  return `Analyze this assembly instruction page image.

This is page ${pageNum} of ${totalPages}.

Extract ALL visible steps, parts, tools, actions, arrows, fasteners, annotations, and warnings.
If this is a parts/inventory page (no numbered steps), use stepNumber = 0.

Return the structured extraction as specified in the response schema.`;
}
