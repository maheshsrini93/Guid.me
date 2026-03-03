// ============================================================
// XML Output Types (for XML Builder)
// ============================================================

export interface XmlWorkInstruction {
  metadata: XmlMetadata;
  partsList: XmlPart[];
  toolsRequired: XmlTool[];
  safetyWarnings: XmlWarning[];
  phases: XmlPhase[];
  generationMetadata: XmlGenerationMetadata;
}

export interface XmlMetadata {
  title: string;
  domain: string;
  safetyLevel: "low" | "medium" | "high";
  estimatedMinutes: number;
  personsRequired: number;
  skillLevel: "none" | "basic_hand_tools" | "power_tools_recommended";
  purpose: string;
  sourceDocument: {
    filename: string;
    format: "pdf" | "docx";
    pageCount: number;
  };
}

export interface XmlPart {
  id: string;
  name: string;
  quantity: number;
}

export interface XmlTool {
  name: string;
  required: boolean;
}

export interface XmlWarning {
  severity: "caution" | "warning" | "danger";
  text: string;
}

export interface XmlPhase {
  name: string;
  steps: XmlStep[];
}

export interface XmlStep {
  number: number;
  title: string;
  instruction: string;
  parts: { id: string; quantity: number }[];
  tools: { name: string }[];
  safety: { severity: string; text: string }[];
  illustrationSrc: string | null;
  twoPersonRequired: boolean;
  complexity: "simple" | "complex";
  confidence: number;
  sourcePages: number[];
}

export interface XmlGenerationMetadata {
  jobId: string;
  generatedAt: string;
  qualityScore: number;
  qualityDecision: "approved" | "revise" | "hold";
  totalCostUsd: number;
  processingTimeMs: number;
  textRevisionLoops: number;
  modelsUsed: string[];
  qualityFlags: {
    severity: "error" | "warning" | "info";
    step: number | null;
    description: string;
  }[];
}
