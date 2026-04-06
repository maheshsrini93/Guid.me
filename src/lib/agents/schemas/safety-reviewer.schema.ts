import { SchemaType, type GenerationConfig } from "@google/generative-ai";

/**
 * Gemini responseSchema for Agent 6: Safety Reviewer.
 * Enforces the SafetyReviewResult shape at the API level.
 */
export const safetyReviewerSchema: GenerationConfig["responseSchema"] = {
  type: SchemaType.OBJECT,
  properties: {
    safetyPassed: {
      type: SchemaType.BOOLEAN,
      description: "Whether the guide passes safety review",
    },
    issues: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          severity: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["warning", "critical"],
          },
          stepNumber: {
            type: SchemaType.INTEGER,
            nullable: true,
            description: "Step number, or null for guide-level issues",
          },
          hazardType: {
            type: SchemaType.STRING,
            format: "enum",
            enum: [
              "heavy_lift",
              "sharp_edge",
              "tip_over_risk",
              "pinch_point",
              "wall_anchoring",
              "two_person_required",
              "electrical",
              "chemical",
              "fall_risk",
              "tool_safety",
            ],
          },
          description: {
            type: SchemaType.STRING,
            description: "Description of the safety hazard",
          },
          coverage: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["documented", "undocumented"],
            description:
              "Whether this hazard is already addressed in the work instruction's safety callouts (documented) or missing from the instruction (undocumented)",
          },
          requiredAction: {
            type: SchemaType.STRING,
            description: "Required action to address the hazard",
          },
        },
        required: [
          "severity",
          "coverage",
          "stepNumber",
          "hazardType",
          "description",
          "requiredAction",
        ],
      },
    },
    recommendedSafetyLevel: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["low", "medium", "high"],
      description: "Recommended safety classification for the guide",
    },
  },
  required: ["safetyPassed", "issues", "recommendedSafetyLevel"],
};
