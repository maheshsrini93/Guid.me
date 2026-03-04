/**
 * Pre-cached demo data for all 8 agents.
 * Simulates a 6-step bookshelf assembly guide from a 4-page PDF.
 */

import type {
  ExtractedDocument,
  RawPageExtraction,
  ComposedGuide,
  EnforcedGuide,
  QualityReviewResult,
  SafetyReviewResult,
} from "@/types/agents";

// ============================================================
// Agent 1: Document Extractor (code)
// ============================================================

export const DEMO_EXTRACTED_DOCUMENT: ExtractedDocument = {
  filename: "BJÖRKUDDEN-bookshelf-assembly.pdf",
  format: "pdf",
  pageCount: 4,
  pages: [
    { pageNumber: 1, imagePath: "demo/page-001.png", width: 595, height: 842, mimeType: "image/png" },
    { pageNumber: 2, imagePath: "demo/page-002.png", width: 595, height: 842, mimeType: "image/png" },
    { pageNumber: 3, imagePath: "demo/page-003.png", width: 595, height: 842, mimeType: "image/png" },
    { pageNumber: 4, imagePath: "demo/page-004.png", width: 595, height: 842, mimeType: "image/png" },
  ],
  durationMs: 1200,
};

// ============================================================
// Agent 2: Vision Analyzer
// ============================================================

export const DEMO_PAGE_EXTRACTIONS: RawPageExtraction[] = [
  {
    steps: [{
      stepNumber: 0,
      rawDescription: "Parts overview page showing all components: side panels (x2), shelves (x4), back panel (x1), wooden dowels (x12), cam locks (x8), screws (x8)",
      partsShown: [
        { partNumber: "104321", partName: "Side panel", quantity: 2 },
        { partNumber: "104322", partName: "Shelf", quantity: 4 },
        { partNumber: "104323", partName: "Back panel", quantity: 1 },
        { partNumber: "100001", partName: "Wooden dowel", quantity: 12 },
        { partNumber: "100002", partName: "Cam lock", quantity: 8 },
        { partNumber: "100003", partName: "Screw", quantity: 8 },
      ],
      toolsShown: [
        { toolName: "Phillips screwdriver" },
        { toolName: "Rubber mallet" },
      ],
      actions: [],
      spatialDetails: {},
      arrows: [],
      fasteners: [],
      annotations: [],
      warnings: [],
      complexity: "simple",
      confidence: 0.95,
    }],
    pageIndicators: { arrowCount: 0, hasHingeOrRotation: false, hasFastenerAmbiguity: false, isPartsPage: true },
  },
  {
    steps: [
      {
        stepNumber: 1,
        rawDescription: "Insert wooden dowels into pre-drilled holes on the side panel. Two dowels per shelf position.",
        partsShown: [
          { partNumber: "104321", partName: "Side panel", quantity: 1 },
          { partNumber: "100001", partName: "Wooden dowel", quantity: 6 },
        ],
        toolsShown: [{ toolName: "Rubber mallet" }],
        actions: [{ actionType: "insert", subject: "wooden dowel", target: "side panel hole", direction: "push downward" }],
        spatialDetails: { orientation: "Side panel laid flat on floor" },
        arrows: [{ direction: "downward", indicatesMotion: true }],
        fasteners: [{ type: "dowel", partId: "100001", rotation: "none" }],
        annotations: ["x6"],
        warnings: [],
        complexity: "simple",
        confidence: 0.92,
      },
      {
        stepNumber: 2,
        rawDescription: "Attach shelves to side panel by aligning dowel holes and pressing down firmly.",
        partsShown: [
          { partNumber: "104322", partName: "Shelf", quantity: 4 },
        ],
        toolsShown: [],
        actions: [
          { actionType: "align", subject: "shelf", target: "dowel positions", direction: "lower onto dowels" },
          { actionType: "press", subject: "shelf", target: "side panel", direction: "downward" },
        ],
        spatialDetails: { orientation: "Side panel flat, shelves horizontal", alignmentNotes: "Align dowel holes with shelf holes" },
        arrows: [{ direction: "downward", indicatesMotion: true }],
        fasteners: [],
        annotations: [],
        warnings: [],
        complexity: "simple",
        confidence: 0.90,
      },
    ],
    pageIndicators: { arrowCount: 3, hasHingeOrRotation: false, hasFastenerAmbiguity: false, isPartsPage: false },
  },
  {
    steps: [
      {
        stepNumber: 3,
        rawDescription: "Insert wooden dowels into the second side panel and lower it onto the shelf assembly.",
        partsShown: [
          { partNumber: "104321", partName: "Side panel", quantity: 1 },
          { partNumber: "100001", partName: "Wooden dowel", quantity: 6 },
        ],
        toolsShown: [{ toolName: "Rubber mallet" }],
        actions: [
          { actionType: "insert", subject: "wooden dowel", target: "second side panel" },
          { actionType: "lower", subject: "side panel", target: "shelf assembly", direction: "downward" },
        ],
        spatialDetails: { orientation: "Assembly standing upright" },
        arrows: [{ direction: "downward", indicatesMotion: true }],
        fasteners: [{ type: "dowel", partId: "100001", rotation: "none" }],
        annotations: ["x6", "two-person icon"],
        warnings: ["Heavy — use two people"],
        complexity: "complex",
        confidence: 0.88,
      },
      {
        stepNumber: 4,
        rawDescription: "Insert cam locks into shelf edges and tighten with screwdriver to secure shelves to side panels.",
        partsShown: [
          { partNumber: "100002", partName: "Cam lock", quantity: 8 },
        ],
        toolsShown: [{ toolName: "Phillips screwdriver" }],
        actions: [
          { actionType: "insert", subject: "cam lock", target: "shelf edge hole" },
          { actionType: "tighten", subject: "cam lock", target: "shelf connection", direction: "clockwise" },
        ],
        spatialDetails: { orientation: "Assembly standing upright" },
        arrows: [{ direction: "clockwise", label: "¼ turn", indicatesMotion: true }],
        fasteners: [{ type: "cam lock", partId: "100002", rotation: "clockwise", notes: "Quarter-turn to lock" }],
        annotations: ["x8"],
        warnings: [],
        complexity: "complex",
        confidence: 0.91,
      },
    ],
    pageIndicators: { arrowCount: 4, hasHingeOrRotation: false, hasFastenerAmbiguity: false, isPartsPage: false },
  },
  {
    steps: [
      {
        stepNumber: 5,
        rawDescription: "Position back panel against the rear of the assembly, aligning with edges.",
        partsShown: [
          { partNumber: "104323", partName: "Back panel", quantity: 1 },
        ],
        toolsShown: [],
        actions: [
          { actionType: "position", subject: "back panel", target: "rear of assembly" },
          { actionType: "align", subject: "back panel edges", target: "side panel edges" },
        ],
        spatialDetails: { orientation: "Assembly face-down on floor", alignmentNotes: "Edges flush with side panels" },
        arrows: [{ direction: "downward", indicatesMotion: true }],
        fasteners: [],
        annotations: [],
        warnings: [],
        complexity: "simple",
        confidence: 0.94,
      },
      {
        stepNumber: 6,
        rawDescription: "Secure back panel with screws. Insert screws along edges every 150 mm and tighten.",
        partsShown: [
          { partNumber: "100003", partName: "Screw", quantity: 8 },
        ],
        toolsShown: [{ toolName: "Phillips screwdriver" }],
        actions: [
          { actionType: "screw", subject: "screw", target: "back panel into side panels", direction: "clockwise" },
        ],
        spatialDetails: { orientation: "Assembly face-down" },
        arrows: [{ direction: "clockwise", indicatesMotion: true }],
        fasteners: [{ type: "screw", partId: "100003", rotation: "clockwise" }],
        annotations: ["x8", "150 mm spacing"],
        warnings: ["Do not overtighten"],
        complexity: "simple",
        confidence: 0.93,
      },
    ],
    pageIndicators: { arrowCount: 3, hasHingeOrRotation: false, hasFastenerAmbiguity: false, isPartsPage: false },
  },
];

// ============================================================
// Agent 3: Instruction Composer
// ============================================================

export const DEMO_COMPOSED_GUIDE: ComposedGuide = {
  steps: [
    {
      stepNumber: 1,
      title: "Insert dowels into side panel",
      instruction: "Insert six wooden dowels (100001) into the pre-drilled holes on one side panel (104321). Use a rubber mallet to tap them flush.",
      sourcePdfPages: [2],
      parts: [
        { partNumber: "104321", partName: "Side panel", quantity: 1 },
        { partNumber: "100001", partName: "Wooden dowel", quantity: 6 },
      ],
      tools: [{ toolName: "Rubber mallet" }],
      actions: [{ actionType: "insert", subject: "wooden dowel", target: "side panel hole", direction: "push downward" }],
      spatialDetails: { orientation: "Side panel laid flat on floor" },
      arrows: [{ direction: "downward", indicatesMotion: true }],
      fasteners: [{ type: "dowel", partId: "100001", rotation: "none" }],
      warnings: [],
      complexity: "simple",
      confidence: 0.92,
    },
    {
      stepNumber: 2,
      title: "Attach shelves to first side panel",
      instruction: "Align four shelves (104322) with the dowel positions on the side panel. Press each shelf down firmly until seated.",
      sourcePdfPages: [2],
      parts: [{ partNumber: "104322", partName: "Shelf", quantity: 4 }],
      tools: [],
      actions: [
        { actionType: "align", subject: "shelf", target: "dowel positions" },
        { actionType: "press", subject: "shelf", target: "side panel", direction: "downward" },
      ],
      spatialDetails: { orientation: "Side panel flat", alignmentNotes: "Align dowel holes with shelf holes" },
      arrows: [{ direction: "downward", indicatesMotion: true }],
      fasteners: [],
      warnings: [],
      complexity: "simple",
      confidence: 0.90,
    },
    {
      stepNumber: 3,
      title: "Attach second side panel",
      instruction: "Insert six wooden dowels into the second side panel. With a helper, lower the side panel onto the shelf assembly, aligning all dowel positions.",
      sourcePdfPages: [3],
      parts: [
        { partNumber: "104321", partName: "Side panel", quantity: 1 },
        { partNumber: "100001", partName: "Wooden dowel", quantity: 6 },
      ],
      tools: [{ toolName: "Rubber mallet" }],
      actions: [
        { actionType: "insert", subject: "wooden dowel", target: "second side panel" },
        { actionType: "lower", subject: "side panel", target: "shelf assembly", direction: "downward" },
      ],
      spatialDetails: { orientation: "Assembly standing upright" },
      arrows: [{ direction: "downward", indicatesMotion: true }],
      fasteners: [{ type: "dowel", partId: "100001", rotation: "none" }],
      warnings: ["Heavy — use two people"],
      complexity: "complex",
      confidence: 0.88,
      phaseStart: "Final Assembly",
    },
    {
      stepNumber: 4,
      title: "Secure shelves with cam locks",
      instruction: "Insert eight cam locks (100002) into the shelf edge holes. Tighten each cam lock clockwise with a Phillips screwdriver until it clicks into position.",
      sourcePdfPages: [3],
      parts: [{ partNumber: "100002", partName: "Cam lock", quantity: 8 }],
      tools: [{ toolName: "Phillips screwdriver" }],
      actions: [
        { actionType: "insert", subject: "cam lock", target: "shelf edge hole" },
        { actionType: "tighten", subject: "cam lock", target: "shelf connection", direction: "clockwise" },
      ],
      spatialDetails: { orientation: "Assembly standing upright" },
      arrows: [{ direction: "clockwise", label: "¼ turn", indicatesMotion: true }],
      fasteners: [{ type: "cam lock", partId: "100002", rotation: "clockwise", notes: "Quarter-turn to lock" }],
      warnings: [],
      complexity: "complex",
      confidence: 0.91,
    },
    {
      stepNumber: 5,
      title: "Position back panel",
      instruction: "Place the back panel (104323) against the rear of the assembly. Align edges flush with the side panels.",
      sourcePdfPages: [4],
      parts: [{ partNumber: "104323", partName: "Back panel", quantity: 1 }],
      tools: [],
      actions: [
        { actionType: "position", subject: "back panel", target: "rear of assembly" },
        { actionType: "align", subject: "back panel edges", target: "side panel edges" },
      ],
      spatialDetails: { orientation: "Assembly face-down on floor", alignmentNotes: "Edges flush with side panels" },
      arrows: [{ direction: "downward", indicatesMotion: true }],
      fasteners: [],
      warnings: [],
      complexity: "simple",
      confidence: 0.94,
      phaseStart: "Back Panel Installation",
    },
    {
      stepNumber: 6,
      title: "Secure back panel with screws",
      instruction: "Screw eight screws (100003) along the back panel edges, spacing them 150 mm apart. Tighten with a Phillips screwdriver. Do not overtighten.",
      sourcePdfPages: [4],
      parts: [{ partNumber: "100003", partName: "Screw", quantity: 8 }],
      tools: [{ toolName: "Phillips screwdriver" }],
      actions: [{ actionType: "screw", subject: "screw", target: "back panel into side panels", direction: "clockwise" }],
      spatialDetails: { orientation: "Assembly face-down" },
      arrows: [{ direction: "clockwise", indicatesMotion: true }],
      fasteners: [{ type: "screw", partId: "100003", rotation: "clockwise" }],
      warnings: ["Do not overtighten"],
      complexity: "simple",
      confidence: 0.93,
    },
  ],
  partsOverview: [
    { partNumber: "104321", partName: "Side panel", quantity: 2 },
    { partNumber: "104322", partName: "Shelf", quantity: 4 },
    { partNumber: "104323", partName: "Back panel", quantity: 1 },
    { partNumber: "100001", partName: "Wooden dowel", quantity: 12 },
    { partNumber: "100002", partName: "Cam lock", quantity: 8 },
    { partNumber: "100003", partName: "Screw", quantity: 8 },
  ],
  toolsRequired: [
    { toolName: "Phillips screwdriver" },
    { toolName: "Rubber mallet" },
  ],
  phaseBoundaries: [
    { beforeStepNumber: 3, phaseName: "Final Assembly" },
    { beforeStepNumber: 5, phaseName: "Back Panel Installation" },
  ],
  metadata: {
    estimatedMinutes: 25,
    personsRequired: 2,
    skillLevel: "basic_hand_tools",
    purposeStatement: "Assemble the BJÖRKUDDEN bookshelf",
  },
};

// ============================================================
// Agent 4: Guideline Enforcer
// ============================================================

export const DEMO_ENFORCED_GUIDE: EnforcedGuide = {
  steps: [
    {
      stepNumber: 1,
      title: "Insert dowels into side panel",
      primaryVerb: "Insert",
      instruction: "Insert six wooden dowels (A) into the pre-drilled holes on one side panel (B). Tap each dowel flush with a rubber mallet.",
      parts: [
        { name: "Wooden dowel", id: "A", quantity: 6 },
        { name: "Side panel", id: "B", quantity: 1 },
      ],
      safetyCallout: null,
      twoPersonRequired: false,
      transitionNote: null,
      phaseStart: null,
      sourcePdfPages: [2],
      complexity: "simple",
      confidence: 0.92,
    },
    {
      stepNumber: 2,
      title: "Attach shelves to first side panel",
      primaryVerb: "Align",
      instruction: "Align four shelves (C) with the dowel positions on the side panel. Press each shelf down firmly until fully seated on the dowels.",
      parts: [{ name: "Shelf", id: "C", quantity: 4 }],
      safetyCallout: null,
      twoPersonRequired: false,
      transitionNote: "With dowels in place, attach the shelves.",
      phaseStart: null,
      sourcePdfPages: [2],
      complexity: "simple",
      confidence: 0.90,
    },
    {
      stepNumber: 3,
      title: "Attach second side panel",
      primaryVerb: "Insert",
      instruction: "Insert six wooden dowels (A) into the second side panel (B). Lower the side panel onto the shelf assembly. Align all dowel positions before pressing down.",
      parts: [
        { name: "Wooden dowel", id: "A", quantity: 6 },
        { name: "Side panel", id: "B", quantity: 1 },
      ],
      safetyCallout: { severity: "warning", text: "Heavy component — two people required for safe handling." },
      twoPersonRequired: true,
      transitionNote: "Proceed to the final assembly phase.",
      phaseStart: "Final Assembly",
      sourcePdfPages: [3],
      complexity: "complex",
      confidence: 0.88,
    },
    {
      stepNumber: 4,
      title: "Secure shelves with cam locks",
      primaryVerb: "Insert",
      instruction: "Insert eight cam locks (D) into the shelf edge holes. Tighten each cam lock clockwise with a Phillips screwdriver. Turn one quarter-turn until it clicks.",
      parts: [{ name: "Cam lock", id: "D", quantity: 8 }],
      safetyCallout: null,
      twoPersonRequired: false,
      transitionNote: "With the frame assembled, lock the shelves in place.",
      phaseStart: null,
      sourcePdfPages: [3],
      complexity: "complex",
      confidence: 0.91,
    },
    {
      stepNumber: 5,
      title: "Position back panel",
      primaryVerb: "Place",
      instruction: "Place the back panel (E) against the rear of the bookshelf. Align the panel edges flush with the side panels on all sides.",
      parts: [{ name: "Back panel", id: "E", quantity: 1 }],
      safetyCallout: null,
      twoPersonRequired: false,
      transitionNote: "Turn the assembly face-down for back panel installation.",
      phaseStart: "Back Panel Installation",
      sourcePdfPages: [4],
      complexity: "simple",
      confidence: 0.94,
    },
    {
      stepNumber: 6,
      title: "Secure back panel with screws",
      primaryVerb: "Screw",
      instruction: "Screw eight screws (F) along the back panel edges at 150 mm spacing. Tighten with a Phillips screwdriver. Do not overtighten to avoid stripping.",
      parts: [{ name: "Screw", id: "F", quantity: 8 }],
      safetyCallout: { severity: "caution", text: "Do not overtighten screws to avoid stripping the particle board." },
      twoPersonRequired: false,
      transitionNote: null,
      phaseStart: null,
      sourcePdfPages: [4],
      complexity: "simple",
      confidence: 0.93,
    },
  ],
  guideMetadata: {
    safetyLevel: "medium",
    estimatedMinutes: 25,
    personsRequired: 2,
    skillLevel: "basic_hand_tools",
    purposeStatement: "Assemble the BJÖRKUDDEN bookshelf",
  },
};

// ============================================================
// Agent 5: Quality Reviewer
// ============================================================

export const DEMO_QUALITY_REVIEW: QualityReviewResult = {
  overallScore: 91,
  decision: "approved",
  issues: [
    {
      severity: "info",
      category: "readability",
      stepNumber: 4,
      description: "Step 4 contains two sub-actions (insert + tighten) that could be split for clarity.",
      responsibleAgent: "enforcer",
      suggestedFix: "Consider splitting into two steps for very novice users.",
    },
    {
      severity: "info",
      category: "terminology",
      stepNumber: 6,
      description: "Term 'stripping' may not be familiar to all users.",
      responsibleAgent: "enforcer",
      suggestedFix: "Use simpler phrasing like 'damaging the material'.",
    },
  ],
  summary: "Guide meets quality standards. All 6 steps use approved verbs, verb-first structure, and proper part references. Minor readability suggestions noted.",
};

// ============================================================
// Agent 6: Safety Reviewer
// ============================================================

export const DEMO_SAFETY_REVIEW: SafetyReviewResult = {
  safetyPassed: true,
  issues: [
    {
      severity: "warning",
      stepNumber: 3,
      hazardType: "heavy_lift",
      description: "Side panel requires two-person lift. Warning callout is present.",
      requiredAction: "Verified: two-person warning exists in step 3.",
    },
    {
      severity: "warning",
      stepNumber: null,
      hazardType: "tip_over_risk",
      description: "Assembled bookshelf should be wall-anchored to prevent tip-over.",
      requiredAction: "Add wall-anchoring recommendation to final instructions.",
    },
  ],
  recommendedSafetyLevel: "medium",
};

// ============================================================
// Demo XML Output (pre-built)
// ============================================================

export const DEMO_XML_CONTENT = `<?xml version="1.0" encoding="UTF-8"?>
<work-instruction xmlns="urn:guid:work-instruction:1.0">
  <metadata>
    <title>Assemble the BJÖRKUDDEN bookshelf</title>
    <domain>consumer</domain>
    <safety-level>medium</safety-level>
    <estimated-minutes>25</estimated-minutes>
    <persons-required>2</persons-required>
    <skill-level>basic_hand_tools</skill-level>
    <purpose>Assemble the BJÖRKUDDEN bookshelf</purpose>
    <source-document>
      <filename>BJÖRKUDDEN-bookshelf-assembly.pdf</filename>
      <format>pdf</format>
      <page-count>4</page-count>
    </source-document>
  </metadata>
  <parts-list>
    <part id="A" name="Wooden dowel" quantity="12" />
    <part id="B" name="Side panel" quantity="2" />
    <part id="C" name="Shelf" quantity="4" />
    <part id="D" name="Cam lock" quantity="8" />
    <part id="E" name="Back panel" quantity="1" />
    <part id="F" name="Screw" quantity="8" />
  </parts-list>
  <tools-required>
    <tool category="required">Phillips screwdriver</tool>
    <tool category="required">Rubber mallet</tool>
  </tools-required>
  <safety-warnings>
    <warning severity="warning">Heavy component — two people required for safe handling.</warning>
    <warning severity="caution">Do not overtighten screws to avoid stripping the particle board.</warning>
  </safety-warnings>
  <phases>
    <phase name="Assembly">
      <step number="1">
        <title>Insert dowels into side panel</title>
        <instruction>Insert six wooden dowels (A) into the pre-drilled holes on one side panel (B). Tap each dowel flush with a rubber mallet.</instruction>
        <parts>
          <part-ref id="A" quantity="6" />
          <part-ref id="B" quantity="1" />
        </parts>
        <complexity>simple</complexity>
        <confidence>0.92</confidence>
        <source-pages>2</source-pages>
      </step>
      <step number="2">
        <title>Attach shelves to first side panel</title>
        <instruction>Align four shelves (C) with the dowel positions on the side panel. Press each shelf down firmly until fully seated on the dowels.</instruction>
        <parts>
          <part-ref id="C" quantity="4" />
        </parts>
        <complexity>simple</complexity>
        <confidence>0.9</confidence>
        <source-pages>2</source-pages>
      </step>
    </phase>
    <phase name="Final Assembly">
      <step number="3">
        <title>Attach second side panel</title>
        <instruction>Insert six wooden dowels (A) into the second side panel (B). Lower the side panel onto the shelf assembly. Align all dowel positions before pressing down.</instruction>
        <parts>
          <part-ref id="A" quantity="6" />
          <part-ref id="B" quantity="1" />
        </parts>
        <safety>
          <warning severity="warning">Heavy component — two people required for safe handling.</warning>
        </safety>
        <two-person-required>true</two-person-required>
        <complexity>complex</complexity>
        <confidence>0.88</confidence>
        <source-pages>3</source-pages>
      </step>
      <step number="4">
        <title>Secure shelves with cam locks</title>
        <instruction>Insert eight cam locks (D) into the shelf edge holes. Tighten each cam lock clockwise with a Phillips screwdriver. Turn one quarter-turn until it clicks.</instruction>
        <parts>
          <part-ref id="D" quantity="8" />
        </parts>
        <complexity>complex</complexity>
        <confidence>0.91</confidence>
        <source-pages>3</source-pages>
      </step>
    </phase>
    <phase name="Back Panel Installation">
      <step number="5">
        <title>Position back panel</title>
        <instruction>Place the back panel (E) against the rear of the bookshelf. Align the panel edges flush with the side panels on all sides.</instruction>
        <parts>
          <part-ref id="E" quantity="1" />
        </parts>
        <complexity>simple</complexity>
        <confidence>0.94</confidence>
        <source-pages>4</source-pages>
      </step>
      <step number="6">
        <title>Secure back panel with screws</title>
        <instruction>Screw eight screws (F) along the back panel edges at 150 mm spacing. Tighten with a Phillips screwdriver. Do not overtighten to avoid stripping.</instruction>
        <parts>
          <part-ref id="F" quantity="8" />
        </parts>
        <safety>
          <warning severity="caution">Do not overtighten screws to avoid stripping the particle board.</warning>
        </safety>
        <complexity>simple</complexity>
        <confidence>0.93</confidence>
        <source-pages>4</source-pages>
      </step>
    </phase>
  </phases>
  <generation-metadata>
    <job-id>demo</job-id>
    <generated-at>2026-03-04T12:00:00.000Z</generated-at>
    <quality-score>91</quality-score>
    <quality-decision>approved</quality-decision>
    <total-cost>0.930000</total-cost>
    <processing-time-ms>45000</processing-time-ms>
    <text-revision-loops>0</text-revision-loops>
    <models-used>
      <model>gemini-2.5-flash</model>
      <model>gemini-2.5-pro</model>
    </models-used>
  </generation-metadata>
</work-instruction>`;

// ============================================================
// Per-agent cost records for demo
// ============================================================

export const DEMO_COST_RECORDS = [
  { agent: "document-extractor", model: "code", costUsd: 0, inputTokens: 0, outputTokens: 0 },
  { agent: "vision-analyzer", model: "gemini-2.5-flash", costUsd: 0.06, inputTokens: 28000, outputTokens: 4200 },
  { agent: "instruction-composer", model: "gemini-2.5-flash", costUsd: 0.02, inputTokens: 8500, outputTokens: 3100 },
  { agent: "guideline-enforcer", model: "gemini-2.5-flash", costUsd: 0.03, inputTokens: 12000, outputTokens: 4800 },
  { agent: "quality-reviewer", model: "gemini-2.5-pro", costUsd: 0.08, inputTokens: 9200, outputTokens: 2100 },
  { agent: "safety-reviewer", model: "gemini-2.5-pro", costUsd: 0.04, inputTokens: 6800, outputTokens: 1500 },
  { agent: "illustration-generator", model: "gemini-2.5-flash-preview-image-generation", costUsd: 0.24, inputTokens: 0, outputTokens: 0 },
  { agent: "xml-assembler", model: "code", costUsd: 0, inputTokens: 0, outputTokens: 0 },
];

export const DEMO_TOTAL_COST = DEMO_COST_RECORDS.reduce((sum, c) => sum + c.costUsd, 0);
