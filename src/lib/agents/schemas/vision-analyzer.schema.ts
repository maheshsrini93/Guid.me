import { SchemaType, type GenerationConfig } from "@google/generative-ai";

/**
 * Gemini responseSchema for Agent 2: Vision Analyzer.
 * Enforces the RawPageExtraction shape at the API level.
 */
export const visionAnalyzerSchema: GenerationConfig["responseSchema"] = {
  type: SchemaType.OBJECT,
  properties: {
    steps: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          stepNumber: { type: SchemaType.INTEGER },
          rawDescription: { type: SchemaType.STRING },
          partsShown: {
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
          toolsShown: {
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
          annotations: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
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
      properties: {
        arrowCount: { type: SchemaType.INTEGER },
        hasHingeOrRotation: { type: SchemaType.BOOLEAN },
        hasFastenerAmbiguity: { type: SchemaType.BOOLEAN },
        isPartsPage: { type: SchemaType.BOOLEAN },
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
