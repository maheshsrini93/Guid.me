# Guid.me — Gemini Step Extraction Prompt Template (v1)

## System Instruction

```
You are a structured data extraction engine for assembly manuals. Your job is to analyze images of assembly manual pages and extract precise, machine-readable step data. You never hallucinate parts or actions not shown. If something is unclear, flag it with "confidence": "low". Respond ONLY with valid JSON — no markdown fences, no preamble, no commentary.
```

## User Prompt Template

```
Analyze this assembly manual page image. Extract each assembly step shown.

CONTEXT:
- Product: {{product_name}}
- Page: {{page_number}} of {{total_pages}}
- Previous step summary: {{previous_step_summary | "This is the first page."}}

EXTRACTION RULES:
1. Each visual frame/panel = one step
2. Read left-to-right, top-to-bottom unless arrows indicate otherwise
3. Parts are labeled with circled numbers (e.g., ①, ②) — map them exactly
4. Quantity indicators (e.g., "x2", "x4") mean that many of that part are used
5. Dashed lines = alignment guides, not physical parts
6. Explosion/zoom callouts = sub-steps within the parent step
7. ⚠️ icons or "CLICK" text = warnings or confirmation cues — capture these
8. Hand icons = manual action required (push, hold, rotate)
9. Tool icons = identify the tool (Phillips screwdriver, Allen key, hammer, etc.)

RESPOND WITH THIS EXACT JSON STRUCTURE:
{
  "page": <int>,
  "steps": [
    {
      "step_number": <int>,
      "sub_steps": [
        {
          "sub_step_id": "<step>.<sub>",
          "action": "<verb phrase: e.g., 'Insert dowel into hole'>",
          "parts_used": [
            {
              "part_id": "<circled number or label from manual>",
              "part_name": "<descriptive name: e.g., 'wooden dowel', 'cam lock'>",
              "quantity": <int>
            }
          ],
          "tools_required": ["<tool name>"],
          "warnings": ["<warning text if any>"],
          "confirmation_cue": "<what user should see/hear/feel when done: e.g., 'audible click', 'flush surface'>",
          "confidence": "high" | "medium" | "low"
        }
      ],
      "orientation_note": "<e.g., 'Panel should be face-down on floor'>"
    }
  ],
  "unrecognized_elements": ["<anything in the image you couldn't classify>"]
}
```

## Few-Shot Example (include in prompt for best results)

```
EXAMPLE INPUT CONTEXT:
- Product: KALLAX Shelf Unit
- Page: 3 of 12
- Previous step summary: "Side panels connected with dowels"

EXAMPLE OUTPUT:
{
  "page": 3,
  "steps": [
    {
      "step_number": 4,
      "sub_steps": [
        {
          "sub_step_id": "4.1",
          "action": "Insert cam lock bolt into pre-drilled hole on divider panel",
          "parts_used": [
            {"part_id": "105818", "part_name": "cam lock bolt", "quantity": 2}
          ],
          "tools_required": ["Phillips screwdriver"],
          "warnings": [],
          "confirmation_cue": "Bolt head sits flush with panel surface",
          "confidence": "high"
        },
        {
          "sub_step_id": "4.2",
          "action": "Slide divider panel into side panel and rotate cam lock disc clockwise",
          "parts_used": [
            {"part_id": "118331", "part_name": "cam lock disc", "quantity": 2}
          ],
          "tools_required": [],
          "warnings": ["Do not overtighten — quarter turn only"],
          "confirmation_cue": "Arrow on cam lock points toward panel edge",
          "confidence": "high"
        }
      ],
      "orientation_note": "Shelf unit should be lying on its back"
    }
  ],
  "unrecognized_elements": []
}
```

---

## Usage Notes

### Gemini API Call Structure
```python
import google.generativeai as genai

model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",  # or gemini-2.5-pro for higher accuracy
    system_instruction=SYSTEM_INSTRUCTION,
    generation_config={
        "temperature": 0,
        "response_mime_type": "application/json"  # enforces JSON output
    }
)

response = model.generate_content([
    page_image,          # PIL Image or uploaded file
    user_prompt_text     # template with variables filled in
])
```

### Key Tuning Levers
| Lever | When to adjust |
|---|---|
| `temperature` | Raise to 0.2 if outputs are too rigid/repetitive |
| `response_mime_type` | Use `application/json` to eliminate markdown wrappers |
| Model choice | `flash` for speed/cost, `pro` for complex pages with many sub-steps |
| Few-shot count | Add 2-3 examples for tricky product categories (e.g., PAX wardrobes) |
| `previous_step_summary` | Critical for continuity — prevents duplicate part references |

### Eval Checklist (score each page 0-5)
- [ ] Correct step count?
- [ ] All parts identified with right quantities?
- [ ] Actions are unambiguous verb phrases?
- [ ] Tools correctly identified?
- [ ] Warnings captured?
- [ ] Confidence flags accurate?
- [ ] No hallucinated parts or actions?
