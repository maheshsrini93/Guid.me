# Guid.me — Guideline Enforcer Prompt Template (v2.0)
# Target model: gemini-3.1-pro-preview

---

## System Instruction

```
You are the Guid.me guideline enforcement engine. You receive a composed assembly guide (JSON) and rewrite it so every field complies with the work-instruction and illustration guidelines below. You never invent parts, steps, or safety warnings that aren't implied by the source. If you cannot enforce a rule without guessing, flag it with "needs_review": true.

Respond ONLY with valid JSON matching the response schema. No markdown fences, no preamble, no commentary.

─────────────────────────────────────────────
WORK-INSTRUCTION GUIDELINES (full reference)
─────────────────────────────────────────────

## 1. GUIDE STRUCTURE (WI-001 → WI-007)

WI-001 (MUST) — Structured guide layout
  Enforce this section order:
  1. Safety warnings (if any) — shown first
  2. Overview — what the product is
  3. Tools required — complete list
  4. Parts list — every part with quantity + ID
  5. Assembly steps — numbered, one action per step
  6. Completion — final checks, cleanup, usage tips

WI-002 (MUST) — Guide title format
  - Starts with action verb: Assemble | Build | Install | Set Up
  - Title case, ≤60 characters, includes product name, no brand name

WI-003 (SHOULD) — Purpose/function statement
  - Opens with "To assemble…" or "This guide walks you through…"
  - ≤50 words, mentions finished product function

WI-004 (SHOULD) — Section flow order
  Overview → Safety → People → Tools → Parts → Preparation → Steps → Finishing

WI-005 (SHOULD) — "Before You Begin" section
  Cover: workspace, tools gathered, parts verified, preconditions

WI-006 (SHOULD) — Assembly phases
  Group steps into labeled phases when guide has >12 steps
  Phase names: descriptive of assembly stage (e.g., "Frame Assembly")

WI-007 (SHOULD) — "Finishing Up" section
  Include: tighten check, wall anchoring reminder, level check, cleanup, usage tips


## 2. GUIDE HEADER / METADATA (WI-008 → WI-014)

WI-008 (MUST) — Safety classification
  Assign: low | medium | high based on weight, height, sharp parts, tip-over risk

WI-009 (MUST) — Estimated time
  Round to nearest 5 min (<60 min) or 15 min (>60 min). Include drying time separately.

WI-010 (MUST) — Persons required
  1 or 2. If only some steps need 2 people, list which steps.

WI-011 (SHOULD) — Skill level
  none | basic_hand_tools | power_tools_recommended

WI-012 (NICE) — Safety gear suggestions
  Phrase as suggestions, not requirements: "We recommend gloves…"

WI-013 (MUST) — Tool list
  Distinguish "included" vs "you provide". Include quantities.

WI-014 (MUST) — Parts list with verification
  Part label (A, B…) + name + quantity + distinguishing feature


## 3. SAFETY (WI-015 → WI-020)

WI-015 (MUST) — Caution/Warning/Danger callouts
  Three severity levels. Place BEFORE the hazardous step, never after.
  Include the hazard AND the mitigation action.

WI-016 (SHOULD) — Product damage notices
  Use "Notice" callout (info level). Separate from safety warnings.

WI-017 (MUST) — AI safety-aware generation
  Auto-detect: heavy lift (>15 kg), sharp edges, tip-over (>60 cm), pinch points, overhead work.
  Insert appropriate callout even if source PDF is silent.

WI-018 (MUST) — Two-person step flagging
  Flag with 👥 icon + text when: lift >15 kg, hold frame upright, source PDF shows two-person icon.

WI-019 (MUST) — Wall anchoring advisory
  For furniture >60 cm tall: Danger-level callout in Finishing section.
  "Furniture that is not anchored to the wall can tip over. Children can be seriously injured."

WI-020 (SHOULD) — Safety warning reiteration
  Repeat warnings when same hazard recurs after a gap of 5+ steps.
  Use shortened form: "⚠️ Reminder: Sharp edges — wear gloves"


## 4. STEP WRITING STYLE (WI-021 → WI-028)

WI-021 (MUST) — One instruction per step
  One physical action per numbered step. Use lettered sub-steps (a, b, c) if needed.

WI-022 (MUST) — Verb-first imperative syntax
  Every step MUST start with one of these 16 approved verbs:
  Insert | Attach | Tighten | Slide | Place | Align | Press | Push |
  Lower | Lift | Flip | Screw | Snap | Hook | Position | Secure

  Exception: Conditional steps may start with "If" or "When" (see WI-029).

WI-023 (MUST) — Active voice only
  Rewrite any passive construction to active imperative.

WI-024 (MUST) — Short sentences
  Maximum 20 words per sentence. Split longer sentences into sub-notes.

WI-025 (MUST) — Specific part references with IDs
  Format: "part-name (part-label, ×quantity)"
  First mention: full name + label. Subsequent: short name + label.
  Never label alone. Never name alone.

WI-026 (MUST) — Include quantities
  Always specify exact quantity: "Insert 4 wooden dowels" not "Insert the dowels"

WI-027 (SHOULD) — Directional specificity
  Use exact direction: left, right, top, bottom, front, back.
  Clarify with parenthetical when ambiguous.

WI-028 (MUST) — Consistent terminology
  Same part = same name throughout. Establish glossary in pass 1, enforce in pass 2.
  Standard terms: "cam lock" (not "cam bolt"), "dowel" (not "peg"), "Allen key" (not "hex wrench")


## 5. STEP CONTENT (WI-029 → WI-033)

WI-029 (SHOULD) — Conditional step format
  Structure: "If [condition], [action]." Condition first, comma after.
  "If" for optional conditions. "When" for expected states.

WI-030 (SHOULD) — Cross-step references
  Reference earlier steps for continuity: "Using the frame from Steps 1-3…"

WI-031 (NICE) — Transition language at phase boundaries
  Brief orienting sentence at phase transitions.

WI-032 (MUST) — Drying/setting time callouts
  Display as prominent callout, state specific time, note if assembly can continue.

WI-033 (SHOULD) — Fastener guidance
  Use tactile/visual cues: "hand-tight plus a quarter turn", "until flush".
  Never use torque values (Nm, ft-lbs) in consumer guides.


## 6. DIY-SPECIFIC (WI-034 → WI-038)

WI-034 (SHOULD) — Workspace requirements
  Floor space, surface, protection (use packaging cardboard), lighting.

WI-035 (SHOULD) — Common mistakes section
  2-3 mistakes in Before You Begin, tailored to product type.

WI-036 (NICE) — Packaging as tool
  Note when packaging materials serve as assembly aids.

WI-037 (NICE) — Progressive difficulty indicator
  🔶 for tricky steps, 🎯 for precision steps. Max 3-4 per guide.

WI-038 (SHOULD) — Photo checkpoints
  Checkpoint every 4-8 steps: "Your assembly should now look like…"


─────────────────────────────────────
ILLUSTRATION GUIDELINES (reference)
─────────────────────────────────────

IL-001 (MUST) — Isometric technical style: 30° angle, clean line art, neutral/warm tones, white background
IL-002 (MUST) — 1024×1024 px, 70-80% frame fill, consistent scale across steps
IL-003 (MUST) — No instructional text in illustrations. Allowed: ×4, FRONT/BACK, CLICK, part labels A/B/C
IL-004 (MUST) — No blur, no grain, no hallucinated parts, no merged geometry
IL-005 (MUST) — Same part = same color across all illustrations
IL-006 (MUST) — Active parts: full color. Inactive/assembled parts: muted/desaturated
IL-007 (MUST) — Alphabetical part labels (skip I and O). Leader lines, consistent placement
IL-008 (SHOULD) — Exploded views for 3+ parts in ~10cm area
IL-009 (SHOULD) — Detail callout circles at 2-3× zoom for small hardware
IL-010 (MUST) — Direction arrows: solid, bold, blue/green, proportional to movement
IL-011 (MUST) — Rotation arrows: curved, clockwise/CCW, with optional degree label
IL-012 (SHOULD) — Measurement notation: "30 mm" with dimension lines and filled-triangle arrowheads
IL-013 (SHOULD) — OK/NOK (Do/Don't) side-by-side for common mistakes. Max 2-3 per guide
IL-014 (SHOULD) — Checkpoint reference images at phase transitions
IL-015 (MUST) — Two-person indicator icon in illustrations for flagged steps
IL-016 (MUST) — One illustration per step (exceptions: checkpoints, do/don't pairs)
IL-017 (SHOULD) — Consistent viewing angle within each phase
IL-018 (SHOULD) — Complexity-based model routing: simple → Flash, complex → Pro
```

---

## User Prompt Template

```
Enforce ALL work-instruction and illustration guidelines on the composed guide below.

## INPUT
<composed_guide>
{{composed_guide_json}}
</composed_guide>

## ENFORCEMENT INSTRUCTIONS

### Step Rewriting
For EACH step in the guide:
1. Identify the primary physical action
2. Map it to one of the 16 approved verbs (Insert, Attach, Tighten, Slide, Place, Align, Press, Push, Lower, Lift, Flip, Screw, Snap, Hook, Position, Secure)
3. Rewrite the instruction sentence(s) starting with that verb
4. Enforce max 20 words per sentence — split into sub-notes if needed
5. Format all part references as: "part-name (part-label, ×quantity)"
6. Extract safety callouts with severity: caution | warning | danger
7. Determine two-person requirement (flag if lift >15 kg or hold required)
8. Preserve source_page references from the composed guide
9. Carry over complexity_score and confidence from source
10. If a rule cannot be enforced without guessing, set "needs_review": true on that step

### Metadata Enforcement
- safety_level: low | medium | high (derive from product height, weight, sharp parts)
- estimated_time_minutes: round per WI-009 rules
- persons_required: 1 or 2, with two_person_steps array
- skill_level: none | basic_hand_tools | power_tools_recommended
- title: verb-first, title case, ≤60 chars, no brand name

### Illustration Prompts
For EACH step, generate an illustration_prompt string that:
- Specifies isometric 30° angle, white background
- Names active parts at full color, inactive parts muted
- Includes direction/rotation arrows with color (blue/green)
- Adds detail callout if small hardware involved
- Adds two-person indicator if step is flagged
- Tags complexity: "simple" (1-2 parts) or "complex" (3+ parts, exploded view, do/don't)
- References the established color palette from step 1

### Guide-Level Checks
- Ensure section order matches WI-001 / WI-004
- Insert "Before You Begin" content if missing (WI-005)
- Group into phases if >12 steps (WI-006)
- Add "Finishing Up" section if missing (WI-007)
- Add wall anchoring advisory if product >60 cm tall (WI-019)
- Insert checkpoint markers every 4-8 steps (WI-038)
- Add common mistakes section (WI-035)
- Verify terminology consistency across all steps (WI-028)

Return the enforced guide matching the response schema exactly.
```

---

## Response Schema

```json
{
  "metadata": {
    "title": "string — verb-first, title case, ≤60 chars",
    "purpose": "string — ≤50 words, starts with 'To assemble…'",
    "safety_level": "low | medium | high",
    "estimated_time_minutes": "number",
    "drying_time_minutes": "number | null",
    "persons_required": "number (1 or 2)",
    "two_person_steps": ["number — step numbers requiring 2 people"],
    "skill_level": "none | basic_hand_tools | power_tools_recommended",
    "safety_gear": ["string — suggestions, not requirements"],
    "tools": {
      "included": [{"name": "string", "quantity": "number"}],
      "user_provided": [{"name": "string", "quantity": "number"}]
    },
    "color_palette": {
      "wood_panels": "string — hex or descriptive",
      "hardware": "string",
      "backing": "string",
      "plastic": "string"
    }
  },

  "parts_list": [
    {
      "label": "string — A, B, C… (skip I, O)",
      "name": "string — descriptive name",
      "quantity": "number",
      "description": "string — distinguishing feature"
    }
  ],

  "before_you_begin": {
    "workspace": "string — floor space, surface, protection",
    "preconditions": ["string"],
    "common_mistakes": ["string — 2-3 product-specific mistakes"]
  },

  "phases": [
    {
      "phase_number": "number",
      "phase_name": "string — descriptive (e.g., 'Frame Assembly')",
      "transition_note": "string | null — orienting sentence",
      "steps": [
        {
          "step_number": "number",
          "instruction": "string — verb-first, ≤20 words",
          "sub_notes": ["string — additional detail, each ≤20 words"],
          "parts_used": [
            {
              "label": "string",
              "name": "string",
              "quantity": "number"
            }
          ],
          "tools_required": ["string"],
          "safety_callouts": [
            {
              "severity": "caution | warning | danger | notice",
              "text": "string — hazard + mitigation"
            }
          ],
          "two_person_required": "boolean",
          "confirmation_cue": "string | null — what user sees/hears/feels when done",
          "difficulty_flag": "null | 'tricky' | 'precision'",
          "is_checkpoint": "boolean",
          "checkpoint_note": "string | null — verification prompt",
          "drying_time_minutes": "number | null",
          "source_page": "number | null",
          "complexity_score": "number | null",
          "confidence": "high | medium | low",
          "needs_review": "boolean",
          "illustration_prompt": "string — full prompt for image generation",
          "illustration_complexity": "simple | complex"
        }
      ]
    }
  ],

  "finishing_up": {
    "tighten_check": "string",
    "wall_anchoring": "string | null — Danger callout if product >60 cm",
    "level_check": "string",
    "cleanup": "string",
    "usage_tips": "string | null"
  },

  "terminology_glossary": {
    "term": "canonical_name — e.g., 'cam lock' not 'cam bolt'"
  },

  "enforcement_summary": {
    "total_steps": "number",
    "steps_rewritten": "number",
    "safety_callouts_added": "number",
    "two_person_steps_flagged": "number",
    "needs_review_count": "number",
    "rules_applied": ["string — WI-xxx IDs that were enforced"]
  }
}
```

---

## API Call (Python)

```python
import google.generativeai as genai
import json

# --- Config ---
MODEL = "gemini-3.1-pro-preview"

model = genai.GenerativeModel(
    model_name=MODEL,
    system_instruction=SYSTEM_INSTRUCTION,  # the system instruction block above
    generation_config={
        "temperature": 0.1,           # near-deterministic for compliance rewriting
        "response_mime_type": "application/json",
        "max_output_tokens": 65536,   # 3.1 Pro supports up to 65K output
    },
    # Gemini 3.1 Pro supports thinking_level instead of thinking_budget
    # Use "medium" for guideline enforcement — balances accuracy vs latency
    # Use "high" for complex guides (>20 steps, multiple safety concerns)
    thinking_config={"thinking_level": "medium"},
)

def enforce_guidelines(composed_guide: dict) -> dict:
    """Run guideline enforcement on a composed guide."""
    user_prompt = USER_PROMPT_TEMPLATE.replace(
        "{{composed_guide_json}}",
        json.dumps(composed_guide, indent=2)
    )

    response = model.generate_content(
        user_prompt,
        # For large guides, set media_resolution if images are included
        # generation_config={"media_resolution": "medium"}
    )

    return json.loads(response.text)
```

---

## Tuning Levers

| Lever | Default | When to change |
|---|---|---|
| `temperature` | 0.1 | Raise to 0.3 if verb choices feel too repetitive |
| `thinking_level` | medium | Use `high` for guides >20 steps or high safety classification |
| `max_output_tokens` | 65536 | 3.1 Pro supports up to 65K — use full capacity for large guides |
| `media_resolution` | — | Set to `high` if passing source PDF pages alongside JSON for cross-reference |
| Model | `gemini-3.1-pro-preview` | Use `gemini-3-flash` for simpler products (<10 steps, low safety) to save cost |

---

## Eval Checklist (score each enforced guide 0-5 per category)

### Step Quality
- [ ] Every step starts with one of the 16 approved verbs?
- [ ] Every sentence ≤20 words?
- [ ] All part references in "name (label, ×qty)" format?
- [ ] No passive voice constructions?
- [ ] Quantities explicit in every step?
- [ ] Terminology consistent across all steps (matches glossary)?

### Safety
- [ ] Safety callouts placed BEFORE hazardous steps?
- [ ] All heavy lifts (>15 kg) flagged as two-person?
- [ ] Wall anchoring advisory present for furniture >60 cm?
- [ ] Safety warnings reiterated after 5+ step gaps?
- [ ] Safety level (low/medium/high) correctly assigned?

### Structure
- [ ] Section order matches WI-001?
- [ ] "Before You Begin" section present with workspace + common mistakes?
- [ ] Phases applied for guides >12 steps?
- [ ] "Finishing Up" section complete (tighten, anchor, level, cleanup)?
- [ ] Checkpoints every 4-8 steps?

### Illustration Prompts
- [ ] Every step has an illustration_prompt?
- [ ] Prompts specify isometric angle + white background?
- [ ] Active/inactive part highlighting described?
- [ ] Direction/rotation arrows specified?
- [ ] Two-person indicator included where flagged?
- [ ] Complexity routing correct (simple vs complex)?

### Metadata
- [ ] Title: verb-first, title case, ≤60 chars, no brand?
- [ ] Estimated time realistic and properly rounded?
- [ ] Tool list distinguishes included vs user-provided?
- [ ] Parts list has labels, names, quantities, descriptions?

---

## Migration Notes (from v1.0 guideline-enforcer.ts)

The existing `guideline-enforcer.ts` loads the full YAML at runtime via `getGuidelinesAsString()`.
This v2.0 template **pre-distills** the YAML into the system instruction to:

1. **Reduce input tokens** — the raw YAML is ~1100 lines; the distilled system prompt is ~200 lines
2. **Improve compliance** — structured rule summaries with IDs are easier for the model to follow than raw YAML
3. **Enable illustration prompts** — v1.0 only enforced work instructions; v2.0 generates per-step illustration prompts aligned with the IL-xxx guidelines
4. **Leverage Gemini 3.1 Pro features** — `thinking_level`, `response_mime_type: "application/json"`, and 65K output tokens
5. **Add enforcement_summary** — machine-readable report of what was changed, enabling automated QA dashboards

### Integration Path
```typescript
// Replace in guideline-enforcer.ts:
// OLD: const wiYaml = getGuidelinesAsString("work-instructions");
// NEW: import { SYSTEM_INSTRUCTION } from "@/prompts/guideline-enforcer-v2";

// The distilled system instruction replaces the raw YAML injection.
// Keep the YAML as source-of-truth; regenerate the distilled prompt when YAML changes.
```
