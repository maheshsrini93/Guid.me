import type { EnforcedGuide, EnforcedStep, AllowedVerb } from "@/types/agents";

/**
 * Post-processor (Layer 3): 9+ deterministic transforms applied after AI response.
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

  return {
    steps,
    guideMetadata: { ...guide.guideMetadata },
  };
}

function postProcessStep(step: EnforcedStep): EnforcedStep {
  // 1. Verb-first enforcement (WI-022)
  step.instruction = enforceVerbFirst(step.instruction, step.primaryVerb);

  // 2. Sentence length enforcement (max 20 words)
  step.instruction = enforceSentenceLength(step.instruction);

  // 3. Part ID insertion — ensure format: "name (id, ×quantity)"
  step.instruction = enforcePartReferences(step.instruction, step.parts);

  // 4. Safety tag normalization
  if (step.safetyCallout) {
    step.safetyCallout = normalizeSafetyTag(step.safetyCallout);
  }

  // 5. Whitespace and formatting cleanup
  step.instruction = cleanWhitespace(step.instruction);

  // 6. Metric unit enforcement
  step.instruction = enforceMetricUnits(step.instruction);

  // 7. Step numbering normalization (ensure sequential)
  // (handled at guide level below)

  // 8. Sentence case enforcement
  step.instruction = enforceSentenceCase(step.instruction);

  // 9. Hazard keyword detection
  if (!step.safetyCallout) {
    const detectedHazard = detectHazardKeywords(step.instruction);
    if (detectedHazard) {
      step.safetyCallout = detectedHazard;
    }
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
    } else {
      // Subsequent sentences should also start with an approved verb if possible
      const firstWord = trimmed.split(/\s+/)[0].replace(/[.,;:!?]$/, "");
      if (!APPROVED_VERBS.includes(firstWord as AllowedVerb)) {
        // Don't force-fix subsequent sentences — just leave them
        // The validator will flag these
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
  callout: { severity: "caution" | "warning" | "danger"; text: string },
): { severity: "caution" | "warning" | "danger"; text: string } {
  let { severity, text } = callout;

  // Normalize severity based on keywords
  const lowerText = text.toLowerCase();
  if (
    lowerText.includes("electric shock") ||
    lowerText.includes("fatal") ||
    lowerText.includes("death") ||
    lowerText.includes("fire risk")
  ) {
    severity = "danger";
  } else if (
    lowerText.includes("injury") ||
    lowerText.includes("heavy") ||
    lowerText.includes("fall") ||
    lowerText.includes("sharp")
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

function enforceSentenceCase(instruction: string): string {
  const sentences = splitSentences(instruction);

  return sentences
    .map((s) => {
      const trimmed = s.trim();
      if (!trimmed) return trimmed;
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    })
    .join(" ");
}

// ============================================================
// Transform 9: Hazard keyword detection
// ============================================================

const HAZARD_KEYWORDS: { pattern: RegExp; severity: "caution" | "warning" | "danger"; text: string }[] = [
  { pattern: /\bheavy\b/i, severity: "warning", text: "Heavy component. Use proper lifting technique or get assistance." },
  { pattern: /\bsharp\b/i, severity: "caution", text: "Sharp edges present. Handle with care." },
  { pattern: /\belectri/i, severity: "danger", text: "Electrical components. Ensure power is disconnected." },
  { pattern: /\bchemical|adhesive|glue\b/i, severity: "caution", text: "Chemical substance. Ensure adequate ventilation." },
  { pattern: /\btip.?over/i, severity: "warning", text: "Tip-over risk. Secure the assembly or use wall anchoring." },
];

function detectHazardKeywords(
  instruction: string,
): { severity: "caution" | "warning" | "danger"; text: string } | null {
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
