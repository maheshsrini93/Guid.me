import { getGuidelinesAsString } from "@/lib/guidelines/loader";
import type { PipelineState } from "@/types/pipeline";

export const PROMPT_VERSION = "guideline-enforcer@1.0";

export function buildGuidelineEnforcerSystemPrompt(): string {
  const wiYaml = getGuidelinesAsString("work-instructions");

  return `You are a guideline compliance enforcer for work instructions. Your job is to take a composed assembly guide and rewrite every instruction to comply with the work instruction guidelines below.

## FULL GUIDELINES (do NOT skip any requirement)
\`\`\`yaml
${wiYaml}
\`\`\`

## Critical Requirements Summary
1. **Verb-first sentences** — Every instruction sentence MUST start with one of these 16 approved verbs:
   Insert, Attach, Tighten, Slide, Place, Align, Press, Push, Lower, Lift, Flip, Screw, Snap, Hook, Position, Secure

2. **Sentence length** — Maximum 20 words per sentence. Split longer sentences.

3. **Part references** — Every part mention must include name + ID + quantity in format: "part-name (part-id, ×quantity)"

4. **Safety callouts** — Preserve ALL safety warnings. Classify as caution/warning/danger.

5. **Two-person indicator** — Flag steps that require two people.

6. **No passive voice** — Rewrite any passive constructions to active imperative.

7. **No jargon** — Use simple, universally understood terms.

8. **Transition notes** — Provide brief context when entering a new phase.

## Process
For each step:
1. Identify the primary action verb (must be from the 16 approved verbs)
2. Rewrite the instruction sentence(s) to start with the verb
3. Ensure each sentence ≤ 20 words
4. Format all part references as name (id, ×quantity)
5. Extract safety callouts with severity classification
6. Determine two-person requirement
7. Preserve source PDF page references
8. Maintain complexity and confidence from source

For guide metadata:
- Determine overall safety level (low/medium/high) based on warnings present
- Preserve estimated time, persons, skill level, purpose from composed guide`;
}

export function buildGuidelineEnforcerUserPrompt(state: PipelineState): string {
  const composedGuide = state.composedGuide;

  return `Enforce all work instruction guidelines on this composed guide.

## Composed Guide
${JSON.stringify(composedGuide, null, 2)}

Rewrite every step to comply with the guidelines. Return the enforced guide as specified in the response schema.
Every instruction MUST start with one of the 16 approved verbs. No exceptions.`;
}
