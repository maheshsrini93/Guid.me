import { SchemaType, type GenerationConfig } from "@google/generative-ai";

/**
 * Gemini responseSchema for Agent 2: Vision Analyzer.
 * Enforces the RawPageExtraction shape at the API level.
 *
 * v2.0 — Rich descriptions for Gemini 3 (field-level guidance lives here,
 * not in the system prompt). New additive fields: pageType, isSubStep,
 * parentStepNumber, spatialRelationships, arrowType, fastener quantity,
 * toolId, hasTwoPersonWarning, hasSubSteps.
 */
export const visionAnalyzerSchema: GenerationConfig["responseSchema"] = {
  type: SchemaType.OBJECT,
  description:
    "Structured extraction from a single assembly instruction page image. One object per page.",
  properties: {
    pageType: {
      type: SchemaType.STRING,
      description:
        "Page classification: cover (title/logo page), safety (dedicated safety warnings page), parts_inventory (parts overview with quantities), assembly (numbered assembly steps), completion (final result or wall-anchoring page).",
      format: "enum",
      enum: ["cover", "safety", "parts_inventory", "assembly", "completion"],
    },
    steps: {
      type: SchemaType.ARRAY,
      description:
        "All numbered assembly steps visible on this page. Use stepNumber=0 for parts inventory or non-step content.",
      items: {
        type: SchemaType.OBJECT,
        description: "A single assembly step extracted from the page image.",
        properties: {
          stepNumber: {
            type: SchemaType.INTEGER,
            description:
              "Step number printed on the page. Use 0 for parts/inventory pages with no numbered steps.",
          },
          rawDescription: {
            type: SchemaType.STRING,
            description:
              "Factual, observation-based description of what this step shows. Describe visible actions, parts, and spatial arrangement. Do NOT write narrative prose or infer intent.",
          },
          isSubStep: {
            type: SchemaType.BOOLEAN,
            description:
              "True if this is a detail circle, magnified inset, or zoom-in showing a close-up of a connection within a larger step. False for normal full-frame steps.",
          },
          parentStepNumber: {
            type: SchemaType.INTEGER,
            description:
              "If isSubStep is true, the step number of the parent step this detail belongs to. Otherwise omit or set to 0.",
          },
          partsShown: {
            type: SchemaType.ARRAY,
            description:
              "All parts visible in this step. Use the part number/letter printed in the manual. Keep part names consistent across all pages (e.g. always 'Side panel', never 'Side board' then 'Side panel').",
            items: {
              type: SchemaType.OBJECT,
              properties: {
                partNumber: {
                  type: SchemaType.STRING,
                  description:
                    "Part identifier as printed in the manual (e.g. '104321', 'A', '12'). Must match across pages.",
                },
                partName: {
                  type: SchemaType.STRING,
                  description:
                    "Descriptive name for the part (e.g. 'Side panel', 'Wooden dowel'). Use the same name every time this part appears.",
                },
                quantity: {
                  type: SchemaType.INTEGER,
                  description:
                    "How many of this part are used or shown in this step. Read from 'x4' annotations or count visible instances.",
                },
              },
              required: ["partNumber", "partName", "quantity"],
            },
          },
          toolsShown: {
            type: SchemaType.ARRAY,
            description:
              "Tools visible in this step, either as icons or drawn illustrations.",
            items: {
              type: SchemaType.OBJECT,
              properties: {
                toolName: {
                  type: SchemaType.STRING,
                  description:
                    "Tool name (e.g. 'Phillips screwdriver', 'Rubber mallet', 'Allen key').",
                },
                toolIcon: {
                  type: SchemaType.STRING,
                  description:
                    "Description of the tool icon if shown (e.g. 'screwdriver silhouette', 'hand icon').",
                },
                toolId: {
                  type: SchemaType.STRING,
                  description:
                    "Tool identifier from the manual if one is printed (e.g. a part number for an included Allen key).",
                },
              },
              required: ["toolName"],
            },
          },
          actions: {
            type: SchemaType.ARRAY,
            description:
              "Physical assembly actions depicted in this step. Each action has a subject (what moves), a target (where it goes), and optional direction.",
            items: {
              type: SchemaType.OBJECT,
              properties: {
                actionType: {
                  type: SchemaType.STRING,
                  description:
                    "Action verb (e.g. 'insert', 'attach', 'rotate', 'tighten', 'press', 'slide', 'lower', 'flip', 'snap', 'hook').",
                },
                subject: {
                  type: SchemaType.STRING,
                  description:
                    "The part or component being acted on (e.g. 'wooden dowel', 'shelf').",
                },
                target: {
                  type: SchemaType.STRING,
                  description:
                    "Where the subject goes or connects to (e.g. 'side panel hole', 'shelf assembly').",
                },
                direction: {
                  type: SchemaType.STRING,
                  description:
                    "Direction of motion if visible (e.g. 'push downward', 'slide left-to-right', 'clockwise').",
                },
              },
              required: ["actionType", "subject", "target"],
            },
          },
          spatialDetails: {
            type: SchemaType.OBJECT,
            description:
              "Overall spatial context: how the assembly is oriented and any alignment notes.",
            properties: {
              orientation: {
                type: SchemaType.STRING,
                description:
                  "How the main assembly is oriented (e.g. 'Side panel laid flat on floor', 'Assembly standing upright').",
              },
              alignmentNotes: {
                type: SchemaType.STRING,
                description:
                  "Alignment cues visible in the image (e.g. 'Edges flush with side panels', 'Align holes before pressing').",
              },
            },
          },
          spatialRelationships: {
            type: SchemaType.ARRAY,
            description:
              "Structured spatial relationships between parts visible in this step. Capture how parts relate to each other positionally.",
            items: {
              type: SchemaType.OBJECT,
              description:
                "A spatial relationship between two parts (e.g. 'Shelf sits on top of dowels', 'Back panel flush against side panel').",
              properties: {
                partA: {
                  type: SchemaType.STRING,
                  description:
                    "First part in the relationship (use consistent part name).",
                },
                relationship: {
                  type: SchemaType.STRING,
                  description:
                    "Spatial relationship (e.g. 'sits on', 'inserted into', 'flush against', 'perpendicular to', 'slides into').",
                },
                partB: {
                  type: SchemaType.STRING,
                  description:
                    "Second part in the relationship (use consistent part name).",
                },
                notes: {
                  type: SchemaType.STRING,
                  description:
                    "Additional spatial context if needed (e.g. 'at 90-degree angle', 'left side only').",
                },
              },
              required: ["partA", "relationship", "partB"],
            },
          },
          arrows: {
            type: SchemaType.ARRAY,
            description:
              "All arrow annotations visible in this step. Classify each arrow by its purpose.",
            items: {
              type: SchemaType.OBJECT,
              properties: {
                direction: {
                  type: SchemaType.STRING,
                  description:
                    "Arrow direction (e.g. 'downward', 'clockwise', 'left-to-right', 'upward').",
                },
                label: {
                  type: SchemaType.STRING,
                  description:
                    "Text label near the arrow if any (e.g. '¼ turn', 'click', 'x4').",
                },
                indicatesMotion: {
                  type: SchemaType.BOOLEAN,
                  description:
                    "True if this arrow shows assembly motion (part movement). False if it is a callout pointer or label indicator.",
                },
                arrowType: {
                  type: SchemaType.STRING,
                  description:
                    "Arrow purpose classification: 'motion' (shows part movement direction), 'callout' (points to a part or detail), 'rotation' (shows rotational movement like screw tightening).",
                  format: "enum",
                  enum: ["motion", "callout", "rotation"],
                },
              },
              required: ["direction", "indicatesMotion"],
            },
          },
          fasteners: {
            type: SchemaType.ARRAY,
            description:
              "Fastener details visible in this step (screws, bolts, dowels, cam locks, nails).",
            items: {
              type: SchemaType.OBJECT,
              properties: {
                type: {
                  type: SchemaType.STRING,
                  description:
                    "Fastener type (e.g. 'cam lock', 'screw', 'bolt', 'dowel', 'nail').",
                },
                partId: {
                  type: SchemaType.STRING,
                  description:
                    "Part identifier for this fastener as printed in the manual.",
                },
                rotation: {
                  type: SchemaType.STRING,
                  description:
                    "Rotation direction for this fastener: clockwise, counter_clockwise, or none (for press-fit like dowels).",
                  format: "enum",
                  enum: ["clockwise", "counter_clockwise", "none"],
                },
                notes: {
                  type: SchemaType.STRING,
                  description:
                    "Additional notes (e.g. 'quarter-turn to lock', 'hand-tighten only').",
                },
                quantity: {
                  type: SchemaType.INTEGER,
                  description:
                    "How many of this fastener are used in this step. Read from 'x8' annotations or count visible instances.",
                },
              },
              required: ["type", "rotation"],
            },
          },
          annotations: {
            type: SchemaType.ARRAY,
            description:
              "Other text labels, quantity markers ('x4'), icons, or symbols visible in this step that are not arrows or warnings.",
            items: { type: SchemaType.STRING },
          },
          warnings: {
            type: SchemaType.ARRAY,
            description:
              "Safety icons, caution text, two-person indicators, or hazard symbols visible in this step.",
            items: { type: SchemaType.STRING },
          },
          complexity: {
            type: SchemaType.STRING,
            description:
              "Step complexity: 'simple' (1-3 parts, single action) or 'complex' (multiple sub-actions, fasteners, rotation, or sub-steps).",
            format: "enum",
            enum: ["simple", "complex"],
          },
          confidence: {
            type: SchemaType.NUMBER,
            description:
              "Self-reported confidence from 0.0 to 1.0. Lower if image is blurry, arrows overlap, parts are obscured, or fastener types are ambiguous. Be honest — do not default to 1.0.",
          },
          confirmationCue: {
            type: SchemaType.STRING,
            description:
              "What the user should see, hear, or feel when this step is completed correctly (e.g., 'audible click', 'flush surface', 'arrow on cam lock points toward panel edge'). Only populate if a visual cue is present in the image — icons like CLICK, checkmarks, alignment indicators, or tactile feedback symbols.",
          },
        },
        required: [
          "stepNumber",
          "rawDescription",
          "partsShown",
          "toolsShown",
          "actions",
          "spatialDetails",
          "arrows",
          "fasteners",
          "annotations",
          "warnings",
          "complexity",
          "confidence",
        ],
      },
    },
    pageIndicators: {
      type: SchemaType.OBJECT,
      description:
        "Page-level indicators used for escalation decisions and pipeline routing.",
      properties: {
        arrowCount: {
          type: SchemaType.INTEGER,
          description:
            "Total number of arrows visible anywhere on this page. Count every arrow, including callouts.",
        },
        hasHingeOrRotation: {
          type: SchemaType.BOOLEAN,
          description:
            "True if any hinge, pivot, rotation mechanism, or rotating joint is shown on this page.",
        },
        hasFastenerAmbiguity: {
          type: SchemaType.BOOLEAN,
          description:
            "True if fastener types cannot be clearly distinguished (e.g. screw vs bolt unclear, cam lock orientation ambiguous).",
        },
        isPartsPage: {
          type: SchemaType.BOOLEAN,
          description:
            "True if this page is primarily a parts inventory/overview showing components and quantities without numbered assembly steps.",
        },
        hasTwoPersonWarning: {
          type: SchemaType.BOOLEAN,
          description:
            "True if a two-person icon or two-person warning text is visible anywhere on this page.",
        },
        hasSubSteps: {
          type: SchemaType.BOOLEAN,
          description:
            "True if this page contains detail circles, magnified insets, or zoom-in views showing close-ups of connections.",
        },
      },
      required: [
        "arrowCount",
        "hasHingeOrRotation",
        "hasFastenerAmbiguity",
        "isPartsPage",
      ],
    },
  },
  required: ["steps", "pageIndicators"],
};
