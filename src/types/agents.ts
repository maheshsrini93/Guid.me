// ============================================================
// Agent 1: Document Extractor
// ============================================================

export interface DocumentExtractorInput {
  /** Path to the uploaded file on local storage */
  filePath: string;
  /** MIME type of the uploaded file */
  mimeType:
    | "application/pdf"
    | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  /** Unique job identifier */
  jobId: string;
}

export interface ExtractedDocument {
  /** Original filename */
  filename: string;
  /** Document format */
  format: "pdf" | "docx";
  /** Total number of pages/sections */
  pageCount: number;
  /** Extracted pages with image paths */
  pages: ExtractedPage[];
  /** Raw text content (if available from DOCX) */
  textContent?: string;
  /** Full-document Markdown from Docling (cross-page context for Vision Analyzer) */
  doclingMarkdown?: string;
  /** Extraction timing */
  durationMs: number;
}

export interface ExtractedPage {
  /** Page number (1-indexed) */
  pageNumber: number;
  /** Path to the extracted page image */
  imagePath: string;
  /** Image dimensions */
  width: number;
  height: number;
  /** MIME type of the extracted image */
  mimeType: "image/png" | "image/jpeg";
}

// ============================================================
// Agent 2: Vision Analyzer
// ============================================================

export interface VisionAnalyzerInput {
  /** High-resolution rendered page image */
  pageImage: Buffer;
  /** Image MIME type */
  mimeType: "image/png" | "image/jpeg";
  /** Page number (1-indexed) */
  pageNumber: number;
  /** Total pages in the document */
  totalPages: number;
  /** Condensed MUST rules for the vision pass */
  guidelines?: string;
}

export interface RawPageExtraction {
  /** Page classification */
  pageType?: "cover" | "safety" | "parts_inventory" | "assembly" | "completion";
  /** Extracted steps from this page */
  steps: RawStepExtraction[];
  /** Page-level indicators for escalation decisions */
  pageIndicators: {
    arrowCount: number;
    hasHingeOrRotation: boolean;
    hasFastenerAmbiguity: boolean;
    isPartsPage: boolean;
    hasTwoPersonWarning?: boolean;
    hasSubSteps?: boolean;
  };
}

export interface RawStepExtraction {
  /** Step number as shown on page (0 for parts/tools overview pages) */
  stepNumber: number;
  /** Factual observation, NOT narrative prose */
  rawDescription: string;
  /** True if this is a detail circle / magnified inset */
  isSubStep?: boolean;
  /** Parent step number if isSubStep is true */
  parentStepNumber?: number;
  /** Parts visible in this step */
  partsShown: PartReference[];
  /** Tools visible in this step */
  toolsShown: ToolReference[];
  /** Physical actions observed */
  actions: VisualAction[];
  /** Spatial context */
  spatialDetails: {
    orientation?: string;
    alignmentNotes?: string;
  };
  /** Structured spatial relationships between parts */
  spatialRelationships?: SpatialRelationship[];
  /** Arrow annotations on the page */
  arrows: ArrowAnnotation[];
  /** Fastener details */
  fasteners: FastenerDetail[];
  /** Other annotations ("x4", "click sound icon", "two-person icon") */
  annotations: string[];
  /** Safety/caution icons or text observed */
  warnings: string[];
  /** Complexity classification */
  complexity: "simple" | "complex";
  /** Self-reported confidence (0.0 to 1.0) */
  confidence: number;
  /** What the user should see/hear/feel when step is done correctly */
  confirmationCue?: string;
}

export interface SpatialRelationship {
  partA: string;
  relationship: string;
  partB: string;
  notes?: string;
}

export interface PartReference {
  /** Part identifier (e.g., "104321" or "A") */
  partNumber: string;
  /** Part name (e.g., "Wooden dowel") */
  partName: string;
  /** Quantity shown */
  quantity: number;
}

export interface ToolReference {
  /** Tool name (e.g., "Phillips screwdriver") */
  toolName: string;
  /** Optional icon identifier */
  toolIcon?: string;
  /** Tool identifier from the manual */
  toolId?: string;
}

export interface VisualAction {
  /** Action type (e.g., "insert", "attach", "rotate", "tighten") */
  actionType: string;
  /** What is being acted on */
  subject: string;
  /** Where it goes */
  target: string;
  /** Direction of motion (e.g., "push downward", "slide left-to-right") */
  direction?: string;
}

export interface ArrowAnnotation {
  /** Arrow direction (e.g., "downward", "clockwise") */
  direction: string;
  /** Text label near the arrow */
  label?: string;
  /** true = assembly motion, false = callout pointer */
  indicatesMotion: boolean;
  /** Arrow purpose classification */
  arrowType?: "motion" | "callout" | "rotation";
}

export interface FastenerDetail {
  /** Fastener type (e.g., "cam lock", "screw", "bolt", "dowel") */
  type: string;
  /** Part identifier */
  partId?: string;
  /** Rotation direction */
  rotation: "clockwise" | "counter_clockwise" | "none";
  /** Additional notes (e.g., "quarter-turn to lock") */
  notes?: string;
  /** How many of this fastener used in this step */
  quantity?: number;
}

// ============================================================
// Agent 3: Instruction Composer
// ============================================================

export interface InstructionComposerInput {
  /** All page extractions, in page order */
  pageExtractions: RawPageExtraction[];
  /** Document metadata */
  documentMetadata: {
    title?: string;
    pageCount: number;
    domain?: string;
  };
  /** Desired tone for instructions */
  tone?: "professional" | "friendly" | "minimal";
}

export interface ComposedGuide {
  /** Ordered list of composed steps */
  steps: ComposedStep[];
  /** Consolidated parts list from all pages */
  partsOverview: PartReference[];
  /** All tools referenced across all steps */
  toolsRequired: ToolReference[];
  /** Phase boundary definitions */
  phaseBoundaries: PhaseBoundary[];
  /** Guide-level metadata */
  metadata: {
    estimatedMinutes: number;
    personsRequired: number;
    skillLevel: "none" | "basic_hand_tools" | "power_tools_recommended";
    purposeStatement: string;
  };
}

export interface ComposedStep {
  /** Sequential step number (renumbered from 1) */
  stepNumber: number;
  /** Short descriptive title */
  title: string;
  /** Full instruction text (polished, readable) */
  instruction: string;
  /** Which PDF pages this step spans */
  sourcePdfPages: number[];
  /** Parts used in this step */
  parts: PartReference[];
  /** Tools used in this step */
  tools: ToolReference[];
  /** Physical actions from source extraction */
  actions: VisualAction[];
  /** Spatial context */
  spatialDetails: {
    orientation?: string;
    alignmentNotes?: string;
  };
  /** Arrow annotations from source */
  arrows: ArrowAnnotation[];
  /** Fastener details from source */
  fasteners: FastenerDetail[];
  /** Safety warnings from source */
  warnings: string[];
  /** Complexity classification */
  complexity: "simple" | "complex";
  /** Confidence score */
  confidence: number;
  /** Transition text from previous step/phase */
  transitionNote?: string;
  /** Phase name if this step starts a new phase */
  phaseStart?: string;
}

export interface PhaseBoundary {
  /** Step number where this phase begins */
  beforeStepNumber: number;
  /** Phase name (e.g., "Frame Assembly", "Wiring") */
  phaseName: string;
}

// ============================================================
// Agent 4: Guideline Enforcer
// ============================================================

export interface GuidelineEnforcerInput {
  /** The composed guide from Agent 3 */
  composedGuide: ComposedGuide;
  /** Full work instruction guidelines YAML (untruncated) */
  guidelinesYaml: string;
  /** Full illustration guidelines YAML (for cross-reference) */
  illustrationGuidelinesYaml?: string;
}

export interface EnforcedGuide {
  /** Guideline-compliant steps */
  steps: EnforcedStep[];
  /** Guide-level metadata */
  guideMetadata: GuideMetadata;
}

export interface EnforcedStep {
  /** Sequential step number */
  stepNumber: number;
  /** Short descriptive title */
  title: string;
  /** Primary imperative verb (one of 16 approved verbs) */
  primaryVerb: AllowedVerb;
  /** Guideline-compliant instruction text (verb-first, <= 20 words/sentence) */
  instruction: string;
  /** Structured part references with name + id + quantity */
  parts: StructuredPartRef[];
  /** Safety callout (if applicable) */
  safetyCallout: SafetyCallout | null;
  /** Whether this step requires two people */
  twoPersonRequired: boolean;
  /** Transition note from previous step */
  transitionNote: string | null;
  /** Phase name if this step starts a new phase */
  phaseStart: string | null;
  /** Source PDF page numbers */
  sourcePdfPages: number[];
  /** Complexity classification */
  complexity: "simple" | "complex";
  /** Confidence score */
  confidence: number;
}

/** The 16 default imperative verbs (from WI-022) */
export type AllowedVerb =
  | "Insert"
  | "Attach"
  | "Tighten"
  | "Slide"
  | "Place"
  | "Align"
  | "Press"
  | "Push"
  | "Lower"
  | "Lift"
  | "Flip"
  | "Screw"
  | "Snap"
  | "Hook"
  | "Position"
  | "Secure";

export interface StructuredPartRef {
  /** Part name (e.g., "Wooden dowel") */
  name: string;
  /** Part identifier (e.g., "A" or "104321") */
  id: string;
  /** Quantity used in this step */
  quantity: number;
}

export interface SafetyCallout {
  /** Severity level */
  severity: "caution" | "warning" | "danger";
  /** Callout text */
  text: string;
}

export interface GuideMetadata {
  /** Overall safety classification */
  safetyLevel: "low" | "medium" | "high";
  /** Estimated completion time in minutes */
  estimatedMinutes: number;
  /** Number of people required */
  personsRequired: number;
  /** Skill level needed */
  skillLevel: "none" | "basic_hand_tools" | "power_tools_recommended";
  /** One-sentence purpose statement */
  purposeStatement: string;
}

// ============================================================
// Agent 5: Quality Reviewer
// ============================================================

export interface QualityReviewerInput {
  /** The enforced guide from Agent 4 */
  enforcedGuide: EnforcedGuide;
  /** Original page extractions for cross-verification */
  originalExtractions: RawPageExtraction[];
  /** Full guidelines YAML for scoring reference */
  guidelinesYaml: string;
}

export interface QualityReviewResult {
  /** Overall quality score (0-100) */
  overallScore: number;
  /** Decision based on score threshold */
  decision: "approved" | "revise" | "hold";
  /** Specific issues found */
  issues: QualityIssue[];
  /** Human-readable summary */
  summary: string;
}

export interface QualityIssue {
  /** Issue severity */
  severity: "error" | "warning" | "info";
  /** Issue category */
  category: QualityCategory;
  /** Step number (null for guide-level issues) */
  stepNumber: number | null;
  /** Description of the issue */
  description: string;
  /** Which agent should fix this on revision */
  responsibleAgent: "enforcer" | "composer";
  /** Suggested fix */
  suggestedFix?: string;
}

export type QualityCategory =
  | "verb_syntax"
  | "sentence_length"
  | "part_reference"
  | "missing_quantity"
  | "passive_voice"
  | "terminology"
  | "safety_missing"
  | "sequence_logic"
  | "completeness"
  | "readability"
  | "metadata"
  | "cross_reference";

// ============================================================
// Agent 6: Safety Reviewer
// ============================================================

export interface SafetyReviewerInput {
  /** The enforced guide from Agent 4 */
  enforcedGuide: EnforcedGuide;
  /** Original page extractions for hazard cross-check */
  originalExtractions: RawPageExtraction[];
}

export interface SafetyReviewResult {
  /** Whether safety review passed */
  safetyPassed: boolean;
  /** Safety issues found */
  issues: SafetyIssue[];
  /** Recommended safety classification */
  recommendedSafetyLevel: "low" | "medium" | "high";
}

export interface SafetyIssue {
  /** Issue severity */
  severity: "warning" | "critical";
  /** Step number (null for guide-level issues) */
  stepNumber: number | null;
  /** Hazard type */
  hazardType: HazardType;
  /** Description of the hazard */
  description: string;
  /** Required action to address the hazard */
  requiredAction: string;
}

export type HazardType =
  | "heavy_lift"
  | "sharp_edge"
  | "tip_over_risk"
  | "pinch_point"
  | "wall_anchoring"
  | "two_person_required"
  | "electrical"
  | "chemical"
  | "fall_risk"
  | "tool_safety";

// ============================================================
// Agent 7: Illustration Generator
// ============================================================

export interface IllustrationGeneratorInput {
  /** The approved enforced guide */
  enforcedGuide: EnforcedGuide;
  /** Step number to illustrate */
  stepNumber: number;
  /** Step instruction text (for context) */
  stepInstruction: string;
  /** Parts active in this step */
  activeParts: StructuredPartRef[];
  /** Illustration guidelines YAML */
  illustrationGuidelinesYaml: string;
  /** Global part label mapping (built once, reused across steps) */
  partLabelMap: Record<string, string>;
  /** Product name for context */
  productName: string;
}

export interface GeneratedIllustration {
  /** Step number this illustration belongs to */
  stepNumber: number;
  /** Generated image as buffer */
  imageBuffer: Buffer;
  /** Image MIME type */
  mimeType: "image/png";
  /** File path where illustration is saved */
  filePath: string;
  /** Model used for generation */
  modelUsed: string;
  /** Image dimensions */
  width: number;
  height: number;
  /** Generation cost */
  costUsd: number;
  /** Generation duration */
  durationMs: number;
}

// ============================================================
// Agent 8: XML Assembler
// ============================================================

export interface XmlAssemblerInput {
  /** The approved enforced guide */
  enforcedGuide: EnforcedGuide;
  /** Quality review results */
  qualityReview: QualityReviewResult;
  /** Safety review results */
  safetyReview: SafetyReviewResult;
  /** Generated illustrations (one per step) */
  illustrations: GeneratedIllustration[];
  /** Original document metadata */
  documentMetadata: {
    filename: string;
    format: string;
    pageCount: number;
  };
  /** Job metadata */
  jobMetadata: {
    jobId: string;
    startedAt: string;
    totalCostUsd: number;
    modelsUsed: string[];
    textRevisionLoops: number;
  };
}

export interface XmlAssemblerOutput {
  /** Complete XML document as string */
  xmlContent: string;
  /** Path where XML file is saved */
  xmlFilePath: string;
  /** JSON representation (for API responses) */
  jsonContent: object;
  /** Assembly duration */
  durationMs: number;
}
