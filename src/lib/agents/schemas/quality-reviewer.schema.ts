import { SchemaType, type GenerationConfig } from "@google/generative-ai";

/**
 * Gemini responseSchema for Agent 5: Quality Reviewer.
 * Enforces the QualityReviewResult shape at the API level.
 */
export const qualityReviewerSchema: GenerationConfig["responseSchema"] = {
  type: SchemaType.OBJECT,
  properties: {
    overallScore: {
      type: SchemaType.INTEGER,
      description: "Quality score from 0 to 100",
    },
    decision: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["approved", "revise", "hold"],
      description:
        "approved (>= 85), revise (70-84), hold (< 70)",
    },
    issues: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          severity: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["error", "warning", "info"],
          },
          category: {
            type: SchemaType.STRING,
            format: "enum",
            enum: [
              "verb_syntax",
              "sentence_length",
              "part_reference",
              "missing_quantity",
              "passive_voice",
              "terminology",
              "safety_missing",
              "sequence_logic",
              "completeness",
              "readability",
              "metadata",
              "cross_reference",
            ],
          },
          stepNumber: {
            type: SchemaType.INTEGER,
            nullable: true,
            description: "Step number, or null for guide-level issues",
          },
          description: {
            type: SchemaType.STRING,
            description: "Description of the quality issue",
          },
          responsibleAgent: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["enforcer", "composer"],
            description: "Which agent should fix this on revision",
          },
          suggestedFix: {
            type: SchemaType.STRING,
            nullable: true,
            description: "Suggested correction",
          },
        },
        required: [
          "severity",
          "category",
          "stepNumber",
          "description",
          "responsibleAgent",
          "suggestedFix",
        ],
      },
    },
    summary: {
      type: SchemaType.STRING,
      description: "Human-readable quality summary",
    },
  },
  required: ["overallScore", "decision", "issues", "summary"],
};
