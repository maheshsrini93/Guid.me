import type { EnforcedStep, StructuredPartRef } from "@/types/agents";

export const PROMPT_VERSION = "illustration-generator@2.0";

// Part label sequence per IL-007: skip I and O
export const PART_LABELS = "ABCDEFGHJKLMNPQRSTUVWXYZ".split("");

// ============================================================
// System instruction — full IL-001 to IL-018 reference
// Prepended to every user prompt since the REST image API
// does not support a separate systemInstruction field.
// ============================================================

const SYSTEM_INSTRUCTION = `You are the Guid.me illustration engine. You generate technical assembly illustrations for consumer furniture guides. Every image you produce must comply with the illustration guidelines below. You never add parts, tools, or decorations that aren't specified in the step data.

Your output is a single image per call. No text responses — only the generated image.

─────────────────────────────────────────
ILLUSTRATION GUIDELINES (full reference)
─────────────────────────────────────────

## 1. VISUAL STYLE

IL-001 (MUST) — Isometric technical style
  - Perspective: isometric, approximately 30° angle
  - Line work: clean, precise line art with subtle shading
  - Palette: neutral/warm tones matching real materials (light wood, white laminate, silver hardware)
  - Background: clean white — no gradients, patterns, scenery, or lifestyle elements
  - Shadows: subtle drop shadow to ground the object only
  - Detail level: enough to identify parts, NOT photorealistic
  - Feel: professional technical documentation — think IKEA manual quality with color

IL-002 (MUST) — Standardized dimensions
  - Resolution: 1024 × 1024 pixels (square)
  - Framing: product fills 70-80% of the frame
  - Margins: consistent on all sides for labels and arrows
  - Scale: same product appears at the same scale across ALL steps in the guide

IL-003 (MUST) — No instructional text in illustrations
  ALLOWED text elements only:
  - Quantities: "×4" next to grouped identical fasteners
  - Directional labels: "FRONT", "BACK", "TOP", "BOTTOM"
  - Action indicators: "CLICK" for snap-fit connections
  - Part labels: "A", "B", "C" matching the parts list
  FORBIDDEN: any instructional sentences, step descriptions, or explanatory text

IL-004 (MUST) — Image quality standards
  - No blur — all edges sharp and well-defined
  - No grain/noise — clean rendering
  - No stretching/distortion — proportions accurate
  - No hallucinated parts — only parts that exist in the product
  - No merged geometry — distinct parts visually separate
  Regenerate up to 3× before flagging for manual review.

IL-005 (MUST) — Color consistency
  Same part = same color in every illustration. Establish palette in step 1:
  - Wood panels: consistent wood tone (light birch, white laminate, etc.)
  - Metal hardware: consistent silver/gray
  - Plastic components: consistent black or white
  - Backing boards: darker tone to distinguish from shelves


## 2. PART VISUALIZATION

IL-006 (MUST) — Active/inactive part highlighting
  - Active parts (current step): full color, sharp edges, bright/saturated
  - Inactive parts (already assembled): muted/desaturated, semi-transparent, lighter lines
  - New parts being added: optional subtle glow or highlight to draw attention

IL-007 (MUST) — Alphabetical part labels
  - Sequence: A, B, C, D, E, F, G, H, J, K, L, M, N, P… (SKIP I and O)
  - Placed near the part with thin leader line if needed
  - Legible: minimum apparent size, high contrast against background
  - Consistent placement: prefer upper-right of part

IL-008 (SHOULD) — Exploded views for clustered parts
  - Use when 3+ parts connect within ~10 cm area
  - Show parts separated along their insertion axis
  - Dashed lines connecting each part to its destination
  - Maintain relative positioning for spatial clarity

IL-009 (SHOULD) — Detail callouts/enlargements
  - Circular inset at 2-3× magnification for small hardware
  - Connected by thin leader line to the main illustration area
  - Common uses: cam lock insertion, dowel alignment, screw head depth, hinge screws
  - Main illustration stays at normal scale


## 3. MOTION & DIRECTION

IL-010 (MUST) — Direction arrows
  - Style: solid, bold arrows with clear arrowheads
  - Color: distinct from product — blue or green
  - Types: push/insert = straight arrow into destination; slide = arrow along path;
    lower/place = downward curved arrow; lift = upward arrow
  - Length: proportional to movement distance
  - Start from part being moved, point toward destination

IL-011 (MUST) — Rotation arrows
  - Curved arrows for rotation actions (tighten, turn cam lock)
  - Clockwise = tightening; counter-clockwise = loosening
  - Bold curved arrow with clear direction indicator
  - Placed around the rotating element
  - Optional degree label: "¼ turn" or "90°" when specific amount matters

IL-012 (SHOULD) — Measurement notation
  - Format: value + space + unit: "30 mm", "15 cm"
  - Dimension lines with arrowheads at both ends (small filled triangles)
  - Place outside the product outline when possible
  - Use sparingly — only when exact measurement is critical


## 4. COMPARATIVE & REFERENCE

IL-013 (SHOULD) — OK/NOK (Do/Don't) illustrations
  - Left side: correct assembly with green checkmark (✓)
  - Right side: incorrect assembly with red X overlay
  - Mistake must be clearly visible
  - Use sparingly: max 2-3 per guide

IL-014 (SHOULD) — Checkpoint reference images
  - Generated at phase transitions (every 4-8 steps)
  - Shows cumulative assembly state — all parts full color, no muting
  - Standard isometric angle, no action arrows — static reference
  - Labeled: "Checkpoint" or "Your progress"

IL-015 (MUST) — Two-person indicator
  - Two simplified human figure silhouettes
  - Placement: upper-right corner, consistent position
  - Always visible, not obscured by parts or arrows
  - Optional: show second person's hand positions on product

IL-016 (MUST) — One illustration per step
  - Every step gets exactly one illustration
  - Exceptions: checkpoints are additional; do/don't pairs count as one unit

IL-017 (SHOULD) — Consistent viewing angle
  - Same isometric angle within each assembly phase
  - Only change when furniture flips, rotates, or step explicitly says "Turn the unit"

IL-018 (SHOULD) — Complexity-based model routing
  - Simple (1-2 parts, straightforward action): Nano Banana 2 / Gemini 3.1 Flash Image
  - Complex (3+ parts, exploded view, detail callout, do/don't): Nano Banana Pro / Gemini 3 Pro Image`;

// ============================================================
// Part label map builder
// ============================================================

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

// ============================================================
// Complexity scorer (IL-018)
// ============================================================

/**
 * Score step complexity for model routing per IL-018.
 * Returns "complex" if score >= 3, otherwise "simple".
 */
export function scoreStepComplexity(step: EnforcedStep): "simple" | "complex" {
  let score = 0;

  const activeParts = step.parts.length;
  if (activeParts >= 3) score += 2;
  else if (activeParts === 2) score += 1;

  if (step.needsExplodedView) score += 2;
  if (step.needsDetailCallout) score += 1;
  if (step.isOkNok) score += 2;
  if (step.twoPersonRequired) score += 1;

  const isRotation =
    step.primaryVerb === "Tighten" || step.primaryVerb === "Screw";
  if (isRotation && activeParts >= 2) score += 1;

  if (step.isCheckpoint) score += 1;

  return score >= 3 ? "complex" : "simple";
}

// ============================================================
// Color palette type
// ============================================================

export interface ColorPalette {
  woodPanels: string;
  hardware: string;
  backing: string;
  plastic: string;
}

// ============================================================
// Step prompt builder (v2.0)
// ============================================================

/**
 * Build the illustration prompt for a single step.
 * Follows the v2.0 template: system instruction prepend, color palette,
 * conditional sections for exploded view, detail callout, checkpoint,
 * OK/NOK, and richer motion indicators.
 */
export function buildStepPrompt(
  step: EnforcedStep,
  stepIndex: number,
  totalSteps: number,
  partLabelMap: Record<string, string>,
  productName: string,
  previousParts: StructuredPartRef[],
  colorPalette?: ColorPalette,
): string {
  const lines: string[] = [
    // System instruction prepend (REST API has no separate system instruction)
    SYSTEM_INSTRUCTION,
    "",
    "---",
    "",
    // User prompt header
    `Generate a technical assembly illustration for step ${step.stepNumber} of ${totalSteps} in the "${productName}" assembly guide.`,
    "",
  ];

  // ── STEP DETAILS ──
  lines.push(
    "STEP DETAILS:",
    `- Step ${step.stepNumber}: "${step.title}"`,
    `- Instruction: "${step.instruction}"`,
    `- Primary action: ${step.primaryVerb}`,
    "",
  );

  // ── COLOR PALETTE (inject from step 2 onward per IL-005) ──
  if (colorPalette && stepIndex > 0) {
    lines.push(
      "COLOR PALETTE (established in step 1 — maintain exactly):",
      `- Wood panels: ${colorPalette.woodPanels}`,
      `- Metal hardware: ${colorPalette.hardware}`,
      `- Backing/panels: ${colorPalette.backing}`,
      `- Plastic components: ${colorPalette.plastic}`,
      "- Direction arrows: blue (#2563EB)",
      "- Rotation arrows: green (#16A34A)",
      "",
    );
  }

  // ── ACTIVE PARTS ──
  const activeParts = step.parts.map(
    (p) =>
      `- ${partLabelMap[p.id] ?? "?"}: ${p.name} (×${p.quantity})`,
  );
  if (activeParts.length > 0) {
    lines.push(
      "ACTIVE PARTS (render at full color, sharp edges, bright/saturated):",
      ...activeParts,
      "",
    );
  }

  // ── PREVIOUSLY ASSEMBLED PARTS ──
  const inactiveParts = previousParts
    .filter((p) => !step.parts.some((sp) => sp.id === p.id))
    .map(
      (p) =>
        `- ${partLabelMap[p.id] ?? "?"}: ${p.name}`,
    );
  if (inactiveParts.length > 0) {
    lines.push(
      "PREVIOUSLY ASSEMBLED PARTS (render muted/desaturated, semi-transparent, lighter lines):",
      ...inactiveParts,
      "",
    );
  }

  // ── MOTION INDICATORS ──
  const isRotation =
    step.primaryVerb === "Tighten" || step.primaryVerb === "Screw";

  lines.push("MOTION INDICATORS:");
  if (isRotation) {
    const direction = step.rotationDirection ?? "clockwise";
    const target = step.rotationTarget ?? "the fastener";
    lines.push(
      `- Show a bold curved ${direction} arrow around ${target}`,
    );
    if (step.rotationAmount) {
      lines.push(`- Label: "${step.rotationAmount}"`);
    }
  } else {
    const arrowDir = step.arrowDirection ?? "directional";
    const start = step.arrowStart ?? "the part being moved";
    const end = step.arrowEnd ?? "its destination";
    lines.push(
      `- Show a bold ${arrowDir} arrow (blue, #2563EB) from ${start} toward ${end}`,
      "- Arrow length proportional to the movement distance",
    );
  }
  lines.push("");

  // ── EXPLODED VIEW (IL-008) ──
  if (step.needsExplodedView) {
    const explodedParts = step.parts.map(
      (p) => `  - ${partLabelMap[p.id] ?? "?"}: ${p.name}`,
    );
    lines.push(
      "EXPLODED VIEW:",
      "- Separate the following parts along their insertion axis with dashed guide lines:",
      ...explodedParts,
      "",
    );
  }

  // ── DETAIL CALLOUT (IL-009) ──
  if (step.needsDetailCallout) {
    const subject =
      step.detailCalloutSubject ?? "the small hardware connection";
    lines.push(
      "DETAIL CALLOUT:",
      `- Add a circular zoom inset (2-3× magnification) showing: ${subject}`,
      "- Connect with a thin leader line to the relevant area on the main view",
      "",
    );
  }

  // ── TWO-PERSON INDICATOR (IL-015) ──
  if (step.twoPersonRequired) {
    lines.push(
      "TWO-PERSON INDICATOR:",
      "- Place two simplified human figure silhouettes in the upper-right corner",
    );
    if (step.gripPositions) {
      lines.push(
        `- Show where both people should grip/support: ${step.gripPositions}`,
      );
    }
    lines.push("");
  }

  // ── CHECKPOINT IMAGE (IL-014) ──
  if (step.isCheckpoint) {
    lines.push(
      "CHECKPOINT IMAGE:",
      "- This is a progress checkpoint, NOT an action step",
      "- Show the full cumulative assembly state — ALL parts at full color (no muting)",
      "- No action arrows or motion indicators",
      "- Standard isometric angle",
      "",
    );
  }

  // ── DO / DON'T COMPARISON (IL-013) ──
  if (step.isOkNok) {
    const okDesc = step.okDescription ?? "correct assembly";
    const nokDesc = step.nokDescription ?? "incorrect assembly";
    lines.push(
      "DO / DON'T COMPARISON:",
      `- LEFT side: correct assembly with green checkmark (✓) — ${okDesc}`,
      `- RIGHT side: incorrect assembly with red X — ${nokDesc}`,
      "- Make the difference clearly visible",
      "",
    );
  }

  // ── SAFETY CALLOUTS ──
  if (step.safetyCallouts && step.safetyCallouts.length > 0) {
    lines.push("SAFETY CALLOUTS:");
    for (const callout of step.safetyCallouts) {
      lines.push(`- ${callout.severity.toUpperCase()}: ${callout.text}`);
    }
    lines.push("");
  }

  // ── PART LABELS ──
  const activeLabels = step.parts
    .map((p) => partLabelMap[p.id] ?? "?")
    .join(", ");
  lines.push(
    "PART LABELS:",
    `- Label each active part with its letter (${activeLabels}) using thin leader lines`,
    "- Place labels consistently in the upper-right of each part",
    '- No other text in the image except: part labels, "×N" for grouped fasteners, and directional labels (FRONT/BACK/TOP/BOTTOM) if needed',
    "",
  );

  // ── RENDERING RULES ──
  lines.push(
    "RENDERING RULES:",
    "- Isometric perspective, approximately 30° angle",
    "- Clean precise line art with subtle shading",
    "- White background, no gradients or scenery",
    "- Subtle drop shadow to ground the object",
    "- 1024×1024 px, product fills 70-80% of frame",
    "- No blur, no noise, no hallucinated parts, no merged geometry",
  );

  if (stepIndex > 0) {
    lines.push(
      "- MAINTAIN the same viewing angle as the previous steps in this phase",
    );
  }

  return lines.join("\n");
}
