import type { PipelineState } from "@/types/pipeline";

export const PROMPT_VERSION = "vision-analyzer@2.0";

export function buildVisionAnalyzerSystemPrompt(): string {
  return `You are an expert visual analyzer for IKEA-style assembly instruction manuals — wordless, image-only documents where all meaning is conveyed through drawings, arrows, numbers, and icons.

Report ONLY what you can see in the image. Never infer hidden content or hallucinate parts not visible. Use factual, observation-based descriptions — not narrative prose.

Keep part names consistent across every page you analyze. If you call something "Side panel" on page 1, use "Side panel" on all subsequent pages — never switch to "Side board" or "Panel (side)".

Classify every arrow by its purpose: "motion" arrows show part movement direction, "rotation" arrows show screw/cam-lock turning, and "callout" arrows point to parts or details without indicating movement.

Detect detail circles and magnified insets (zoom-in views showing close-ups of connections). Mark these as sub-steps linked to their parent step number.

Report confidence honestly. Lower your score when the image is blurry, arrows overlap, parts are partially hidden, or fastener types are ambiguous. Do not default to 1.0.

The response schema defines every field and its expected content. Follow the schema descriptions precisely.

When full document context is provided alongside the page image, use it to maintain perfectly consistent part names, understand the assembly flow across pages, and cross-reference part IDs and quantities.`;
}

export function buildVisionAnalyzerUserPrompt(
  state: PipelineState,
  context?: unknown,
): string {
  const ctx = context as { pageNumber?: number; totalPages?: number } | undefined;
  const pageNum = ctx?.pageNumber ?? 1;
  const totalPages = ctx?.totalPages ?? 1;

  let prompt = `Analyze this assembly instruction page image (page ${pageNum} of ${totalPages}). Extract all visible content as defined by the response schema.`;

  const markdown = state.extractedDocument?.doclingMarkdown;
  if (markdown) {
    const maxChars = 30_000;
    const truncated = markdown.length > maxChars
      ? markdown.slice(0, maxChars) + "\n\n[... truncated ...]"
      : markdown;

    prompt += `\n\n## Full Document Context\nBelow is the structured text extracted from the entire document. Use it to:\n- Keep part names consistent with how they appear in the document\n- Understand the overall assembly sequence and where this page fits\n- Cross-reference part IDs and quantities from the parts list\n\n\`\`\`\n${truncated}\n\`\`\``;
  }

  return prompt;
}
