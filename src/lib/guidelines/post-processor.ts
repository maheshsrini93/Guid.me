import type { EnforcedGuide, EnforcedStep, AllowedVerb, SafetySeverity } from "@/types/agents";

/**
 * Post-processor (Layer 3): deterministic transforms applied after AI response.
 * These are rule-based corrections that don't require AI — they enforce formatting,
 * consistency, and style requirements that the LLM might miss.
 */

const APPROVED_VERBS: AllowedVerb[] = [
  "Insert", "Attach", "Tighten", "Slide",
  "Place", "Align", "Press", "Push",
  "Lower", "Lift", "Flip", "Screw",
  "Snap", "Hook", "Position", "Secure",
];

const MAX_SENTENCE_WORDS = 20;

/**
 * Apply all post-processing transforms to an enforced guide.
 * Returns a new guide (does not mutate the input).
 */
export function postProcess(guide: EnforcedGuide): EnforcedGuide {
  const steps = guide.steps.map((step) => postProcessStep({ ...step }));

  // Normalize step numbering (Transform 7)
  for (let i = 0; i < steps.length; i++) {
    steps[i].stepNumber = i + 1;
  }

  return {
    steps,
    guideMetadata: { ...guide.guideMetadata },
    beforeYouBegin: guide.beforeYouBegin
      ? {
          ...guide.beforeYouBegin,
          commonMistakes: guide.beforeYouBegin.commonMistakes.map(enforceSentenceCase),
        }
      : { workspace: "", preconditions: [], commonMistakes: [] },
    finishingUp: guide.finishingUp
      ? {
          ...guide.finishingUp,
          usageTips: guide.finishingUp.usageTips.map(enforceSentenceCase),
        }
      : { tightenCheck: null, wallAnchoring: null, levelCheck: null, cleanup: null, usageTips: [] },
    terminologyGlossary: guide.terminologyGlossary ?? [],
    enforcementSummary: guide.enforcementSummary
      ? {
          ...guide.enforcementSummary,
          // Correct totalSteps if it doesn't match
          totalSteps: steps.length,
        }
      : {
          totalSteps: steps.length,
          stepsRewritten: 0,
          safetyCalloutsAdded: 0,
          twoPersonStepsFlagged: 0,
          needsReviewCount: 0,
          rulesApplied: [],
        },
  };
}

function postProcessStep(step: EnforcedStep): EnforcedStep {
  // 1. Verb-first enforcement (WI-022)
  step.instruction = enforceVerbFirst(step.instruction, step.primaryVerb);

  // 2. Sentence length enforcement (max 20 words)
  step.instruction = enforceSentenceLength(step.instruction);

  // 3. Part ID insertion — ensure format: "name (id, ×quantity)"
  step.instruction = enforcePartReferences(step.instruction, step.parts);

  // 4. Safety tag normalization (array-based)
  step.safetyCallouts = step.safetyCallouts.map(normalizeSafetyTag);

  // 5. Whitespace and formatting cleanup
  step.instruction = cleanWhitespace(step.instruction);

  // 6. Metric unit enforcement
  step.instruction = enforceMetricUnits(step.instruction);

  // 7. Step numbering normalization (handled at guide level)

  // 8. Sentence case enforcement
  step.instruction = enforceSentenceCaseText(step.instruction);

  // 9. Hazard keyword detection (adds to safetyCallouts array)
  const detectedHazard = detectHazardKeywords(step.instruction);
  if (detectedHazard && !step.safetyCallouts.some((c) =>
    c.text.toLowerCase().includes(detectedHazard.text.split(".")[0].toLowerCase().slice(0, 20))
  )) {
    step.safetyCallouts.push(detectedHazard);
  }

  // 10. Sub-note sentence length enforcement
  step.subNotes = (step.subNotes ?? []).flatMap((note) => {
    const words = note.trim().split(/\s+/);
    if (words.length > MAX_SENTENCE_WORDS) {
      const mid = Math.ceil(words.length / 2);
      return [words.slice(0, mid).join(" ") + ".", words.slice(mid).join(" ")];
    }
    return [note];
  });

  // 11. Illustration prompt sanitization
  if (step.illustrationPrompt) {
    step.illustrationPrompt = step.illustrationPrompt.trim();
  }

  // 12. Confirmation cue formatting
  if (step.confirmationCue) {
    let cue = step.confirmationCue.trim();
    if (cue && !cue.endsWith(".")) cue += ".";
    if (cue.length > 0) cue = cue.charAt(0).toUpperCase() + cue.slice(1);
    step.confirmationCue = cue;
  }

  // 13. Tools deduplication
  step.toolsRequired = [...new Set(step.toolsRequired ?? [])];

  // 14. Checkpoint consistency
  if (step.isCheckpoint && !step.checkpointNote) {
    step.checkpointNote = "Verify your assembly matches the expected state before continuing.";
  }

  return step;
}

// ============================================================
// Transform 1: Verb-first enforcement
// ============================================================

function enforceVerbFirst(instruction: string, primaryVerb: AllowedVerb): string {
  const sentences = splitSentences(instruction);

  const fixed = sentences.map((sentence, idx) => {
    const trimmed = sentence.trim();
    if (!trimmed) return trimmed;

    // First sentence must start with the primary verb
    if (idx === 0) {
      const firstWord = trimmed.split(/\s+/)[0].replace(/[.,;:!?]$/, "");
      if (!APPROVED_VERBS.includes(firstWord as AllowedVerb)) {
        return `${primaryVerb} ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
      }
    }

    return trimmed;
  });

  return fixed.join(" ");
}

// ============================================================
// Transform 2: Sentence length enforcement
// ============================================================

function enforceSentenceLength(instruction: string): string {
  const sentences = splitSentences(instruction);

  const fixed: string[] = [];
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/);
    if (words.length > MAX_SENTENCE_WORDS) {
      // Split at the midpoint
      const mid = Math.ceil(words.length / 2);
      fixed.push(words.slice(0, mid).join(" ") + ".");
      fixed.push(words.slice(mid).join(" "));
    } else {
      fixed.push(sentence.trim());
    }
  }

  return fixed.join(" ");
}

// ============================================================
// Transform 3: Part ID insertion
// ============================================================

function enforcePartReferences(
  instruction: string,
  parts: { name: string; id: string; quantity: number }[],
): string {
  let result = instruction;

  for (const part of parts) {
    // If the part name appears without the full reference format, add it
    const fullRef = `${part.name} (${part.id}, ×${part.quantity})`;
    const namePattern = new RegExp(
      `\\b${escapeRegex(part.name)}\\b(?!\\s*\\()`,
      "gi",
    );

    // Only replace the first occurrence without the reference
    let replaced = false;
    result = result.replace(namePattern, (match) => {
      if (!replaced) {
        replaced = true;
        return fullRef;
      }
      return match;
    });
  }

  return result;
}

// ============================================================
// Transform 4: Safety tag normalization
// ============================================================

function normalizeSafetyTag(
  callout: { severity: SafetySeverity; text: string },
): { severity: SafetySeverity; text: string } {
  let { severity, text } = callout;

  // Normalize severity based on keywords (only escalate, never downgrade)
  const lowerText = text.toLowerCase();
  if (
    lowerText.includes("electric shock") ||
    lowerText.includes("fatal") ||
    lowerText.includes("death") ||
    lowerText.includes("fire risk")
  ) {
    severity = "danger";
  } else if (
    severity !== "danger" && (
      lowerText.includes("injury") ||
      lowerText.includes("heavy") ||
      lowerText.includes("fall") ||
      lowerText.includes("sharp")
    )
  ) {
    severity = "warning";
  }

  // Ensure text ends with a period
  text = text.trim();
  if (text && !text.endsWith(".")) {
    text += ".";
  }

  // Sentence case
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  return { severity, text };
}

// ============================================================
// Transform 5: Whitespace cleanup
// ============================================================

function cleanWhitespace(instruction: string): string {
  return instruction
    .replace(/\s+/g, " ") // collapse multiple spaces
    .replace(/\s+\./g, ".") // remove space before period
    .replace(/\s+,/g, ",") // remove space before comma
    .replace(/\.{2,}/g, ".") // collapse multiple periods
    .trim();
}

// ============================================================
// Transform 6: Metric unit enforcement
// ============================================================

function enforceMetricUnits(instruction: string): string {
  // Convert common imperial references to metric equivalents
  return instruction
    .replace(/(\d+)\s*inch(?:es)?/gi, (_, n) => `${Math.round(Number(n) * 25.4)} mm`)
    .replace(/(\d+)\s*(?:foot|feet)/gi, (_, n) => `${Math.round(Number(n) * 304.8)} mm`)
    .replace(/(\d+(?:\.\d+)?)\s*lbs?/gi, (_, n) => `${(Number(n) * 0.4536).toFixed(1)} kg`)
    .replace(/(\d+(?:\.\d+)?)\s*oz/gi, (_, n) => `${Math.round(Number(n) * 28.35)} g`);
}

// ============================================================
// Transform 8: Sentence case enforcement
// ============================================================

function enforceSentenceCaseText(instruction: string): string {
  const sentences = splitSentences(instruction);

  return sentences
    .map((s) => {
      const trimmed = s.trim();
      if (!trimmed) return trimmed;
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    })
    .join(" ");
}

function enforceSentenceCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  let result = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  if (!result.endsWith(".")) result += ".";
  return result;
}

// ============================================================
// Transform 9: Hazard keyword detection
// ============================================================

const HAZARD_KEYWORDS: { pattern: RegExp; severity: SafetySeverity; text: string }[] = [
  { pattern: /\bheavy\b/i, severity: "warning", text: "Heavy component. Use proper lifting technique or get assistance." },
  { pattern: /\bsharp\b/i, severity: "caution", text: "Sharp edges present. Handle with care." },
  { pattern: /\belectri/i, severity: "danger", text: "Electrical components. Ensure power is disconnected." },
  { pattern: /\bchemical|adhesive|glue\b/i, severity: "caution", text: "Chemical substance. Ensure adequate ventilation." },
  { pattern: /\btip.?over/i, severity: "warning", text: "Tip-over risk. Secure the assembly or use wall anchoring." },
];

function detectHazardKeywords(
  instruction: string,
): { severity: SafetySeverity; text: string } | null {
  for (const { pattern, severity, text } of HAZARD_KEYWORDS) {
    if (pattern.test(instruction)) {
      return { severity, text };
    }
  }
  return null;
}

// ============================================================
// Helpers
// ============================================================

function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space or end
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
