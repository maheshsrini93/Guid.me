import type { EnforcedStep, StructuredPartRef } from "@/types/agents";

export const PROMPT_VERSION = "illustration-generator@1.0";

// Part label sequence per IL-007: skip I and O
export const PART_LABELS = "ABCDEFGHJKLMNPQRSTUVWXYZ".split("");

/**
 * Build a global part label map: partId -> letter (A, B, C, ...).
 * Consistent across all steps per IL-005 and IL-007.
 */
export function buildPartLabelMap(
  steps: EnforcedStep[],
): Record<string, string> {
  const seen = new Map<string, string>();
  let idx = 0;

  for (const step of steps) {
    for (const part of step.parts) {
      if (!seen.has(part.id) && idx < PART_LABELS.length) {
        seen.set(part.id, PART_LABELS[idx]);
        idx++;
      }
    }
  }

  return Object.fromEntries(seen);
}

/**
 * Build the illustration prompt for a single step.
 * Injects IL guidelines context, step details, part labels, and active/inactive state.
 */
export function buildStepPrompt(
  step: EnforcedStep,
  stepIndex: number,
  totalSteps: number,
  partLabelMap: Record<string, string>,
  productName: string,
  previousParts: StructuredPartRef[],
): string {
  const activeLabels = step.parts
    .map((p) => `${partLabelMap[p.id] ?? "?"}: ${p.name} (x${p.quantity})`)
    .join(", ");

  const prevLabels = previousParts
    .filter((p) => !step.parts.some((sp) => sp.id === p.id))
    .map((p) => `${partLabelMap[p.id] ?? "?"}: ${p.name}`)
    .join(", ");

  const lines: string[] = [
    `Generate a technical assembly illustration for step ${step.stepNumber} of ${totalSteps} in the "${productName}" work instruction guide.`,
    "",
    "## Visual Style Requirements",
    "- Isometric perspective (approximately 30-degree angle)",
    "- Clean, precise line art with subtle shading",
    "- Neutral/warm tones reflecting actual material colors",
    "- Clean white background, no gradients or scenery",
    "- Subtle drop shadow to ground the object",
    "- Resolution: 1024x1024 pixels, product fills 70-80% of frame",
    "",
    "## Step Details",
    `- Step ${step.stepNumber} of ${totalSteps}: "${step.title}"`,
    `- Instruction: "${step.instruction}"`,
    `- Complexity: ${step.complexity}`,
  ];

  if (activeLabels) {
    lines.push(
      "",
      "## Active Parts (full color, sharp edges, bright/saturated)",
      activeLabels,
    );
  }

  if (prevLabels) {
    lines.push(
      "",
      "## Previously Assembled Parts (muted/desaturated, lighter lines)",
      prevLabels,
    );
  }

  // Direction/motion arrows
  lines.push(
    "",
    "## Motion Indicators",
    "- Show clear directional arrows (blue or green) indicating the assembly motion",
    "- Arrow starts from the part being moved and points toward its destination",
  );

  if (step.primaryVerb === "Tighten" || step.primaryVerb === "Screw") {
    lines.push(
      "- Include a curved clockwise rotation arrow around the fastener",
    );
  }

  // Safety indicators
  if (step.twoPersonRequired) {
    lines.push(
      "",
      "## Two-Person Indicator",
      "- Include two simplified human figure silhouettes in the upper-right corner",
      "- Show where both people should grip/support the product",
    );
  }

  if (step.safetyCallouts && step.safetyCallouts.length > 0) {
    lines.push("", "## Safety Callouts");
    for (const callout of step.safetyCallouts) {
      lines.push(`- ${callout.severity.toUpperCase()}: ${callout.text}`);
    }
  }

  // Part labels
  lines.push(
    "",
    "## Part Labels",
    "- Label active parts with their letter (A, B, C...) using thin leader lines",
    "- No instructional text in the image (only part labels, quantities like 'x4', and directional labels)",
  );

  // Consistency
  if (stepIndex > 0) {
    lines.push(
      "",
      "## Consistency",
      "- Maintain the same isometric viewing angle as previous steps in this phase",
      "- Keep the same color palette for all parts across steps",
    );
  }

  return lines.join("\n");
}
