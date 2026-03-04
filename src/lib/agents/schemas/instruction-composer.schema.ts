import { SchemaType, type GenerationConfig } from "@google/generative-ai";

/**
 * Gemini responseSchema for Agent 3: Instruction Composer.
 * Enforces the ComposedGuide shape at the API level.
 */
export const instructionComposerSchema: GenerationConfig["responseSchema"] = {
  type: SchemaType.OBJECT,
  properties: {
    steps: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          stepNumber: { type: SchemaType.INTEGER },
          title: { type: SchemaType.STRING },
          instruction: { type: SchemaType.STRING },
          sourcePdfPages: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.INTEGER },
          },
          parts: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                partNumber: { type: SchemaType.STRING },
                partName: { type: SchemaType.STRING },
                quantity: { type: SchemaType.INTEGER },
              },
              required: ["partNumber", "partName", "quantity"],
            },
          },
          tools: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                toolName: { type: SchemaType.STRING },
                toolIcon: { type: SchemaType.STRING },
              },
              required: ["toolName"],
            },
          },
          actions: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                actionType: { type: SchemaType.STRING },
                subject: { type: SchemaType.STRING },
                target: { type: SchemaType.STRING },
                direction: { type: SchemaType.STRING },
              },
              required: ["actionType", "subject", "target"],
            },
          },
          spatialDetails: {
            type: SchemaType.OBJECT,
            properties: {
              orientation: { type: SchemaType.STRING },
              alignmentNotes: { type: SchemaType.STRING },
            },
          },
          arrows: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                direction: { type: SchemaType.STRING },
                label: { type: SchemaType.STRING },
                indicatesMotion: { type: SchemaType.BOOLEAN },
              },
              required: ["direction", "indicatesMotion"],
            },
          },
          fasteners: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                type: { type: SchemaType.STRING },
                partId: { type: SchemaType.STRING },
                rotation: {
                  type: SchemaType.STRING,
                  format: "enum",
                  enum: ["clockwise", "counter_clockwise", "none"],
                },
                notes: { type: SchemaType.STRING },
              },
              required: ["type", "rotation"],
            },
          },
          warnings: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          complexity: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["simple", "complex"],
          },
          confidence: { type: SchemaType.NUMBER },
          transitionNote: { type: SchemaType.STRING },
          phaseStart: { type: SchemaType.STRING },
        },
        required: [
          "stepNumber",
          "title",
          "instruction",
          "sourcePdfPages",
          "parts",
          "tools",
          "actions",
          "spatialDetails",
          "arrows",
          "fasteners",
          "warnings",
          "complexity",
          "confidence",
        ],
      },
    },
    partsOverview: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          partNumber: { type: SchemaType.STRING },
          partName: { type: SchemaType.STRING },
          quantity: { type: SchemaType.INTEGER },
        },
        required: ["partNumber", "partName", "quantity"],
      },
    },
    toolsRequired: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          toolName: { type: SchemaType.STRING },
          toolIcon: { type: SchemaType.STRING },
        },
        required: ["toolName"],
      },
    },
    phaseBoundaries: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          beforeStepNumber: { type: SchemaType.INTEGER },
          phaseName: { type: SchemaType.STRING },
        },
        required: ["beforeStepNumber", "phaseName"],
      },
    },
    metadata: {
      type: SchemaType.OBJECT,
      properties: {
        estimatedMinutes: { type: SchemaType.INTEGER },
        personsRequired: { type: SchemaType.INTEGER },
        skillLevel: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["none", "basic_hand_tools", "power_tools_recommended"],
        },
        purposeStatement: { type: SchemaType.STRING },
      },
      required: [
        "estimatedMinutes",
        "personsRequired",
        "skillLevel",
        "purposeStatement",
      ],
    },
  },
  required: [
    "steps",
    "partsOverview",
    "toolsRequired",
    "phaseBoundaries",
    "metadata",
  ],
};
