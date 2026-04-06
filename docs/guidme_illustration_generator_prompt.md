# Guid.me — Illustration Generator Prompt Template (v2.0)
# Target models:
#   Simple steps  → Nano Banana 2 (gemini-3.1-flash-image) per IL-018
#   Complex steps → Nano Banana Pro (gemini-3-pro-image) per IL-018

---

## System Instruction

```
You are the Guid.me illustration engine. You generate technical assembly illustrations for consumer furniture guides. Every image you produce must comply with the illustration guidelines below. You never add parts, tools, or decorations that aren't specified in the step data.

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
  - Complex (3+ parts, exploded view, detail callout, do/don't): Nano Banana Pro / Gemini 3 Pro Image
```

---

## User Prompt Template

```
Generate a technical assembly illustration for step {{step_number}} of {{total_steps}} in the "{{product_name}}" assembly guide.

STEP DETAILS:
- Step {{step_number}}: "{{step_title}}"
- Instruction: "{{instruction}}"
- Primary action: {{primary_verb}}

{{#if color_palette}}
COLOR PALETTE (established in step 1 — maintain exactly):
- Wood panels: {{color_palette.wood_panels}}
- Metal hardware: {{color_palette.hardware}}
- Backing/panels: {{color_palette.backing}}
- Plastic components: {{color_palette.plastic}}
- Direction arrows: blue (#2563EB)
- Rotation arrows: green (#16A34A)
{{/if}}

ACTIVE PARTS (render at full color, sharp edges, bright/saturated):
{{#each active_parts}}
- {{label}}: {{name}} (×{{quantity}})
{{/each}}

{{#if inactive_parts}}
PREVIOUSLY ASSEMBLED PARTS (render muted/desaturated, semi-transparent, lighter lines):
{{#each inactive_parts}}
- {{label}}: {{name}}
{{/each}}
{{/if}}

MOTION INDICATORS:
{{#if is_rotation}}
- Show a bold curved {{rotation_direction}} arrow around the {{rotation_target}}
{{#if rotation_amount}}- Label: "{{rotation_amount}}"{{/if}}
{{else}}
- Show a bold {{arrow_direction}} arrow (blue, #2563EB) from {{arrow_start}} toward {{arrow_end}}
- Arrow length proportional to the movement distance
{{/if}}

{{#if needs_exploded_view}}
EXPLODED VIEW:
- Separate the following parts along their insertion axis with dashed guide lines:
{{#each exploded_parts}}
  - {{label}}: {{name}}
{{/each}}
{{/if}}

{{#if needs_detail_callout}}
DETAIL CALLOUT:
- Add a circular zoom inset (2-3× magnification) showing: {{detail_subject}}
- Connect with a thin leader line to the relevant area on the main view
{{/if}}

{{#if two_person_required}}
TWO-PERSON INDICATOR:
- Place two simplified human figure silhouettes in the upper-right corner
- Show where both people should grip/support: {{grip_positions}}
{{/if}}

{{#if is_checkpoint}}
CHECKPOINT IMAGE:
- This is a progress checkpoint, NOT an action step
- Show the full cumulative assembly state — ALL parts at full color (no muting)
- No action arrows or motion indicators
- Standard isometric angle
{{/if}}

{{#if is_ok_nok}}
DO / DON'T COMPARISON:
- LEFT side: correct assembly with green checkmark (✓) — {{ok_description}}
- RIGHT side: incorrect assembly with red X — {{nok_description}}
- Make the difference clearly visible
{{/if}}

PART LABELS:
- Label each active part with its letter ({{active_labels_list}}) using thin leader lines
- Place labels consistently in the upper-right of each part
- No other text in the image except: part labels, "×{{qty}}" for grouped fasteners, and directional labels (FRONT/BACK/TOP/BOTTOM) if needed

RENDERING RULES:
- Isometric perspective, approximately 30° angle
- Clean precise line art with subtle shading
- White background, no gradients or scenery
- Subtle drop shadow to ground the object
- 1024×1024 px, product fills 70-80% of frame
- No blur, no noise, no hallucinated parts, no merged geometry
{{#if step_number > 1}}
- MAINTAIN the same viewing angle as the previous steps in this phase
{{/if}}
```

---

## Complexity Router

```python
from enum import Enum

class IllustrationComplexity(Enum):
    SIMPLE = "simple"
    COMPLEX = "complex"

def score_step_complexity(step: dict) -> IllustrationComplexity:
    """Route to Flash Image (simple) or Pro Image (complex) per IL-018."""
    score = 0

    # Part count
    active_parts = len(step.get("parts_used", []))
    if active_parts >= 3:
        score += 2
    elif active_parts == 2:
        score += 1

    # Exploded view needed (3+ parts in tight area)
    if step.get("needs_exploded_view", False):
        score += 2

    # Detail callout needed (small hardware)
    if step.get("needs_detail_callout", False):
        score += 1

    # Do/Don't comparison
    if step.get("is_ok_nok", False):
        score += 2

    # Two-person indicator adds visual complexity
    if step.get("two_person_required", False):
        score += 1

    # Rotation + direction arrows together
    if step.get("is_rotation", False) and active_parts >= 2:
        score += 1

    # Checkpoint images are static but need accuracy
    if step.get("is_checkpoint", False):
        score += 1

    return IllustrationComplexity.COMPLEX if score >= 3 else IllustrationComplexity.SIMPLE
```

---

## API Call (Python)

```python
import google.generativeai as genai
from pathlib import Path
import json

# --- Models per IL-018 ---
MODELS = {
    "simple":  "gemini-3.1-flash-image",   # Nano Banana 2
    "complex": "gemini-3-pro-image",        # Nano Banana Pro
}

def get_model(complexity: str) -> genai.GenerativeModel:
    return genai.GenerativeModel(
        model_name=MODELS[complexity],
        system_instruction=SYSTEM_INSTRUCTION,
        generation_config={
            "temperature": 0.4,  # some creative latitude for natural-looking illustrations
            # Image models don't use response_mime_type — they return images directly
        },
    )


def generate_illustration(
    step: dict,
    step_index: int,
    total_steps: int,
    product_name: str,
    color_palette: dict,
    part_label_map: dict,
    previous_parts: list[dict],
) -> bytes:
    """Generate a single step illustration."""

    # 1. Score complexity and pick model
    complexity = score_step_complexity(step)
    model = get_model(complexity.value)

    # 2. Build active/inactive part lists
    active_parts = [
        {
            "label": part_label_map.get(p["id"], "?"),
            "name": p["name"],
            "quantity": p["quantity"],
        }
        for p in step.get("parts_used", [])
    ]

    inactive_parts = [
        {
            "label": part_label_map.get(p["id"], "?"),
            "name": p["name"],
        }
        for p in previous_parts
        if p["id"] not in {sp["id"] for sp in step.get("parts_used", [])}
    ]

    # 3. Determine motion type
    rotation_verbs = {"Tighten", "Screw"}
    primary_verb = step.get("primary_verb", "")
    is_rotation = primary_verb in rotation_verbs

    # 4. Fill prompt template
    prompt = fill_template(
        step=step,
        step_number=step.get("step_number", step_index + 1),
        total_steps=total_steps,
        product_name=product_name,
        color_palette=color_palette,
        active_parts=active_parts,
        inactive_parts=inactive_parts,
        is_rotation=is_rotation,
        active_labels_list=", ".join(p["label"] for p in active_parts),
    )

    # 5. Generate
    response = model.generate_content(prompt)

    # 6. Extract image bytes
    for part in response.parts:
        if part.mime_type and part.mime_type.startswith("image/"):
            return part.data

    raise ValueError(f"No image returned for step {step.get('step_number')}")


def generate_all_illustrations(
    enforced_guide: dict,
    product_name: str,
) -> list[dict]:
    """Generate illustrations for every step in an enforced guide."""

    # Build global part label map (IL-007: skip I and O)
    LABELS = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    all_parts = []
    part_label_map = {}
    label_idx = 0

    for phase in enforced_guide.get("phases", []):
        for step in phase.get("steps", []):
            for part in step.get("parts_used", []):
                pid = part.get("label", part.get("id", ""))
                if pid not in part_label_map and label_idx < len(LABELS):
                    part_label_map[pid] = LABELS[label_idx]
                    label_idx += 1

    color_palette = enforced_guide.get("metadata", {}).get("color_palette", {})
    results = []
    cumulative_parts = []

    for phase in enforced_guide.get("phases", []):
        for step in phase.get("steps", []):
            image_bytes = generate_illustration(
                step=step,
                step_index=len(results),
                total_steps=sum(
                    len(ph.get("steps", []))
                    for ph in enforced_guide.get("phases", [])
                ),
                product_name=product_name,
                color_palette=color_palette,
                part_label_map=part_label_map,
                previous_parts=cumulative_parts.copy(),
            )

            results.append({
                "step_number": step.get("step_number"),
                "complexity": score_step_complexity(step).value,
                "image_bytes": image_bytes,
            })

            # Track cumulative parts for inactive rendering
            for part in step.get("parts_used", []):
                if not any(p["id"] == part.get("id") for p in cumulative_parts):
                    cumulative_parts.append(part)

    return results
```

---

## Tuning Levers

| Lever | Default | When to change |
|---|---|---|
| `temperature` | 0.4 | Lower to 0.2 for stricter consistency; raise to 0.6 if images look too stiff |
| Model routing threshold | score ≥ 3 | Lower to 2 if Flash quality drops on borderline steps |
| `media_resolution` | — | Use `high` when passing reference images (e.g., source PDF pages) alongside the prompt |
| Retry count | 3 | Per IL-004: regenerate up to 3× on quality failures before flagging |
| Color palette injection | Always after step 1 | Skip only if product is single-material (e.g., all white laminate) |

---

## Eval Checklist (score each illustration 0-5 per category)

### Visual Style (IL-001 → IL-005)
- [ ] Isometric ~30° angle?
- [ ] Clean line art, not photorealistic?
- [ ] White background, no scenery?
- [ ] 1024×1024, product fills 70-80%?
- [ ] Colors match established palette?
- [ ] No blur, noise, distortion, or hallucinated parts?

### Part Visualization (IL-006 → IL-009)
- [ ] Active parts at full color, inactive parts muted?
- [ ] Part labels (A, B, C…) present with leader lines?
- [ ] Labels skip I and O?
- [ ] Exploded view used where 3+ parts cluster?
- [ ] Detail callout for small hardware operations?

### Motion & Direction (IL-010 → IL-012)
- [ ] Direction arrows present (blue/green, bold)?
- [ ] Arrows start from moving part, point to destination?
- [ ] Rotation arrows (curved) for tighten/screw actions?
- [ ] Measurements shown only when critical?

### Special Elements (IL-013 → IL-017)
- [ ] Two-person icon present where flagged?
- [ ] Checkpoint images show full assembly, no arrows?
- [ ] Do/Don't pairs show clear visible difference?
- [ ] Viewing angle consistent within phase?
- [ ] One illustration per step (no missing, no duplicates)?

### Text Rules (IL-003)
- [ ] No instructional text in image?
- [ ] Only allowed text: part labels, ×qty, FRONT/BACK, CLICK?

---

## Migration Notes (from v1.0 illustration-generator.ts)

| v1.0 (`illustration-generator.ts`) | v2.0 (this template) |
|---|---|
| Hardcoded prompt strings in `buildStepPrompt()` | Template with variables — easier to iterate |
| No model routing | Complexity scorer routes to Flash or Pro per IL-018 |
| No color palette persistence | Palette established in step 1, injected in every subsequent call |
| No exploded view logic | Template has `needs_exploded_view` conditional block |
| No detail callout logic | Template has `needs_detail_callout` conditional block |
| No checkpoint image support | Template supports `is_checkpoint` mode (IL-014) |
| No OK/NOK comparison support | Template supports `is_ok_nok` mode (IL-013) |
| No retry on quality failure | Caller can retry up to 3× per IL-004 |
| Motion arrows always generic | Rotation vs direction arrows based on `primary_verb` |

### Integration Path
```typescript
// Replace buildStepPrompt() in illustration-generator.ts with:
// 1. score_step_complexity() to pick model
// 2. fill_template() with the v2.0 user prompt
// 3. Call the appropriate image model
// 4. Validate output against IL-004 quality checks
// 5. Retry up to 3× on failure

// Keep buildPartLabelMap() — the logic is correct and reused.
// The PART_LABELS constant ("ABCDEFGHJKLMNPQRSTUVWXYZ") is unchanged.
```
