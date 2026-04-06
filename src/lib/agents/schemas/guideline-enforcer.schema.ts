import { SchemaType, type GenerationConfig } from "@google/generative-ai";

/**
 * Gemini responseSchema for Agent 4: Guideline Enforcer v2.0.
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
          subNotes: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
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
          toolsRequired: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          safetyCallouts: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                severity: {
                  type: SchemaType.STRING,
                  format: "enum",
                  enum: ["notice", "caution", "warning", "danger"],
                },
                text: { type: SchemaType.STRING },
              },
              required: ["severity", "text"],
            },
          },
          twoPersonRequired: { type: SchemaType.BOOLEAN },
          confirmationCue: { type: SchemaType.STRING, nullable: true },
          difficultyFlag: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["tricky", "precision"],
            nullable: true,
          },
          isCheckpoint: { type: SchemaType.BOOLEAN },
          checkpointNote: { type: SchemaType.STRING, nullable: true },
          dryingTimeMinutes: { type: SchemaType.INTEGER, nullable: true },
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
          needsReview: { type: SchemaType.BOOLEAN },
          illustrationPrompt: { type: SchemaType.STRING },
          illustrationComplexity: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["simple", "complex"],
          },
        },
        required: [
          "stepNumber",
          "title",
          "primaryVerb",
          "instruction",
          "subNotes",
          "parts",
          "toolsRequired",
          "safetyCallouts",
          "twoPersonRequired",
          "confirmationCue",
          "difficultyFlag",
          "isCheckpoint",
          "checkpointNote",
          "dryingTimeMinutes",
          "transitionNote",
          "phaseStart",
          "sourcePdfPages",
          "complexity",
          "confidence",
          "needsReview",
          "illustrationPrompt",
          "illustrationComplexity",
        ],
      },
    },
    guideMetadata: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING },
        safetyLevel: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["low", "medium", "high"],
        },
        estimatedMinutes: { type: SchemaType.INTEGER },
        dryingTimeMinutes: { type: SchemaType.INTEGER, nullable: true },
        personsRequired: { type: SchemaType.INTEGER },
        twoPersonSteps: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.INTEGER },
        },
        skillLevel: {
          type: SchemaType.STRING,
          format: "enum",
          enum: ["none", "basic_hand_tools", "power_tools_recommended"],
        },
        purposeStatement: { type: SchemaType.STRING },
        safetyGear: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        tools: {
          type: SchemaType.OBJECT,
          properties: {
            included: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: { type: SchemaType.STRING },
                  quantity: { type: SchemaType.INTEGER },
                },
                required: ["name"],
              },
            },
            userProvided: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: { type: SchemaType.STRING },
                  quantity: { type: SchemaType.INTEGER },
                },
                required: ["name"],
              },
            },
          },
          required: ["included", "userProvided"],
        },
        colorPalette: {
          type: SchemaType.OBJECT,
          properties: {
            woodPanels: { type: SchemaType.STRING },
            hardware: { type: SchemaType.STRING },
            backing: { type: SchemaType.STRING },
            plastic: { type: SchemaType.STRING },
          },
          required: ["woodPanels", "hardware", "backing", "plastic"],
        },
      },
      required: [
        "title",
        "safetyLevel",
        "estimatedMinutes",
        "dryingTimeMinutes",
        "personsRequired",
        "twoPersonSteps",
        "skillLevel",
        "purposeStatement",
        "safetyGear",
        "tools",
        "colorPalette",
      ],
    },
    beforeYouBegin: {
      type: SchemaType.OBJECT,
      properties: {
        workspace: { type: SchemaType.STRING },
        preconditions: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        commonMistakes: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
      },
      required: ["workspace", "preconditions", "commonMistakes"],
    },
    finishingUp: {
      type: SchemaType.OBJECT,
      properties: {
        tightenCheck: { type: SchemaType.STRING, nullable: true },
        wallAnchoring: { type: SchemaType.STRING, nullable: true },
        levelCheck: { type: SchemaType.STRING, nullable: true },
        cleanup: { type: SchemaType.STRING, nullable: true },
        usageTips: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
      },
      required: ["tightenCheck", "wallAnchoring", "levelCheck", "cleanup", "usageTips"],
    },
    terminologyGlossary: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          term: { type: SchemaType.STRING },
          definition: { type: SchemaType.STRING },
        },
        required: ["term", "definition"],
      },
    },
    enforcementSummary: {
      type: SchemaType.OBJECT,
      properties: {
        totalSteps: { type: SchemaType.INTEGER },
        stepsRewritten: { type: SchemaType.INTEGER },
        safetyCalloutsAdded: { type: SchemaType.INTEGER },
        twoPersonStepsFlagged: { type: SchemaType.INTEGER },
        needsReviewCount: { type: SchemaType.INTEGER },
        rulesApplied: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
      },
      required: [
        "totalSteps",
        "stepsRewritten",
        "safetyCalloutsAdded",
        "twoPersonStepsFlagged",
        "needsReviewCount",
        "rulesApplied",
      ],
    },
  },
  required: [
    "steps",
    "guideMetadata",
    "beforeYouBegin",
    "finishingUp",
    "terminologyGlossary",
    "enforcementSummary",
  ],
};
