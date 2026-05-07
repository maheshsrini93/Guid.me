import type { StructuredPartRef, AssemblyNode } from "@/types/agents";

export const CAD_VISION_PROMPT_VERSION = "vision-analyzer-cad@1.0";

export function buildCadVisionSystemPrompt(): string {
  return `You are a CAD assembly vision analyzer. You receive two consecutive frames from an authored "explode" animation of a 3D assembly: frame[n-1] is the state *before* installation step n, and frame[n] is the state *after*. Your job is to describe the *transition* — what was just installed and how — by comparing the two frames.

A deterministic parts catalog and assembly tree is supplied in the user prompt. Every Component you reference in \`actions[].subject\` MUST come from the active-Components list. Do NOT invent part names. Do NOT report parts you do not see actually move between the two frames.

You are NOT asked to enumerate all visible parts, list tools, count quantities, or detect safety warnings. The CAD source adapter already provides those deterministically. Restrict yourself to:

  1. \`actions\` — which active component(s) moved and how. Pick a verb that matches the visual motion (insert, place, slide, press, rotate, etc.). The subject must be a Component name/ID from the active list. The target should be a Component or feature already in place.

  2. \`arrows\` — rotation cues only. CAD frames typically show pure translation; if the renderer baked in a curved arrow (e.g. on a threaded fastener or a hinge pivot), capture it. Otherwise leave the array empty. Translation arrows are added later by the illustration renderer — do not synthesize them here.

  3. \`complexity\` — simple (one part, one straight motion) vs complex (multi-part, rotation, threading, precise mating).

  4. \`confidence\` — be honest. Lower the score when the diff is ambiguous (e.g. multiple parts moved at once, cannot match the moving body to a Component in the list, or symmetric components are interchangeable). Do not default to 1.0.

  5. \`confirmationCue\` — what the operator should see/feel when the step is done. Derive from geometry: threads → "tightened", snap features → "audible click", flat mating face → "flush against {target}". Omit if you cannot infer one cleanly.

Honesty rules:
- If you cannot identify what moved, return an empty \`actions\` array and lower \`confidence\` to ≤ 0.4 — never invent a transition.
- If multiple Components moved together (a sub-assembly), report each one as a separate action with the same target.
- Use Component IDs *exactly* as listed (the dotted path) when more than one Component shares a name.`;
}

export interface CadVisionContext {
  /** 1-indexed step number (corresponds to the destination frame) */
  stepNumber: number;
  /** Total number of transitions in this assembly */
  totalSteps: number;
  /** Components most likely to be installed in this transition */
  activeComponents: StructuredPartRef[];
  /** Optional running summary of previous transitions for cross-step continuity */
  previousStepSummary?: string;
  /** Hierarchical assembly path of the destination state, for spatial context */
  assemblyTree: AssemblyNode;
}

export function buildCadVisionUserPrompt(ctx: CadVisionContext): string {
  const activeList = ctx.activeComponents
    .map((c) => {
      const parts: string[] = [`  - ${c.id}: "${c.name}"`];
      if (c.parentAssemblyPath) parts.push(`(under ${c.parentAssemblyPath})`);
      if (c.material) parts.push(`material=${c.material}`);
      if (c.mass !== undefined) parts.push(`mass=${c.mass.toFixed(3)}kg`);
      return parts.join(" ");
    })
    .join("\n");

  let prompt = `Compare these two consecutive keyframes from an explode-view animation.

Step ${ctx.stepNumber} of ${ctx.totalSteps}.

The first attached image is frame[n-1] (state BEFORE this step). The second attached image is frame[n] (state AFTER). Identify what was just installed.

Active Components most likely involved in this transition (from the parts catalog):
${activeList || "  (no narrowed-down candidates — choose from the assembly tree)"}

Assembly tree (for context):
${renderTree(ctx.assemblyTree, 0)}`;

  if (ctx.previousStepSummary) {
    prompt += `\n\nPrevious step summary: ${ctx.previousStepSummary}`;
  }

  prompt += `

Return only the transition fields defined by the response schema: \`actions\`, \`arrows\` (rotation only), \`complexity\`, \`confidence\`, and \`confirmationCue\`. Do not list parts, tools, or quantities — those are already known.`;

  return prompt;
}

function renderTree(node: AssemblyNode, depth: number): string {
  const indent = "  ".repeat(depth);
  const lines = [`${indent}- ${node.id}: "${node.name}"`];
  for (const c of node.children) {
    lines.push(renderTree(c, depth + 1));
  }
  return lines.join("\n");
}
