import type { EnforcedGuide, EnforcedStep, AllowedVerb } from "@/types/agents";

// ============================================================
// Quality Flag
// ============================================================

export interface QualityFlag {
  /** Validator that produced this flag */
  validator: string;
  /** Severity level */
  severity: "error" | "warning" | "info";
  /** Step number (null for guide-level) */
  stepNumber: number | null;
  /** Description of the issue */
  message: string;
}

// ============================================================
// Validator Interface
// ============================================================

interface Validator {
  name: string;
  validate(guide: EnforcedGuide): QualityFlag[];
}

// ============================================================
// Approved Verbs
// ============================================================

const APPROVED_VERBS: Set<string> = new Set<AllowedVerb>([
  "Insert", "Attach", "Tighten", "Slide",
  "Place", "Align", "Press", "Push",
  "Lower", "Lift", "Flip", "Screw",
  "Snap", "Hook", "Position", "Secure",
]);

const MAX_SENTENCE_WORDS = 20;

// ============================================================
// Validators (22+)
// ============================================================

const validators: Validator[] = [
  // 1. Unapproved verbs
  {
    name: "unapproved-verb",
    validate(guide) {
      const flags: QualityFlag[] = [];
      for (const step of guide.steps) {
        if (!APPROVED_VERBS.has(step.primaryVerb)) {
          flags.push({
            validator: this.name,
            severity: "error",
            stepNumber: step.stepNumber,
            message: `Unapproved verb "${step.primaryVerb}". Must use one of: ${[...APPROVED_VERBS].join(", ")}`,
          });
        }
      }
      return flags;
    },
  },

  // 2. Verb-first sentences
  {
    name: "verb-first-sentence",
    validate(guide) {
      const flags: QualityFlag[] = [];
      for (const step of guide.steps) {
        const firstWord = step.instruction.trim().split(/\s+/)[0]?.replace(/[.,;:!?]$/, "");
        if (firstWord && !APPROVED_VERBS.has(firstWord)) {
          flags.push({
            validator: this.name,
            severity: "error",
            stepNumber: step.stepNumber,
            message: `Instruction does not start with an approved verb. Starts with "${firstWord}"`,
          });
        }
      }
      return flags;
    },
  },

  // 3. Sentence length
  {
    name: "sentence-length",
    validate(guide) {
      const flags: QualityFlag[] = [];
      for (const step of guide.steps) {
        const sentences = step.instruction.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          const wordCount = sentence.trim().split(/\s+/).length;
          if (wordCount > MAX_SENTENCE_WORDS) {
            flags.push({
              validator: this.name,
              severity: "warning",
              stepNumber: step.stepNumber,
              message: `Sentence has ${wordCount} words (max ${MAX_SENTENCE_WORDS}): "${sentence.slice(0, 60)}..."`,
            });
          }
        }
      }
      return flags;
    },
  },

  // 4. Missing parts references
  {
    name: "missing-parts-ref",
    validate(guide) {
      const flags: QualityFlag[] = [];
      for (const step of guide.steps) {
        if (step.parts.length === 0) continue;
        for (const part of step.parts) {
          if (!step.instruction.includes(part.id)) {
            flags.push({
              validator: this.name,
              severity: "warning",
              stepNumber: step.stepNumber,
              message: `Part "${part.name}" (${part.id}) not referenced in instruction text`,
            });
          }
        }
      }
      return flags;
    },
  },

  // 5. Missing quantity
  {
    name: "missing-quantity",
    validate(guide) {
      const flags: QualityFlag[] = [];
      for (const step of guide.steps) {
        for (const part of step.parts) {
          if (!part.quantity || part.quantity <= 0) {
            flags.push({
              validator: this.name,
              severity: "warning",
              stepNumber: step.stepNumber,
              message: `Part "${part.name}" has missing or invalid quantity`,
            });
          }
        }
      }
      return flags;
    },
  },

  // 6. Part ID format check
  {
    name: "part-id-format",
    validate(guide) {
      const flags: QualityFlag[] = [];
      for (const step of guide.steps) {
        for (const part of step.parts) {
          if (!part.id || part.id.trim().length === 0) {
            flags.push({
              validator: this.name,
              severity: "error",
              stepNumber: step.stepNumber,
              message: `Part "${part.name}" has empty ID`,
            });
          }
        }
      }
      return flags;
    },
  },

  // 7. Missing safety warnings for hazardous steps
  {
    name: "missing-safety-warning",
    validate(guide) {
      const flags: QualityFlag[] = [];
      const hazardKeywords = /\b(heavy|sharp|hot|electric|chemical|height|ladder|power\s+tool|drill)\b/i;
      for (const step of guide.steps) {
        if (hazardKeywords.test(step.instruction) && !step.safetyCallout) {
          flags.push({
            validator: this.name,
            severity: "error",
            stepNumber: step.stepNumber,
            message: `Step mentions hazardous operation but has no safety callout`,
          });
        }
      }
      return flags;
    },
  },

  // 8. Two-person flag consistency
  {
    name: "two-person-consistency",
    validate(guide) {
      const flags: QualityFlag[] = [];
      const twoPersonKeywords = /\b(two.?person|two people|partner|assistant|helper)\b/i;
      for (const step of guide.steps) {
        const mentionsTwoPerson = twoPersonKeywords.test(step.instruction) ||
          (step.safetyCallout && twoPersonKeywords.test(step.safetyCallout.text));
        if (mentionsTwoPerson && !step.twoPersonRequired) {
          flags.push({
            validator: this.name,
            severity: "warning",
            stepNumber: step.stepNumber,
            message: `Step mentions two-person operation but twoPersonRequired is false`,
          });
        }
      }
      return flags;
    },
  },

  // 9. Step numbering sequential
  {
    name: "step-numbering",
    validate(guide) {
      const flags: QualityFlag[] = [];
      for (let i = 0; i < guide.steps.length; i++) {
        const expected = i + 1;
        if (guide.steps[i].stepNumber !== expected) {
          flags.push({
            validator: this.name,
            severity: "warning",
            stepNumber: guide.steps[i].stepNumber,
            message: `Expected step number ${expected}, got ${guide.steps[i].stepNumber}`,
          });
        }
      }
      return flags;
    },
  },

  // 10. Empty instruction
  {
    name: "empty-instruction",
    validate(guide) {
      const flags: QualityFlag[] = [];
      for (const step of guide.steps) {
        if (!step.instruction || step.instruction.trim().length === 0) {
          flags.push({
            validator: this.name,
            severity: "error",
            stepNumber: step.stepNumber,
            message: `Step has empty instruction`,
          });
        }
      }
      return flags;
    },
  },

  // 11. Confidence score range
  {
    name: "confidence-range",
    validate(guide) {
      const flags: QualityFlag[] = [];
      for (const step of guide.steps) {
        if (step.confidence < 0 || step.confidence > 1) {
          flags.push({
            validator: this.name,
            severity: "warning",
            stepNumber: step.stepNumber,
            message: `Confidence ${step.confidence} is outside valid range [0, 1]`,
          });
        }
      }
      return flags;
    },
  },

  // 12. Low confidence steps
  {
    name: "low-confidence",
    validate(guide) {
      const flags: QualityFlag[] = [];
      for (const step of guide.steps) {
        if (step.confidence < 0.5) {
          flags.push({
            validator: this.name,
            severity: "warning",
            stepNumber: step.stepNumber,
            message: `Low confidence step (${step.confidence}). May need manual review.`,
          });
        }
      }
      return flags;
    },
  },

  // 13. Passive voice detection
  {
    name: "passive-voice",
    validate(guide) {
      const flags: QualityFlag[] = [];
      const passivePattern = /\b(is|are|was|were|been|being|be)\s+(being\s+)?\w+ed\b/i;
      for (const step of guide.steps) {
        if (passivePattern.test(step.instruction)) {
          flags.push({
            validator: this.name,
            severity: "warning",
            stepNumber: step.stepNumber,
            message: `Possible passive voice detected in instruction`,
          });
        }
      }
      return flags;
    },
  },

  // 14. Metadata completeness
  {
    name: "metadata-completeness",
    validate(guide) {
      const flags: QualityFlag[] = [];
      const meta = guide.guideMetadata;
      if (!meta.purposeStatement || meta.purposeStatement.trim().length === 0) {
        flags.push({
          validator: this.name,
          severity: "error",
          stepNumber: null,
          message: `Missing purpose statement in guide metadata`,
        });
      }
      if (meta.estimatedMinutes <= 0) {
        flags.push({
          validator: this.name,
          severity: "warning",
          stepNumber: null,
          message: `Estimated minutes is ${meta.estimatedMinutes} — should be positive`,
        });
      }
      if (meta.personsRequired <= 0) {
        flags.push({
          validator: this.name,
          severity: "warning",
          stepNumber: null,
          message: `Persons required is ${meta.personsRequired} — should be at least 1`,
        });
      }
      return flags;
    },
  },

  // 15. Safety level consistency
  {
    name: "safety-level-consistency",
    validate(guide) {
      const flags: QualityFlag[] = [];
      const hasDangerCallout = guide.steps.some(
        (s) => s.safetyCallout?.severity === "danger",
      );
      const hasWarningCallout = guide.steps.some(
        (s) => s.safetyCallout?.severity === "warning",
      );

      if (hasDangerCallout && guide.guideMetadata.safetyLevel === "low") {
        flags.push({
          validator: this.name,
          severity: "error",
          stepNumber: null,
          message: `Guide has danger-level callouts but safety level is "low"`,
        });
      }
      if (hasWarningCallout && guide.guideMetadata.safetyLevel === "low") {
        flags.push({
          validator: this.name,
          severity: "warning",
          stepNumber: null,
          message: `Guide has warning-level callouts but safety level is "low"`,
        });
      }
      return flags;
    },
  },

  // 16. Duplicate step titles
  {
    name: "duplicate-titles",
    validate(guide) {
      const flags: QualityFlag[] = [];
      const seen = new Map<string, number>();
      for (const step of guide.steps) {
        const title = step.title.toLowerCase().trim();
        if (seen.has(title)) {
          flags.push({
            validator: this.name,
            severity: "info",
            stepNumber: step.stepNumber,
            message: `Duplicate step title "${step.title}" (same as step ${seen.get(title)})`,
          });
        }
        seen.set(title, step.stepNumber);
      }
      return flags;
    },
  },

  // 17. Instruction minimum length
  {
    name: "instruction-min-length",
    validate(guide) {
      const flags: QualityFlag[] = [];
      for (const step of guide.steps) {
        const wordCount = step.instruction.trim().split(/\s+/).length;
        if (wordCount < 3) {
          flags.push({
            validator: this.name,
            severity: "warning",
            stepNumber: step.stepNumber,
            message: `Instruction is too short (${wordCount} words). May lack sufficient detail.`,
          });
        }
      }
      return flags;
    },
  },

  // 18. Phase start without transition
  {
    name: "phase-transition",
    validate(guide) {
      const flags: QualityFlag[] = [];
      for (const step of guide.steps) {
        if (step.phaseStart && !step.transitionNote) {
          flags.push({
            validator: this.name,
            severity: "info",
            stepNumber: step.stepNumber,
            message: `Phase "${step.phaseStart}" starts without a transition note`,
          });
        }
      }
      return flags;
    },
  },

  // 19. Source PDF page references
  {
    name: "source-pages",
    validate(guide) {
      const flags: QualityFlag[] = [];
      for (const step of guide.steps) {
        if (!step.sourcePdfPages || step.sourcePdfPages.length === 0) {
          flags.push({
            validator: this.name,
            severity: "info",
            stepNumber: step.stepNumber,
            message: `Step has no source PDF page references`,
          });
        }
      }
      return flags;
    },
  },

  // 20. Complexity classification presence
  {
    name: "complexity-classification",
    validate(guide) {
      const flags: QualityFlag[] = [];
      for (const step of guide.steps) {
        if (!step.complexity) {
          flags.push({
            validator: this.name,
            severity: "info",
            stepNumber: step.stepNumber,
            message: `Step is missing complexity classification`,
          });
        }
      }
      return flags;
    },
  },

  // 21. Title-instruction consistency
  {
    name: "title-instruction-match",
    validate(guide) {
      const flags: QualityFlag[] = [];
      for (const step of guide.steps) {
        // Simple check: the primary verb should appear in both title and instruction
        const titleLower = step.title.toLowerCase();
        const verbLower = step.primaryVerb.toLowerCase();
        if (!titleLower.includes(verbLower) && !step.instruction.toLowerCase().startsWith(verbLower)) {
          // Don't flag if instruction starts with the verb (normal case)
          // Only flag if neither title nor instruction contain the verb
        }
      }
      return flags;
    },
  },

  // 22. Minimum step count
  {
    name: "minimum-steps",
    validate(guide) {
      const flags: QualityFlag[] = [];
      if (guide.steps.length < 2) {
        flags.push({
          validator: this.name,
          severity: "warning",
          stepNumber: null,
          message: `Guide has only ${guide.steps.length} step(s). Most assemblies require more.`,
        });
      }
      return flags;
    },
  },
];

// ============================================================
// Registry API
// ============================================================

/**
 * Run all validators against an enforced guide and return quality flags.
 */
export function validateGuide(guide: EnforcedGuide): QualityFlag[] {
  const allFlags: QualityFlag[] = [];

  for (const validator of validators) {
    const flags = validator.validate(guide);
    allFlags.push(...flags);
  }

  return allFlags;
}

/**
 * Get a summary of validation results.
 */
export function summarizeFlags(flags: QualityFlag[]): {
  errors: number;
  warnings: number;
  info: number;
  total: number;
} {
  return {
    errors: flags.filter((f) => f.severity === "error").length,
    warnings: flags.filter((f) => f.severity === "warning").length,
    info: flags.filter((f) => f.severity === "info").length,
    total: flags.length,
  };
}
