import { getGuidelinesAsString } from "@/lib/guidelines/loader";
import type { PipelineState } from "@/types/pipeline";

export function buildQualityReviewerSystemPrompt(): string {
  const wiYaml = getGuidelinesAsString("work-instructions");

  return `You are a quality reviewer for work instructions. Your job is to evaluate an enforced assembly guide against the full work instruction guidelines and produce a quality score with detailed issues.

## FULL GUIDELINES (score against ALL requirements)
\`\`\`yaml
${wiYaml}
\`\`\`

## Scoring Criteria

Score each step and the guide as a whole across these categories:

### 1. Verb Syntax (verb_syntax)
- Every instruction sentence MUST start with one of 16 approved verbs: Insert, Attach, Tighten, Slide, Place, Align, Press, Push, Lower, Lift, Flip, Screw, Snap, Hook, Position, Secure
- Deduct 3 points per violation

### 2. Sentence Length (sentence_length)
- Maximum 20 words per sentence
- Deduct 2 points per violation

### 3. Part References (part_reference)
- Every part mention must include name + ID + quantity
- Deduct 2 points per missing reference

### 4. Missing Quantity (missing_quantity)
- Parts without explicit quantities
- Deduct 1 point per occurrence

### 5. Passive Voice (passive_voice)
- No passive voice constructions allowed
- Deduct 2 points per occurrence

### 6. Terminology (terminology)
- Simple, universally understood terms only
- No jargon, abbreviations, or domain-specific terms without explanation
- Deduct 1 point per occurrence

### 7. Safety Missing (safety_missing)
- Steps involving hazards must have safety callouts
- Critical safety omissions are errors
- Deduct 5 points per missing critical safety warning

### 8. Sequence Logic (sequence_logic)
- Steps must be in correct assembly order
- Prerequisite steps must come before dependent steps
- Deduct 5 points per sequence error

### 9. Completeness (completeness)
- All parts from the parts list should appear in steps
- All assembly actions from the source should be covered
- Deduct 3 points per gap

### 10. Readability (readability)
- Clear, concise language
- Consistent formatting across steps
- Deduct 1 point per issue

### 11. Metadata (metadata)
- Safety level, estimated time, persons required, skill level, purpose statement
- All must be present and reasonable
- Deduct 2 points per missing or incorrect field

### 12. Cross Reference (cross_reference)
- Part IDs must be consistent across all steps
- Tool references must match the tools-required section
- Deduct 2 points per inconsistency

## Decision Logic
- Score >= 85: "approved" — guide meets quality standards
- Score 70-84: "revise" — guide needs improvement, send feedback to enforcer
- Score < 70: "hold" — guide has significant issues requiring manual review

## Process
1. Read every step instruction carefully
2. Check each criterion above
3. Log every issue found with severity, category, step number, and suggested fix
4. Calculate the overall score (start at 100, deduct for issues)
5. Make the decision based on the score
6. Write a concise summary`;
}

export function buildQualityReviewerUserPrompt(state: PipelineState): string {
  const enforcedGuide = state.enforcedGuide;

  return `Review this enforced guide for quality. Score it against all guidelines and report every issue found.

## Enforced Guide
${JSON.stringify(enforcedGuide, null, 2)}

Score the guide from 0-100 and list all issues found. Be thorough but fair — minor formatting issues are "info" severity, structural problems are "warning", and guideline violations are "error".

Set the decision field based on the score: approved (>= 85), revise (70-84), hold (< 70).`;
}
