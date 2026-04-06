import type { PipelineState } from "@/types/pipeline";

export const PROMPT_VERSION = "vision-analyzer@3.0";

export function buildVisionAnalyzerSystemPrompt(): string {
  return `You are an expert visual analyzer for IKEA-style assembly instruction manuals — wordless, image-only documents where all meaning is conveyed through drawings, arrows, numbers, and icons.

Report ONLY what you can see in the image. Never infer hidden content or hallucinate parts not visible. Use factual, observation-based descriptions — not narrative prose.

Keep part names consistent across every page you analyze. If you call something "Side panel" on page 1, use "Side panel" on all subsequent pages — never switch to "Side board" or "Panel (side)".

Classify every arrow by its purpose: "motion" arrows show part movement direction, "rotation" arrows show screw/cam-lock turning, and "callout" arrows point to parts or details without indicating movement.

Detect detail circles and magnified insets (zoom-in views showing close-ups of connections). Mark these as sub-steps linked to their parent step number.

Report confidence honestly. Lower your score when the image is blurry, arrows overlap, parts are partially hidden, or fastener types are ambiguous. Do not default to 1.0.

The response schema defines every field and its expected content. Follow the schema descriptions precisely.

When full document context is provided alongside the page image, use it to maintain perfectly consistent part names, understand the assembly flow across pages, and cross-reference part IDs and quantities.

EXTRACTION RULES:
1. Each visual frame or panel on the page equals one step.
2. Read left-to-right, top-to-bottom unless arrows explicitly indicate a different sequence.
3. Parts labeled with circled numbers (e.g., ①, ②) or printed IDs — map them exactly as printed in partNumber.
4. Quantity indicators (e.g., "x2", "x4") mean that many of that part are used in this step — set the quantity field accordingly.
5. Dashed lines are alignment guides, not physical parts — note them in spatialDetails.alignmentNotes.
6. Explosion or zoom callouts are sub-steps within the parent step — set isSubStep=true and parentStepNumber.
7. Warning icons (⚠️) or "CLICK" text are confirmation cues or warnings — capture in warnings[] and confirmationCue.
8. Hand icons indicate manual action required (push, hold, rotate) — record as an action with the appropriate verb.
9. Tool icons identify tools — record in toolsShown[] with a toolIcon description.`;
}

export function buildVisionAnalyzerUserPrompt(
  state: PipelineState,
  context?: unknown,
): string {
  const ctx = context as {
    pageNumber?: number;
    totalPages?: number;
    previousStepSummary?: string;
  } | undefined;
  const pageNum = ctx?.pageNumber ?? 1;
  const totalPages = ctx?.totalPages ?? 1;

  const productName = state.extractedDocument?.filename
    ?.replace(/\.[^.]+$/, "")
    ?.replace(/[-_]/g, " ")
    ?? "Unknown product";

  let prompt = `Analyze this assembly instruction page image for "${productName}" (page ${pageNum} of ${totalPages}). Extract all visible content as defined by the response schema.`;

  const prevSummary = ctx?.previousStepSummary;
  if (prevSummary) {
    prompt += `\n\nPrevious step summary: ${prevSummary}`;
  } else if (pageNum === 1) {
    prompt += `\n\nThis is the first page of the document.`;
  }

  prompt += `

## Example Output (one step)
\`\`\`json
{
  "pageType": "assembly",
  "steps": [{
    "stepNumber": 4,
    "rawDescription": "Cam lock bolt inserted into pre-drilled hole on divider panel, then cam lock disc rotated clockwise to secure",
    "isSubStep": false,
    "partsShown": [
      {"partNumber": "105818", "partName": "Cam lock bolt", "quantity": 2},
      {"partNumber": "118331", "partName": "Cam lock disc", "quantity": 2}
    ],
    "toolsShown": [{"toolName": "Phillips screwdriver", "toolIcon": "screwdriver silhouette"}],
    "actions": [
      {"actionType": "insert", "subject": "Cam lock bolt", "target": "Divider panel hole", "direction": "push inward"},
      {"actionType": "rotate", "subject": "Cam lock disc", "target": "Cam lock bolt", "direction": "clockwise"}
    ],
    "spatialDetails": {"orientation": "Shelf unit lying on its back", "alignmentNotes": "Bolt head flush with panel surface"},
    "spatialRelationships": [{"partA": "Cam lock bolt", "relationship": "inserted into", "partB": "Divider panel"}],
    "arrows": [{"direction": "clockwise", "indicatesMotion": true, "arrowType": "rotation", "label": "1/4 turn"}],
    "fasteners": [{"type": "cam lock", "partId": "105818", "rotation": "clockwise", "notes": "Quarter-turn to lock", "quantity": 2}],
    "annotations": ["x2"],
    "warnings": ["Do not overtighten"],
    "complexity": "complex",
    "confidence": 0.9,
    "confirmationCue": "Arrow on cam lock points toward panel edge"
  }],
  "pageIndicators": {"arrowCount": 3, "hasHingeOrRotation": false, "hasFastenerAmbiguity": false, "isPartsPage": false, "hasSubSteps": false}
}
\`\`\``;

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
