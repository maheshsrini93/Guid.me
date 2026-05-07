import { SchemaType, type GenerationConfig } from "@google/generative-ai";

/**
 * Gemini responseSchema for the CAD path of Agent 2 (Vision Analyzer).
 *
 * This is the *trimmed* CAD schema — much smaller than the document schema
 * because the CAD source-adapter already provided ground truth for parts,
 * tools, fasteners, quantities, etc. via `structuredMetadata.partsCatalog`.
 *
 * The model only needs to describe the *transition* between two consecutive
 * keyframes:
 *   - which active component(s) moved (`actions[]`),
 *   - any rotation cues observed (`arrows[]`, classified as `rotation`),
 *   - a complexity rating for the move,
 *   - a confidence score (lower if the visual diff is ambiguous),
 *   - an optional confirmation cue (e.g. "fully seated", "flush").
 *
 * Parts/quantities/tools/warnings are *not* asked for here — they come from
 * `structuredMetadata` and are merged in by Agent 3 (Composer). See ADR-0001.
 */
export const cadVisionSchema: GenerationConfig["responseSchema"] = {
  type: SchemaType.OBJECT,
  description:
    "Trimmed extraction for one transition between consecutive CAD keyframes. The CAD source-adapter already supplies parts, tools, quantities, and assembly hierarchy — this schema only captures the visual delta between frames.",
  properties: {
    actions: {
      type: SchemaType.ARRAY,
      description:
        "Physical assembly actions you see happening between frame[n-1] and frame[n]. Use the active Components from the parts catalog as `subject`. Each action has a subject (the part being placed/inserted/etc.), a target (the parent assembly or mating part), and optional direction. One transition typically has 1-3 actions.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          actionType: {
            type: SchemaType.STRING,
            description:
              "Action verb. Prefer one of: 'insert', 'attach', 'place', 'slide', 'press', 'rotate', 'tighten', 'snap', 'lower', 'lift'. Use the verb that best matches the visual motion.",
          },
          subject: {
            type: SchemaType.STRING,
            description:
              "The Component being installed in this transition. MUST be a name or ID from the active Components list provided in the user prompt — do not invent names.",
          },
          target: {
            type: SchemaType.STRING,
            description:
              "Where the subject goes (e.g. 'base plate', 'shaft bore', 'previously-installed bracket'). Use Component names from the catalog when applicable, or describe the receiving feature.",
          },
          direction: {
            type: SchemaType.STRING,
            description:
              "Direction of motion if the visual diff makes it clear (e.g. 'downward into receiver', 'slide along rail', 'thread clockwise into bore'). Omit if not visually unambiguous.",
          },
        },
        required: ["actionType", "subject", "target"],
      },
    },
    arrows: {
      type: SchemaType.ARRAY,
      description:
        "Rotation indicators only. CAD explode animations rarely render motion arrows, but rotation overlays (curved arrows on threaded parts, fasteners, hinges) are sometimes baked into the keyframe. If you see a rotation cue, capture it here. Otherwise leave the array empty.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          direction: {
            type: SchemaType.STRING,
            description:
              "Rotation direction (e.g. 'clockwise', 'counter-clockwise').",
          },
          label: {
            type: SchemaType.STRING,
            description:
              "Text label near the arrow if any (e.g. '¼ turn', 'tighten').",
          },
          indicatesMotion: {
            type: SchemaType.BOOLEAN,
            description:
              "Always true for rotation indicators. Use false only for callout-style arrows.",
          },
          arrowType: {
            type: SchemaType.STRING,
            description:
              "Always 'rotation' for CAD-path arrows. The CAD renderer adds motion arrows in Agent 7 — do not invent them here.",
            format: "enum",
            enum: ["rotation"],
          },
        },
        required: ["direction", "indicatesMotion"],
      },
    },
    complexity: {
      type: SchemaType.STRING,
      description:
        "Transition complexity: 'simple' (1 component placed with a single linear motion) or 'complex' (multiple components, rotation, threading, or precise alignment).",
      format: "enum",
      enum: ["simple", "complex"],
    },
    confidence: {
      type: SchemaType.NUMBER,
      description:
        "Self-reported confidence from 0.0 to 1.0. Lower if the keyframe pair is visually ambiguous, if multiple parts moved simultaneously, or if you cannot match what moved to a Component in the active list. Be honest — do not default to 1.0.",
    },
    confirmationCue: {
      type: SchemaType.STRING,
      description:
        "What the operator should observe when this transition is performed correctly (e.g. 'shaft fully seated', 'bracket flush against frame', 'audible click when snap engages'). Derive from the geometry — a thread implies 'tightened', a snap-fit implies an audible click. Omit if you cannot infer one.",
    },
  },
  required: ["actions", "complexity", "confidence"],
};
