# Product Requirements Document: Instructo

> **Version:** 1.0.0
> **Date:** 2026-02-18
> **Status:** Draft

| Field | Value |
|-------|-------|
| **Product** | Instructo |
| **npm Scope** | `@instructo/*` |
| **API Key Prefix** | `inst_sk_live_<32 hex>` |
| **Repository** | `/Users/hashincloud/instructo/` |

---

## Table of Contents

1. [Product Vision & Scope](#1-product-vision--scope)
2. [User Personas](#2-user-personas)
3. [Core Pipeline Architecture](#3-core-pipeline-architecture)
4. [API Design](#4-api-design)
5. [MCP Server Design](#5-mcp-server-design)
6. [SKILL.md Design](#6-skillmd-design)
7. [Input/Output Contracts](#7-inputoutput-contracts)
8. [Quality System](#8-quality-system)
9. [Infrastructure Reuse Map](#9-infrastructure-reuse-map)
10. [Cost Model](#10-cost-model)
11. [Tech Stack](#11-tech-stack)
12. [Implementation Phases](#12-implementation-phases)
13. [Success Criteria](#13-success-criteria)
14. [Non-Goals (v1)](#14-non-goals-v1)
15. [Future Roadmap (post-v1)](#15-future-roadmap-post-v1)

---

## 1. Product Vision & Scope

### One-Liner

**PDF in, structured work instructions + illustrations out.**

### Problem

Instructional PDFs -- assembly manuals, installation guides, maintenance procedures, equipment setup documents -- are the universal format for conveying "how to build, install, or fix something." But they are trapped in a format that is:

- **Unsearchable** -- no structured data, no per-step indexing
- **Unintegrable** -- cannot be consumed by apps, agents, or APIs
- **Unillustrated** (or poorly illustrated) -- diagrams are often ambiguous, inconsistent, or missing entirely
- **Unvalidated** -- no quality feedback loop ensures clarity, safety, or completeness

This problem spans every industry that ships products with manuals: furniture, electronics, industrial equipment, medical devices, consumer appliances, educational lab procedures, automotive aftermarket, and field service operations.

### What is Instructo?

Instructo is a **standalone, domain-agnostic microservice** that transforms instructional PDFs into:

1. **Structured work instructions** -- machine-readable, human-friendly JSON with per-step parts, tools, callouts, safety warnings, confidence scores, and metadata
2. **Assembly diagram illustrations** -- AI-generated isometric technical illustrations that match the instructions, with consistent labeling, color coding, and viewing angles across all steps

It exposes this capability through:
- A **REST API** for async and sync generation
- An **MCP server** for AI agent integration (Claude Code, Cursor, Copilot, custom agents)
- An **optional CLI** for local development workflows
- A **SKILL.md** for agent discovery

### Key Differentiator

Instructo is not a single-prompt generator. It is a **multi-agent pipeline with compliance-by-construction** -- 11 specialized agents where each has one clear responsibility, narrow guardrails, and measurable output quality. A deterministic orchestrator state machine coordinates the agents, enforces quality feedback loops, and tracks costs. This architecture produces consistent, verifiable output that single-prompt approaches cannot achieve.

### Scope Boundaries

| In Scope (v1) | Out of Scope (v1) |
|---|---|
| Transform instructional PDFs into structured work instructions | Web UI for guide browsing or editing |
| Generate assembly diagram illustrations from approved text | Product catalog or database |
| REST API with async and sync generation modes | User accounts or subscription management |
| MCP server for AI agent integration | Troubleshooting chatbot |
| CLI for local generation | Multi-language output |
| Custom guideline YAML override per request | Flowchart/process diagram generation |
| Quality scoring and feedback loops | A2A protocol (designed compatible, adopt later) |
| Docker deployment | Hosted SaaS platform |
| Domain-agnostic (furniture, electronics, industrial, etc.) | Domain-specific product knowledge |

### Origin

Instructo extracts and generalizes the AI guide generation pipeline built for [Guid.me](https://guid.how) (Phase 1), an IKEA-focused product guide platform. The Guid.me pipeline was designed for furniture assembly PDFs specifically; Instructo makes the same multi-agent architecture work for any instructional PDF, in any domain, from any source.

---

## 2. User Personas

### Persona 1: Developer Integrators

**Who:** Software engineers building applications on top of structured work instructions.

**Industries:** Home improvement apps, field service platforms, e-learning systems, equipment maintenance software, consumer product guides, technical documentation portals.

**How they use Instructo:**
- Call `POST /v1/generate` with a PDF URL from their application
- Poll for completion via `GET /v1/jobs/:jobId` or register a webhook
- Consume the structured JSON response to render guides in their own UI
- Use custom guideline YAML to enforce their brand's writing standards

**What they care about:**
- Clean, well-documented API with predictable response shapes
- Reliable async processing with clear status and progress reporting
- Cost transparency (per-generation pricing, no surprises)
- Structured output that maps directly to their data models without transformation
- SDK and client library availability

**Example scenario:** A field service platform integrates Instructo to automatically process equipment installation manuals from multiple manufacturers. When a new product is onboarded, the technician uploads the PDF, Instructo generates structured step-by-step instructions, and the mobile app renders them with parts checklists, safety callouts, and the generated illustrations -- all without manual transcription.

### Persona 2: AI Agent Systems

**Who:** Autonomous AI agents that discover tools via SKILL.md, integrate via MCP, and call programmatically.

**Agents:** Claude Code, Cursor, GitHub Copilot Workspace, custom LangChain/LangGraph pipelines, enterprise automation agents.

**How they use Instructo:**
- Discover Instructo through SKILL.md on skills.sh or agent directories
- Install the MCP server with a single command: `claude mcp add instructo -- npx @instructo/mcp-server`
- Call `instructo_generate_sync` for small PDFs or `instructo_generate` + `instructo_check_status` for larger ones
- Embed structured guide content in their responses to users
- Reason about the structured output (parts lists, safety requirements, time estimates) to answer follow-up questions

**What they care about:**
- Zero-friction installation (one `npx` command, one environment variable)
- Clear tool descriptions so the agent knows when and how to use Instructo
- Structured JSON output that agents can parse and reason about
- Response formatting tips in SKILL.md so agents present guides well to humans

**Example scenario:** A user tells Claude Code: "Generate assembly instructions from this IKEA manual PDF." Claude discovers Instructo via SKILL.md, calls `instructo_generate_sync` with the PDF URL, and presents the structured guide with step-by-step instructions, a parts checklist, and safety warnings -- all formatted for the conversation context.

### Persona 3: Enterprise Platform Teams

**Who:** Engineering and operations teams at furniture retailers, equipment manufacturers, or SaaS platforms that need to process hundreds or thousands of instructional PDFs.

**How they use Instructo:**
- Deploy Instructo as a Docker container within their infrastructure (data stays in-house)
- Submit bulk generation jobs via the API
- Configure custom guidelines YAML to enforce their content standards, brand voice, and regulatory requirements
- Monitor quality scores and costs via the health and job endpoints
- Set up webhooks for pipeline completion notifications
- Integrate with their CI/CD pipeline to auto-generate guides when new product documentation is published

**What they care about:**
- Self-hostable with Docker (no data leaves their infrastructure)
- Bulk throughput (hundreds of PDFs per day)
- Quality gates that prevent low-quality output from reaching production
- Cost predictability and per-generation cost tracking
- Customizable guidelines that enforce brand voice, safety standards, and regulatory compliance
- Webhook notifications for integration with existing workflows
- SLA guarantees for uptime and processing time

**Example scenario:** An office furniture manufacturer processes their entire catalog of 500 installation manuals through a self-hosted Instructo deployment. They configure custom guidelines that match their brand voice ("Connect" instead of "Attach", mandatory sterilization checks for healthcare product lines), set an auto-approve threshold at 85% confidence, and pipe approved guides directly into their customer support portal via webhook.

---

## 3. Core Pipeline Architecture

The pipeline is the heart of Instructo. It consists of two sequential stages: the **Text Pipeline** (7 agents) produces approved structured work instructions, and the **Illustration Pipeline** (4 agents) generates assembly diagrams after the text is approved.

### Pipeline Overview

```
[Instructional PDF]
    |
    v
+======================== TEXT PIPELINE (7 Agents) ============================+
|                                                                              |
|  +----------------+    +------------------+    +--------------------+         |
|  |    VISION      |    |    SEQUENCE      |    |    GUIDELINE       |         |
|  |   EXTRACTOR    |--->|    COMPOSER      |--->|    ENFORCER        |         |
|  | (Flash -> Pro) |    |  (Flash, text)   |    |  (Flash + YAML)   |         |
|  +----------------+    +------------------+    +--------------------+         |
|   [1] per-page,                                        |                     |
|   parallel                                             v                     |
|                                                +----------------+            |
|                                                |     EDITOR     |            |
|                                                |  (Flash, text) |            |
|                                                +-------+--------+            |
|                                                        |                     |
|                                           +------------+------------+        |
|                                           v                         v        |
|                                  +-----------------+    +-----------------+  |
|                                  |    QUALITY      |    |    SAFETY       |  |
|                                  |    REVIEWER     |    |    REVIEWER     |  |
|                                  |   (Pro model)   |    |   (Pro model)   |  |
|                                  +--------+--------+    +--------+--------+  |
|                                           |                      |           |
|                                           +----------+-----------+           |
|                                                      |                       |
|                                              [Text Approved?]                |
|                                               /           \                  |
|                                           Yes              No (max 2x)      |
|                                            |                \                |
|                                            |     Route feedback to           |
|                                            |     responsible agent           |
|                                            |     (Enforcer or Editor)        |
|                                            v                                 |
|                                                                              |
|  +-----------------------------------------------------------------------+   |
|  |  ORCHESTRATOR [7] (Deterministic TypeScript State Machine)             |   |
|  |  - Routes data between agents           - Enforces loop limits        |   |
|  |  - Tracks per-agent costs               - Manages state transitions   |   |
|  |  - Handles escalations                  - Emits progress events       |   |
|  +-----------------------------------------------------------------------+   |
|                                                                              |
+==============================================================================+
    |
    v  (Text approved)
+===================== ILLUSTRATION PIPELINE (4 Agents) =======================+
|                                                                              |
|  +-------------------+    +------------------+                               |
|  |   ILLUSTRATION    |    |  PROMPT BUILDER  |                               |
|  |     PLANNER       |--->| (Deterministic   |                               |
|  |  [8] (Flash, 1x)  |    |  TypeScript) [9] |                               |
|  +-------------------+    +--------+---------+                               |
|                                    |                                         |
|                         +----------+-----------+                             |
|                         v                      v                             |
|               +------------------+    +------------------+                   |
|               |     IMAGE        |    |    VISUAL QA     |                   |
|               |   GENERATOR      |--->|  (Flash vision)  |                   |
|               |  [10] (NB/NBP)   |    |      [11]        |                   |
|               +------------------+    +--------+---------+                   |
|                        ^               Pass?   |                             |
|                        |               /    \  |                             |
|                        |           Yes      No (max 2x per step)            |
|                        |            |        \                               |
|                        +------------+   Append correction prompt             |
|                                                                              |
+==============================================================================+
    |
    v
[Complete Guide: Structured Text + Illustrations]
```

### Agent 1: Vision Extractor

**Purpose:** Examine each PDF page and output structured JSON describing raw visual facts -- parts, actions, arrows, spatial relationships, fasteners, and confidence. This agent sees the image; it does NOT interpret, narrate, or write instructions.

**Model:** Gemini 2.5 Flash (default), escalates to Gemini 2.5 Pro on triggers.

**Execution:** Parallel per-page (rate-limit permitting). Each page is an independent call.

**Escalation triggers (Flash to Pro):**
- 5+ arrows/overlays in one panel
- Hinge, drawer-slide, or rotation mechanics depicted
- Fastener ambiguity (e.g., Torx vs. Phillips, "tight vs. loose" indicators)
- Flash self-reported confidence < 0.7
- Flash fails to produce valid JSON
- Flash output disagrees with rule-checker

**Input schema:**

```typescript
interface VisionExtractorInput {
  pageImage: Buffer;               // High-resolution rendered page
  mimeType: "image/png" | "image/jpeg";
  pageNumber: number;
  totalPages: number;
  guidelines?: string;             // Condensed MUST rules for vision pass
}
```

**Output schema:**

```typescript
interface RawPageExtraction {
  steps: RawStepExtraction[];
  pageIndicators: {
    arrowCount: number;
    hasHingeOrRotation: boolean;
    hasFastenerAmbiguity: boolean;
    isPartsPage: boolean;
  };
}

interface RawStepExtraction {
  stepNumber: number;              // 0 for parts/tools overview pages
  rawDescription: string;          // Factual observation, NOT narrative prose
  partsShown: PartReference[];
  toolsShown: ToolReference[];
  actions: VisualAction[];
  spatialDetails: {
    orientation?: string;          // "Product laid on side, back facing up"
    alignmentNotes?: string;       // "Holes in panel A align with panel B edge"
  };
  arrows: ArrowAnnotation[];
  fasteners: FastenerDetail[];
  annotations: string[];           // "x4", "click sound icon", "two-person icon"
  warnings: string[];              // Safety/caution icons or text observed
  complexity: "simple" | "complex";
  confidence: number;              // 0.0 to 1.0
}

interface PartReference {
  partNumber: string;              // e.g., "104321" or "A"
  partName: string;                // e.g., "Wooden dowel"
  quantity: number;
}

interface ToolReference {
  toolName: string;                // e.g., "Phillips screwdriver"
  toolIcon?: string;               // Optional icon identifier
}

interface VisualAction {
  actionType: string;              // "insert", "attach", "rotate", "tighten"
  subject: string;                 // What is being acted on
  target: string;                  // Where it goes
  direction?: string;              // "push downward", "slide left-to-right"
}

interface ArrowAnnotation {
  direction: string;               // "downward", "clockwise"
  label?: string;                  // Text label near the arrow
  indicatesMotion: boolean;        // true = assembly motion, false = callout pointer
}

interface FastenerDetail {
  type: string;                    // "cam lock", "screw", "bolt", "dowel"
  partId?: string;
  rotation: "clockwise" | "counter_clockwise" | "none";
  notes?: string;                  // "quarter-turn to lock"
}
```

**Guardrails:**
- MUST NOT interpret or write human-readable instructions -- raw visual facts only
- MUST NOT reference information from other pages
- MUST report confidence honestly (< 0.7 triggers escalation)
- MUST flag ambiguous mechanisms explicitly in annotations

---

### Agent 2: Sequence Composer

**Purpose:** Take all Vision Extractor outputs (the full set of per-page extractions) and produce a single ordered step sequence with titles, parts, tools, transitions, and phase breaks. Merges multi-page steps. Detects and consolidates the parts overview page.

**Model:** Gemini 2.5 Flash (text-only, no vision input).

**Execution:** Single call per guide. Receives the complete set of page extractions.

**Input schema:**

```typescript
interface SequenceComposerInput {
  pageExtractions: RawPageExtraction[];  // All pages, in order
  documentMetadata?: {
    title?: string;
    pageCount: number;
    domain?: string;                     // "furniture", "electronics", etc.
  };
}
```

**Output schema:**

```typescript
interface StepSequence {
  steps: ComposedStep[];
  partsOverview: PartReference[];        // Consolidated from parts pages
  toolsRequired: ToolReference[];        // All tools across all steps
  phaseBoundaries: PhaseBoundary[];
}

interface ComposedStep {
  stepNumber: number;                    // Renumbered sequentially from 1
  title: string;                         // Short descriptive title
  sourcePdfPages: number[];              // Which PDF pages this step spans
  parts: PartReference[];
  tools: ToolReference[];
  actions: VisualAction[];
  spatialDetails: {
    orientation?: string;
    alignmentNotes?: string;
  };
  arrows: ArrowAnnotation[];
  fasteners: FastenerDetail[];
  warnings: string[];
  complexity: "simple" | "complex";
  confidence: number;
  transitionNote?: string;               // "With the frame assembled, add shelves"
}

interface PhaseBoundary {
  beforeStepNumber: number;
  phaseName: string;                     // "Frame Assembly", "Wiring", etc.
}
```

**Guardrails:**
- MUST NOT apply formatting rules or guideline compliance -- that is the Enforcer's job
- MUST merge steps that span multiple PDF pages into a single coherent step
- MUST renumber steps sequentially (no gaps)
- MUST preserve all raw visual data (actions, arrows, fasteners) through the merge

---

### Agent 3: Guideline Enforcer

**Purpose:** Receive the step sequence and the **full** guidelines YAML document. Apply all requirements to transform raw step data into guideline-compliant structured work instructions. This agent is the primary compliance mechanism.

**Model:** Gemini 2.5 Flash (text-only).

**Execution:** Single call per guide. Receives the full step sequence and full guidelines YAML (no truncation).

**Input schema:**

```typescript
interface GuidelineEnforcerInput {
  stepSequence: StepSequence;
  guidelinesYaml: string;           // Full YAML document, untruncated
  customOverrides?: string;         // Per-request custom guidelines YAML
}
```

**Output schema:**

```typescript
interface EnforcedGuide {
  steps: EnforcedStep[];
  guideMetadata: GuideMetadata;
}

interface EnforcedStep {
  stepNumber: number;
  title: string;
  primaryVerb: AllowedVerb;         // One of 16 approved imperative verbs
  instruction: string;              // Verb-first, <=20 words/sentence
  parts: StructuredPartRef[];       // name + id + quantity
  safetyCallout: SafetyCallout | null;
  twoPersonRequired: boolean;
  transitionNote: string | null;
  phaseStart: string | null;
  sourcePdfPages: number[];
  complexity: "simple" | "complex";
  confidence: number;
}

/** The 16 default imperative verbs (customizable via guidelines YAML) */
type AllowedVerb =
  | "Insert" | "Attach" | "Tighten" | "Slide" | "Place" | "Align"
  | "Press" | "Push" | "Lower" | "Lift" | "Flip" | "Screw"
  | "Snap" | "Hook" | "Position" | "Secure";

interface StructuredPartRef {
  name: string;                     // "Wooden dowel"
  id: string;                       // "A" or "104321"
  quantity: number;
}

interface SafetyCallout {
  severity: "caution" | "warning" | "danger";
  text: string;
}

interface GuideMetadata {
  safetyLevel: "low" | "medium" | "high";
  estimatedMinutes: number;
  personsRequired: number;
  skillLevel: "none" | "basic_hand_tools" | "power_tools_recommended";
  purposeStatement: string;
}
```

**Guardrails:**
- MUST use only approved imperative verbs for step instructions (default set of 16; overridable via custom guidelines)
- MUST include part ID references in parentheses: "wooden dowel (A)"
- MUST include quantities when > 1: "4 wooden dowels (A)"
- MUST keep sentences to 20 words or fewer
- MUST use active voice (no passive constructions)
- MUST include safety callouts before hazardous steps
- MUST flag two-person steps explicitly
- Receives full guidelines YAML -- NO character budget truncation

---

### Agent 4: Editor

**Purpose:** Polish the enforced guide for readability, tone consistency, and flow. The Editor smooths transitions between steps, ensures consistent terminology, and makes instructions feel natural rather than robotic -- without violating any guideline rules.

**Model:** Gemini 2.5 Flash (text-only).

**Execution:** Single call per guide.

**Input schema:**

```typescript
interface EditorInput {
  enforcedGuide: EnforcedGuide;
  tone?: "professional" | "friendly" | "minimal";  // Default: "professional"
}
```

**Output schema:** Same shape as `EnforcedGuide` with polished instruction text. All structural fields (step count, order, parts, tools, callouts) are preserved exactly.

**Guardrails:**
- MUST NOT change step structure (count, order, boundaries)
- MUST NOT remove safety callouts
- MUST NOT alter part IDs, quantities, or tool references
- MUST NOT introduce passive voice
- MUST NOT exceed 20-word sentence limit
- MUST preserve the primary verb at the start of each instruction

---

### Agent 5: Quality Reviewer

**Purpose:** Score the complete guide against quality criteria. Return structured issues with the responsible agent tagged so the Orchestrator can route feedback to the correct upstream agent for revision.

**Model:** Gemini 2.5 Pro (higher accuracy for evaluation tasks).

**Execution:** Single call per guide. Runs in **parallel** with Safety Reviewer.

**Input schema:**

```typescript
interface QualityReviewerInput {
  editedGuide: EnforcedGuide;            // After Editor pass
  originalExtractions: RawPageExtraction[];  // For cross-verification
  guidelines: string;                     // Full YAML for scoring reference
}
```

**Output schema:**

```typescript
interface QualityReviewResult {
  overallScore: number;                      // 0-100
  decision: "approved" | "revise" | "hold";  // >= 90, 70-89, < 70
  issues: QualityIssue[];
  summary: string;                           // Human-readable summary
}

interface QualityIssue {
  severity: "error" | "warning" | "info";
  category: QualityCategory;
  stepNumber?: number;                       // null = guide-level
  description: string;
  responsibleAgent: "enforcer" | "editor";   // Who should fix this
  suggestedFix?: string;
}

type QualityCategory =
  | "verb_syntax"        // Instruction doesn't start with approved verb
  | "sentence_length"    // Sentence exceeds 20 words
  | "part_reference"     // Part referenced without ID
  | "missing_quantity"   // Quantity not specified
  | "passive_voice"      // Passive construction detected
  | "terminology"        // Inconsistent part naming across steps
  | "safety_missing"     // Safety callout absent for hazardous step
  | "sequence_logic"     // Steps don't follow logical order
  | "completeness"       // Missing steps or parts vs. source PDF
  | "readability"        // Instruction is confusing or ambiguous
  | "metadata"           // Missing or invalid guide metadata
  | "cross_reference";   // Instruction contradicts source extraction data
```

**Guardrails:**
- MUST compare edited guide against original vision extractions (catch hallucinations)
- MUST tag each issue with `responsibleAgent` (Enforcer vs. Editor) for feedback routing
- MUST score using consistent criteria across all guides
- Decision thresholds: `approved` (>= 90), `revise` (70-89), `hold` (< 70)

---

### Agent 6: Safety Reviewer

**Purpose:** Dedicated safety review pass. Checks for hazard verification independent of the Quality Reviewer. Safety is important enough to warrant its own dedicated agent and model call.

**Model:** Gemini 2.5 Pro (safety-critical evaluation).

**Execution:** Single call per guide. Runs in **parallel** with Quality Reviewer.

**Input schema:**

```typescript
interface SafetyReviewerInput {
  editedGuide: EnforcedGuide;
  originalExtractions: RawPageExtraction[];
}
```

**Output schema:**

```typescript
interface SafetyReviewResult {
  safetyPassed: boolean;
  issues: SafetyIssue[];
  recommendedSafetyLevel: "low" | "medium" | "high";
}

interface SafetyIssue {
  severity: "warning" | "critical";
  stepNumber?: number;               // null = guide-level
  hazardType: HazardType;
  description: string;
  requiredAction: string;            // What callout or change is needed
}

type HazardType =
  | "heavy_lift"                     // Component > 15 kg
  | "sharp_edge"                     // Cutting risk
  | "tip_over_risk"                  // Furniture > 60 cm tall
  | "pinch_point"                    // Finger/hand trap risk
  | "wall_anchoring"                 // Requires wall anchor
  | "two_person_required"            // Step needs helper
  | "electrical"                     // Electrical connections
  | "chemical"                       // Adhesives, solvents
  | "fall_risk"                      // Working at height
  | "tool_safety";                   // Power tool usage
```

**Guardrails:**
- MUST check all standard hazard categories regardless of domain
- MUST flag heavy lifts (> 15 kg), tip-over risk (> 60 cm), sharp edges, pinch points
- MUST verify two-person steps have explicit callouts
- MUST verify wall anchoring advisory for tall/heavy products
- MUST verify warnings appear before (not after) hazardous instructions

---

### Agent 7: Orchestrator

**Purpose:** Deterministic state machine that coordinates all agents. The Orchestrator is NOT an LLM -- it is pure TypeScript logic that routes data between agents, tracks costs, enforces loop limits, manages state transitions, and emits progress events.

**Model:** None (pure TypeScript).

**State machine diagram:**

```
                    +------------------+
                    |    PENDING       |
                    +--------+---------+
                             |
                    PDF received, pages extracted via pdftoppm
                             |
                             v
                    +------------------+
                    |   EXTRACTING     |  Vision Extractor [1] (parallel per page)
                    +--------+---------+
                             |
                    All pages extracted
                             |
                             v
                    +------------------+
                    |   COMPOSING      |  Sequence Composer [2]
                    +--------+---------+
                             |
                             v
                    +------------------+
                    |   ENFORCING      |  Guideline Enforcer [3]
                    +--------+---------+
                             |
                             v
                    +------------------+
                    |    EDITING       |  Editor [4]
                    +--------+---------+
                             |
                             v
                    +------------------+
                    |   REVIEWING      |  Quality [5] + Safety [6] (parallel)
                    +--------+---------+
                             |
                    +--------+---------+
                    |                  |
              Score >= 90        Score 70-89
                    |            AND loops < 2
                    |                  |
                    v                  v
           +----------------+  +------------------+
           | TEXT_APPROVED   |  |   REVISING       |  Route to responsible agent
           +-------+--------+  +--------+---------+
                   |                     |
                   |              Re-enter at ENFORCING or EDITING
                   |              (based on issue.responsibleAgent)
                   |
                   v
           +------------------+
           |  ILLUSTRATING    |  Illustration Pipeline [8-11]
           +--------+---------+
                    |
                    v
           +------------------+
           |   COMPLETED      |  Full guide ready
           +------------------+

  Score < 70 OR loops exhausted:
           +------------------+
           |   COMPLETED      |  With qualityDecision = "hold"
           |   (needs review) |  Full feedback history included
           +------------------+

  Error at any stage:
           +------------------+
           |     FAILED       |  With error details + partial results
           +------------------+

  External cancellation:
           +------------------+
           |   CANCELLED      |
           +------------------+
```

**Orchestrator state type:**

```typescript
interface PipelineState {
  jobId: string;
  status: PipelineStatus;

  // Input
  pdfUrl: string;
  pdfPages: ExtractedPdfPage[];

  // Agent outputs (populated as pipeline progresses)
  pageExtractions?: RawPageExtraction[];
  stepSequence?: StepSequence;
  enforcedGuide?: EnforcedGuide;
  editedGuide?: EnforcedGuide;
  qualityReview?: QualityReviewResult;
  safetyReview?: SafetyReviewResult;
  illustrationPlan?: IllustrationPlan;
  illustrations?: Map<number, IllustrationResult>;

  // Loop tracking
  textRevisionCount: number;              // Max 2
  illustrationRetries: Map<number, number>;  // Per step, max 2 each

  // Cost tracking
  costs: AgentCostRecord[];
  totalCostUsd: number;

  // Timing
  startedAt: Date;
  completedAt?: Date;
  lastProgressAt: Date;

  // Error
  error?: string;
}

type PipelineStatus =
  | "pending"
  | "extracting"
  | "composing"
  | "enforcing"
  | "editing"
  | "reviewing"
  | "revising"
  | "text_approved"
  | "illustrating"
  | "completed"
  | "failed"
  | "cancelled";

interface AgentCostRecord {
  agent: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  timestamp: Date;
}
```

**Orchestrator responsibilities:**
1. Route data between agents in the correct sequence
2. Execute Quality Reviewer and Safety Reviewer in parallel (both must complete before proceeding)
3. Route revision feedback to the responsible agent (Enforcer or Editor) based on `issue.responsibleAgent`
4. Enforce max 2 text revision loops; after limit, complete with `qualityDecision: "hold"`
5. Enforce max 2 illustration retries per step; flag persistent failures without blocking other steps
6. Track per-agent costs in real time
7. Emit progress events for status polling (current agent, steps completed, etc.)
8. Handle cancellation at any stage (graceful teardown)
9. Handle individual agent failures (retry once, then fail the job with partial results)

---

### Agent 8: Illustration Planner

**Purpose:** Create a global illustration plan ensuring visual consistency across all steps: a unified part-to-label mapping, color palette, per-step annotation specs, and viewing angle plan per assembly phase.

**Model:** Gemini 2.5 Flash (text-only, single call per guide).

**Execution:** Single call. Receives the full approved text guide.

**Input schema:**

```typescript
interface IllustrationPlannerInput {
  approvedGuide: EnforcedGuide;
  productName: string;
  illustrationStyle?: string;       // Override default style
}
```

**Output schema:**

```typescript
interface IllustrationPlan {
  globalLabels: PartLabel[];
  colorPalette: ColorAssignment[];
  viewingAnglePlan: ViewingAngle[];
  stepSpecs: StepIllustrationSpec[];
}

interface PartLabel {
  partId: string;
  partName: string;
  label: string;                     // "A", "B", "C"... (skipping I, O)
  color: string;                     // Hex color from palette
}

interface ColorAssignment {
  role: "active_part" | "inactive_part" | "fastener"
      | "tool" | "arrow" | "background";
  color: string;                     // Hex
}

interface ViewingAngle {
  phase: string;                     // "Frame Assembly", "Wiring"
  angle: string;                     // "front-left isometric 30deg"
  rationale: string;
}

interface StepIllustrationSpec {
  stepNumber: number;
  activeParts: string[];             // Part labels being assembled NOW
  inactiveParts: string[];           // Part labels visible but not active
  arrows: ArrowSpec[];
  detailCallout?: DetailCalloutSpec;
  viewingAngle: string;              // Reference to phase angle
  complexity: "simple" | "complex";
  notes: string;                     // Free-text guidance for prompt builder
}

interface ArrowSpec {
  from: string;
  to: string;
  direction: string;
  style: "motion" | "callout" | "rotation";
}

interface DetailCalloutSpec {
  subject: string;
  zoomLevel: string;                 // "2x", "3x"
  position: string;                  // "bottom-right inset"
}
```

**Guardrails:**
- MUST assign sequential labels (A, B, C...) skipping I and O (avoids confusion with 1 and 0)
- MUST assign the same label and color to the same part across ALL steps
- MUST plan viewing angles per assembly phase for visual consistency
- MUST classify each step as simple or complex (drives model routing in Image Generator)

---

### Agent 9: Prompt Builder

**Purpose:** Transform each `StepIllustrationSpec` into a structured natural-language image generation prompt. This is a deterministic TypeScript function, NOT an LLM call.

**Model:** None (pure TypeScript template engine).

**Execution:** Synchronous. Called once per step. Zero API cost.

**Output format:**

```
[STYLE] Clean isometric technical assembly illustration. Line art with subtle
shading, neutral/warm color palette, white background.

[PRODUCT] KALLAX Shelf Unit, Step 7 of 14.

[COLOR PALETTE]
- Active parts: #2563EB (blue)
- Inactive parts: #E5E7EB (light gray)
- Fasteners: #F59E0B (amber)
- Arrows: #DC2626 (red)

[SCENE] Attaching side panel (B) to base panel (A) using 4 wooden dowels (C).

[ACTIVE PARTS]
- Side panel (B) -- being lowered into position, highlighted in blue
- 4x Wooden dowel (C) -- pre-inserted into base panel holes, amber

[INACTIVE PARTS]
- Base panel (A) -- flat on work surface, light gray
- Previous side panel (D) -- already attached, light gray

[ARROWS]
- Downward arrow from side panel (B) toward base panel (A) -- red, motion style
- 4 small arrows pointing into dowel holes -- red, insertion style

[DETAIL CALLOUT] Bottom-right inset at 2x: close-up of dowel (C) seating
into pre-drilled hole in side panel (B).

[VIEWING ANGLE] Front-left isometric, 30 degrees, matching Phase 1 angle.

[DO NOT INCLUDE] Text labels on the illustration, human hands, photorealistic
textures, brand logos.
```

**Guardrails:**
- MUST include all sections: STYLE, PRODUCT, COLOR PALETTE, SCENE, ACTIVE PARTS, INACTIVE PARTS, ARROWS, VIEWING ANGLE, DO NOT INCLUDE
- MUST use part labels and colors from the Illustration Plan (consistency)
- MUST include DETAIL CALLOUT section only when the spec calls for it
- MUST NOT call any LLM -- this is deterministic template logic

---

### Agent 10: Image Generator

**Purpose:** Generate an illustration from the prompt. Routes to the appropriate model based on step complexity.

**Model:**
- **Simple steps:** Gemini 2.5 Flash Image (`gemini-2.5-flash-image`) -- faster, cheaper
- **Complex steps:** Gemini 3 Pro Image (`gemini-3-pro-image-preview`) -- higher fidelity, up to 4K

**Execution:** Sequential per step (API rate limits). On retry, the QA correction prompt is appended to the original prompt.

**Input/output:**

```typescript
interface ImageGeneratorInput {
  prompt: string;                    // From Prompt Builder
  complexity: "simple" | "complex";
  retryCount: number;               // 0 on first attempt
  correctionPrompt?: string;        // From Visual QA on retry
}

interface ImageGeneratorOutput {
  imageBuffer: Buffer;
  mimeType: "image/png" | "image/jpeg";
  modelUsed: string;
  width: number;
  height: number;
}
```

**Guardrails:**
- Simple steps use Flash Image model; complex steps use Pro Image model
- On retry (retryCount > 0), correction prompt appended to original
- Max 2 retries per step (enforced by Orchestrator, not by this agent)
- Individual step failures do not block other steps

---

### Agent 11: Visual QA

**Purpose:** Examine each generated illustration against its annotation spec. Verify labels, arrows, color coding, part accuracy, and image quality.

**Model:** Gemini 2.5 Flash (vision mode).

**Execution:** One call per generated illustration.

**Input/output:**

```typescript
interface VisualQAInput {
  image: Buffer;
  mimeType: "image/png" | "image/jpeg";
  stepSpec: StepIllustrationSpec;
  stepInstruction: string;           // For context
}

interface VisualQAResult {
  passed: boolean;
  score: number;                     // 0-100
  issues: VisualQAIssue[];
  correctionPrompt?: string;         // If failed: prompt to fix issues on retry
}

interface VisualQAIssue {
  category: "missing_label" | "wrong_arrow" | "hallucinated_part"
          | "missing_part" | "wrong_color" | "quality" | "text_in_image";
  description: string;
  severity: "error" | "warning";
}
```

**Guardrails:**
- MUST check: labels present and legible, arrows match spec, active/inactive rendering correct
- MUST check: no hallucinated parts, no missing parts, no unwanted text in image
- MUST produce a correction prompt when issues are found (consumed by Image Generator on retry)
- Pass threshold: score >= 80

---

### Feedback Loop Design

**Text revision loop (max 2 iterations):**

```
Quality Reviewer returns decision = "revise" (score 70-89)
    |
    v
Orchestrator checks: textRevisionCount < 2?
    |
   Yes --> Route issues to responsible agent:
    |      - issue.responsibleAgent === "enforcer" --> re-enter at ENFORCING
    |      - issue.responsibleAgent === "editor"   --> re-enter at EDITING
    |      All downstream agents re-run from that entry point
    |      textRevisionCount++
    |
   No  --> Complete with qualityDecision = "hold"
           Full feedback history from all agents included in result
           Consumer decides whether to accept or request human review
```

**Illustration retry loop (max 2 retries per step):**

```
Visual QA returns passed = false for step N
    |
    v
Orchestrator checks: illustrationRetries.get(N) < 2?
    |
   Yes --> Append correctionPrompt to original prompt
    |      Re-call Image Generator for step N only
    |      Re-call Visual QA on new image
    |      illustrationRetries.set(N, count + 1)
    |
   No  --> Flag step N illustration as "needs_manual_review"
           Continue with remaining steps
           Guide is still deliverable with flagged illustrations noted
```

### Parallel Execution Map

| Phase | Agents | Execution | Notes |
|-------|--------|-----------|-------|
| 1. Extraction | Vision Extractor x N | Parallel per page | Rate-limited |
| 2. Composition | Sequence Composer | Sequential | Depends on all extractions |
| 3. Enforcement | Guideline Enforcer | Sequential | Depends on composition |
| 4. Editing | Editor | Sequential | Depends on enforcement |
| 5. Review | Quality + Safety | **Parallel** | Both must complete |
| 6. Planning | Illustration Planner | Sequential | After text approved |
| 7. Building | Prompt Builder x N | Synchronous (no API) | Instant |
| 8. Generation | Image Generator x N | Sequential per step | Rate-limited |
| 9. QA | Visual QA x N | Sequential (follows each generation) | Rate-limited |

---

## 4. API Design

Instructo exposes a REST API built with [Hono](https://hono.dev/), a lightweight, edge-compatible HTTP framework. The API is versioned under `/v1/` and uses Bearer token authentication.

### Route Map

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `POST` | `/v1/generate` | Submit PDF for async generation | Bearer |
| `GET` | `/v1/jobs/:jobId` | Poll job status + progress | Bearer |
| `GET` | `/v1/jobs/:jobId/result` | Get completed result | Bearer |
| `POST` | `/v1/jobs/:jobId/cancel` | Cancel a queued/running job | Bearer |
| `POST` | `/v1/generate/sync` | Synchronous generation (small PDFs, <= 10 pages) | Bearer |
| `GET` | `/v1/health` | Health check | None |

### Authentication

**API key format:**

```
inst_sk_live_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6
|        |   |                                |
prefix   env 32 random hex bytes
```

- Prefix `inst_sk_` for easy identification in logs and configs
- `live` vs `test` differentiates production from development environments
- Keys are hashed with SHA-256 before storage; the raw key is NEVER persisted
- Authentication header: `Authorization: Bearer inst_sk_live_...`

**Auth middleware flow:**

```
Request received
  --> Extract Bearer token from Authorization header
  --> SHA-256 hash the token
  --> Look up ApiKey record by hash
  --> Check: not revoked, not expired
  --> Check rate limit (sliding window per key, Redis-backed)
  --> Update usage counter (fire-and-forget, non-blocking)
  --> Attach { apiKeyId, tier, rateLimitRpm } to request context
```

### Rate Limiting

Per-API-key sliding window backed by Redis:

| Tier | Requests/min | Concurrent jobs | Max PDF pages |
|------|-------------|-----------------|---------------|
| Free | 10 | 2 | 30 |
| Pro | 60 | 10 | 100 |
| Enterprise | 300 | 50 | 100 |

### Endpoint Details

#### `POST /v1/generate` -- Async Generation

Submit a PDF for asynchronous guide generation. Returns immediately with a job ID.

**Request:**

```json
{
  "pdf": {
    "url": "https://example.com/manual.pdf"
  },
  "options": {
    "name": "KALLAX Shelf Unit",
    "domain": "furniture",
    "illustrations": true,
    "tone": "professional",
    "customGuidelines": null,
    "callbackUrl": "https://my-app.com/webhooks/instructo"
  }
}
```

- Either `pdf.url` or `pdf.base64` must be provided (mutually exclusive)
- All fields in `options` are optional
- `illustrations` defaults to `true`; set `false` for text-only mode (~70% cheaper
- `customGuidelines` accepts a YAML string that overrides or extends default guidelines
- `callbackUrl` receives a POST with the full result when the job completes

**Response (202 Accepted):**

```json
{
  "jobId": "job_01HXK4WMQJ...",
  "status": "pending",
  "createdAt": "2026-02-18T10:00:00Z",
  "estimatedDurationSeconds": 600,
  "statusUrl": "/v1/jobs/job_01HXK4WMQJ...",
  "resultUrl": "/v1/jobs/job_01HXK4WMQJ.../result"
}
```

#### `GET /v1/jobs/:jobId` -- Poll Status

**Response:**

```json
{
  "jobId": "job_01HXK4WMQJ...",
  "status": "reviewing",
  "progress": {
    "currentAgent": "quality_reviewer",
    "stepsCompleted": 5,
    "totalSteps": 7,
    "pagesExtracted": 24,
    "totalPages": 24,
    "textRevisionLoop": 0,
    "illustrationsCompleted": 0,
    "illustrationsTotal": 14
  },
  "costs": {
    "totalUsd": 0.42,
    "breakdown": {
      "vision_extractor": 0.20,
      "sequence_composer": 0.02,
      "guideline_enforcer": 0.05,
      "editor": 0.03,
      "quality_reviewer": 0.08,
      "safety_reviewer": 0.04
    }
  },
  "createdAt": "2026-02-18T10:00:00Z",
  "startedAt": "2026-02-18T10:00:02Z",
  "updatedAt": "2026-02-18T10:08:15Z"
}
```

#### `GET /v1/jobs/:jobId/result` -- Get Result

Returns the full generation result. Returns 404 if the job is not yet completed.

**Response:** See [Section 7: Input/Output Contracts](#7-inputoutput-contracts) for the complete output schema.

#### `POST /v1/jobs/:jobId/cancel` -- Cancel Job

**Response (200):**

```json
{
  "jobId": "job_01HXK4WMQJ...",
  "status": "cancelled",
  "cancelledAt": "2026-02-18T10:05:00Z"
}
```

Returns 409 Conflict if the job is already completed, failed, or cancelled.

#### `POST /v1/generate/sync` -- Synchronous Generation

Synchronous generation for small PDFs (<= 10 pages). Blocks until the result is ready. Hard timeout at 120 seconds.

**Request:** Same shape as `POST /v1/generate`.

**Response:** The full generation result (same as `GET /v1/jobs/:jobId/result`).

Returns 413 if the PDF exceeds 10 pages. Returns 504 if processing exceeds 120 seconds.

#### `GET /v1/health` -- Health Check

No authentication required.

**Response:**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 86400,
  "queue": {
    "pending": 3,
    "active": 2,
    "completed": 1547,
    "failed": 12
  },
  "dependencies": {
    "redis": "connected",
    "database": "connected",
    "gemini": "available"
  }
}
```

### Error Response Format

All errors follow a consistent structure:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 15 seconds.",
    "retryAfter": 15
  }
}
```

| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `FORBIDDEN` | 403 | API key lacks permission for this action |
| `NOT_FOUND` | 404 | Job not found or result not ready |
| `CONFLICT` | 409 | Job already completed/cancelled |
| `INVALID_INPUT` | 422 | Bad request body (invalid PDF, missing required fields) |
| `PDF_TOO_LARGE` | 413 | PDF exceeds page limit for sync mode |
| `RATE_LIMIT_EXCEEDED` | 429 | Per-key rate limit hit |
| `GENERATION_FAILED` | 500 | Internal pipeline failure |
| `TIMEOUT` | 504 | Sync generation exceeded time limit |

---

## 5. MCP Server Design

### Package

- **npm:** `@instructo/mcp-server`
- **Source:** `packages/mcp-server/`
- **SDK:** `@modelcontextprotocol/sdk`

The MCP server wraps the Instructo REST API, exposing it as MCP tools that AI agents can call through the Model Context Protocol.

### Installation

```bash
# Claude Code (one command)
claude mcp add instructo -- npx @instructo/mcp-server

# Cursor, Copilot, or any MCP client -- add to mcp.json / settings.json
{
  "mcpServers": {
    "instructo": {
      "command": "npx",
      "args": ["@instructo/mcp-server"],
      "env": {
        "INSTRUCTO_API_KEY": "inst_sk_live_...",
        "INSTRUCTO_BASE_URL": "https://api.instructo.dev"
      }
    }
  }
}
```

### Transport

- **Primary:** stdio -- standard for local MCP servers, works with all MCP clients
- **Secondary:** SSE -- for remote/hosted deployments where stdio is not available

### Tools

| Tool | Description | API Route |
|------|-------------|-----------|
| `instructo_generate` | Submit a PDF for async guide generation. Returns a jobId for tracking. | `POST /v1/generate` |
| `instructo_check_status` | Check the status and progress of a generation job. | `GET /v1/jobs/:jobId` |
| `instructo_get_result` | Get the completed result (text + illustrations). | `GET /v1/jobs/:jobId/result` |
| `instructo_generate_sync` | Generate a guide synchronously (small PDFs only, <= 10 pages). | `POST /v1/generate/sync` |

### Tool Schemas (MCP format)

```typescript
// instructo_generate
{
  name: "instructo_generate",
  description:
    "Submit an instructional PDF for AI-powered guide generation. " +
    "Returns a job ID for tracking. Use instructo_check_status to poll, " +
    "or instructo_get_result when status shows 'completed'.",
  inputSchema: {
    type: "object",
    properties: {
      pdfUrl: { type: "string", description: "URL of the PDF to process" },
      name: { type: "string", description: "Name/title for the guide" },
      domain: {
        type: "string",
        description: "Content domain: furniture, electronics, etc.",
        default: "general"
      },
      illustrations: {
        type: "boolean",
        description: "Generate illustrations for each step",
        default: true
      }
    },
    required: ["pdfUrl"]
  }
}

// instructo_generate_sync
{
  name: "instructo_generate_sync",
  description:
    "Generate a structured guide from a small PDF synchronously. " +
    "Only for PDFs with 10 or fewer pages. " +
    "For larger PDFs, use instructo_generate instead.",
  inputSchema: {
    type: "object",
    properties: {
      pdfUrl: { type: "string", description: "URL of the PDF (max 10 pages)" },
      name: { type: "string", description: "Name/title for the guide" },
      domain: { type: "string", default: "general" },
      illustrations: { type: "boolean", default: true }
    },
    required: ["pdfUrl"]
  }
}

// instructo_check_status
{
  name: "instructo_check_status",
  description: "Check current status and progress of a guide generation job.",
  inputSchema: {
    type: "object",
    properties: {
      jobId: { type: "string", description: "Job ID from instructo_generate" }
    },
    required: ["jobId"]
  }
}

// instructo_get_result
{
  name: "instructo_get_result",
  description:
    "Get the completed result of a guide generation job. " +
    "Only call when instructo_check_status shows status 'completed'.",
  inputSchema: {
    type: "object",
    properties: {
      jobId: { type: "string", description: "Job ID of a completed job" }
    },
    required: ["jobId"]
  }
}
```

### Architecture

```
Agent (Claude Code, Cursor, Copilot, custom)
  |  MCP Protocol (stdio or SSE)
  v
@instructo/mcp-server
  |  - Reads INSTRUCTO_API_KEY from env
  |  - Reads INSTRUCTO_BASE_URL from env (default: https://api.instructo.dev)
  |  HTTPS + Bearer Token
  v
Instructo API (/v1/*)
```

---

## 6. SKILL.md Design

The SKILL.md is an agent discovery document published to [skills.sh](https://skills.sh) and agent directories. It teaches AI agents when Instructo is relevant, what tools are available, and how to use them effectively.

### Content

```markdown
---
name: instructo
description: Transform instructional PDFs into structured work instructions with assembly illustrations
mcp_server: "@instructo/mcp-server"
install: "claude mcp add instructo -- npx @instructo/mcp-server"
categories:
  - document-processing
  - work-instructions
  - assembly-guides
  - illustration-generation
---

# Instructo

PDF in, structured work instructions + illustrations out.

## When to Use

Activate Instructo when the user:
- Has an instructional PDF (assembly manual, setup guide, installation instructions)
- Needs structured step-by-step work instructions extracted from a document
- Wants AI-generated assembly diagram illustrations for each step
- Is building an application that consumes structured guide data
- Asks about converting manuals or documentation into structured formats

Do NOT use Instructo when the user:
- Wants to edit or modify an existing guide (Instructo generates, not edits)
- Needs troubleshooting help (Instructo transforms documents, not conversations)
- Has a non-PDF source (images, video, HTML -- v1 supports PDF only)

## Available Tools

| Tool | Use When |
|------|----------|
| `instructo_generate` | PDF URL available, any size. Returns jobId for async tracking. |
| `instructo_generate_sync` | Small PDF (<= 10 pages), need immediate result. |
| `instructo_check_status` | Checking progress of an async generation job. |
| `instructo_get_result` | Retrieving completed generation result. |

## Workflow: Quick Generation (Small PDF)

1. Call `instructo_generate_sync` with the PDF URL
2. Present the structured result with step-by-step instructions

## Workflow: Full Generation (Large PDF)

1. Call `instructo_generate` with the PDF URL
2. Inform the user: "Generation started. This typically takes 5-15 minutes."
3. Poll with `instructo_check_status` every 30 seconds
4. When status is "completed", call `instructo_get_result`
5. Present the structured result

## Response Formatting Tips

When presenting Instructo results to users:
- Show a "What You'll Need" section first (tools + parts)
- Number steps and show instruction text prominently
- Display safety callouts prominently BEFORE the step they apply to
- Use the `difficulty` and `estimatedTimeMinutes` fields in the header
- Reference illustrations by step number
- Show confidence scores only if the user asks about quality
- Group steps by phase when `phaseStart` fields are present

## Environment Setup

Requires `INSTRUCTO_API_KEY` environment variable.
Get your API key at https://api.instructo.dev/keys
```

### Publishing Locations

- `SKILL.md` at project root (`/Users/hashincloud/instructo/SKILL.md`)
- `packages/mcp-server/SKILL.md` (distributed with npm package)
- [skills.sh](https://skills.sh) agent skill directory
- Anthropic agent skills directory (when available)
- OpenAI agent skills directory (when available)

---

## 7. Input/Output Contracts

### Input Contract

**Required:** A PDF document (either by URL or as base64-encoded content).

**Optional:** Metadata that improves generation quality and customizes the output.

```typescript
interface GenerationInput {
  pdf: {
    /** URL to fetch the PDF from. Mutually exclusive with base64. */
    url?: string;
    /** Base64-encoded PDF content. Mutually exclusive with url. */
    base64?: string;
  };

  options?: {
    /** Display name for the guide (e.g., "KALLAX Shelf Assembly") */
    name?: string;
    /** Content domain hint. Influences safety checks and terminology. */
    domain?: "furniture" | "electronics" | "appliances" | "automotive"
           | "industrial" | "medical" | "educational" | "general";
    /** Generate illustrations for each step. Default: true. */
    illustrations?: boolean;
    /** Desired tone for instructions. Default: "professional". */
    tone?: "professional" | "friendly" | "minimal";
    /** Custom guidelines YAML overriding/extending defaults. */
    customGuidelines?: string;
    /** Webhook URL to POST when generation completes. */
    callbackUrl?: string;
  };
}
```

**PDF constraints:**
- Maximum file size: 50 MB
- Maximum page count: 100 pages (async), 10 pages (sync)
- Supported formats: PDF only (v1)
- Minimum resolution: 150 DPI recommended for accurate vision extraction
- Must be a valid PDF (not password-protected or encrypted)

### Output Contract

The complete generation result returned by `GET /v1/jobs/:jobId/result` and `POST /v1/generate/sync`.

```typescript
interface GenerationResult {
  /** Unique document identifier */
  documentId: string;

  /** Guide title (auto-generated from PDF content if not provided) */
  title: string;

  /** Difficulty classification */
  difficulty: "easy" | "medium" | "hard";

  /** Estimated completion time in minutes */
  estimatedTimeMinutes: number;

  /** Ordered list of instruction steps */
  steps: OutputStep[];

  /** Summary of all tools needed */
  tools: {
    required: ToolRef[];
    optional: ToolRef[];
  };

  /** Summary of all parts referenced */
  parts: {
    items: PartRef[];
    totalCount: number;
  };

  /** Quality flags raised during generation */
  qualityFlags: QualityFlag[];

  /** Overall confidence score (0.0 to 1.0) */
  overallConfidence: number;

  /** Guide-level metadata */
  guideMetadata: {
    safetyLevel: "low" | "medium" | "high";
    personsRequired: number;
    skillLevel: "none" | "basic_hand_tools" | "power_tools_recommended";
    purposeStatement: string;
  };

  /** Quality review decision */
  qualityDecision: "approved" | "review" | "hold";

  /** Generation process metadata */
  generation: {
    pdfPageCount: number;
    processingTimeMs: number;
    totalCostUsd: number;
    textRevisionLoops: number;
    illustrationRetries: number;
    modelsUsed: string[];
    generatedAt: string;             // ISO 8601
  };
}

interface OutputStep {
  stepNumber: number;                // Sequential from 1
  title: string;                     // Short descriptive title
  instruction: string;               // Full instruction text (guideline-compliant)
  parts: PartRef[];                  // Parts used in this step
  tools: ToolRef[];                  // Tools used in this step
  callouts: Callout[];               // Warnings, tips, info
  illustrationUrl: string | null;    // URL to generated illustration
  illustrationBase64: string | null; // Base64 (if URL not available)
  confidence: number;                // 0.0 to 1.0
  sourcePdfPages: number[];          // Which PDF pages this came from
  complexity: "simple" | "complex";
  twoPersonRequired: boolean;
  phaseStart: string | null;         // Phase name if this starts a new phase
  transitionNote: string | null;     // Bridge from previous step/phase
}

interface PartRef {
  id: string;                        // Part identifier
  name: string;                      // Human-readable name
  quantity: number;
}

interface ToolRef {
  name: string;
  icon?: string;                     // Optional icon identifier
}

interface Callout {
  type: "warning" | "tip" | "info";
  text: string;
  severity?: "caution" | "warning" | "danger";  // For type: "warning" only
}

interface QualityFlag {
  code: string;                      // Machine-readable code
  message: string;                   // Human-readable description
  severity: "error" | "warning" | "info";
  stepNumber?: number;               // null = guide-level flag
}
```

### Example Output (Abbreviated)

```json
{
  "documentId": "doc_01HXK4WMQJ...",
  "title": "Assemble KALLAX Shelf Unit",
  "difficulty": "easy",
  "estimatedTimeMinutes": 45,
  "steps": [
    {
      "stepNumber": 1,
      "title": "Prepare the base panel",
      "instruction": "Place the base panel (A) flat on a clean surface with pre-drilled holes facing upward.",
      "parts": [{ "id": "A", "name": "Base panel", "quantity": 1 }],
      "tools": [],
      "callouts": [
        { "type": "tip", "text": "Lay cardboard beneath the panel to prevent scratching." }
      ],
      "illustrationUrl": "https://storage.instructo.dev/jobs/job_.../step_1.png",
      "illustrationBase64": null,
      "confidence": 0.95,
      "sourcePdfPages": [3],
      "complexity": "simple",
      "twoPersonRequired": false,
      "phaseStart": "Frame Assembly",
      "transitionNote": null
    },
    {
      "stepNumber": 2,
      "title": "Insert dowels into base panel",
      "instruction": "Insert 4 wooden dowels (C) into the pre-drilled holes along the top edge of the base panel (A). Push each dowel firmly until flush.",
      "parts": [{ "id": "C", "name": "Wooden dowel", "quantity": 4 }],
      "tools": [],
      "callouts": [],
      "illustrationUrl": "https://storage.instructo.dev/jobs/job_.../step_2.png",
      "illustrationBase64": null,
      "confidence": 0.92,
      "sourcePdfPages": [3],
      "complexity": "simple",
      "twoPersonRequired": false,
      "phaseStart": null,
      "transitionNote": null
    }
  ],
  "tools": {
    "required": [{ "name": "Phillips screwdriver" }],
    "optional": [{ "name": "Rubber mallet" }]
  },
  "parts": {
    "items": [
      { "id": "A", "name": "Base panel", "quantity": 1 },
      { "id": "B", "name": "Side panel", "quantity": 2 },
      { "id": "C", "name": "Wooden dowel", "quantity": 8 }
    ],
    "totalCount": 11
  },
  "qualityFlags": [],
  "overallConfidence": 0.93,
  "guideMetadata": {
    "safetyLevel": "medium",
    "personsRequired": 1,
    "skillLevel": "none",
    "purposeStatement": "Free-standing shelf unit for books and decorative items."
  },
  "qualityDecision": "approved",
  "generation": {
    "pdfPageCount": 24,
    "processingTimeMs": 540000,
    "totalCostUsd": 1.02,
    "textRevisionLoops": 0,
    "illustrationRetries": 1,
    "modelsUsed": ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-image"],
    "generatedAt": "2026-02-18T10:09:00Z"
  }
}
```

---

## 8. Quality System

Instructo implements a 4-layer **Compliance by Construction** quality system. Each layer catches different classes of errors at different costs, creating a defense-in-depth where the final output is reliable by design, not by luck.

### Layer 1: Prompt Injection -- Guidelines Into Agent Prompts

Guidelines are injected directly into agent prompts so the LLM "knows the rules" at generation time.

| Agent | What Is Injected | How |
|-------|-----------------|-----|
| Vision Extractor | Condensed MUST rules for visual observation | Compact rule lines in system prompt |
| Guideline Enforcer | **Full** YAML guidelines document | Entire YAML passed as context (NO truncation) |
| Editor | Tone and style rules | Style directives in system prompt |
| Quality Reviewer | Full guidelines for scoring reference | YAML document for evaluation criteria |

Critical difference from monolithic pipeline approaches: the Guideline Enforcer receives the **complete** guidelines YAML. The multi-agent architecture eliminates the character-budget truncation problem because each agent only handles one responsibility and can accommodate the full guideline set within its focused context.

### Layer 2: Response Schema -- Structural Enforcement at Generation Time

Gemini's `responseSchema` parameter enforces structural compliance at the model output level. The model physically cannot produce output that violates the schema.

**Enforced constraints:**

| Field | Schema Enforcement |
|-------|-------------------|
| `primaryVerb` | Enum of 16 approved verbs (customizable) |
| `safetyCallout.severity` | Enum: `caution`, `warning`, `danger` |
| `safetyLevel` | Enum: `low`, `medium`, `high` |
| `skillLevel` | Enum: `none`, `basic_hand_tools`, `power_tools_recommended` |
| `twoPersonRequired` | Boolean (cannot be omitted) |
| `parts[].name`, `parts[].id`, `parts[].quantity` | All three required per part |
| `originalStepNumbers` | Required array of integers |

This makes certain classes of violations **impossible** rather than merely "flagged after the fact." The model cannot invent verbs outside the approved set, cannot skip part IDs, and cannot omit required safety metadata.

### Layer 3: Post-Processing -- Deterministic Transforms (~10ms, $0)

After LLM generation, **9+ deterministic transforms** run synchronously with zero API calls and zero cost. These fix remaining guideline violations that the LLM missed:

| # | Transform | Guideline | What It Does |
|---|-----------|-----------|-------------|
| 1 | Verb-first fix | WI-022 | Ensures instruction starts with an approved verb; strips lead-ins like "Next," or "You should" |
| 2 | Part ID insertion | WI-025 | Adds missing part IDs: "dowel" becomes "dowel (A)" |
| 3 | Quantity insertion | WI-026 | Prefixes with quantity: "dowels (A)" becomes "4 dowels (A)" |
| 4 | Sentence splitting | WI-024 | Splits sentences > 20 words at natural break points |
| 5 | Part ID merging | WI-028 | Merges inconsistent IDs for the same part across steps |
| 6 | Terminology normalization | WI-028 | Ensures same part uses same name everywhere |
| 7 | Two-person callouts | WI-018 | Adds "Two people needed" callout where detected but missing |
| 8 | Safety callout ordering | WI-015 | Moves warning callouts before other callouts |
| 9 | Wall anchoring advisory | WI-019 | Appends anchoring warning for tall/heavy products |
| 10 | Phase detection | WI-006 | Auto-inserts phase boundaries for guides > 12 steps |

All transforms are domain-agnostic -- they operate on structural patterns (missing IDs, long sentences, callout ordering) rather than domain-specific content.

### Layer 4: Validation Registry -- 22+ Validators Producing Quality Flags

A registry of validators runs against the completed guide and produces `QualityFlag` objects. Validators **only observe and report** -- they never trigger retries. The flags feed into the Quality Reviewer's scoring and are included in the API response for consumer visibility.

**Validator categories:**

| Category | Validators | Checks |
|----------|-----------|--------|
| **Text quality** | 7 | Verb-first syntax, sentence length, active voice, part references, quantities, one action per step, terminology consistency |
| **Metadata** | 6 | Title format, purpose statement, safety classification, time estimate, persons required, skill level |
| **Safety** | 4 | Callout ordering, hazard detection, two-person flags, wall anchoring |
| **Structure** | 3 | Guide has steps, phase grouping for long guides, section order |
| **Illustration** | 2 | One illustration per step, correct model routing |

### Quality Gates

The Quality Reviewer's score (0-100) determines the guide's disposition:

| Score | Decision | Action |
|-------|----------|--------|
| >= 90 | `approved` | Ready for consumption. Safe for auto-publishing. |
| 70-89 | `review` | Acceptable but imperfect. Feedback history included. Consumer decides. |
| < 70 | `hold` | Significant issues. Full feedback history included. Needs human review. |

### Custom Guidelines

Instructo ships with a comprehensive default guideline set. Consumers can override or extend per request:

```yaml
# Custom guidelines (merged with defaults)
version: "1.0.0"
scope: "Medical device installation manuals"
overrides:
  - id: WI-022
    description: "Use only these verbs: Connect, Attach, Verify, Calibrate, Test, Seal"
    approved_verbs: [Connect, Attach, Verify, Calibrate, Test, Seal]
additions:
  - id: CUSTOM-001
    title: "Sterilization check"
    priority: must
    description: "Every step involving patient-contact surfaces must include a sterilization callout"
```

Merge behavior:
- `overrides` replace matching default requirements by ID
- `additions` are appended to the default requirement set
- All layers (Enforcer, post-processor, validators, Quality Reviewer) operate on the merged set

---

## 9. Infrastructure Reuse Map

Instructo extracts, generalizes, and extends components from the Guid.me Phase 1 AI pipeline (`/Users/hashincloud/Guid.me/src/lib/ai/`). This section maps every relevant file to its disposition in Instructo.

### Directly Portable (Copy with Minimal Changes)

| Guid.me Source | Instructo Target | Changes |
|---|---|---|
| `ai/vision-provider.ts` | `core/src/providers/vision-provider.ts` | Remove Next.js env patterns; add Hono-compatible env reading |
| `ai/rate-limiter.ts` | `core/src/infra/rate-limiter.ts` | None -- already provider-agnostic |
| `ai/cost-tracker.ts` | `core/src/infra/cost-tracker.ts` | Extend with per-agent cost bucketing |
| `ai/pdf-extractor.ts` | `core/src/extraction/pdf-extractor.ts` | Replace `child_process` with proper pdftoppm wrapper |
| `ai/guideline-schema.ts` | `core/src/guidelines/schema.ts` | Remove Guid.me-specific `GuidelineAppliesTo` values; generalize |
| `ai/guideline-loader.ts` | `core/src/guidelines/loader.ts` | Generalize file path resolution for monorepo |

### Extract + Generalize

| Guid.me Source | Instructo Target | What Changes |
|---|---|---|
| `ai/guideline-post-processor.ts` | `core/src/transforms/post-processor.ts` | **Remove:** IKEA phase names ("Frame Assembly", "Door Mounting"), product-type regex (`/wardrobe\|bookcase/`), hardcoded anchoring text. **Replace with:** configurable phase names from guidelines, domain-agnostic hazard detection, pluggable safety rules. |
| `ai/guideline-validator.ts` | `core/src/quality/validator-registry.ts` | **Remove:** Prisma dependency, IKEA part number patterns. **Replace with:** pure function validators, configurable patterns, registry-based extensibility. |
| `ai/quality-checker.ts` | `core/src/quality/quality-checker.ts` | **Remove:** Prisma model dependencies. **Replace with:** pure functions taking guide objects, returning scores. |
| `ai/illustration-generator.ts` | `core/src/illustration/image-generator.ts` | **Keep:** `classifyComplexityForIllustration()`, `selectIllustrationModel()`, `callGeminiImageGeneration()`. **Replace:** `buildIllustrationPrompt()` with Prompt Builder agent. **Remove:** `formatSystemSection()` char-budget call. |
| `ai/guideline-formatter.ts` | `core/src/guidelines/formatter.ts` | **Remove:** character budget truncation (`CHAR_BUDGETS`), priority filtering by pass. Multi-agent architecture eliminates truncation need. **Keep:** requirement formatting logic. |

### Build New

| Component | Package | Description |
|---|---|---|
| Orchestrator state machine | `core/src/orchestrator/` | TypeScript state machine: state tracking, agent routing, loop limits, progress events, cost aggregation |
| Agent framework | `core/src/agents/base-agent.ts` | Abstract `Agent<TInput, TOutput>` class with typed execute, cost tracking, error handling, retry |
| 11 agent implementations | `core/src/agents/` | One file per agent, each implementing the base class |
| Job queue | `core/src/queue/` | BullMQ (Redis) + in-memory dev adapter. Job CRUD, polling, cancellation |
| API server | `api/src/` | Hono routes, middleware (auth, rate limit, validation, errors), request/response handling |
| MCP server | `mcp-server/src/` | MCP tool definitions wrapping REST API, stdio + SSE transports |
| CLI | `cli/src/` | `instructo generate <pdf-url>`, `instructo status <jobId>` |
| Illustration Planner | `core/src/agents/illustration-planner.ts` | Global label/color/angle planning (no Guid.me equivalent) |
| Prompt Builder | `core/src/agents/prompt-builder.ts` | Deterministic template engine replacing `buildIllustrationPrompt()` |
| Visual QA | `core/src/agents/visual-qa.ts` | Vision model verification of illustrations (no Guid.me equivalent) |
| API key management | `api/src/auth/` | Key generation, SHA-256 hashing, verification, rate limiting, usage tracking |
| Storage abstraction | `core/src/storage/` | Local filesystem (dev) / S3-compatible (production) |

### Drop Entirely

| Guid.me File | Reason |
|---|---|
| `ai/requirements-catalog.ts` | IKEA-specific cross-product part registry |
| `ai/pilot-products.ts` | IKEA pilot product selection |
| All Prisma models/migrations | Guid.me-specific database schema |
| All Next.js pages, components, layouts | Web UI (Instructo has no UI) |
| All NextAuth code | Web session auth (Instructo uses API keys only) |
| All Stripe/subscription code | Payment management (out of scope) |
| All chat/troubleshooting code | Conversational AI (out of scope) |
| All adapter/retailer code | Multi-retailer catalog (out of scope) |

---

## 10. Cost Model

All costs are based on published Gemini API pricing as of February 2026. Costs will decrease as model pricing drops.

### Per-Guide Cost Breakdown (Reference: 24-page PDF, 14 output steps)

#### Text Pipeline (~29 API calls)

| Agent | Model | Calls | Avg Input Tokens | Avg Output Tokens | Cost/Call | Subtotal |
|-------|-------|-------|-----------------|------------------|-----------|----------|
| Vision Extractor | Flash (75%) | 18 | 2,000 | 500 | $0.0005 | $0.009 |
| Vision Extractor | Pro (25%) | 6 | 2,000 | 500 | $0.0076 | $0.046 |
| Sequence Composer | Flash | 1 | 8,000 | 3,000 | $0.02 | $0.020 |
| Guideline Enforcer | Flash | 1 | 12,000 | 4,000 | $0.03 | $0.030 |
| Editor | Flash | 1 | 8,000 | 4,000 | $0.02 | $0.020 |
| Quality Reviewer | Pro | 1 | 15,000 | 2,000 | $0.08 | $0.080 |
| Safety Reviewer | Pro | 1 | 10,000 | 1,000 | $0.04 | $0.040 |
| | | **29** | | | | **~$0.29** |

#### Illustration Pipeline (~43 API calls)

| Agent | Model | Calls | Cost/Call | Subtotal |
|-------|-------|-------|-----------|----------|
| Illustration Planner | Flash | 1 | $0.02 | $0.02 |
| Prompt Builder | None (TypeScript) | 14 | $0.00 | $0.00 |
| Image Generator (simple, ~60%) | Flash Image | 8 | $0.05 | $0.40 |
| Image Generator (complex, ~40%) | Pro Image | 6 | $0.04 | $0.24 |
| Visual QA | Flash (vision) | 14 | $0.005 | $0.07 |
| | | **43** | | **~$0.73** |

#### Summary Table

| Mode | API Calls | Cost |
|------|-----------|------|
| **Text + illustrations (default)** | ~72 | **~$1.02** |
| **Text only** | ~29 | **~$0.29** |
| **With 1 text revision loop** | ~82 | **~$1.17** |
| **With 2 text revision loops** | ~92 | **~$1.32** |
| **Maximum cost (all retries)** | ~98 | **~$1.50** |

### Pricing to API Consumers

Target margin: 2-3x production cost.

| Mode | Instructo Cost | Consumer Price |
|------|---------------|----------------|
| Text + illustrations | ~$1.02 | $2.50 - $3.00 per guide |
| Text only | ~$0.29 | $0.75 - $1.00 per guide |

### Cost Optimization Levers

| Lever | Potential Savings | When to Apply |
|-------|-------------------|---------------|
| **Gemini Batch API** | 50% discount | Non-urgent bulk generation (> 1hr SLA acceptable) |
| **Context caching** | 30-50% on guidelines tokens | Session-based caching for repeated guideline YAML |
| **Flash-only mode** | ~40% vs. Flash+Pro hybrid | Low-complexity documents with no escalation triggers |
| **Illustration sampling** | Proportional to skip rate | Generate illustrations for key steps only |
| **Model generation updates** | Varies | Newer model generations are typically cheaper per token |
| **Vision extraction parallelism** | Reduced wall-clock time (not cost) | When rate limits allow higher concurrency |

---

## 11. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Runtime** | Node.js 22 LTS | Long-term support, native fetch, performance. Matches MCP SDK and AI tooling ecosystem. |
| **Language** | TypeScript 5.x | Type safety for complex agent I/O schemas. Shared types across all monorepo packages. |
| **HTTP** | Hono | Lightweight (~14 KB), edge-compatible, Web Standards (Request/Response). Runs on Node.js, Bun, Deno, Workers. No Express overhead. |
| **Job Queue** | BullMQ (Redis) | Production-grade: priorities, retries, progress tracking, rate limiting, delayed jobs. Battle-tested at scale. |
| **Dev Queue** | In-memory | Zero-dependency local development. BullMQ API-compatible wrapper. |
| **State Store** | Redis | Fast read/write for pipeline state, progress tracking, real-time status polling. |
| **Persistent DB** | SQLite (dev) / PostgreSQL (prod) | API keys, usage logs, job history. SQLite for zero-config dev; Postgres for production. |
| **File Storage** | Local fs (dev) / S3-compatible (prod) | Generated illustrations and intermediate artifacts. |
| **Primary AI** | Google Gemini API | Flash (bulk), Pro (review/escalation), Flash/Pro Image (illustrations). All-Gemini simplifies provider management. |
| **Fallback AI** | OpenAI API | GPT-4o as fallback for vision extraction. Provider abstraction (`VisionProvider`) supports both. |
| **PDF Rendering** | pdftoppm (poppler) | High-quality page-to-image conversion. Better than pdf.js for vision extraction accuracy. |
| **MCP SDK** | `@modelcontextprotocol/sdk` | Official SDK for tool registration, protocol negotiation, transport. |
| **Transport** | stdio (primary) + SSE (secondary) | stdio for local MCP; SSE for remote/hosted. |
| **Testing** | Vitest | Fast, native TypeScript, ESM-first, monorepo workspace compatible. |
| **Deployment** | Docker + docker-compose | Self-contained: Redis + API + optional Postgres. Base: `node:22-slim` + poppler-utils. |
| **Monorepo** | pnpm workspaces | Fast, disk-efficient, strict dependency resolution. Native workspace support. |

### Monorepo Structure

```
instructo/
  pnpm-workspace.yaml
  docker-compose.yml
  Dockerfile
  SKILL.md
  tsconfig.base.json

  packages/
    core/                              @instructo/core
      src/
        agents/                        11 agent implementations
          base-agent.ts
          vision-extractor.ts
          sequence-composer.ts
          guideline-enforcer.ts
          editor.ts
          quality-reviewer.ts
          safety-reviewer.ts
          illustration-planner.ts
          prompt-builder.ts
          image-generator.ts
          visual-qa.ts
        orchestrator/                  State machine
          orchestrator.ts
          states.ts
          transitions.ts
        providers/                     AI provider abstractions
          vision-provider.ts
          image-provider.ts
        extraction/                    PDF processing
          pdf-extractor.ts
        guidelines/                    YAML guidelines system
          schema.ts
          loader.ts
          formatter.ts
          defaults/                    Default guideline YAML files
            work-instructions.yaml
            illustrations.yaml
        transforms/                    Deterministic post-processing
          post-processor.ts
        quality/                       Validation + scoring
          validator-registry.ts
          quality-checker.ts
        infra/                         Rate limiting, cost tracking
          rate-limiter.ts
          cost-tracker.ts
        storage/                       File storage abstraction
          storage.ts
          local-storage.ts
          s3-storage.ts
        types/                         Shared TypeScript types
          index.ts
      package.json
      tsconfig.json
      vitest.config.ts

    api/                               @instructo/api
      src/
        index.ts                       Hono server entry
        routes/
          generate.ts
          jobs.ts
          health.ts
        middleware/
          auth.ts
          rate-limit.ts
          error-handler.ts
          validation.ts
        auth/
          api-keys.ts
        queue/
          job-processor.ts
          bull-queue.ts
          memory-queue.ts
      package.json

    mcp-server/                        @instructo/mcp-server
      src/
        index.ts                       MCP server entry
        tools.ts                       Tool definitions
        api-client.ts                  Typed HTTP client
      SKILL.md
      package.json

    cli/                               @instructo/cli (optional)
      src/
        index.ts
        commands/
          generate.ts
          status.ts
      package.json

  docs/
    prd.md                             This document
    architecture.md                    Technical deep-dive
    api-spec.md                        OpenAPI specification
```

---

## 12. Implementation Phases

### Phase 0: Foundation (1 week)

**Goal:** Monorepo scaffolding, shared types, portable infrastructure.

| ID | Task | Package | Description |
|----|------|---------|-------------|
| P0.1 | Monorepo setup | root | pnpm workspace, TypeScript project references, tsconfig.base.json |
| P0.2 | Shared types | core | Define all types: agent I/O, pipeline state, output contract, quality flags |
| P0.3 | Vision provider | core | Port `vision-provider.ts` from Guid.me, generalize env reading |
| P0.4 | Rate limiter | core | Port `rate-limiter.ts` (already provider-agnostic) |
| P0.5 | Cost tracker | core | Port `cost-tracker.ts`, add per-agent cost bucketing |
| P0.6 | PDF extractor | core | Port `pdf-extractor.ts` with proper pdftoppm wrapper |
| P0.7 | Guideline system | core | Port and generalize schema, loader, default YAML files |
| P0.8 | Post-processor | core | Generalize `post-processor.ts` (remove IKEA-specific heuristics) |
| P0.9 | Validator registry | core | Generalize `validator-registry.ts` (remove IKEA patterns, Prisma) |
| P0.10 | Test infrastructure | core | Vitest setup with mocked provider fixtures, reference PDFs |
| P0.11 | Docker base | root | `node:22-slim` + poppler-utils base image |

**Deliverable:** `@instructo/core` with types, providers, extraction, guidelines, transforms, validators. All unit tests passing.

### Phase 1: Text Pipeline (2 weeks)

**Goal:** The 7-agent text pipeline produces guideline-compliant work instructions from any instructional PDF.

| ID | Task | Package | Description |
|----|------|---------|-------------|
| P1.1 | Base agent class | core | Abstract `Agent<TInput, TOutput>` with execute, cost tracking, error handling |
| P1.2 | Vision Extractor | core | Per-page extraction with Flash/Pro escalation triggers |
| P1.3 | Sequence Composer | core | Full-sequence composition: merge, renumber, phase boundaries |
| P1.4 | Guideline Enforcer | core | Full YAML injection, response schema enforcement, 16 approved verbs |
| P1.5 | Editor | core | Readability polish with structural preservation guardrails |
| P1.6 | Quality Reviewer | core | Pro model scoring, structured feedback with agent attribution |
| P1.7 | Safety Reviewer | core | Dedicated hazard verification, parallel with Quality |
| P1.8 | Orchestrator (text) | core | State machine for text pipeline states, feedback routing |
| P1.9 | End-to-end wiring | core | PDF in, structured guide out (no illustrations) |
| P1.10 | Feedback loop | core | Quality issues route to responsible agent, max 2 loops |
| P1.11 | Integration tests | core | 5 reference PDFs across 3 domains (furniture, electronics, industrial) |

**Deliverable:** Text pipeline generates guideline-compliant instructions. Quality scores >= 85% on reference PDFs.

### Phase 2: Review Calibration (1 week)

**Goal:** Quality and Safety reviewers are calibrated; feedback loop is proven.

| ID | Task | Package | Description |
|----|------|---------|-------------|
| P2.1 | Quality calibration | core | Calibrate scoring against 20 manually-reviewed guides |
| P2.2 | Safety calibration | core | Test against known-hazard reference PDFs |
| P2.3 | Feedback loop testing | core | Inject deliberate errors, verify correct agent routing |
| P2.4 | Loop limit testing | core | Verify escalation to "hold" after 2 loops |
| P2.5 | Cost benchmarking | core | Measure and verify cost per guide across reference set |

**Deliverable:** Calibrated reviewers. Verified feedback loop. Cost within budget.

### Phase 3: Illustration Pipeline (2 weeks)

**Goal:** Generate assembly diagram illustrations matching the approved text.

| ID | Task | Package | Description |
|----|------|---------|-------------|
| P3.1 | Illustration Planner | core | Global label/color/angle planning agent |
| P3.2 | Prompt Builder | core | Deterministic template engine with structured sections |
| P3.3 | Image Generator | core | Port from Guid.me, adapt complexity routing |
| P3.4 | Visual QA | core | Vision model verification, correction prompt generation |
| P3.5 | Orchestrator extension | core | Add illustration states after text_approved |
| P3.6 | Retry loop | core | QA failure triggers regeneration, max 2 per step |
| P3.7 | Integration tests | core | Full pipeline (text + illustrations) on 5 reference PDFs |
| P3.8 | Storage abstraction | core | Local filesystem / S3-compatible adapters |

**Deliverable:** Full pipeline produces text + illustrations. Visual QA first-pass rate >= 70%.

### Phase 4: API Server (1 week)

**Goal:** REST API is live with auth, rate limiting, and job management.

| ID | Task | Package | Description |
|----|------|---------|-------------|
| P4.1 | Hono scaffolding | api | Server setup, middleware chain, error handling |
| P4.2 | Async generation | api | `POST /v1/generate` with BullMQ job queue |
| P4.3 | Status polling | api | `GET /v1/jobs/:jobId` with real-time progress |
| P4.4 | Result retrieval | api | `GET /v1/jobs/:jobId/result` |
| P4.5 | Job cancellation | api | `POST /v1/jobs/:jobId/cancel` |
| P4.6 | Sync generation | api | `POST /v1/generate/sync` for small PDFs |
| P4.7 | Health check | api | `GET /v1/health` with dependency status |
| P4.8 | API key auth | api | SHA-256 hashing, rate limiting, usage tracking |
| P4.9 | Request validation | api | Zod schemas for all endpoint inputs |
| P4.10 | Docker compose | root | Redis + API + optional Postgres |
| P4.11 | API integration tests | api | All endpoints tested end-to-end |

**Deliverable:** Functional REST API. `docker-compose up` starts the service. All endpoints tested.

### Phase 5: MCP + SKILL.md (3 days)

**Goal:** AI agents can discover and use Instructo.

| ID | Task | Package | Description |
|----|------|---------|-------------|
| P5.1 | MCP server (stdio) | mcp-server | Server entry with stdio transport |
| P5.2 | API client | mcp-server | Typed HTTP client wrapping REST endpoints |
| P5.3 | Tool registration | mcp-server | 4 tools: generate, check_status, get_result, generate_sync |
| P5.4 | SSE transport | mcp-server | Secondary transport for remote deployment |
| P5.5 | SKILL.md | root + mcp-server | Author and validate discovery document |
| P5.6 | npm package config | mcp-server | `@instructo/mcp-server`, bin entry, prepublish |
| P5.7 | E2E test | root | `claude mcp add instructo -- npx @instructo/mcp-server` works |

**Deliverable:** `@instructo/mcp-server` installable via npx. SKILL.md ready for publishing.

### Phase 6: Harden (1 week)

**Goal:** Production readiness.

| ID | Task | Package | Description |
|----|------|---------|-------------|
| P6.1 | Retry logic | core | Transient AI API failure retries per agent (exponential backoff) |
| P6.2 | Structured logging | api | JSON logs with correlation IDs per job |
| P6.3 | Graceful shutdown | api | Drain queue, finish active jobs on SIGTERM |
| P6.4 | Webhook delivery | api | POST to callbackUrl on job completion (with retries) |
| P6.5 | OpenAPI spec | docs | `docs/api-spec.md` or `openapi.yaml` |
| P6.6 | Architecture docs | docs | `docs/architecture.md` with deep technical detail |
| P6.7 | CLI | cli | `instructo generate <pdf-url> [--text-only] [--output json]` |
| P6.8 | CI pipeline | root | Lint, type-check, test, build, Docker image |
| P6.9 | Load test | root | 10 concurrent jobs, verify stability and resource usage |
| P6.10 | Security review | root | API key handling, input validation, PDF processing safety |

**Deliverable:** Production-hardened service with documentation, CI, and monitoring readiness.

### Timeline Summary

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 0: Foundation | 1 week | Week 1 |
| Phase 1: Text Pipeline | 2 weeks | Week 3 |
| Phase 2: Review Calibration | 1 week | Week 4 |
| Phase 3: Illustration Pipeline | 2 weeks | Week 6 |
| Phase 4: API Server | 1 week | Week 7 |
| Phase 5: MCP + SKILL.md | 3 days | Week 7.5 |
| Phase 6: Harden | 1 week | **Week 8.5** |

---

## 13. Success Criteria

### Text Quality Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| MUST guideline violations | 0 per guide | Validator registry (Layer 4) |
| Verb-first syntax compliance | 100% of steps | `validateVerbFirstSyntax` |
| Sentence length compliance | 100% of sentences <= 20 words | `validateSentenceLength` |
| Part ID reference completeness | 100% of parts include IDs | `validatePartReferences` |
| Active voice compliance | 100% (no passive) | `validateActiveVoice` |
| Quality score (first pass) | >= 85% average across reference set | Quality Reviewer agent |
| Quality score (post-revision) | >= 90% | Quality Reviewer (after feedback loop) |

### Illustration Quality Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Label accuracy | All active parts labeled correctly | Visual QA agent |
| Arrow correctness | Arrows match step actions | Visual QA agent |
| First-pass QA rate | >= 80% of illustrations pass on first generation | Visual QA pass/fail tracking |
| Hallucinated parts | 0 per illustration | Visual QA agent |
| Cross-step consistency | Same part has same label + color everywhere | Illustration Plan verification |

### System Performance Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Cost per guide (text + illustrations) | <= $1.50 | Cost tracker |
| Cost per guide (text only) | <= $0.40 | Cost tracker |
| Processing time (24-page PDF) | <= 20 minutes | Pipeline timing |
| Processing time (10-page PDF, sync) | <= 5 minutes | Sync endpoint timing |
| API uptime | 99.5% | Health check monitoring |
| Job failure rate | < 2% | Job status tracking |

### Domain Generalization Metrics

| Domain | Quality Score Target | Reference Set |
|--------|---------------------|---------------|
| Furniture assembly PDFs | >= 90% | IKEA, Wayfair, generic |
| Electronics setup PDFs | >= 85% | Consumer electronics, routers, smart home |
| Equipment installation PDFs | >= 85% | Industrial, field service |
| Educational procedure PDFs | >= 80% | Lab procedures, training manuals |

### Adoption Metrics (6 months post-launch)

| Metric | Target |
|--------|--------|
| Active API keys | 50+ |
| Monthly API calls | 10,000+ |
| MCP server npm weekly installs | 100+ |
| SKILL.md listed on skills.sh | Yes |
| Paying consumers (Pro tier) | 10+ |

---

## 14. Non-Goals (v1)

These are explicitly out of scope for the initial release. They are intentional decisions, not oversights.

| Non-Goal | Rationale |
|----------|-----------|
| **No web UI** | Instructo is API-first. Consumers build their own UIs. |
| **No product catalog** | Instructo transforms PDFs. It does not store or browse products. |
| **No user accounts** | Authentication is API key-based only. No registration, profiles, sessions. |
| **No subscription management** | Billing is handled externally by consumers or a separate billing service. |
| **No guide editing interface** | Output is consumed programmatically. Editing is the consumer's concern. |
| **No troubleshooting chatbot** | Instructo generates static guides from documents, not conversational AI. |
| **No multi-language output** | v1 generates English only. Translation is a post-processing concern. |
| **No A2A protocol** | Designed A2A-compatible (typed I/O, message interfaces), but not implemented in v1. |
| **No flowcharts/process diagrams** | Illustration MVP: assembly diagrams only. Other visual types are roadmap. |
| **No batch API endpoint** | Consumers submit individual requests. Dedicated batch endpoint is roadmap. |
| **No real-time progress streaming** | Status is polled, not pushed. SSE streaming is a future feature. |
| **No custom agent plugins** | Agent set is fixed in v1. Pluggable architecture is roadmap. |
| **No PDF editing/annotation** | Instructo reads PDFs; it does not modify or annotate them. |

---

## 15. Future Roadmap (post-v1)

### v1.1: Any-Visual Illustrations

Expand illustration generation beyond assembly diagrams to any visual the content needs:
- Wiring diagrams for electronics
- Safety signage and labels
- Tool usage close-ups
- Before/after comparison views
- Exploded views for complex mechanisms
- Cross-section views for internal assemblies

### v1.2: Multi-Language Output

- Accept `targetLanguage` parameter in generation request
- Add a Translation Agent after the Editor (pre-review)
- Localize safety terminology per language and regulatory framework
- Validate translated output against language-specific guideline sets

### v1.3: Batch API

- `POST /v1/generate/batch` accepts an array of PDF URLs
- Returns a batch ID with per-job tracking
- Priority queue management for batch vs. individual jobs
- Bulk pricing discount (lower per-guide cost at volume)

### v1.4: Real-Time Progress Streaming

- SSE endpoint for live pipeline progress updates
- Per-agent status events as they complete
- Illustration preview thumbnails streamed during generation
- Replace polling with push-based updates for consuming applications

### v1.5: A2A Protocol Adoption

- Implement Agent-to-Agent (A2A) protocol for inter-agent communication
- Expose individual agents as reusable A2A services
- Enable running agents on different infrastructure or with different AI providers per agent
- Support multi-server deployments for horizontal scaling

### v1.6: Custom Agent Plugins

- Plugin API for registering custom agents at any point in the pipeline
- Custom agents can run before, after, or in place of built-in agents
- Use cases: domain-specific validators, custom illustration styles, regulatory compliance checks, brand-specific terminology enforcement
- Plugin registry for community-contributed agents

### v2.0: Input Format Expansion

- Scanned PDF support (OCR preprocessing for low-quality scans)
- Image-based manuals (photos of printed manuals)
- Video input (extract key frames from instructional videos)
- HTML documentation (web-based manuals and help pages)

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **Agent** | A specialized AI processing unit with one responsibility, typed I/O, and measurable quality. Called by the Orchestrator, not autonomous. |
| **Orchestrator** | The deterministic TypeScript state machine coordinating all agents. NOT an LLM. |
| **Pipeline** | The full agent execution sequence: text pipeline (7 agents) then illustration pipeline (4 agents). |
| **Guideline** | A YAML document defining rules for work instruction quality, loaded by the Enforcer. |
| **Quality Flag** | A structured observation from the validator registry. Reports issues but never triggers retries. |
| **Feedback Loop** | A revision cycle where reviewer issues route back to upstream agents. Hard-limited to prevent runaway. |
| **Compliance by Construction** | The 4-layer quality system: prompt injection, response schema, post-processing, validation. |
| **Escalation** | Routing from a cheaper model (Flash) to a more capable model (Pro) based on complexity triggers. |
| **Nano Banana** | Gemini 2.5 Flash Image -- illustration generation for simple steps. |
| **Nano Banana Pro** | Gemini 3 Pro Image -- illustration generation for complex steps. |
| **Flash** | Gemini 2.5 Flash -- cost-efficient default model for most agent calls. |
| **Pro** | Gemini 2.5 Pro -- high-accuracy model for review agents and escalation targets. |

## Appendix B: Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | -- | Google Gemini API key |
| `OPENAI_API_KEY` | No | -- | OpenAI API key (fallback provider) |
| `REDIS_URL` | Prod only | `redis://localhost:6379` | Redis connection URL for BullMQ + state |
| `DATABASE_URL` | Prod only | `file:./instructo.db` | SQLite (dev) or Postgres (prod) connection |
| `STORAGE_PATH` | No | `./storage` | Local path for generated files |
| `S3_BUCKET` | Prod only | -- | S3-compatible bucket for illustrations |
| `S3_ENDPOINT` | Prod only | -- | S3-compatible endpoint URL |
| `PORT` | No | `3100` | API server port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, `error` |
| `MAX_CONCURRENT_JOBS` | No | `3` | Maximum parallel pipeline executions |
| `FLASH_MODEL` | No | `gemini-2.5-flash` | Gemini Flash model ID |
| `PRO_MODEL` | No | `gemini-2.5-pro` | Gemini Pro model ID |
| `FLASH_IMAGE_MODEL` | No | `gemini-2.5-flash-image` | Flash Image model ID |
| `PRO_IMAGE_MODEL` | No | `gemini-3-pro-image-preview` | Pro Image model ID |

## Appendix C: docker-compose.yml Reference

```yaml
version: "3.8"
services:
  api:
    build: .
    ports:
      - "3100:3100"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://instructo:instructo@postgres:5432/instructo
      - NODE_ENV=production
    depends_on:
      - redis
      - postgres
    volumes:
      - ./storage:/app/storage

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=instructo
      - POSTGRES_PASSWORD=instructo
      - POSTGRES_DB=instructo
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  redis-data:
  postgres-data:
```
