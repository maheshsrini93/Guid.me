import { SchemaType, type GenerationConfig } from "@google/generative-ai";

/**
 * Gemini responseSchema for Agent 4: Guideline Enforcer.
 * Enforces the EnforcedGuide shape at the API level.
 * The 16 approved verbs are enforced as an enum on primaryVerb.
 */
export const guidelineEnforcerSchema: GenerationConfig["responseSchema"] = {
  type: SchemaType.OBJECT,
  properties: {
    steps: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          stepNumber: { type: SchemaType.INTEGER },
          title: { type: SchemaType.STRING },
          primaryVerb: {
            type: SchemaType.STRING,
            format: "enum",
            enum: [
              "Insert",
              "Attach",
              "Tighten",
              "Slide",
              "Place",
              "Align",
              "Press",
              "Push",
              "Lower",
              "Lift",
              "Flip",
              "Screw",
              "Snap",
              "Hook",
              "Position",
              "Secure",
            ],
          },
          instruction: { type: SchemaType.STRING },
          parts: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING },
                id: { type: SchemaType.STRING },
                quantity: { type: SchemaType.INTEGER },
              },
              required: ["name", "id", "quantity"],
            },
          },
          safetyCallout: {
            type: SchemaType.OBJECT,
            nullable: true,
            properties: {
              severity: {
                type: SchemaType.STRING,
                format: "enum",
                enum: ["caution", "warning", "danger"],
              },
              text: { type: SchemaType.STRING },
            },
            required: ["severity", "text"],
          },
          twoPersonRequired: { type: SchemaType.BOOLEAN },
          transitionNote: { type: SchemaType.STRING, nullable: true },
          phaseStart: { type: SchemaType.STRING, nullable: true },
          sourcePdfPages: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.INTEGER },
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
          "title",
          "primaryVerb",
          "instruction",
          "parts",
          "safetyCallout",
          "twoPersonRequired",
          "transitionNote",
          "phaseStart",
          "sourcePdfPages",
          "complexity",
          "confidence",
        ],
      },
    },
    guideMetadata: {
      type: SchemaType.OBJECT,
      properties: {
        safetyLevel: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["low", "medium", "high"],
        },
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
        "safetyLevel",
        "estimatedMinutes",
        "personsRequired",
        "skillLevel",
        "purposeStatement",
      ],
    },
  },
  required: ["steps", "guideMetadata"],
};
