// ============================================================
// TypeScript types matching the guideline YAML structure
// ============================================================

export interface GuidelineFile {
  version: string;
  scope: string;
  updated_at: string;
  description: string;
  categories: GuidelineCategory[];
}

export interface GuidelineCategory {
  name: string;
  description: string;
  requirements: GuidelineRequirement[];
}

export interface GuidelineRequirement {
  id: string;
  title: string;
  origin: string;
  priority: "must" | "should" | "may";
  description: string;
  applies_to: string[];
  validation: {
    type: string;
    check_function?: string;
    severity: "error" | "warning" | "info";
    [key: string]: unknown;
  };
  examples?: {
    good?: string[];
    bad?: string[];
  };
}
