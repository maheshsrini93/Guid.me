/**
 * STEP-only sequence inference, Option A (T-081).
 *
 * When the user uploads a STEP file *without* an authored explode-view video,
 * we have no ground-truth build sequence. We fall back to asking Gemini Pro
 * to propose an ordering from:
 *   - the deterministic parts catalog (from occt-import-js)
 *   - the assembly tree
 *   - four canonical multi-view renders (top, front, side, isometric)
 *
 * The model returns an ordered list of Component IDs and an overall
 * confidence (0-1). The output page surfaces the confidence as a banner
 * (T-093) so the user knows the sequence is inferred, not authored.
 *
 * Per ADR-0001's "Alternatives considered → LLM-based sequence inference",
 * this is intentionally a *fallback*, not the primary path. Confidence will
 * generally be lower than 1.0; callers must record it on
 * `structuredMetadata.sequenceConfidence`.
 */
import { readFile } from "fs/promises";
import { SchemaType, type GenerationConfig } from "@google/generative-ai";
import { generateTextWithImages } from "@/lib/gemini/client";
import { config } from "@/lib/config";
import type { AssemblyNode, StructuredPartRef } from "@/types/agents";

export const SEQUENCE_INFERENCE_PROMPT_VERSION = "sequence-inference@1.0";

export interface SequenceInferenceResult {
  /** Ordered Component IDs (matches partsCatalog[*].id) — the build order */
  orderedComponentIds: string[];
  /** Overall confidence in the inferred sequence (0-1) */
  confidence: number;
  /** Free-text reasoning the model produced (for debugging / banner detail) */
  rationale: string;
  /** Tokens + cost from the Gemini call */
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

interface InferenceRawResponse {
  steps: Array<{
    componentId: string;
    rationale?: string;
  }>;
  overallConfidence: number;
  reasoning?: string;
}

const responseSchema: GenerationConfig["responseSchema"] = {
  type: SchemaType.OBJECT,
  description:
    "Inferred build-order sequence for a CAD assembly, with per-step rationale and an overall confidence score.",
  properties: {
    steps: {
      type: SchemaType.ARRAY,
      description:
        "Components in the order they should be installed. Every Component in the parts catalog must appear exactly once. The first item is the base/fixture; subsequent items mount onto the partially-built assembly. Sub-assemblies are typically built first, then attached.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          componentId: {
            type: SchemaType.STRING,
            description:
              "The Component ID exactly as listed in the parts catalog (the dotted assembly path). Do not invent or modify IDs.",
          },
          rationale: {
            type: SchemaType.STRING,
            description:
              "Brief one-sentence justification for this position in the sequence (e.g., 'Base plate first as the mounting fixture', 'Bearing must precede shaft so shaft can be inserted into it').",
          },
        },
        required: ["componentId"],
      },
    },
    overallConfidence: {
      type: SchemaType.NUMBER,
      description:
        "Confidence in the overall sequence (0.0 to 1.0). Use 0.9+ for assemblies with clear structural hierarchy and unambiguous mating; 0.6-0.8 when there are multiple plausible orders for sub-assemblies; below 0.5 when geometry is ambiguous (e.g., symmetric or near-symmetric assemblies, identical interchangeable parts).",
    },
    reasoning: {
      type: SchemaType.STRING,
      description:
        "Two-to-four-sentence summary of the sequencing strategy. Surfaced to the user as banner detail.",
    },
  },
  required: ["steps", "overallConfidence"],
};

const SYSTEM_PROMPT = `You are a manufacturing assembly-sequence planner. Given a CAD assembly described by its parts catalog, hierarchical assembly tree, and four orthographic + isometric renders, propose the order in which a human operator would build the assembly from the bottom up.

Sequencing principles, in priority order:

1. **Base/fixture first.** Identify the largest static component (usually a base plate, frame rail, or housing) and start there.

2. **Bottom-up structural assembly.** Lower / load-bearing components precede upper / mounted components. Use the orthographic views to read vertical hierarchy — top view shows the floorplan; front and side views show stacking.

3. **Sub-assemblies before integration.** If the assembly tree has sub-trees (multiple components grouped under a parent node), build each sub-tree as a unit before attaching it to the main assembly. Within a sub-tree, apply the same principles recursively.

4. **Inserted-into precedes inserted.** Bearings before shafts. Nuts before bolts that thread through them. Bushings before pins.

5. **Fasteners last.** Bolts, screws, washers, nuts, and clips that hold an already-positioned subset go after the parts they secure.

6. **Symmetry handling.** When two Components are interchangeable (e.g., left/right brackets), order them adjacently in the sequence and lower confidence by ~0.1.

Honesty rules:

- Every Component in the parts catalog must appear in your sequence exactly once. Do not skip Components.
- Use Component IDs *exactly* as given. They are dotted assembly paths (e.g., "frame/leg-assembly/leg-front-left"). Do not paraphrase.
- Confidence reflects *your actual confidence*, not optimism. If two orderings are equally plausible, drop confidence to 0.6-0.7.
- If geometry alone cannot disambiguate (symmetric assemblies, identical fasteners), say so in \`reasoning\` and lower confidence below 0.6.

Use the renders to confirm spatial relationships. The isometric view is most informative for stacking; the top view helps with floorplan layout.`;

/**
 * Run sequence inference. Calls Gemini Pro with the parts catalog, assembly
 * tree, and the four multi-view renders.
 */
export async function inferSequence(
  partsCatalog: StructuredPartRef[],
  assemblyTree: AssemblyNode,
  multiViewPaths: { top: string; front: string; side: string; isometric: string },
): Promise<SequenceInferenceResult> {
  if (partsCatalog.length === 0) {
    throw new Error("inferSequence: empty parts catalog");
  }

  const userPrompt = buildUserPrompt(partsCatalog, assemblyTree);

  const [topBuf, frontBuf, sideBuf, isoBuf] = await Promise.all([
    readFile(multiViewPaths.top),
    readFile(multiViewPaths.front),
    readFile(multiViewPaths.side),
    readFile(multiViewPaths.isometric),
  ]);

  const result = await generateTextWithImages<InferenceRawResponse>(
    config.geminiProModel,
    SYSTEM_PROMPT,
    userPrompt,
    [
      { data: topBuf, mimeType: "image/png" },
      { data: frontBuf, mimeType: "image/png" },
      { data: sideBuf, mimeType: "image/png" },
      { data: isoBuf, mimeType: "image/png" },
    ],
    responseSchema,
    { temperature: 0.3, maxOutputTokens: 4096 },
  );

  if (!("parsed" in result)) {
    throw new Error("Sequence inference returned text without schema parsing");
  }

  const parsed = result.parsed;
  const orderedComponentIds = (parsed.steps ?? []).map((s) => s.componentId);

  // Validate against the parts catalog. We don't fail hard on missing IDs —
  // we report them via lowered confidence and append any unmapped IDs at the
  // end of the sequence so the pipeline doesn't drop Components.
  const catalogIds = new Set(partsCatalog.map((p) => p.id));
  const seen = new Set<string>();
  const validated: string[] = [];
  let invalidCount = 0;
  for (const id of orderedComponentIds) {
    if (!catalogIds.has(id)) {
      invalidCount++;
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    validated.push(id);
  }
  // Append any catalog IDs that the model omitted, in catalog order.
  for (const p of partsCatalog) {
    if (!seen.has(p.id)) validated.push(p.id);
  }

  // If the model produced an invalid sequence, knock confidence down.
  let confidence = clamp01(parsed.overallConfidence ?? 0.5);
  if (invalidCount > 0 || validated.length !== partsCatalog.length) {
    confidence = Math.min(confidence, 0.4);
  }

  return {
    orderedComponentIds: validated,
    confidence,
    rationale: parsed.reasoning ?? "",
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    costUsd: result.costUsd,
  };
}

// ============================================================
// Prompt construction
// ============================================================

function buildUserPrompt(
  partsCatalog: StructuredPartRef[],
  assemblyTree: AssemblyNode,
): string {
  const catalog = partsCatalog
    .map((p) => {
      const bbox = p.boundingBox
        ? ` bbox=[${p.boundingBox.min.map(fmt).join(",")} → ${p.boundingBox.max.map(fmt).join(",")}]`
        : "";
      return `  - ${p.id}: "${p.name}"${bbox}`;
    })
    .join("\n");

  const tree = renderTree(assemblyTree, 0);

  return `Propose a build sequence for this Assembly.

Parts catalog (${partsCatalog.length} Components):
${catalog}

Assembly tree:
${tree}

Four renders are attached: top view, front view, side view, isometric view (in that order).

Return ordered \`steps\`, where each entry's \`componentId\` exactly matches one of the IDs above. Every Component in the catalog must appear exactly once. Provide an overall confidence (0-1) and a 2-4 sentence \`reasoning\`.`;
}

function renderTree(node: AssemblyNode, depth: number): string {
  const indent = "  ".repeat(depth);
  const lines = [`${indent}- ${node.id}: "${node.name}"`];
  for (const c of node.children) {
    lines.push(renderTree(c, depth + 1));
  }
  return lines.join("\n");
}

function fmt(n: number): string {
  return Math.abs(n) < 1 ? n.toFixed(3) : n.toFixed(1);
}

function clamp01(x: number): number {
  if (!isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
