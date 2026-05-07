/**
 * Pre-cached demo data for the 3D pipeline (T-095).
 *
 * Mirrors the structure of `demo-data.ts` (PDF/DOCX path) but represents the
 * CAD path: a 5-step benchtop pulley assembly produced from a STEP file plus
 * an authored explode-view animation. The Source Adapter populates
 * `structuredMetadata` (parts catalog + assembly tree + sequenceSource), so
 * Agents 2 and 7 dispatch to their CAD sub-implementations and Agent 7
 * renders illustrations from geometry at $0 cost.
 *
 * The actual binary asset (storage/demo-assets/v1-demo/) is authored by hand
 * (T-094). When that asset lands the cached outputs here should be regenerated
 * against the real STEP/MP4 to keep the demo consistent with the live path.
 */

import type {
  ExtractedSource,
  RawFrameExtraction,
  ComposedGuide,
  EnforcedGuide,
  QualityReviewResult,
  SafetyReviewResult,
  AssemblyNode,
  StructuredPartRef,
} from "@/types/agents";

// ============================================================
// Asset spec (12-component benchtop pulley)
// ============================================================

const PARTS_CATALOG: StructuredPartRef[] = [
  {
    id: "BasePlate",
    name: "Base plate",
    quantity: 1,
    parentAssemblyPath: "pulley/frame",
    mass: 1.42,
    material: "Aluminum 6061-T6",
    boundingBox: { min: [0, 0, 0], max: [180, 120, 8] },
  },
  {
    id: "UprightL",
    name: "Left upright",
    quantity: 1,
    parentAssemblyPath: "pulley/frame/uprights",
    mass: 0.46,
    material: "Aluminum 6061-T6",
    boundingBox: { min: [0, 0, 0], max: [10, 60, 80] },
  },
  {
    id: "UprightR",
    name: "Right upright",
    quantity: 1,
    parentAssemblyPath: "pulley/frame/uprights",
    mass: 0.46,
    material: "Aluminum 6061-T6",
    boundingBox: { min: [0, 0, 0], max: [10, 60, 80] },
  },
  {
    id: "Axle",
    name: "Axle shaft",
    quantity: 1,
    parentAssemblyPath: "pulley/drivetrain",
    mass: 0.18,
    material: "Steel - AISI 1018",
    boundingBox: { min: [0, 0, 0], max: [120, 8, 8] },
  },
  {
    id: "BearingL",
    name: "Bearing (left)",
    quantity: 1,
    parentAssemblyPath: "pulley/drivetrain",
    mass: 0.04,
    material: "Steel - 52100",
    boundingBox: { min: [0, 0, 0], max: [22, 22, 7] },
  },
  {
    id: "BearingR",
    name: "Bearing (right)",
    quantity: 1,
    parentAssemblyPath: "pulley/drivetrain",
    mass: 0.04,
    material: "Steel - 52100",
    boundingBox: { min: [0, 0, 0], max: [22, 22, 7] },
  },
  {
    id: "Pulley",
    name: "Pulley wheel",
    quantity: 1,
    parentAssemblyPath: "pulley/drivetrain",
    mass: 0.31,
    material: "Aluminum 6061-T6",
    boundingBox: { min: [0, 0, 0], max: [60, 60, 18] },
  },
  {
    id: "Spacer",
    name: "Spacer collar",
    quantity: 2,
    parentAssemblyPath: "pulley/drivetrain",
    mass: 0.01,
    material: "Brass - C36000",
    boundingBox: { min: [0, 0, 0], max: [12, 12, 6] },
  },
  {
    id: "RetClipL",
    name: "Retaining clip (left)",
    quantity: 1,
    parentAssemblyPath: "pulley/drivetrain",
    mass: 0.005,
    material: "Spring steel",
    boundingBox: { min: [0, 0, 0], max: [10, 10, 1] },
  },
  {
    id: "RetClipR",
    name: "Retaining clip (right)",
    quantity: 1,
    parentAssemblyPath: "pulley/drivetrain",
    mass: 0.005,
    material: "Spring steel",
    boundingBox: { min: [0, 0, 0], max: [10, 10, 1] },
  },
  {
    id: "M5x10",
    name: "M5×10 cap screw",
    quantity: 4,
    parentAssemblyPath: "pulley/fasteners",
    mass: 0.008,
    material: "Steel - 8.8",
    boundingBox: { min: [0, 0, 0], max: [5, 5, 10] },
  },
];

const ASSEMBLY_TREE: AssemblyNode = {
  id: "pulley",
  name: "Benchtop pulley",
  children: [
    {
      id: "frame",
      name: "Frame",
      children: [
        { id: "BasePlate", name: "Base plate", children: [] },
        {
          id: "uprights",
          name: "Uprights",
          children: [
            { id: "UprightL", name: "Left upright", children: [] },
            { id: "UprightR", name: "Right upright", children: [] },
          ],
        },
      ],
    },
    {
      id: "drivetrain",
      name: "Drivetrain",
      children: [
        { id: "Axle", name: "Axle shaft", children: [] },
        { id: "BearingL", name: "Bearing (left)", children: [] },
        { id: "BearingR", name: "Bearing (right)", children: [] },
        { id: "Pulley", name: "Pulley wheel", children: [] },
        { id: "Spacer", name: "Spacer collar", children: [] },
        { id: "RetClipL", name: "Retaining clip (left)", children: [] },
        { id: "RetClipR", name: "Retaining clip (right)", children: [] },
      ],
    },
    {
      id: "fasteners",
      name: "Fasteners",
      children: [{ id: "M5x10", name: "M5×10 cap screw", children: [] }],
    },
  ],
};

// ============================================================
// Agent 1: Source Adapter — STEP + explode video path
// ============================================================

export const DEMO_CAD_EXTRACTED_SOURCE: ExtractedSource = {
  // Six keyframes extracted from explode.mp4 at motion-stall transitions.
  frames: [
    { frameNumber: 1, imagePath: "demo-assets/v1-demo/frames/frame-001.png", width: 1920, height: 1080, mimeType: "image/png" },
    { frameNumber: 2, imagePath: "demo-assets/v1-demo/frames/frame-002.png", width: 1920, height: 1080, mimeType: "image/png" },
    { frameNumber: 3, imagePath: "demo-assets/v1-demo/frames/frame-003.png", width: 1920, height: 1080, mimeType: "image/png" },
    { frameNumber: 4, imagePath: "demo-assets/v1-demo/frames/frame-004.png", width: 1920, height: 1080, mimeType: "image/png" },
    { frameNumber: 5, imagePath: "demo-assets/v1-demo/frames/frame-005.png", width: 1920, height: 1080, mimeType: "image/png" },
    { frameNumber: 6, imagePath: "demo-assets/v1-demo/frames/frame-006.png", width: 1920, height: 1080, mimeType: "image/png" },
  ],
  documentMetadata: {
    filename: "benchtop-pulley.stp",
    format: "step+explode-video",
    pageCount: 6,
  },
  structuredMetadata: {
    partsCatalog: PARTS_CATALOG,
    assemblyTree: ASSEMBLY_TREE,
    sourceFormat: "step+explode-video",
    sequenceSource: "explode-video",
    sequenceConfidence: 1.0,
  },
  durationMs: 8400,
};

// ============================================================
// Agent 2: Vision Analyzer — CAD keyframe-pair extractions
// ============================================================

export const DEMO_CAD_FRAME_EXTRACTIONS: RawFrameExtraction[] = [
  {
    pageType: "assembly",
    steps: [{
      stepNumber: 1,
      isSubStep: false,
      rawDescription: "Left and right uprights translate downward onto the base plate, seating into the milled pockets.",
      partsShown: [
        { partNumber: "BasePlate", partName: "Base plate", quantity: 1 },
        { partNumber: "UprightL", partName: "Left upright", quantity: 1 },
        { partNumber: "UprightR", partName: "Right upright", quantity: 1 },
      ],
      toolsShown: [],
      actions: [{ actionType: "lower", subject: "uprights", target: "base plate pockets", direction: "downward" }],
      spatialDetails: { orientation: "Base plate flat on bench" },
      arrows: [{ direction: "downward", indicatesMotion: true, arrowType: "motion" }],
      fasteners: [],
      annotations: [],
      warnings: [],
      complexity: "simple",
      confidence: 0.94,
    }],
    pageIndicators: { arrowCount: 2, hasHingeOrRotation: false, hasFastenerAmbiguity: false, isPartsPage: false, hasSubSteps: false },
  },
  {
    pageType: "assembly",
    steps: [{
      stepNumber: 2,
      isSubStep: false,
      rawDescription: "Four M5×10 cap screws translate upward through the base plate counterbores into the upright threaded holes.",
      partsShown: [
        { partNumber: "M5x10", partName: "M5×10 cap screw", quantity: 4 },
      ],
      toolsShown: [{ toolName: "4mm hex key" }],
      actions: [
        { actionType: "insert", subject: "cap screws", target: "base plate counterbores", direction: "upward" },
        { actionType: "tighten", subject: "cap screws", target: "uprights", direction: "clockwise" },
      ],
      spatialDetails: {},
      arrows: [
        { direction: "upward", indicatesMotion: true, arrowType: "motion" },
        { direction: "clockwise", indicatesMotion: true, arrowType: "rotation" },
      ],
      fasteners: [{ type: "cap screw", partId: "M5x10", rotation: "clockwise", quantity: 4 }],
      annotations: ["torque 5 Nm"],
      warnings: [],
      complexity: "simple",
      confidence: 0.92,
    }],
    pageIndicators: { arrowCount: 4, hasHingeOrRotation: true, hasFastenerAmbiguity: false, isPartsPage: false, hasSubSteps: false },
  },
  {
    pageType: "assembly",
    steps: [{
      stepNumber: 3,
      isSubStep: false,
      rawDescription: "Both bearings press into the upright bearing bores; subsequent frame shows the axle shaft sliding through both bearings.",
      partsShown: [
        { partNumber: "BearingL", partName: "Bearing (left)", quantity: 1 },
        { partNumber: "BearingR", partName: "Bearing (right)", quantity: 1 },
        { partNumber: "Axle", partName: "Axle shaft", quantity: 1 },
      ],
      toolsShown: [{ toolName: "Soft-jaw arbor press" }],
      actions: [
        { actionType: "press", subject: "bearings", target: "upright bores", direction: "inward" },
        { actionType: "slide", subject: "axle", target: "bearings", direction: "left-to-right" },
      ],
      spatialDetails: { alignmentNotes: "Axle shoulder seats against left bearing inner race" },
      arrows: [
        { direction: "inward", indicatesMotion: true, arrowType: "motion" },
        { direction: "rightward", indicatesMotion: true, arrowType: "motion" },
      ],
      fasteners: [],
      annotations: [],
      warnings: ["Do not strike the axle directly — press only on bearing inner race"],
      complexity: "complex",
      confidence: 0.89,
    }],
    pageIndicators: { arrowCount: 4, hasHingeOrRotation: false, hasFastenerAmbiguity: false, isPartsPage: false, hasSubSteps: false },
  },
  {
    pageType: "assembly",
    steps: [{
      stepNumber: 4,
      isSubStep: false,
      rawDescription: "Left spacer slides onto axle, then the pulley wheel slides on, then right spacer.",
      partsShown: [
        { partNumber: "Spacer", partName: "Spacer collar", quantity: 2 },
        { partNumber: "Pulley", partName: "Pulley wheel", quantity: 1 },
      ],
      toolsShown: [],
      actions: [
        { actionType: "slide", subject: "spacer", target: "axle", direction: "rightward" },
        { actionType: "slide", subject: "pulley wheel", target: "axle", direction: "rightward" },
      ],
      spatialDetails: { alignmentNotes: "Pulley wheel keyway aligns with axle flat" },
      arrows: [{ direction: "rightward", indicatesMotion: true, arrowType: "motion" }],
      fasteners: [],
      annotations: [],
      warnings: [],
      complexity: "simple",
      confidence: 0.93,
    }],
    pageIndicators: { arrowCount: 3, hasHingeOrRotation: false, hasFastenerAmbiguity: false, isPartsPage: false, hasSubSteps: false },
  },
  {
    pageType: "completion",
    steps: [{
      stepNumber: 5,
      isSubStep: false,
      rawDescription: "Two retaining clips snap into the axle grooves on either side, locking the drivetrain in place.",
      partsShown: [
        { partNumber: "RetClipL", partName: "Retaining clip (left)", quantity: 1 },
        { partNumber: "RetClipR", partName: "Retaining clip (right)", quantity: 1 },
      ],
      toolsShown: [{ toolName: "External circlip pliers" }],
      actions: [{ actionType: "snap", subject: "retaining clip", target: "axle groove", direction: "inward" }],
      spatialDetails: {},
      arrows: [{ direction: "inward", indicatesMotion: true, arrowType: "motion" }],
      fasteners: [{ type: "retaining clip", partId: "RetClipL", rotation: "none" }],
      annotations: ["audible click"],
      warnings: ["Wear safety glasses — circlips can fly when released"],
      complexity: "complex",
      confidence: 0.90,
    }],
    pageIndicators: { arrowCount: 2, hasHingeOrRotation: false, hasFastenerAmbiguity: true, isPartsPage: false, hasSubSteps: false },
  },
];

// ============================================================
// Agent 3: Instruction Composer
// ============================================================

export const DEMO_CAD_COMPOSED_GUIDE: ComposedGuide = {
  steps: [
    {
      stepNumber: 1,
      title: "Place uprights on base plate",
      instruction: "Lower the left upright (UprightL) and right upright (UprightR) into the milled pockets on the base plate (BasePlate). Press until each upright is fully seated.",
      sourcePdfPages: [1],
      parts: [
        { partNumber: "BasePlate", partName: "Base plate", quantity: 1 },
        { partNumber: "UprightL", partName: "Left upright", quantity: 1 },
        { partNumber: "UprightR", partName: "Right upright", quantity: 1 },
      ],
      tools: [],
      actions: [{ actionType: "lower", subject: "uprights", target: "base plate pockets", direction: "downward" }],
      spatialDetails: { orientation: "Base plate flat on bench" },
      arrows: [{ direction: "downward", indicatesMotion: true }],
      fasteners: [],
      warnings: [],
      complexity: "simple",
      confidence: 0.94,
    },
    {
      stepNumber: 2,
      title: "Bolt frame together",
      instruction: "Insert four M5×10 cap screws (M5x10) up through the base plate counterbores. Tighten each clockwise into the uprights to 5 Nm with a 4 mm hex key.",
      sourcePdfPages: [2],
      parts: [{ partNumber: "M5x10", partName: "M5×10 cap screw", quantity: 4 }],
      tools: [{ toolName: "4mm hex key" }],
      actions: [
        { actionType: "insert", subject: "cap screws", target: "base plate counterbores", direction: "upward" },
        { actionType: "tighten", subject: "cap screws", target: "uprights", direction: "clockwise" },
      ],
      spatialDetails: {},
      arrows: [
        { direction: "upward", indicatesMotion: true },
        { direction: "clockwise", label: "5 Nm", indicatesMotion: true },
      ],
      fasteners: [{ type: "cap screw", partId: "M5x10", rotation: "clockwise", quantity: 4 }],
      warnings: [],
      complexity: "simple",
      confidence: 0.92,
    },
    {
      stepNumber: 3,
      title: "Fit bearings and axle",
      instruction: "Press the left bearing (BearingL) into the left upright bore. Press the right bearing (BearingR) into the right upright bore. Slide the axle (Axle) through both bearings until the shoulder seats against the left bearing.",
      sourcePdfPages: [3],
      parts: [
        { partNumber: "BearingL", partName: "Bearing (left)", quantity: 1 },
        { partNumber: "BearingR", partName: "Bearing (right)", quantity: 1 },
        { partNumber: "Axle", partName: "Axle shaft", quantity: 1 },
      ],
      tools: [{ toolName: "Soft-jaw arbor press" }],
      actions: [
        { actionType: "press", subject: "bearings", target: "upright bores", direction: "inward" },
        { actionType: "slide", subject: "axle", target: "bearings", direction: "left-to-right" },
      ],
      spatialDetails: { alignmentNotes: "Axle shoulder seats against left bearing inner race" },
      arrows: [{ direction: "inward", indicatesMotion: true }],
      fasteners: [],
      warnings: ["Do not strike the axle directly — press only on bearing inner race"],
      complexity: "complex",
      confidence: 0.89,
      phaseStart: "Drivetrain",
    },
    {
      stepNumber: 4,
      title: "Stack pulley and spacers on axle",
      instruction: "Slide the left spacer collar (Spacer) onto the axle until it contacts the left bearing. Slide the pulley wheel (Pulley) on with its keyway aligned to the axle flat. Slide the right spacer collar (Spacer) on until it contacts the right bearing.",
      sourcePdfPages: [4],
      parts: [
        { partNumber: "Spacer", partName: "Spacer collar", quantity: 2 },
        { partNumber: "Pulley", partName: "Pulley wheel", quantity: 1 },
      ],
      tools: [],
      actions: [
        { actionType: "slide", subject: "spacer", target: "axle", direction: "rightward" },
        { actionType: "slide", subject: "pulley wheel", target: "axle", direction: "rightward" },
      ],
      spatialDetails: { alignmentNotes: "Pulley wheel keyway aligns with axle flat" },
      arrows: [{ direction: "rightward", indicatesMotion: true }],
      fasteners: [],
      warnings: [],
      complexity: "simple",
      confidence: 0.93,
    },
    {
      stepNumber: 5,
      title: "Lock drivetrain with retaining clips",
      instruction: "Snap the left retaining clip (RetClipL) into the axle groove on the left side. Snap the right retaining clip (RetClipR) into the axle groove on the right side. Both clips should click into place.",
      sourcePdfPages: [5],
      parts: [
        { partNumber: "RetClipL", partName: "Retaining clip (left)", quantity: 1 },
        { partNumber: "RetClipR", partName: "Retaining clip (right)", quantity: 1 },
      ],
      tools: [{ toolName: "External circlip pliers" }],
      actions: [{ actionType: "snap", subject: "retaining clip", target: "axle groove", direction: "inward" }],
      spatialDetails: {},
      arrows: [{ direction: "inward", indicatesMotion: true }],
      fasteners: [{ type: "retaining clip", partId: "RetClipL", rotation: "none" }],
      warnings: ["Wear safety glasses — circlips can fly when released"],
      complexity: "complex",
      confidence: 0.90,
    },
  ],
  partsOverview: PARTS_CATALOG.map((p) => ({
    partNumber: p.id,
    partName: p.name,
    quantity: p.quantity,
  })),
  toolsRequired: [
    { toolName: "4mm hex key" },
    { toolName: "Soft-jaw arbor press" },
    { toolName: "External circlip pliers" },
  ],
  phaseBoundaries: [{ beforeStepNumber: 3, phaseName: "Drivetrain" }],
  metadata: {
    estimatedMinutes: 18,
    personsRequired: 1,
    skillLevel: "basic_hand_tools",
    purposeStatement: "Assemble the benchtop pulley",
  },
};

// ============================================================
// Agent 4: Guideline Enforcer
// ============================================================

export const DEMO_CAD_ENFORCED_GUIDE: EnforcedGuide = {
  steps: [
    {
      stepNumber: 1,
      title: "Place uprights on base plate",
      primaryVerb: "Place",
      instruction: "Lower the left upright (UprightL, ×1) and the right upright (UprightR, ×1) into the milled pockets on the base plate (BasePlate, ×1).",
      subNotes: ["Press each upright until it is fully seated in its pocket.", "Verify the upright shoulders sit flush against the base plate."],
      parts: [
        { name: "Base plate", id: "BasePlate", quantity: 1 },
        { name: "Left upright", id: "UprightL", quantity: 1 },
        { name: "Right upright", id: "UprightR", quantity: 1 },
      ],
      toolsRequired: [],
      safetyCallouts: [],
      twoPersonRequired: false,
      confirmationCue: "Both uprights sit flush against the base plate with no gap.",
      difficultyFlag: null,
      isCheckpoint: false,
      checkpointNote: null,
      dryingTimeMinutes: null,
      transitionNote: null,
      phaseStart: null,
      sourcePdfPages: [1],
      complexity: "simple",
      confidence: 0.94,
      needsReview: false,
      illustrationPrompt: "[CAD render] Active: BasePlate, UprightL, UprightR. Inactive: none. Show downward motion arrows on each upright.",
      illustrationComplexity: "simple",
    },
    {
      stepNumber: 2,
      title: "Bolt frame together",
      primaryVerb: "Insert",
      instruction: "Insert four M5×10 cap screws (M5x10, ×4) upward through the base plate counterbores into the uprights.",
      subNotes: ["Tighten each cap screw clockwise to 5 Nm with a 4 mm hex key.", "Tighten in a cross pattern to seat the uprights evenly."],
      parts: [{ name: "M5×10 cap screw", id: "M5x10", quantity: 4 }],
      toolsRequired: ["4mm hex key"],
      safetyCallouts: [],
      twoPersonRequired: false,
      confirmationCue: "All four cap screws are flush with the base plate counterbore.",
      difficultyFlag: null,
      isCheckpoint: true,
      checkpointNote: "Frame should now stand square and rigid on the bench.",
      dryingTimeMinutes: null,
      transitionNote: "With the frame fixed, move on to the drivetrain.",
      phaseStart: null,
      sourcePdfPages: [2],
      complexity: "simple",
      confidence: 0.92,
      needsReview: false,
      illustrationPrompt: "[CAD render] Active: M5x10. Inactive: BasePlate, UprightL, UprightR (opacity 0.3). Upward motion + clockwise rotation overlays. Torque label 5 Nm.",
      illustrationComplexity: "simple",
    },
    {
      stepNumber: 3,
      title: "Fit bearings and axle",
      primaryVerb: "Press",
      instruction: "Press the left bearing (BearingL, ×1) into the left upright bore and the right bearing (BearingR, ×1) into the right upright bore.",
      subNotes: ["Slide the axle shaft (Axle, ×1) through both bearings.", "Seat the axle shoulder against the inner race of the left bearing."],
      parts: [
        { name: "Bearing (left)", id: "BearingL", quantity: 1 },
        { name: "Bearing (right)", id: "BearingR", quantity: 1 },
        { name: "Axle shaft", id: "Axle", quantity: 1 },
      ],
      toolsRequired: ["Soft-jaw arbor press"],
      safetyCallouts: [
        { severity: "caution", text: "Press only on bearing inner races — do not strike the axle directly." },
      ],
      twoPersonRequired: false,
      confirmationCue: "Axle rotates freely with no axial play.",
      difficultyFlag: "precision",
      isCheckpoint: false,
      checkpointNote: null,
      dryingTimeMinutes: null,
      transitionNote: null,
      phaseStart: "Drivetrain",
      sourcePdfPages: [3],
      complexity: "complex",
      confidence: 0.89,
      needsReview: false,
      illustrationPrompt: "[CAD render] Active: BearingL, BearingR, Axle. Inactive: BasePlate, uprights (opacity 0.3). Inward motion arrows on bearings, leftward-to-rightward arrow on axle.",
      illustrationComplexity: "complex",
    },
    {
      stepNumber: 4,
      title: "Stack pulley and spacers on axle",
      primaryVerb: "Slide",
      instruction: "Slide the left spacer collar (Spacer, ×1) onto the axle until it contacts the left bearing.",
      subNotes: ["Slide the pulley wheel (Pulley, ×1) on with its keyway aligned to the axle flat.", "Slide the right spacer collar (Spacer, ×1) on until it contacts the right bearing."],
      parts: [
        { name: "Spacer collar", id: "Spacer", quantity: 2 },
        { name: "Pulley wheel", id: "Pulley", quantity: 1 },
      ],
      toolsRequired: [],
      safetyCallouts: [],
      twoPersonRequired: false,
      confirmationCue: "Pulley wheel rotates with the axle, both spacers contact their bearings.",
      difficultyFlag: null,
      isCheckpoint: false,
      checkpointNote: null,
      dryingTimeMinutes: null,
      transitionNote: null,
      phaseStart: null,
      sourcePdfPages: [4],
      complexity: "simple",
      confidence: 0.93,
      needsReview: false,
      illustrationPrompt: "[CAD render] Active: Spacer (×2), Pulley. Inactive: drivetrain so far (opacity 0.3). Rightward motion arrow chain showing stack-up order.",
      illustrationComplexity: "simple",
    },
    {
      stepNumber: 5,
      title: "Lock drivetrain with retaining clips",
      primaryVerb: "Snap",
      instruction: "Snap the left retaining clip (RetClipL, ×1) into the left axle groove and the right retaining clip (RetClipR, ×1) into the right axle groove.",
      subNotes: ["Each clip should click audibly into place.", "Verify there is no axial play in the drivetrain after both clips are seated."],
      parts: [
        { name: "Retaining clip (left)", id: "RetClipL", quantity: 1 },
        { name: "Retaining clip (right)", id: "RetClipR", quantity: 1 },
      ],
      toolsRequired: ["External circlip pliers"],
      safetyCallouts: [
        { severity: "warning", text: "Wear safety glasses — circlips can fly when released from the pliers." },
      ],
      twoPersonRequired: false,
      confirmationCue: "Both clips fully seated in their grooves with an audible click.",
      difficultyFlag: "tricky",
      isCheckpoint: true,
      checkpointNote: "Drivetrain should rotate freely with no axial play.",
      dryingTimeMinutes: null,
      transitionNote: null,
      phaseStart: null,
      sourcePdfPages: [5],
      complexity: "complex",
      confidence: 0.90,
      needsReview: false,
      illustrationPrompt: "[CAD render] Active: RetClipL, RetClipR. Inactive: full drivetrain (opacity 0.3). Inward motion arrows on each clip, audible-click indicator.",
      illustrationComplexity: "complex",
    },
  ],
  guideMetadata: {
    title: "Assemble the Benchtop Pulley",
    safetyLevel: "low",
    estimatedMinutes: 18,
    dryingTimeMinutes: null,
    personsRequired: 1,
    twoPersonSteps: [],
    skillLevel: "basic_hand_tools",
    purposeStatement: "Assemble the benchtop pulley from frame to drivetrain.",
    safetyGear: ["Wear safety glasses when fitting retaining clips."],
    tools: {
      included: [],
      userProvided: [
        { name: "4mm hex key", quantity: 1 },
        { name: "Soft-jaw arbor press", quantity: 1 },
        { name: "External circlip pliers", quantity: 1 },
      ],
    },
    colorPalette: {
      woodPanels: "#9CA3AF",
      hardware: "#C0C0C0",
      backing: "#6B7280",
      plastic: "#374151",
    },
  },
  beforeYouBegin: {
    workspace: "Clean bench at least 600 mm × 400 mm. Soft mat to protect machined surfaces.",
    preconditions: [
      "Verify all 11 components against the parts list.",
      "Confirm bearing bores are clean and lightly oiled.",
    ],
    commonMistakes: [
      "Striking the axle directly to seat bearings — always press on the inner race.",
      "Mounting the pulley wheel without aligning the keyway to the axle flat.",
      "Forgetting either retaining clip — drivetrain will float axially.",
    ],
  },
  finishingUp: {
    tightenCheck: "Re-check all four M5×10 cap screws to 5 Nm.",
    wallAnchoring: null,
    levelCheck: "Spin the pulley by hand and verify smooth rotation with no wobble.",
    cleanup: "Wipe the assembly with a lint-free cloth and apply a light coat of machine oil to the axle.",
    usageTips: ["Avoid radial loads exceeding 50 N at the pulley centerline."],
  },
  terminologyGlossary: [
    { term: "counterbore", definition: "Cylindrical recess that lets a cap screw sit flush." },
    { term: "circlip", definition: "Spring-steel retaining clip that snaps into a groove." },
    { term: "keyway", definition: "Slot machined into a shaft and mating part to transmit torque." },
  ],
  enforcementSummary: {
    totalSteps: 5,
    stepsRewritten: 5,
    safetyCalloutsAdded: 2,
    twoPersonStepsFlagged: 0,
    needsReviewCount: 0,
    rulesApplied: ["WI-002", "WI-005", "WI-007", "WI-008", "WI-009", "WI-018", "WI-022", "WI-024", "WI-025", "WI-026", "WI-028", "WI-035", "WI-038"],
  },
};

// ============================================================
// Agent 5 + 6: Reviewers
// ============================================================

export const DEMO_CAD_QUALITY_REVIEW: QualityReviewResult = {
  overallScore: 93,
  decision: "approved",
  issues: [
    {
      severity: "info",
      category: "terminology",
      stepNumber: 3,
      description: "'Inner race' may not be familiar to first-time builders.",
      responsibleAgent: "enforcer",
      suggestedFix: "Add a one-line explanation of bearing inner race in the glossary or in the sub-note.",
    },
  ],
  summary: "Guide meets quality standards. All 5 steps reference deterministic CAD part IDs from the structuredMetadata.partsCatalog. Verb-first structure preserved.",
};

export const DEMO_CAD_SAFETY_REVIEW: SafetyReviewResult = {
  safetyPassed: true,
  issues: [
    {
      severity: "warning",
      coverage: "documented",
      stepNumber: 5,
      hazardType: "tool_safety",
      description: "Circlips under tension can release suddenly. Eye protection callout is present.",
      requiredAction: "Verified: safety-glasses warning exists in step 5.",
    },
    {
      severity: "warning",
      coverage: "documented",
      stepNumber: 3,
      hazardType: "tool_safety",
      description: "Striking the axle directly can damage bearings. Press-on-inner-race callout is present.",
      requiredAction: "Verified: caution callout exists in step 3.",
    },
  ],
  recommendedSafetyLevel: "low",
};

// ============================================================
// XML output (pre-built)
// ============================================================

export const DEMO_CAD_XML_CONTENT = `<?xml version="1.0" encoding="UTF-8"?>
<work-instruction xmlns="urn:guid:work-instruction:1.0">
  <metadata>
    <title>Assemble the Benchtop Pulley</title>
    <domain>manufacturing</domain>
    <safety-level>low</safety-level>
    <estimated-minutes>18</estimated-minutes>
    <persons-required>1</persons-required>
    <skill-level>basic_hand_tools</skill-level>
    <purpose>Assemble the benchtop pulley from frame to drivetrain.</purpose>
    <source-document>
      <filename>benchtop-pulley.stp</filename>
      <format>step+explode-video</format>
      <page-count>6</page-count>
    </source-document>
  </metadata>
  <parts-list>
    <part id="BasePlate" name="Base plate" quantity="1" />
    <part id="UprightL" name="Left upright" quantity="1" />
    <part id="UprightR" name="Right upright" quantity="1" />
    <part id="Axle" name="Axle shaft" quantity="1" />
    <part id="BearingL" name="Bearing (left)" quantity="1" />
    <part id="BearingR" name="Bearing (right)" quantity="1" />
    <part id="Pulley" name="Pulley wheel" quantity="1" />
    <part id="Spacer" name="Spacer collar" quantity="2" />
    <part id="RetClipL" name="Retaining clip (left)" quantity="1" />
    <part id="RetClipR" name="Retaining clip (right)" quantity="1" />
    <part id="M5x10" name="M5x10 cap screw" quantity="4" />
  </parts-list>
  <tools-required>
    <tool category="required">4mm hex key</tool>
    <tool category="required">Soft-jaw arbor press</tool>
    <tool category="required">External circlip pliers</tool>
  </tools-required>
  <safety-warnings>
    <warning severity="warning">Wear safety glasses when fitting retaining clips.</warning>
    <warning severity="caution">Press only on bearing inner races — do not strike the axle directly.</warning>
  </safety-warnings>
  <phases>
    <phase name="Frame">
      <step number="1">
        <title>Place uprights on base plate</title>
        <instruction>Lower the left upright (UprightL) and the right upright (UprightR) into the milled pockets on the base plate (BasePlate). Press each upright until it is fully seated.</instruction>
        <parts>
          <part-ref id="BasePlate" quantity="1" />
          <part-ref id="UprightL" quantity="1" />
          <part-ref id="UprightR" quantity="1" />
        </parts>
        <complexity>simple</complexity>
        <confidence>0.94</confidence>
      </step>
      <step number="2">
        <title>Bolt frame together</title>
        <instruction>Insert four M5x10 cap screws (M5x10) upward through the base plate counterbores. Tighten each clockwise to 5 Nm with a 4 mm hex key.</instruction>
        <parts>
          <part-ref id="M5x10" quantity="4" />
        </parts>
        <complexity>simple</complexity>
        <confidence>0.92</confidence>
      </step>
    </phase>
    <phase name="Drivetrain">
      <step number="3">
        <title>Fit bearings and axle</title>
        <instruction>Press the left bearing (BearingL) into the left upright bore and the right bearing (BearingR) into the right upright bore. Slide the axle shaft (Axle) through both bearings.</instruction>
        <parts>
          <part-ref id="BearingL" quantity="1" />
          <part-ref id="BearingR" quantity="1" />
          <part-ref id="Axle" quantity="1" />
        </parts>
        <safety>
          <warning severity="caution">Press only on bearing inner races — do not strike the axle directly.</warning>
        </safety>
        <complexity>complex</complexity>
        <confidence>0.89</confidence>
      </step>
      <step number="4">
        <title>Stack pulley and spacers on axle</title>
        <instruction>Slide the left spacer collar (Spacer) onto the axle until it contacts the left bearing. Slide the pulley wheel (Pulley) on with its keyway aligned to the axle flat. Slide the right spacer collar (Spacer) on until it contacts the right bearing.</instruction>
        <parts>
          <part-ref id="Spacer" quantity="2" />
          <part-ref id="Pulley" quantity="1" />
        </parts>
        <complexity>simple</complexity>
        <confidence>0.93</confidence>
      </step>
      <step number="5">
        <title>Lock drivetrain with retaining clips</title>
        <instruction>Snap the left retaining clip (RetClipL) into the left axle groove and the right retaining clip (RetClipR) into the right axle groove. Both clips should click into place.</instruction>
        <parts>
          <part-ref id="RetClipL" quantity="1" />
          <part-ref id="RetClipR" quantity="1" />
        </parts>
        <safety>
          <warning severity="warning">Wear safety glasses — circlips can fly when released from the pliers.</warning>
        </safety>
        <complexity>complex</complexity>
        <confidence>0.9</confidence>
      </step>
    </phase>
  </phases>
  <generation-metadata>
    <job-id>demo-cad</job-id>
    <generated-at>2026-05-07T12:00:00.000Z</generated-at>
    <quality-score>93</quality-score>
    <quality-decision>approved</quality-decision>
    <total-cost>0.210000</total-cost>
    <processing-time-ms>32000</processing-time-ms>
    <text-revision-loops>0</text-revision-loops>
    <models-used>
      <model>gemini-3.1-flash-lite-preview</model>
      <model>gemini-3.1-pro-preview</model>
      <model>internal-cad-renderer</model>
    </models-used>
  </generation-metadata>
</work-instruction>`;

// ============================================================
// Per-agent cost records (CAD path totals ≈ $0.21)
// ============================================================

export const DEMO_CAD_COST_RECORDS = [
  // Source Adapter is code-only on the CAD path: STEP parse + ffmpeg + three.js
  { agent: "source-adapter", model: "code", costUsd: 0, inputTokens: 0, outputTokens: 0 },
  // Vision Analyzer runs Gemini Flash on each keyframe-pair (trimmed prompt)
  { agent: "vision-analyzer", model: "gemini-3.1-flash-lite-preview", costUsd: 0.04, inputTokens: 14000, outputTokens: 2400 },
  { agent: "instruction-composer", model: "gemini-3.1-flash-lite-preview", costUsd: 0.02, inputTokens: 7600, outputTokens: 2900 },
  { agent: "guideline-enforcer", model: "gemini-3.1-flash-lite-preview", costUsd: 0.03, inputTokens: 11500, outputTokens: 4100 },
  { agent: "quality-reviewer", model: "gemini-3.1-pro-preview", costUsd: 0.08, inputTokens: 8800, outputTokens: 1900 },
  { agent: "safety-reviewer", model: "gemini-3.1-pro-preview", costUsd: 0.04, inputTokens: 6400, outputTokens: 1300 },
  // Illustration Renderer is internal three.js + overlays — $0
  { agent: "illustration-renderer", model: "internal-cad-renderer", costUsd: 0, inputTokens: 0, outputTokens: 0 },
  { agent: "xml-assembler", model: "code", costUsd: 0, inputTokens: 0, outputTokens: 0 },
];

export const DEMO_CAD_TOTAL_COST = DEMO_CAD_COST_RECORDS.reduce(
  (sum, r) => sum + r.costUsd,
  0,
);
