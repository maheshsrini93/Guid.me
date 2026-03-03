# Product Requirements Document: Guid

> **Version:** 1.0.0
> **Date:** 2026-03-02
> **Status:** Draft

| Field | Value |
|-------|-------|
| **Product** | Guid — General Unified Industrialization Dashboard |
| **First Product** | AI Work Instruction Generator (demo) |
| **Repository** | `Guid.me/` |
| **Stack** | Next.js 15, TypeScript, Tailwind v4, shadcn/ui, Drizzle ORM, SQLite |
| **AI Provider** | Google Gemini API (Flash + Pro) |

---

## Table of Contents

1. [Product Vision & Purpose](#1-product-vision--purpose)
2. [Demo Scenario](#2-demo-scenario)
3. [Architecture Overview](#3-architecture-overview)
4. [Agent Pipeline Design](#4-agent-pipeline-design)
5. [Orchestrator Design](#5-orchestrator-design)
6. [Frontend Design](#6-frontend-design)
7. [Database Schema](#7-database-schema)
8. [Guidelines & Quality System](#8-guidelines--quality-system)
9. [XML Output Schema](#9-xml-output-schema)
10. [API Routes](#10-api-routes)
11. [File Structure](#11-file-structure)
12. [Implementation Phases](#12-implementation-phases)
13. [Environment Variables](#13-environment-variables)
14. [The 5-Minute Demo Script](#14-the-5-minute-demo-script)
15. [Future Vision](#15-future-vision)

---

## 1. Product Vision & Purpose

### One-Liner

**Upload a document, watch 8 AI agents transform it into enterprise-grade work instructions — live, in real time.**

### Problem Statement

In semiconductor manufacturing and other regulated industries, creating and maintaining work instructions is a massive documentation overhead:

- **Manual authoring** — Technical writers spend hours converting engineering knowledge into step-by-step procedures
- **Inconsistent quality** — Different authors produce different styles, levels of detail, and safety coverage
- **No structured output** — Work instructions live in Word/PDF format, unreachable by MES, PLM, or ERP systems
- **Invisible process** — Management cannot see how AI adds value because existing tools are black boxes
- **Compliance gaps** — Guidelines exist but enforcement is manual and error-prone

These problems exist across every industry that produces procedural documentation: semiconductor fabs, pharmaceutical manufacturing, aerospace assembly, automotive production, medical device manufacturing, and consumer product assembly.

### What is Guid?

**Guid** — **G**eneral **U**nified **I**ndustrialization **D**ashboard — is a platform for AI-powered industrialization workflows. The first product is a **work instruction generator** that demonstrates the platform's core capability: transparent, multi-agent AI pipelines with visible, auditable execution.

The demo product takes an instructional document (PDF or DOCX), runs it through **8 specialized AI agents** with a visible pipeline, and produces:

1. **Structured work instructions** — XML-formatted, guideline-compliant, with per-step parts, tools, safety warnings, and quality scores
2. **Assembly illustrations** — AI-generated isometric technical illustrations for each step
3. **Full pipeline transparency** — Every agent's input, output, prompt, and cost is visible in real time via Server-Sent Events

### Key Differentiators

| Differentiator | Description |
|---|---|
| **8 visible agents** | Not a black-box single prompt. Each agent has one job, visible I/O, and measurable output. Management can see exactly what the AI does. |
| **Structured XML output** | Canonical XML with namespace `urn:guid:work-instruction:1.0` proves enterprise-system interoperability to management. Not another PDF — real structured data. |
| **Compliance-by-construction** | 4-layer quality system (prompt injection, response schema, post-processing, validation) means guidelines are enforced by design, not by luck. |
| **Real-time pipeline monitor** | SSE-driven UI shows agents executing live — the star feature for management demos. |
| **Form-driven configuration** | Non-technical users upload a document, pick options, and watch. No CLI, no API keys, no code. |
| **Cost transparency** | Per-agent cost tracking shows management exactly what AI costs per document. |

### Scope Boundaries

| In Scope (Demo v1) | Out of Scope (Demo v1) |
|---|---|
| Transform PDF/DOCX into structured work instructions | Multi-user authentication or accounts |
| Generate per-step assembly illustrations | Role-based access control |
| 8-agent pipeline with real-time SSE monitoring | External API for third-party consumers |
| XML canonical output with quality scores | MCP server or agent integration |
| Form-driven upload and configuration UI | Batch processing of multiple documents |
| Pipeline transparency (prompts, responses, costs) | Custom guideline YAML upload per request |
| Pre-cached fallback for offline demos | Multi-language output |
| SQLite local database | Production PostgreSQL deployment |
| Single-user local deployment | Docker containerization |

### Success Criteria

The primary success criterion is singular and clear:

> **The 5-minute demo convinces management to fund a full team for the Guid platform.**

Supporting metrics:

| Metric | Target |
|---|---|
| Demo completion time | <= 5 minutes end-to-end |
| Pipeline completes without errors | 100% on demo document |
| Quality score on demo document | >= 85 |
| All 8 agents visible in pipeline monitor | Yes |
| XML output renders correctly | Yes |
| Illustrations generate for all steps | Yes |
| Cost per generation visible | Yes |
| Fallback (pre-cached) works offline | Yes |

---

## 2. Demo Scenario

### Overview

The demo tells a story: "We have a problem (documentation overhead), here is the solution (AI pipeline), watch it work (live execution), see the result (structured output), and here is the vision (enterprise platform)."

Total runtime: 5 minutes. The audience is semiconductor manufacturing management — technical enough to appreciate structured data, business-oriented enough to care about cost and scalability.

### Minute-by-Minute Walkthrough

#### 0:00–0:30 — Context (What This Solves)

**Screen:** Landing page with Guid branding.

**Talking points:**
- "Every work instruction we write takes hours of manual effort"
- "The output is a Word doc or PDF — no system can consume it"
- "Quality depends entirely on who wrote it and whether they followed the guidelines"
- "What if AI could do this in minutes, with guaranteed guideline compliance, and output that our systems can actually use?"

**UI action:** None. This is a verbal setup with the landing page visible.

#### 0:30–1:00 — Upload & Configure

**Screen:** Upload & Configure view (`/`).

**Talking points:**
- "I'll upload a sample assembly manual — this is a real IKEA KALLAX PDF, 24 pages"
- "I select the domain — furniture assembly — and set the quality threshold to 85"
- "That's it. No prompt engineering. No configuration files. Click Generate."

**UI actions:**
1. Drag PDF into the dropzone (or click to browse)
2. Select "Furniture Assembly" from the domain dropdown
3. Leave quality threshold at 85 (default)
4. Click "Generate Work Instructions"

**Transition:** Page navigates to `/pipeline/[jobId]`.

#### 1:00–3:30 — Pipeline Monitor (Agents Executing in Real Time)

**Screen:** Pipeline Monitor view (`/pipeline/[jobId]`).

This is the star of the demo — 2.5 minutes of visible AI execution.

**Talking points per agent:**

| Time | Agent | What the Audience Sees | Talking Point |
|---|---|---|---|
| 1:00–1:15 | Document Extractor | Card activates, shows "Extracting 24 pages..." with progress bar | "First, we extract every page from the PDF as high-resolution images. This is pure code — no AI cost." |
| 1:15–1:45 | Vision Analyzer | Card activates, shows per-page analysis with thumbnails updating | "Now Gemini Flash analyzes each page — identifying parts, tools, actions, arrows. Complex pages automatically escalate to Gemini Pro." |
| 1:45–2:00 | Instruction Composer | Card activates, shows step count building | "The Composer takes all those raw observations and builds a logical step sequence. It merges multi-page steps and detects phase boundaries." |
| 2:00–2:15 | Guideline Enforcer | Card activates, shows compliance checks | "This is where our writing guidelines get applied — 38 requirements, verb-first syntax, part IDs, safety callouts. The full YAML guidelines are injected into the prompt." |
| 2:15–2:30 | Quality Reviewer | Card activates (parallel indicator), shows scoring | "Quality and Safety review run in parallel. The Quality Reviewer scores against all 38 writing requirements." |
| 2:15–2:30 | Safety Reviewer | Card activates (parallel indicator), shows hazard checks | "The Safety Reviewer independently verifies hazards — heavy lifts, tip-over risk, two-person requirements." |
| 2:30–2:45 | Illustration Generator | Card activates, shows illustration thumbnails appearing | "Now we generate an isometric illustration for each step. Simple steps use Flash, complex steps use Pro." |
| 2:45–3:00 | XML Assembler | Card activates, shows XML being assembled | "Finally, everything is assembled into canonical XML — the format our enterprise systems expect." |

**Live cost ticker:** Running total in the corner, updating per agent. By completion: ~$0.80–$1.20.

**Expandable details:** Click any agent card to see the actual prompt sent to Gemini and the response received. This is the transparency that sets Guid apart.

**If an agent is slow:** The progress indicators and SSE updates keep the audience engaged. Each agent completing is a visible milestone.

#### 3:30–4:30 — Output Review

**Screen:** Output Review view (`/output/[jobId]`).

**Talking points:**
- "Here's the result — structured XML, not a PDF. Every step has an instruction, parts list, safety callouts, and an illustration."
- "The quality score is [score] — above our 85 threshold, so this would auto-publish in production."
- "Look at the XML — this has a namespace, typed elements, generation metadata. Any MES or PLM system can consume this."
- "Each illustration is isometric, consistent style, with labeled parts and directional arrows."

**UI actions:**
1. Show the XML viewer with syntax highlighting — scroll through the structure
2. Click on the illustration gallery — show per-step illustrations
3. Show the side-by-side comparison (original PDF page vs. generated instruction + illustration)
4. Show the quality score breakdown and any flags raised
5. Click "Export XML" to demonstrate the file download

#### 4:30–5:00 — Close with Metrics and Next Steps

**Screen:** Output Review view with metrics panel visible.

**Talking points:**
- "Total cost: [cost]. Total time: [time]. For a 24-page manual."
- "This is one document. Imagine this running across our entire documentation library."
- "The pipeline is transparent — we can audit every decision the AI made."
- "The XML output integrates directly with our systems — no manual transcription."
- "This demo is the first product in the Guid platform. The architecture supports any workflow type."

**Close:** "We need a team to take this from demo to production. The architecture is proven. The pipeline works. The output format is enterprise-ready. Let's build it."

### Fallback Plan: Pre-Cached Results

For demos without internet or when the Gemini API is slow/down:

**Implementation:**
- Pre-generate results for the KALLAX demo document and store in SQLite
- On pipeline start, check if the document hash matches a cached result
- If cached: replay the SSE events with realistic timing delays (simulating real execution)
- The UI behaves identically — agent cards activate, progress updates, cost ticks
- The output review shows real pre-generated results

**Activation:** Set `DEMO_MODE=true` in environment variables, or the system automatically falls back if the Gemini API is unreachable.

**The audience cannot tell the difference** — the pipeline monitor animates the same way, the output is real (just pre-generated), and the cost/timing numbers are representative.

---

## 3. Architecture Overview

### System Architecture

```
+------------------------------------------------------------------+
|                        GUID DASHBOARD                             |
|                                                                   |
|  +---------------------------+  +------------------------------+  |
|  |     NEXT.JS FRONTEND      |  |       NEXT.JS API ROUTES     |  |
|  |                            |  |                              |  |
|  |  / ............. Upload    |  |  POST /api/jobs              |  |
|  |  /pipeline/[id]  Monitor  |  |  GET  /api/jobs/[id]         |  |
|  |  /output/[id] .. Review   |  |  GET  /api/jobs/[id]/sse     |  |
|  |                            |  |  GET  /api/jobs/[id]/result  |  |
|  |  React Server Components  |  |  POST /api/jobs/[id]/cancel  |  |
|  |  + Client Components      |  |  GET  /api/jobs              |  |
|  |  shadcn/ui + Tailwind v4  |  |                              |  |
|  +------------+---------------+  +------+-------+---------------+  |
|               |                         |       |                  |
|               |    SSE Stream           |       |                  |
|               |<-----------+            |       |                  |
|               |            |            |       |                  |
|  +------------v------------+--+  +------v-------v-----------+     |
|  |      SSE EVENT BUS         |  |     ORCHESTRATOR          |     |
|  |                            |  |                           |     |
|  |  agent:start               |  |  TypeScript State Machine |     |
|  |  agent:progress            |  |  Pipeline Coordination    |     |
|  |  agent:complete            |  |  Feedback Loop Control    |     |
|  |  pipeline:state            |  |  Cost Tracking            |     |
|  |  pipeline:cost             |  |  Error Handling           |     |
|  |  pipeline:error            |  |                           |     |
|  +----------------------------+  +------+--------------------+     |
|                                         |                          |
|  +--------------------------------------v----------------------+   |
|  |                    AGENT PIPELINE                            |   |
|  |                                                              |   |
|  |  [1] Document    [2] Vision     [3] Instruction              |   |
|  |      Extractor       Analyzer       Composer                 |   |
|  |      (code)          (Flash/Pro)    (Flash)                  |   |
|  |         |                |              |                    |   |
|  |         v                v              v                    |   |
|  |  [4] Guideline   [5] Quality    [6] Safety                  |   |
|  |      Enforcer        Reviewer       Reviewer                |   |
|  |      (Flash)         (Pro)          (Pro)                    |   |
|  |         |               \             /                      |   |
|  |         v                +-----+-----+                      |   |
|  |  [7] Illustration              |                             |   |
|  |      Generator           [Parallel]                          |   |
|  |      (Flash Image)             |                             |   |
|  |         |                      v                             |   |
|  |         v               [Quality Gate]                       |   |
|  |  [8] XML Assembler        /        \                         |   |
|  |      (code)          Approved    Revise (max 2x)             |   |
|  |                                                              |   |
|  +--------------------------------------------------------------+   |
|                                                                    |
|  +--------------------------------------------------------------+   |
|  |                    DATA LAYER                                 |   |
|  |                                                               |   |
|  |  +------------------+  +------------------+  +--------------+ |   |
|  |  |  DRIZZLE ORM     |  |  LOCAL STORAGE   |  |  GEMINI API  | |   |
|  |  |  SQLite           |  |  ./storage/      |  |  Flash + Pro | |   |
|  |  |  jobs, agents,    |  |  illustrations/  |  |  Flash Image | |   |
|  |  |  guides, images   |  |  uploads/        |  |              | |   |
|  |  +------------------+  +------------------+  +--------------+ |   |
|  +--------------------------------------------------------------+   |
+--------------------------------------------------------------------+
```

### Agent Pipeline Flow

```
[PDF/DOCX Upload]
    |
    v
+========== DOCUMENT PROCESSING ==========================================+
|                                                                          |
|  [1] DOCUMENT EXTRACTOR (Pure Code)                                      |
|      PDF: pdftoppm -> page images (PNG)                                  |
|      DOCX: mammoth -> HTML -> text + embedded images                     |
|      Output: ExtractedDocument { pages[], text, images[] }               |
|                                                                          |
+==========================================================================+
    |
    v
+========== TEXT PIPELINE (5 Agents) ======================================+
|                                                                          |
|  [2] VISION ANALYZER (Gemini Flash -> Pro escalation)                    |
|      Per-page parallel analysis                                          |
|      Output: RawPageExtraction[] (parts, actions, arrows, fasteners)     |
|                                                                          |
|  [3] INSTRUCTION COMPOSER (Gemini Flash)                                 |
|      Merges all pages into ordered step sequence                         |
|      Handles editing/polishing in same pass                              |
|      Output: ComposedGuide (steps, parts, tools, phases)                 |
|                                                                          |
|  [4] GUIDELINE ENFORCER (Gemini Flash + Full YAML)                       |
|      Applies all 38 WI requirements + post-processing transforms         |
|      Output: EnforcedGuide (compliant steps, metadata)                   |
|                                                                          |
|  [5] QUALITY REVIEWER (Gemini Pro)  ---|                                 |
|      Scores 0-100, tags issues         |--- Parallel execution           |
|      Output: QualityReviewResult       |                                 |
|                                        |                                 |
|  [6] SAFETY REVIEWER (Gemini Pro)  ----|                                 |
|      Hazard verification               |                                 |
|      Output: SafetyReviewResult        |                                 |
|                                                                          |
|  [Quality Gate] Score >= 85 -> Approved                                  |
|                 Score 70-84 -> Revise (max 2 loops back to Enforcer)     |
|                 Score < 70  -> Hold (needs human review)                 |
|                                                                          |
+==========================================================================+
    |
    v (Text Approved)
+========== ILLUSTRATION PIPELINE (1 Agent) ===============================+
|                                                                          |
|  [7] ILLUSTRATION GENERATOR (Gemini Flash Image)                         |
|      Per-step generation with consistent style                           |
|      Labels, arrows, active/inactive part highlighting                   |
|      Output: GeneratedIllustration[] (PNG, per step)                     |
|                                                                          |
+==========================================================================+
    |
    v
+========== OUTPUT ASSEMBLY (1 Agent) =====================================+
|                                                                          |
|  [8] XML ASSEMBLER (Pure Code)                                           |
|      Combines text + illustrations into canonical XML                    |
|      Namespace: urn:guid:work-instruction:1.0                            |
|      Output: Complete XML document + generation metadata                 |
|                                                                          |
+==========================================================================+
    |
    v
[Structured Work Instruction: XML + Illustrations + Quality Metadata]
```

### SSE Event Flow

```
Browser (EventSource)                    Server (SSE Endpoint)
    |                                         |
    |  GET /api/jobs/[jobId]/sse              |
    |---------------------------------------->|
    |                                         |
    |  event: pipeline:state                  |
    |  data: { state: "extracting" }          |
    |<----------------------------------------|
    |                                         |
    |  event: agent:start                     |
    |  data: { agent: "document-extractor",   |
    |          startedAt: "..." }             |
    |<----------------------------------------|
    |                                         |
    |  event: agent:progress                  |
    |  data: { agent: "document-extractor",   |
    |          progress: 0.5,                 |
    |          message: "Extracting page      |
    |           12 of 24" }                   |
    |<----------------------------------------|
    |                                         |
    |  event: agent:complete                  |
    |  data: { agent: "document-extractor",   |
    |          durationMs: 3200,              |
    |          costUsd: 0.00,                 |
    |          summary: "24 pages extracted"} |
    |<----------------------------------------|
    |                                         |
    |  event: pipeline:cost                   |
    |  data: { totalUsd: 0.00,               |
    |          breakdown: {...} }             |
    |<----------------------------------------|
    |                                         |
    |  ... (repeats for each agent) ...       |
    |                                         |
    |  event: agent:start                     |
    |  data: { agent: "quality-reviewer",     |
    |          parallel: true,                |
    |          parallelWith:                  |
    |            "safety-reviewer" }          |
    |<----------------------------------------|
    |                                         |
    |  event: agent:start                     |
    |  data: { agent: "safety-reviewer",      |
    |          parallel: true,                |
    |          parallelWith:                  |
    |            "quality-reviewer" }         |
    |<----------------------------------------|
    |                                         |
    |  ... (both complete) ...                |
    |                                         |
    |  event: pipeline:state                  |
    |  data: { state: "completed",            |
    |          qualityScore: 92,              |
    |          totalCostUsd: 0.87,            |
    |          durationMs: 145000 }           |
    |<----------------------------------------|
    |                                         |
    |  (connection closes)                    |
```

### Technology Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Framework** | Next.js | 15.x | App Router, API routes, React Server Components. Single deployment for frontend + backend. |
| **Language** | TypeScript | 5.x | Type safety for complex agent I/O schemas. Shared types across frontend and backend. |
| **Styling** | Tailwind CSS | v4 | Utility-first, fast iteration, consistent with shadcn/ui. |
| **Components** | shadcn/ui | latest | High-quality accessible components. Customizable, not a dependency. |
| **ORM** | Drizzle | latest | Lighter than Prisma for SQLite. Better DX for demo scope. Type-safe schema-first. |
| **Database** | SQLite | via better-sqlite3 | Zero-config local database. No external dependencies. PostgreSQL-compatible schema design. |
| **AI Provider** | Google Gemini API | 2.5 Flash/Pro | Flash for bulk (fast, cheap), Pro for review (accurate). Flash Image for illustrations. |
| **PDF Processing** | pdftoppm (poppler) | system | High-quality page-to-image conversion for vision extraction. |
| **DOCX Processing** | mammoth | latest | Reliable DOCX-to-HTML conversion with image extraction. |
| **Real-time** | Server-Sent Events | native | One-directional server→client push. Simpler than WebSockets. Built into browsers. |
| **XML** | Custom builder | - | TypeScript XML builder with namespace support. No external dependency needed. |
| **File Storage** | Local filesystem | - | `./storage/` directory for uploads and generated illustrations. |
| **Package Manager** | pnpm | latest | Fast, disk-efficient. Standard for modern TypeScript projects. |
| **Testing** | Vitest | latest | Fast, native TypeScript, ESM-first. |

### Data Flow Summary

```
1. UPLOAD      User uploads PDF/DOCX via dropzone
                 -> File saved to ./storage/uploads/[jobId]/
                 -> Job record created in SQLite (status: pending)
                 -> Redirect to /pipeline/[jobId]

2. EXTRACTION  Document Extractor runs
                 -> PDF: pdftoppm converts pages to PNG images
                 -> DOCX: mammoth extracts HTML + images
                 -> Page images saved to ./storage/jobs/[jobId]/pages/

3. PIPELINE    Agents execute sequentially (with parallel review)
                 -> Each agent reads input from previous agent's output
                 -> Each agent's execution recorded in agent_executions table
                 -> SSE events emitted for each state transition
                 -> Orchestrator manages flow, loops, and error handling

4. OUTPUT      XML Assembler produces final document
                 -> XML saved to ./storage/jobs/[jobId]/output.xml
                 -> Illustrations saved to ./storage/jobs/[jobId]/illustrations/
                 -> generated_guides record created with quality scores
                 -> Job status updated to completed

5. DISPLAY     Output Review view renders results
                 -> XML viewer with syntax highlighting
                 -> Illustration gallery with per-step images
                 -> Quality score breakdown and flags
                 -> Export buttons (XML, JSON, PDF)
```

---

## 4. Agent Pipeline Design

The pipeline consists of 8 agents. This is a simplification of the Instructo PRD's 11-agent design:

- Instructo's "Editor" is merged into the **Instruction Composer** (Agent 3) — composing and polishing happen in one pass
- Instructo's 4 illustration agents (Planner, Prompt Builder, Image Generator, Visual QA) are merged into a single **Illustration Generator** (Agent 7)
- A new **Document Extractor** (Agent 1) handles PDF/DOCX ingestion (Instructo assumed PDF-only input)
- A new **XML Assembler** (Agent 8) produces the canonical XML output (Instructo output JSON)

### Agent Summary Table

| # | Agent | Model | Type | Purpose |
|---|-------|-------|------|---------|
| 1 | Document Extractor | Pure code | Extraction | PDF/DOCX → page images + text |
| 2 | Vision Analyzer | Flash → Pro | Vision AI | Per-page visual analysis |
| 3 | Instruction Composer | Flash | Text AI | Step sequencing + editing + polishing |
| 4 | Guideline Enforcer | Flash | Text AI | YAML guideline compliance enforcement |
| 5 | Quality Reviewer | Pro | Text AI | Quality scoring + feedback routing |
| 6 | Safety Reviewer | Pro | Text AI | Hazard verification (parallel with #5) |
| 7 | Illustration Generator | Flash Image | Image AI | Per-step isometric illustrations |
| 8 | XML Assembler | Pure code | Assembly | Canonical XML output assembly |

---

### Agent 1: Document Extractor

**Purpose:** Extract content from uploaded documents (PDF or DOCX) into a normalized format suitable for downstream AI analysis. This agent is pure code — no LLM calls, no API cost.

**Model:** None (pure TypeScript).

**Execution:** Synchronous. Runs once per job.

**Document ingestion paths:**

| Format | Tool | Process |
|--------|------|---------|
| PDF | `pdftoppm` (poppler) | Convert each page to high-resolution PNG (300 DPI). Save to `./storage/jobs/[jobId]/pages/page-{n}.png`. |
| DOCX | `mammoth` | Convert to HTML, extract embedded images. Parse HTML for text content. Save images to `./storage/jobs/[jobId]/pages/`. |

**Input schema:**

```typescript
interface DocumentExtractorInput {
  /** Path to the uploaded file on local storage */
  filePath: string;
  /** MIME type of the uploaded file */
  mimeType: "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  /** Unique job identifier */
  jobId: string;
}
```

**Output schema:**

```typescript
interface ExtractedDocument {
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
  /** Extraction timing */
  durationMs: number;
}

interface ExtractedPage {
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
```

**Guardrails:**
- MUST validate file type before processing (reject non-PDF/DOCX)
- MUST extract at 300 DPI minimum for PDF pages
- MUST handle corrupted or password-protected PDFs gracefully (fail with clear error)
- MUST report accurate page count and extraction timing
- Zero API cost — this is deterministic code

**Demo transparency:** Shows extraction progress (page N of M) with page thumbnails appearing as they are extracted.

---

### Agent 2: Vision Analyzer

**Purpose:** Examine each extracted page image and output structured JSON describing raw visual facts — parts, actions, arrows, spatial relationships, fasteners, and confidence. This agent sees the image; it does NOT interpret, narrate, or write instructions.

**Model:** Gemini 2.5 Flash (default), escalates to Gemini 2.5 Pro on triggers.

**Execution:** Parallel per-page (rate-limit permitting). Each page is an independent call.

**Escalation triggers (Flash → Pro):**
- 5+ arrows/overlays in one panel
- Hinge, drawer-slide, or rotation mechanics depicted
- Fastener ambiguity (e.g., Torx vs. Phillips, "tight vs. loose" indicators)
- Flash self-reported confidence < 0.7
- Flash fails to produce valid JSON

**Input schema:**

```typescript
interface VisionAnalyzerInput {
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
```

**Output schema:**

```typescript
interface RawPageExtraction {
  /** Extracted steps from this page */
  steps: RawStepExtraction[];
  /** Page-level indicators for escalation decisions */
  pageIndicators: {
    arrowCount: number;
    hasHingeOrRotation: boolean;
    hasFastenerAmbiguity: boolean;
    isPartsPage: boolean;
  };
}

interface RawStepExtraction {
  /** Step number as shown on page (0 for parts/tools overview pages) */
  stepNumber: number;
  /** Factual observation, NOT narrative prose */
  rawDescription: string;
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
}

interface PartReference {
  /** Part identifier (e.g., "104321" or "A") */
  partNumber: string;
  /** Part name (e.g., "Wooden dowel") */
  partName: string;
  /** Quantity shown */
  quantity: number;
}

interface ToolReference {
  /** Tool name (e.g., "Phillips screwdriver") */
  toolName: string;
  /** Optional icon identifier */
  toolIcon?: string;
}

interface VisualAction {
  /** Action type (e.g., "insert", "attach", "rotate", "tighten") */
  actionType: string;
  /** What is being acted on */
  subject: string;
  /** Where it goes */
  target: string;
  /** Direction of motion (e.g., "push downward", "slide left-to-right") */
  direction?: string;
}

interface ArrowAnnotation {
  /** Arrow direction (e.g., "downward", "clockwise") */
  direction: string;
  /** Text label near the arrow */
  label?: string;
  /** true = assembly motion, false = callout pointer */
  indicatesMotion: boolean;
}

interface FastenerDetail {
  /** Fastener type (e.g., "cam lock", "screw", "bolt", "dowel") */
  type: string;
  /** Part identifier */
  partId?: string;
  /** Rotation direction */
  rotation: "clockwise" | "counter_clockwise" | "none";
  /** Additional notes (e.g., "quarter-turn to lock") */
  notes?: string;
}
```

**Guardrails:**
- MUST NOT interpret or write human-readable instructions — raw visual facts only
- MUST NOT reference information from other pages
- MUST report confidence honestly (< 0.7 triggers escalation to Pro)
- MUST flag ambiguous mechanisms explicitly in annotations

**Prompt strategy:** System prompt establishes the role as a "technical visual observer" with explicit prohibitions against narration. The full condensed guideline MUST rules are included. Response uses Gemini `responseSchema` to enforce the `RawPageExtraction` shape.

**Demo transparency:** Shows per-page progress with thumbnails. Expandable detail shows the raw JSON extraction per page, and whether Flash or Pro was used.

---

### Agent 3: Instruction Composer

**Purpose:** Take all Vision Analyzer outputs (the full set of per-page extractions) and produce a single ordered, polished step sequence with titles, parts, tools, transitions, and phase breaks. This agent merges Instructo's Sequence Composer and Editor roles — it both composes the sequence AND polishes for readability in a single pass.

**Model:** Gemini 2.5 Flash (text-only, no vision input).

**Execution:** Single call per guide. Receives the complete set of page extractions.

**Input schema:**

```typescript
interface InstructionComposerInput {
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
```

**Output schema:**

```typescript
interface ComposedGuide {
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

interface ComposedStep {
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

interface PhaseBoundary {
  /** Step number where this phase begins */
  beforeStepNumber: number;
  /** Phase name (e.g., "Frame Assembly", "Wiring") */
  phaseName: string;
}
```

**Guardrails:**
- MUST merge steps that span multiple PDF pages into a single coherent step
- MUST renumber steps sequentially (no gaps)
- MUST preserve all raw visual data (actions, arrows, fasteners) through the merge
- MUST produce readable, natural-sounding instructions (not robotic)
- MUST detect phase boundaries for guides with > 8 steps
- MUST NOT apply guideline formatting rules — that is the Enforcer's job

**Prompt strategy:** System prompt establishes the role as a "technical writer composing assembly instructions." The tone parameter influences writing style. Response uses `responseSchema` for structural enforcement.

**Demo transparency:** Shows the step count building in real time. Expandable detail shows the full composed guide with step titles and instruction previews.

---

### Agent 4: Guideline Enforcer

**Purpose:** Receive the composed guide and the **full** guidelines YAML document. Apply all 38 work instruction requirements (WI-001 through WI-038) to transform the composed steps into guideline-compliant structured work instructions. This agent is the primary compliance mechanism.

**Model:** Gemini 2.5 Flash (text-only).

**Execution:** Single call per guide. Receives the full composed guide and full guidelines YAML (no truncation).

**Input schema:**

```typescript
interface GuidelineEnforcerInput {
  /** The composed guide from Agent 3 */
  composedGuide: ComposedGuide;
  /** Full work instruction guidelines YAML (untruncated) */
  guidelinesYaml: string;
  /** Full illustration guidelines YAML (for cross-reference) */
  illustrationGuidelinesYaml?: string;
}
```

**Output schema:**

```typescript
interface EnforcedGuide {
  /** Guideline-compliant steps */
  steps: EnforcedStep[];
  /** Guide-level metadata */
  guideMetadata: GuideMetadata;
}

interface EnforcedStep {
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
type AllowedVerb =
  | "Insert" | "Attach" | "Tighten" | "Slide"
  | "Place" | "Align" | "Press" | "Push"
  | "Lower" | "Lift" | "Flip" | "Screw"
  | "Snap" | "Hook" | "Position" | "Secure";

interface StructuredPartRef {
  /** Part name (e.g., "Wooden dowel") */
  name: string;
  /** Part identifier (e.g., "A" or "104321") */
  id: string;
  /** Quantity used in this step */
  quantity: number;
}

interface SafetyCallout {
  /** Severity level */
  severity: "caution" | "warning" | "danger";
  /** Callout text */
  text: string;
}

interface GuideMetadata {
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
```

**Key guideline requirements enforced:**

| Requirement | ID | Enforcement |
|---|---|---|
| Structured guide layout | WI-001 | Response schema enforces section structure |
| Phase grouping for long guides | WI-006 | Phase boundaries from Composer, validated |
| Title format | WI-007 | Imperative verb + object, <= 8 words |
| Safety callout placement | WI-015 | Callouts before hazardous steps |
| Two-person flagging | WI-018 | Boolean field, explicitly checked |
| Wall anchoring advisory | WI-019 | Added for tall/heavy products |
| Verb-first syntax | WI-022 | Only 16 approved verbs, instruction starts with verb |
| One action per sentence | WI-023 | Sentence splitting enforced |
| Sentence length limit | WI-024 | <= 20 words per sentence |
| Part ID references | WI-025 | "wooden dowel (A)" format enforced |
| Quantity specification | WI-026 | "4 wooden dowels (A)" when quantity > 1 |
| Active voice | WI-027 | No passive constructions |
| Consistent terminology | WI-028 | Same part = same name everywhere |

**Guardrails:**
- MUST use only approved imperative verbs (WI-022)
- MUST include part ID references in parentheses (WI-025)
- MUST include quantities when > 1 (WI-026)
- MUST keep sentences to 20 words or fewer (WI-024)
- MUST use active voice — no passive constructions (WI-027)
- MUST include safety callouts before hazardous steps (WI-015)
- MUST flag two-person steps explicitly (WI-018)
- Receives full guidelines YAML — NO character budget truncation

**Prompt strategy:** The full `work-instructions.yaml` is injected into the system prompt. Response uses Gemini `responseSchema` with the `AllowedVerb` enum to make verb violations impossible at the model level. Post-processing transforms (Layer 3) run after the LLM response to catch any remaining violations.

**Demo transparency:** Shows compliance checks running. Expandable detail shows which guidelines were applied and any post-processing corrections made.

---

### Agent 5: Quality Reviewer

**Purpose:** Score the complete enforced guide against quality criteria. Return structured issues with severity, category, step number, and suggested fixes. The score determines whether the guide is approved, needs revision, or is held for human review.

**Model:** Gemini 2.5 Pro (higher accuracy for evaluation tasks).

**Execution:** Single call per guide. Runs in **parallel** with Safety Reviewer (Agent 6).

**Input schema:**

```typescript
interface QualityReviewerInput {
  /** The enforced guide from Agent 4 */
  enforcedGuide: EnforcedGuide;
  /** Original page extractions for cross-verification */
  originalExtractions: RawPageExtraction[];
  /** Full guidelines YAML for scoring reference */
  guidelinesYaml: string;
}
```

**Output schema:**

```typescript
interface QualityReviewResult {
  /** Overall quality score (0-100) */
  overallScore: number;
  /** Decision based on score threshold */
  decision: "approved" | "revise" | "hold";
  /** Specific issues found */
  issues: QualityIssue[];
  /** Human-readable summary */
  summary: string;
}

interface QualityIssue {
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

type QualityCategory =
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
```

**Decision thresholds:**

| Score | Decision | Action |
|-------|----------|--------|
| >= 85 | `approved` | Ready for illustration generation and XML assembly |
| 70–84 | `revise` | Feedback routed to responsible agent (max 2 revision loops) |
| < 70 | `hold` | Pipeline completes with `hold` status; full feedback included |

**Guardrails:**
- MUST compare enforced guide against original vision extractions (catch hallucinations)
- MUST tag each issue with `responsibleAgent` for feedback routing
- MUST score using consistent criteria across all guides
- MUST produce actionable suggested fixes for revision issues

**Demo transparency:** Shows the score building in real time. Parallel execution indicator with Safety Reviewer. Expandable detail shows individual issues and the overall score breakdown.

---

### Agent 6: Safety Reviewer

**Purpose:** Dedicated safety review pass. Checks for hazard verification independent of the Quality Reviewer. Safety is important enough to warrant its own dedicated agent and model call.

**Model:** Gemini 2.5 Pro (safety-critical evaluation).

**Execution:** Single call per guide. Runs in **parallel** with Quality Reviewer (Agent 5).

**Input schema:**

```typescript
interface SafetyReviewerInput {
  /** The enforced guide from Agent 4 */
  enforcedGuide: EnforcedGuide;
  /** Original page extractions for hazard cross-check */
  originalExtractions: RawPageExtraction[];
}
```

**Output schema:**

```typescript
interface SafetyReviewResult {
  /** Whether safety review passed */
  safetyPassed: boolean;
  /** Safety issues found */
  issues: SafetyIssue[];
  /** Recommended safety classification */
  recommendedSafetyLevel: "low" | "medium" | "high";
}

interface SafetyIssue {
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

type HazardType =
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
```

**Guardrails:**
- MUST check all standard hazard categories regardless of document domain
- MUST flag heavy lifts (> 15 kg), tip-over risk (> 60 cm), sharp edges, pinch points
- MUST verify two-person steps have explicit callouts (WI-018)
- MUST verify wall anchoring advisory for tall/heavy products (WI-019)
- MUST verify warnings appear before (not after) hazardous instructions (WI-015)

**Prompt strategy:** System prompt establishes the role as a "safety compliance auditor." The prompt includes the safety-related subset of guidelines (WI-014 through WI-020). Response uses `responseSchema` for structured output.

**Demo transparency:** Shows hazard categories being checked. Parallel execution indicator with Quality Reviewer. Expandable detail shows each hazard check result.

---

### Agent 7: Illustration Generator

**Purpose:** Generate one isometric technical illustration per step. This agent merges Instructo's 4 illustration agents (Planner, Prompt Builder, Image Generator, Visual QA) into a single streamlined agent that handles planning, prompt construction, and generation internally.

**Model:** Gemini 2.5 Flash Image (`gemini-2.5-flash-preview-image-generation`).

**Execution:** Sequential per step (API rate limits). Generates one illustration per step.

**Input schema:**

```typescript
interface IllustrationGeneratorInput {
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
```

**Output schema:**

```typescript
interface GeneratedIllustration {
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
```

**Illustration guidelines applied (IL-001 through IL-018):**

| Requirement | ID | How Applied |
|---|---|---|
| Isometric technical style | IL-001 | Prompt prefix: style, perspective, palette, background |
| Standardized dimensions | IL-002 | Request 1024x1024, verify output dimensions |
| No text in illustrations | IL-003 | Explicit prohibition in prompt; only labels/quantities permitted |
| Image quality standards | IL-004 | Quality check in prompt; regenerate on failure |
| Color consistency | IL-005 | Part-to-color mapping maintained across all steps |
| Active/inactive highlighting | IL-006 | Active parts in full color, inactive parts muted |
| Alphabetical part labels | IL-007 | Labels A, B, C... (skip I, O) from partLabelMap |
| Exploded views | IL-008 | Triggered for 3+ parts in small area |
| Detail callouts | IL-009 | Triggered for small hardware/intricate connections |
| Direction arrows | IL-010 | Motion arrows matching step actions |
| Rotation arrows | IL-011 | Curved arrows for tightening/turning operations |
| Measurement notation | IL-012 | Dimension lines when spacing is critical |
| OK/NOK illustrations | IL-013 | For steps with common mistakes (max 2-3 per guide) |
| Checkpoint images | IL-014 | At phase transitions, showing cumulative progress |
| Two-person indicator | IL-015 | Two-person icon when twoPersonRequired is true |
| One illustration per step | IL-016 | Enforced by architecture (one call per step) |
| Consistent viewing angle | IL-017 | Same angle within each phase |
| Complexity-based routing | IL-018 | Simple steps use Flash Image; complex steps use Pro Image |

**Internal prompt construction:**

The agent builds a structured prompt per step:

```
[STYLE] Clean isometric technical assembly illustration. Line art with
subtle shading, neutral/warm color palette, white background.

[PRODUCT] {productName}, Step {stepNumber} of {totalSteps}.

[COLOR PALETTE]
- Active parts: Full color (material-accurate)
- Inactive parts: Muted/semi-transparent gray
- Fasteners: Amber highlight
- Arrows: Blue (direction) / Red (rotation)

[SCENE] {stepInstruction}

[ACTIVE PARTS]
{activeParts with labels and colors}

[INACTIVE PARTS]
{previouslyAssembledParts, muted}

[ARROWS]
{directional arrows matching step actions}

[VIEWING ANGLE] {phaseAngle}

[DO NOT INCLUDE] Instructional text, human hands, photorealistic
textures, brand logos, gradients, scenery.
```

**Guardrails:**
- MUST generate exactly one illustration per step
- MUST maintain consistent part labels and colors across all steps
- MUST include direction/rotation arrows matching the step's actions
- MUST use active/inactive part highlighting (IL-006)
- MUST include two-person indicator when applicable (IL-015)
- Individual step failures do not block other steps

**Demo transparency:** Shows illustration thumbnails appearing one at a time as each step is generated. Expandable detail shows the prompt sent to Gemini and the generated image.

---

### Agent 8: XML Assembler

**Purpose:** Combine the approved text guide and generated illustrations into the canonical XML output document. This agent is pure code — no LLM calls, no API cost. It produces the final structured output that enterprise systems can consume.

**Model:** None (pure TypeScript).

**Execution:** Synchronous. Runs once per job after all illustrations are generated.

**Input schema:**

```typescript
interface XmlAssemblerInput {
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
```

**Output schema:**

```typescript
interface XmlAssemblerOutput {
  /** Complete XML document as string */
  xmlContent: string;
  /** Path where XML file is saved */
  xmlFilePath: string;
  /** JSON representation (for API responses) */
  jsonContent: object;
  /** Assembly duration */
  durationMs: number;
}
```

**Guardrails:**
- MUST produce valid XML with namespace `urn:guid:work-instruction:1.0`
- MUST include all elements: metadata, parts-list, tools-required, safety-warnings, phases, steps, generation-metadata
- MUST reference illustration files by relative path
- MUST include quality scores and flags in generation-metadata
- Zero API cost — this is deterministic code

**Demo transparency:** Shows XML being assembled with a progress indicator. Expandable detail shows the complete XML structure.

---

## 5. Orchestrator Design

The Orchestrator is a **deterministic TypeScript state machine** that coordinates all 8 agents. It is NOT an LLM — it is pure code that routes data between agents, tracks costs, enforces loop limits, manages state transitions, and emits SSE progress events.

### State Machine Diagram

```
                +------------------+
                |     PENDING      |
                +--------+---------+
                         |
                Document uploaded, job created
                         |
                         v
                +------------------+
                |   EXTRACTING     |  Agent 1: Document Extractor
                +--------+---------+
                         |
                All pages extracted
                         |
                         v
                +------------------+
                |   ANALYZING      |  Agent 2: Vision Analyzer (parallel per page)
                +--------+---------+
                         |
                All pages analyzed
                         |
                         v
                +------------------+
                |   COMPOSING      |  Agent 3: Instruction Composer
                +--------+---------+
                         |
                         v
                +------------------+
                |   ENFORCING      |  Agent 4: Guideline Enforcer
                +--------+---------+
                         |
                         v
                +------------------+
                |   REVIEWING      |  Agent 5 + 6: Quality + Safety (parallel)
                +--------+---------+
                         |
                +--------+---------+
                |                  |
          Score >= 85        Score 70-84
                |            AND loops < 2
                |                  |
                v                  v
       +----------------+  +------------------+
       |   APPROVED     |  |    REVISING      |  Route feedback to Enforcer
       +-------+--------+  +--------+---------+
               |                     |
               |              Re-enter at ENFORCING
               |              textRevisionCount++
               |
               v
       +------------------+
       |  ILLUSTRATING    |  Agent 7: Illustration Generator (per step)
       +--------+---------+
                |
                v
       +------------------+
       |   ASSEMBLING     |  Agent 8: XML Assembler
       +--------+---------+
                |
                v
       +------------------+
       |   COMPLETED      |  Full work instruction ready
       +------------------+

  Score < 70 OR loops >= 2:
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

### Pipeline States

```typescript
type PipelineStatus =
  | "pending"        // Job created, waiting to start
  | "extracting"     // Agent 1: Document Extractor running
  | "analyzing"      // Agent 2: Vision Analyzer running (parallel per page)
  | "composing"      // Agent 3: Instruction Composer running
  | "enforcing"      // Agent 4: Guideline Enforcer running
  | "reviewing"      // Agents 5+6: Quality + Safety Reviewers (parallel)
  | "revising"       // Feedback loop: re-running Enforcer with issues
  | "illustrating"   // Agent 7: Illustration Generator running (per step)
  | "assembling"     // Agent 8: XML Assembler running
  | "completed"      // Pipeline finished (may be approved, review, or hold)
  | "failed"         // Pipeline failed with error
  | "cancelled";     // Pipeline cancelled by user
```

### Orchestrator State Type

```typescript
interface PipelineState {
  /** Unique job identifier */
  jobId: string;
  /** Current pipeline status */
  status: PipelineStatus;

  // --- Input ---
  /** Path to the uploaded document */
  documentPath: string;
  /** Document MIME type */
  documentMimeType: string;

  // --- Agent Outputs (populated as pipeline progresses) ---
  extractedDocument?: ExtractedDocument;
  pageExtractions?: RawPageExtraction[];
  composedGuide?: ComposedGuide;
  enforcedGuide?: EnforcedGuide;
  qualityReview?: QualityReviewResult;
  safetyReview?: SafetyReviewResult;
  illustrations?: GeneratedIllustration[];
  xmlOutput?: XmlAssemblerOutput;

  // --- Loop Tracking ---
  /** Text revision count (max 2) */
  textRevisionCount: number;

  // --- Cost Tracking ---
  /** Per-agent cost records */
  costs: AgentCostRecord[];
  /** Running total cost */
  totalCostUsd: number;

  // --- Timing ---
  startedAt: Date;
  completedAt?: Date;
  lastProgressAt: Date;

  // --- Error ---
  error?: string;
}

interface AgentCostRecord {
  /** Agent identifier */
  agent: string;
  /** Model used */
  model: string;
  /** Input tokens consumed */
  inputTokens: number;
  /** Output tokens produced */
  outputTokens: number;
  /** Cost in USD */
  costUsd: number;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** When this execution happened */
  timestamp: Date;
}
```

### Quality + Safety Parallel Execution

Agents 5 (Quality Reviewer) and 6 (Safety Reviewer) run in parallel using `Promise.all()`. Both must complete before the Orchestrator evaluates the quality gate.

```typescript
// Simplified parallel execution
const [qualityResult, safetyResult] = await Promise.all([
  qualityReviewer.execute(qualityInput),
  safetyReviewer.execute(safetyInput),
]);

// Safety issues are merged into quality assessment
if (!safetyResult.safetyPassed) {
  // Safety failures always require revision
  qualityResult.decision = "revise";
  qualityResult.issues.push(
    ...safetyResult.issues.map(toQualityIssue)
  );
}
```

### Feedback Loop Design

**Text revision loop (max 2 iterations):**

```
Quality Reviewer returns decision = "revise" (score 70-84)
    |
    v
Orchestrator checks: textRevisionCount < 2?
    |
   Yes --> Route all issues to Guideline Enforcer (Agent 4)
    |      Enforcer receives: original composed guide + quality issues
    |      Re-runs enforcement with issue context
    |      Pipeline continues from ENFORCING -> REVIEWING
    |      textRevisionCount++
    |
   No  --> Complete with qualityDecision = "hold"
           Full feedback history from all loops included in result
           Output is still generated but flagged for human review
```

**Key design decision:** Unlike Instructo's dual-routing (Enforcer vs Editor), Guid routes all revision feedback to the Guideline Enforcer. This simplifies the feedback loop since the Composer and Enforcer roles handle both composition and compliance.

### SSE Event Specification

Events are sent via the `/api/jobs/[jobId]/sse` endpoint using standard Server-Sent Events format.

**Event types:**

| Event | Data Shape | When Emitted |
|-------|-----------|-------------|
| `pipeline:state` | `{ state: PipelineStatus, timestamp: string }` | Every state transition |
| `agent:start` | `{ agent: string, startedAt: string, parallel?: boolean, parallelWith?: string }` | When an agent begins execution |
| `agent:progress` | `{ agent: string, progress: number, message: string }` | During agent execution (0.0 to 1.0) |
| `agent:complete` | `{ agent: string, durationMs: number, costUsd: number, summary: string, outputPreview?: object }` | When an agent finishes |
| `pipeline:cost` | `{ totalUsd: number, breakdown: Record<string, number> }` | After each agent completes |
| `pipeline:error` | `{ error: string, agent?: string, recoverable: boolean }` | On error |
| `pipeline:complete` | `{ state: "completed", qualityScore: number, qualityDecision: string, totalCostUsd: number, durationMs: number }` | Pipeline finished |

**SSE message format:**

```
event: agent:start
data: {"agent":"vision-analyzer","startedAt":"2026-03-02T10:00:05Z","parallel":false}

event: agent:progress
data: {"agent":"vision-analyzer","progress":0.5,"message":"Analyzing page 12 of 24"}

event: agent:complete
data: {"agent":"vision-analyzer","durationMs":28500,"costUsd":0.055,"summary":"24 pages analyzed (18 Flash, 6 Pro)"}

event: pipeline:cost
data: {"totalUsd":0.055,"breakdown":{"document-extractor":0,"vision-analyzer":0.055}}
```

### Error Handling

| Error Type | Behavior |
|---|---|
| Agent timeout | Retry once with extended timeout. If second attempt fails, mark job as failed with partial results. |
| Gemini API error (429/500) | Exponential backoff retry (3 attempts). After exhaustion, fail the agent. |
| Invalid agent output | Log the malformed response. Retry once. If still invalid, fail the job. |
| Document extraction failure | Fail immediately with descriptive error. No retry (likely bad input). |
| User cancellation | Set status to `cancelled`. Abort any in-flight API calls. Return partial results if available. |

### Cost Tracking

Every agent execution is recorded with:
- Model name and version
- Input/output token counts
- Computed cost in USD (using published Gemini pricing)
- Execution duration

Cost is tracked in real time and emitted via SSE after each agent completes. The running total is visible in the Pipeline Monitor's cost ticker.

**Estimated cost per guide (24-page PDF, 14 steps):**

| Component | Est. Cost |
|---|---|
| Document Extractor | $0.00 (pure code) |
| Vision Analyzer (18 Flash + 6 Pro) | $0.06 |
| Instruction Composer (Flash) | $0.02 |
| Guideline Enforcer (Flash) | $0.03 |
| Quality Reviewer (Pro) | $0.08 |
| Safety Reviewer (Pro) | $0.04 |
| Illustration Generator (14 steps, Flash Image) | $0.70 |
| XML Assembler | $0.00 (pure code) |
| **Total** | **~$0.93** |

---

## 6. Frontend Design

The frontend has three views, each corresponding to a stage of the user journey: Upload, Monitor, Review. Built with Next.js App Router, React Server Components + Client Components, shadcn/ui, and Tailwind v4.

### View 1: Upload & Configure (`/`)

**Purpose:** The entry point. User uploads a document and configures generation options.

**Layout:**

```
+------------------------------------------------------------------+
|  GUID LOGO                                            [History]   |
+------------------------------------------------------------------+
|                                                                    |
|  +--------------------------------------------------------------+ |
|  |                                                                | |
|  |     +------------------------------------------+              | |
|  |     |                                          |              | |
|  |     |    [ICON]                                |              | |
|  |     |                                          |              | |
|  |     |    Drop your document here               |              | |
|  |     |    or click to browse                    |              | |
|  |     |                                          |              | |
|  |     |    PDF or DOCX, up to 50 MB              |              | |
|  |     |                                          |              | |
|  |     +------------------------------------------+              | |
|  |                                                                | |
|  |  Document Name:  [Auto-detected from filename    ]            | |
|  |                                                                | |
|  |  Domain:         [Furniture Assembly         v]               | |
|  |                   General | Furniture | Electronics |         | |
|  |                   Industrial | Automotive | Medical           | |
|  |                                                                | |
|  |  Quality Threshold:  [85]  (0-100)                            | |
|  |                                                                | |
|  |  Generate Illustrations:  [x] Yes                             | |
|  |                                                                | |
|  |                  [ Generate Work Instructions ]                | |
|  |                                                                | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  Recent Jobs                                                       |
|  +--------------------+--------------------+--------------------+  |
|  | KALLAX Manual       | HEMNES Dresser     | Router Setup       | |
|  | Completed (92)      | In Progress...     | Failed             | |
|  | 2 min ago           | Just now           | 1 hour ago         | |
|  +--------------------+--------------------+--------------------+  |
+--------------------------------------------------------------------+
```

**Component hierarchy:**

```
app/page.tsx (Server Component)
  └── UploadView (Client Component)
      ├── Header
      │   ├── Logo
      │   └── HistoryButton -> navigates to job list
      ├── FileDropzone
      │   ├── DropArea (react-dropzone)
      │   ├── FilePreview (shows filename, size, type after upload)
      │   └── UploadProgress (during file upload)
      ├── ConfigurationForm
      │   ├── DocumentNameInput
      │   ├── DomainSelect (shadcn Select)
      │   ├── QualityThresholdInput (shadcn Input, type="number")
      │   ├── IllustrationToggle (shadcn Switch)
      │   └── GenerateButton (shadcn Button, primary)
      └── RecentJobs
          └── JobCard[] (status, score, timestamp, link to pipeline/output)
```

**shadcn/ui components used:** `Button`, `Input`, `Select`, `Switch`, `Card`, `Badge`, `Separator`

**Key interactions:**
- File drag-and-drop with visual feedback (border highlight, icon change)
- Document name auto-populated from filename (editable)
- Domain defaults to "General" — user can change
- Quality threshold defaults to 85 — adjustable 0-100
- Generate button disabled until file is uploaded
- On submit: `POST /api/jobs` with multipart form data → redirect to `/pipeline/[jobId]`
- Recent jobs loaded from `GET /api/jobs` (last 10)

### View 2: Pipeline Monitor (`/pipeline/[jobId]`)

**Purpose:** The star of the demo. Shows 8 agent cards executing in real time via SSE. This view is what convinces management that AI is transparent and auditable.

**Layout:**

```
+------------------------------------------------------------------+
|  GUID LOGO          Pipeline Monitor          Cost: $0.23  [X]   |
+------------------------------------------------------------------+
|                                                                    |
|  Document: KALLAX_assembly.pdf (24 pages)                         |
|  Status: REVIEWING            Elapsed: 2m 15s                     |
|                                                                    |
|  +--------------------------------------------------------------+ |
|  |  AGENT PIPELINE TIMELINE                                      | |
|  |                                                                | |
|  |  [1] Document Extractor                              DONE     | |
|  |      24 pages extracted (3.2s, $0.00)                         | |
|  |      [v] Show Details                                         | |
|  |                                                                | |
|  |  [2] Vision Analyzer                                 DONE     | |
|  |      24 pages analyzed - 18 Flash, 6 Pro (28.5s, $0.06)      | |
|  |      [v] Show Details                                         | |
|  |                                                                | |
|  |  [3] Instruction Composer                            DONE     | |
|  |      14 steps composed, 3 phases (8.1s, $0.02)               | |
|  |      [v] Show Details                                         | |
|  |                                                                | |
|  |  [4] Guideline Enforcer                              DONE     | |
|  |      38 requirements applied (12.3s, $0.03)                   | |
|  |      [v] Show Details                                         | |
|  |                                                                | |
|  |  [5] Quality Reviewer          [PARALLEL]          RUNNING    | |
|  |      ████████░░ 80% - Scoring against 12 categories...       | |
|  |      [v] Show Details                                         | |
|  |                                                                | |
|  |  [6] Safety Reviewer           [PARALLEL]          RUNNING    | |
|  |      ██████████ 100% - 10 hazard types checked               | |
|  |      [v] Show Details                                         | |
|  |                                                                | |
|  |  [7] Illustration Generator                        PENDING    | |
|  |      Waiting for text approval...                             | |
|  |                                                                | |
|  |  [8] XML Assembler                                 PENDING    | |
|  |      Waiting for illustrations...                             | |
|  |                                                                | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  +--------------------------------------------------------------+ |
|  |  DETAIL DRAWER (expanded for Agent 2)                         | |
|  |                                                                | |
|  |  Prompt (Page 5):                                             | |
|  |  ┌──────────────────────────────────────────────────────────┐ | |
|  |  │ You are a technical visual observer. Examine this page   │ | |
|  |  │ image and describe what you see: parts, actions, arrows, │ | |
|  |  │ spatial relationships...                                 │ | |
|  |  └──────────────────────────────────────────────────────────┘ | |
|  |                                                                | |
|  |  Response (Page 5):                                           | |
|  |  ┌──────────────────────────────────────────────────────────┐ | |
|  |  │ { "steps": [{ "stepNumber": 5, "rawDescription":        │ | |
|  |  │   "Two side panels being attached to base with dowels",  │ | |
|  |  │   "partsShown": [...], "confidence": 0.92 }] }          │ | |
|  |  └──────────────────────────────────────────────────────────┘ | |
|  |                                                                | |
|  |  Tokens: 2,100 in / 450 out | Cost: $0.0005 | Model: Flash  | |
|  +--------------------------------------------------------------+ |
+--------------------------------------------------------------------+
```

**Component hierarchy:**

```
app/pipeline/[jobId]/page.tsx (Server Component — initial load)
  └── PipelineMonitor (Client Component — SSE consumer)
      ├── PipelineHeader
      │   ├── Logo
      │   ├── DocumentInfo (filename, page count)
      │   ├── StatusBadge (current pipeline state)
      │   ├── ElapsedTimer (live timer)
      │   ├── CostTicker (live cost, updates per agent)
      │   └── CancelButton
      ├── AgentTimeline
      │   └── AgentCard[] (one per agent, 8 total)
      │       ├── AgentIcon (numbered, color-coded by status)
      │       ├── AgentName
      │       ├── StatusIndicator (pending | running | done | error)
      │       ├── ProgressBar (for running agents)
      │       ├── Summary (after completion: duration, cost, key output)
      │       ├── ParallelBadge (for agents 5+6)
      │       └── ExpandButton -> toggles DetailDrawer
      └── DetailDrawer (collapsible panel for selected agent)
          ├── PromptViewer (syntax-highlighted prompt text)
          ├── ResponseViewer (syntax-highlighted JSON response)
          ├── TokenCostBar (input tokens, output tokens, cost)
          └── ModelBadge (Flash / Pro / Flash Image)
```

**shadcn/ui components used:** `Card`, `Badge`, `Progress`, `Button`, `Collapsible`, `ScrollArea`, `Separator`, `Tabs`

**SSE integration:**

```typescript
// Simplified SSE connection in PipelineMonitor
useEffect(() => {
  const eventSource = new EventSource(`/api/jobs/${jobId}/sse`);

  eventSource.addEventListener("pipeline:state", (e) => {
    const data = JSON.parse(e.data);
    setPipelineState(data.state);
  });

  eventSource.addEventListener("agent:start", (e) => {
    const data = JSON.parse(e.data);
    updateAgent(data.agent, { status: "running", startedAt: data.startedAt });
  });

  eventSource.addEventListener("agent:progress", (e) => {
    const data = JSON.parse(e.data);
    updateAgent(data.agent, { progress: data.progress, message: data.message });
  });

  eventSource.addEventListener("agent:complete", (e) => {
    const data = JSON.parse(e.data);
    updateAgent(data.agent, {
      status: "done",
      durationMs: data.durationMs,
      costUsd: data.costUsd,
      summary: data.summary,
    });
  });

  eventSource.addEventListener("pipeline:cost", (e) => {
    const data = JSON.parse(e.data);
    setTotalCost(data.totalUsd);
  });

  eventSource.addEventListener("pipeline:complete", (e) => {
    const data = JSON.parse(e.data);
    eventSource.close();
    // Navigate to output view after short delay
    router.push(`/output/${jobId}`);
  });

  return () => eventSource.close();
}, [jobId]);
```

**Key interactions:**
- Agent cards update in real time as SSE events arrive
- Running agents show animated progress bars
- Completed agents show green checkmark, duration, and cost
- Parallel agents (5+6) show a "PARALLEL" badge and animate simultaneously
- Click any agent card to expand the Detail Drawer showing prompt/response
- Cost ticker in the header updates after each agent completes
- Elapsed timer runs continuously
- Cancel button sends `POST /api/jobs/[jobId]/cancel`
- On pipeline completion, auto-navigates to `/output/[jobId]` after 2-second delay

### View 3: Output Review (`/output/[jobId]`)

**Purpose:** Display the final generated work instruction. Three tabs: XML viewer, illustration gallery, and quality report. Export options.

**Layout:**

```
+------------------------------------------------------------------+
|  GUID LOGO          Output Review           Score: 92  [Export v] |
+------------------------------------------------------------------+
|                                                                    |
|  Document: KALLAX_assembly.pdf                                    |
|  Quality: APPROVED (92/100) | Cost: $0.93 | Time: 2m 25s         |
|                                                                    |
|  [ XML Viewer ]  [ Illustrations ]  [ Quality Report ]            |
|                                                                    |
|  +--------------------------------------------------------------+ |
|  |  XML VIEWER TAB                                               | |
|  |                                                                | |
|  |  <?xml version="1.0" encoding="UTF-8"?>                      | |
|  |  <work-instruction                                            | |
|  |      xmlns="urn:guid:work-instruction:1.0"                   | |
|  |      version="1.0">                                          | |
|  |    <metadata>                                                 | |
|  |      <title>Assemble KALLAX Shelf Unit</title>                | |
|  |      <domain>furniture</domain>                               | |
|  |      <safety-level>medium</safety-level>                      | |
|  |      <estimated-minutes>45</estimated-minutes>                | |
|  |      ...                                                      | |
|  |    </metadata>                                                | |
|  |    <parts-list>                                               | |
|  |      <part id="A" name="Base panel" quantity="1"/>            | |
|  |      <part id="B" name="Side panel" quantity="2"/>            | |
|  |      ...                                                      | |
|  |    </parts-list>                                              | |
|  |    <phases>                                                   | |
|  |      <phase name="Frame Assembly">                            | |
|  |        <step number="1">                                      | |
|  |          <title>Prepare the base panel</title>                | |
|  |          <instruction>Place the base panel (A) flat on a     | |
|  |            clean surface with pre-drilled holes facing        | |
|  |            upward.</instruction>                              | |
|  |          ...                                                  | |
|  |                                                                | |
|  +--------------------------------------------------------------+ |
+--------------------------------------------------------------------+
```

**Component hierarchy:**

```
app/output/[jobId]/page.tsx (Server Component)
  └── OutputView (Client Component)
      ├── OutputHeader
      │   ├── Logo
      │   ├── DocumentInfo
      │   ├── QualityBadge (score + decision)
      │   ├── CostBadge
      │   ├── TimeBadge
      │   └── ExportDropdown
      │       ├── Export XML
      │       ├── Export JSON
      │       └── Export PDF (future)
      ├── TabNavigation (shadcn Tabs)
      │   ├── XmlViewerTab
      │   │   └── XmlViewer
      │   │       ├── SyntaxHighlighter (XML with line numbers)
      │   │       ├── CollapsibleSections (metadata, parts, phases)
      │   │       └── CopyButton
      │   ├── IllustrationsTab
      │   │   └── IllustrationGallery
      │   │       ├── StepSelector (step number navigation)
      │   │       ├── IllustrationImage (large view)
      │   │       ├── StepInstruction (text below illustration)
      │   │       ├── PartsUsed (parts list for this step)
      │   │       └── ThumbnailStrip (all step thumbnails)
      │   └── QualityReportTab
      │       └── QualityReport
      │           ├── ScoreGauge (circular 0-100 gauge)
      │           ├── DecisionBadge (approved/review/hold)
      │           ├── IssuesList (expandable per-issue details)
      │           ├── SafetyReport (hazard checks)
      │           ├── CostBreakdown (per-agent cost table)
      │           └── GenerationMetadata (models, tokens, timing)
      └── SideBySideComparison (optional overlay)
          ├── OriginalPdfPage
          └── GeneratedStepWithIllustration
```

**shadcn/ui components used:** `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `Card`, `Badge`, `Button`, `DropdownMenu`, `ScrollArea`, `Separator`, `Table`

**Key interactions:**
- XML viewer with syntax highlighting, collapsible sections, and copy-to-clipboard
- Illustration gallery with step-by-step navigation and thumbnail strip
- Quality report with expandable issues and cost breakdown
- Export dropdown: XML download, JSON download
- Side-by-side comparison: toggle overlay showing original PDF page next to generated output
- Quality score badge color-coded: green (>= 85), yellow (70-84), red (< 70)

---

## 7. Database Schema

Using Drizzle ORM with SQLite (better-sqlite3 driver). The schema is designed to be PostgreSQL-compatible for future migration.

### Tables

#### `jobs` — Generation Jobs

Tracks the lifecycle of each document processing job.

```typescript
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const jobs = sqliteTable("jobs", {
  /** Unique job identifier (ULID) */
  id: text("id").primaryKey(),
  /** Current pipeline status */
  status: text("status", {
    enum: [
      "pending", "extracting", "analyzing", "composing",
      "enforcing", "reviewing", "revising", "illustrating",
      "assembling", "completed", "failed", "cancelled",
    ],
  }).notNull().default("pending"),
  /** Quality decision after review */
  qualityDecision: text("quality_decision", {
    enum: ["approved", "revise", "hold"],
  }),
  /** Quality score (0-100) */
  qualityScore: integer("quality_score"),

  // --- Document Info ---
  /** Original filename */
  filename: text("filename").notNull(),
  /** Document MIME type */
  mimeType: text("mime_type").notNull(),
  /** File size in bytes */
  fileSize: integer("file_size").notNull(),
  /** Path to uploaded file */
  filePath: text("file_path").notNull(),
  /** Number of pages in the document */
  pageCount: integer("page_count"),

  // --- Configuration ---
  /** Display name for the guide */
  documentName: text("document_name"),
  /** Content domain */
  domain: text("domain").default("general"),
  /** Quality threshold for auto-approval */
  qualityThreshold: integer("quality_threshold").default(85),
  /** Whether to generate illustrations */
  generateIllustrations: integer("generate_illustrations", { mode: "boolean" }).default(true),

  // --- Timing ---
  /** Job creation timestamp */
  createdAt: text("created_at").notNull(),
  /** Pipeline start timestamp */
  startedAt: text("started_at"),
  /** Pipeline completion timestamp */
  completedAt: text("completed_at"),

  // --- Costs ---
  /** Total cost in USD */
  totalCostUsd: real("total_cost_usd").default(0),

  // --- Pipeline State ---
  /** Number of text revision loops executed */
  textRevisionCount: integer("text_revision_count").default(0),
  /** Current agent being executed */
  currentAgent: text("current_agent"),

  // --- Error ---
  /** Error message if failed */
  errorMessage: text("error_message"),
});
```

#### `agent_executions` — Per-Agent Execution Records

Records every agent execution for transparency and auditing.

```typescript
export const agentExecutions = sqliteTable("agent_executions", {
  /** Unique execution identifier (ULID) */
  id: text("id").primaryKey(),
  /** Foreign key to jobs table */
  jobId: text("job_id").notNull().references(() => jobs.id),
  /** Agent identifier */
  agentName: text("agent_name").notNull(),
  /** Execution order within the pipeline */
  executionOrder: integer("execution_order").notNull(),

  // --- Model Info ---
  /** Model used (e.g., "gemini-2.5-flash", "gemini-2.5-pro") */
  model: text("model"),
  /** Whether this was an escalation (Flash -> Pro) */
  wasEscalation: integer("was_escalation", { mode: "boolean" }).default(false),

  // --- I/O ---
  /** Prompt sent to the model (for AI agents) */
  promptSent: text("prompt_sent"),
  /** Response received from the model */
  responseReceived: text("response_received"),
  /** Structured output (JSON string) */
  structuredOutput: text("structured_output"),

  // --- Tokens & Cost ---
  /** Input tokens consumed */
  inputTokens: integer("input_tokens").default(0),
  /** Output tokens produced */
  outputTokens: integer("output_tokens").default(0),
  /** Cost in USD */
  costUsd: real("cost_usd").default(0),

  // --- Timing ---
  /** Start timestamp */
  startedAt: text("started_at").notNull(),
  /** End timestamp */
  completedAt: text("completed_at"),
  /** Duration in milliseconds */
  durationMs: integer("duration_ms"),

  // --- Status ---
  /** Execution status */
  status: text("status", {
    enum: ["running", "completed", "failed"],
  }).notNull().default("running"),
  /** Error message if failed */
  errorMessage: text("error_message"),
});
```

#### `generated_guides` — Output Work Instructions

Stores the final generated work instruction data.

```typescript
export const generatedGuides = sqliteTable("generated_guides", {
  /** Unique guide identifier (ULID) */
  id: text("id").primaryKey(),
  /** Foreign key to jobs table */
  jobId: text("job_id").notNull().references(() => jobs.id).unique(),

  // --- Output ---
  /** Complete XML output */
  xmlContent: text("xml_content"),
  /** JSON representation of the guide */
  jsonContent: text("json_content"),
  /** Path to saved XML file */
  xmlFilePath: text("xml_file_path"),

  // --- Quality ---
  /** Overall quality score */
  qualityScore: integer("quality_score"),
  /** Quality decision */
  qualityDecision: text("quality_decision", {
    enum: ["approved", "revise", "hold"],
  }),
  /** Quality issues (JSON array) */
  qualityIssues: text("quality_issues"),
  /** Safety issues (JSON array) */
  safetyIssues: text("safety_issues"),

  // --- Metadata ---
  /** Number of steps in the guide */
  stepCount: integer("step_count"),
  /** Number of phases */
  phaseCount: integer("phase_count"),
  /** Guide title */
  title: text("title"),
  /** Domain */
  domain: text("domain"),
  /** Estimated completion time in minutes */
  estimatedMinutes: integer("estimated_minutes"),
  /** Safety level classification */
  safetyLevel: text("safety_level"),

  // --- Generation Metadata ---
  /** Models used (JSON array) */
  modelsUsed: text("models_used"),
  /** Number of text revision loops */
  textRevisionLoops: integer("text_revision_loops"),
  /** Total generation cost */
  totalCostUsd: real("total_cost_usd"),
  /** Generation timestamp */
  generatedAt: text("generated_at").notNull(),
});
```

#### `generated_illustrations` — Per-Step Illustrations

Stores generated illustrations for each step.

```typescript
export const generatedIllustrations = sqliteTable("generated_illustrations", {
  /** Unique illustration identifier (ULID) */
  id: text("id").primaryKey(),
  /** Foreign key to jobs table */
  jobId: text("job_id").notNull().references(() => jobs.id),
  /** Foreign key to generated_guides table */
  guideId: text("guide_id").notNull().references(() => generatedGuides.id),

  // --- Step Info ---
  /** Step number this illustration belongs to */
  stepNumber: integer("step_number").notNull(),

  // --- Image ---
  /** Path to saved illustration file */
  filePath: text("file_path").notNull(),
  /** Image MIME type */
  mimeType: text("mime_type").notNull().default("image/png"),
  /** Image width in pixels */
  width: integer("width"),
  /** Image height in pixels */
  height: integer("height"),

  // --- Generation ---
  /** Model used for generation */
  model: text("model"),
  /** Generation cost in USD */
  costUsd: real("cost_usd"),
  /** Generation duration in milliseconds */
  durationMs: integer("duration_ms"),
  /** Generation timestamp */
  generatedAt: text("generated_at").notNull(),
});
```

### Indexes

```typescript
// Optimized queries for job listing and status checks
export const jobStatusIdx = index("idx_jobs_status").on(jobs.status);
export const jobCreatedIdx = index("idx_jobs_created_at").on(jobs.createdAt);

// Agent executions by job (for pipeline transparency view)
export const agentExecJobIdx = index("idx_agent_exec_job_id").on(agentExecutions.jobId);

// Illustrations by job and step
export const illustrationJobIdx = index("idx_illustrations_job_id").on(generatedIllustrations.jobId);
export const illustrationStepIdx = index("idx_illustrations_step").on(
  generatedIllustrations.jobId,
  generatedIllustrations.stepNumber
);
```

---

## 8. Guidelines & Quality System

The quality system implements **Compliance by Construction** — a 4-layer defense that ensures guidelines are enforced at every stage of the pipeline, not just checked after the fact. This architecture is adapted from the Instructo PRD's quality system.

### Two Guideline Files

| File | Scope | Requirements | IDs |
|---|---|---|---|
| `work-instructions.yaml` | How AI writes step text | 38 requirements | WI-001 to WI-038 |
| `illustrations.yaml` | How AI generates illustrations | 18 requirements | IL-001 to IL-018 |

Both files live in `src/lib/guidelines/` and are loaded at pipeline startup. They are injected into agent prompts — **never truncated**.

### Guideline Categories

**Work Instructions (WI-001 to WI-038):**

| Category | IDs | Count | Purpose |
|---|---|---|---|
| Guide Structure | WI-001 to WI-006 | 6 | Top-level layout, sections, phases |
| Guide Metadata | WI-007 to WI-013 | 7 | Title, purpose, time, safety level, parts list |
| Safety & Compliance | WI-014 to WI-020 | 7 | Callouts, severity, two-person, wall anchoring, PPE |
| Step Writing Style | WI-021 to WI-028 | 8 | Verb-first, active voice, sentence length, part refs |
| Step Content | WI-029 to WI-033 | 5 | One action per step, orientation, fastener detail |
| DIY-Specific | WI-034 to WI-038 | 5 | Time estimates, surface protection, checkpoint images |

**Illustrations (IL-001 to IL-018):**

| Category | IDs | Count | Purpose |
|---|---|---|---|
| Visual Style | IL-001 to IL-005 | 5 | Isometric style, dimensions, no text, quality, color |
| Part Visualization | IL-006 to IL-009 | 4 | Active/inactive highlighting, labels, exploded views |
| Motion & Direction | IL-010 to IL-012 | 3 | Direction arrows, rotation arrows, measurements |
| Comparative & Reference | IL-013 to IL-015 | 3 | OK/NOK views, checkpoints, two-person indicator |
| Quality & Consistency | IL-016 to IL-018 | 3 | One per step, consistent angle, model routing |

### Layer 1: Prompt Injection — Guidelines Into Agent Prompts

Guidelines are injected directly into agent prompts so the LLM "knows the rules" at generation time.

| Agent | What Is Injected | How |
|---|---|---|
| Vision Analyzer | Condensed MUST rules for visual observation | Compact rule lines in system prompt |
| Instruction Composer | Style and tone directives | Style section in system prompt |
| Guideline Enforcer | **Full** work-instructions.yaml | Entire YAML passed in prompt (NO truncation) |
| Quality Reviewer | Full guidelines for scoring reference | YAML document for evaluation criteria |
| Safety Reviewer | Safety-related requirements (WI-014 to WI-020) | Safety subset in system prompt |
| Illustration Generator | Full illustrations.yaml | YAML passed in prompt for each step |

**Critical advantage of multi-agent architecture:** The Guideline Enforcer receives the **complete** guidelines YAML. The multi-agent design eliminates the character-budget truncation problem — each agent only handles one responsibility and can accommodate the full guideline set within its focused context.

### Layer 2: Response Schema — Structural Enforcement at Generation Time

Gemini's `responseSchema` parameter enforces structural compliance at the model output level. The model physically cannot produce output that violates the schema.

**Enforced constraints:**

| Field | Schema Enforcement |
|---|---|
| `primaryVerb` | Enum of 16 approved verbs — impossible to use unapproved verb |
| `safetyCallout.severity` | Enum: `caution`, `warning`, `danger` |
| `safetyLevel` | Enum: `low`, `medium`, `high` |
| `skillLevel` | Enum: `none`, `basic_hand_tools`, `power_tools_recommended` |
| `twoPersonRequired` | Boolean — cannot be omitted |
| `parts[].name`, `parts[].id`, `parts[].quantity` | All three required per part reference |
| `complexity` | Enum: `simple`, `complex` |
| `confidence` | Number — required per step |

### Layer 3: Post-Processing — Deterministic Transforms

After LLM generation, **9+ deterministic transforms** run synchronously with zero API calls and zero cost. These fix remaining guideline violations that the LLM missed.

| # | Transform | Guideline | What It Does |
|---|---|---|---|
| 1 | Verb-first fix | WI-022 | Ensures instruction starts with approved verb; strips lead-ins ("Next,", "You should") |
| 2 | Part ID insertion | WI-025 | Adds missing part IDs: "dowel" → "dowel (A)" |
| 3 | Quantity insertion | WI-026 | Prefixes with quantity: "dowels (A)" → "4 dowels (A)" |
| 4 | Sentence splitting | WI-024 | Splits sentences > 20 words at natural break points |
| 5 | Part ID merging | WI-028 | Merges inconsistent IDs for the same part across steps |
| 6 | Terminology normalization | WI-028 | Ensures same part uses same name everywhere |
| 7 | Two-person callouts | WI-018 | Adds "Two people needed" callout where detected but missing |
| 8 | Safety callout ordering | WI-015 | Moves warning callouts before other callouts |
| 9 | Wall anchoring advisory | WI-019 | Appends anchoring warning for tall/heavy products |
| 10 | Phase detection | WI-006 | Auto-inserts phase boundaries for guides > 12 steps |

### Layer 4: Validation — Quality Flags

A registry of validators runs against the completed guide and produces quality flags. Validators only observe and report — they feed into the Quality Reviewer's scoring and are included in the output for consumer visibility.

**Validator categories:**

| Category | Count | Checks |
|---|---|---|
| Text quality | 7 | Verb-first syntax, sentence length, active voice, part references, quantities, one action per step, terminology consistency |
| Metadata | 6 | Title format, purpose statement, safety classification, time estimate, persons required, skill level |
| Safety | 4 | Callout ordering, hazard detection, two-person flags, wall anchoring |
| Structure | 3 | Guide has steps, phase grouping for long guides, section order |
| Illustration | 2 | One illustration per step, consistent dimensions |

**Quality gates:**

| Score | Decision | Action |
|---|---|---|
| >= 85 | `approved` | Ready for output. Auto-publishable. |
| 70–84 | `revise` | Feedback routed to Enforcer. Max 2 revision loops. |
| < 70 | `hold` | Significant issues. Full feedback included. Needs human review. |

---

## 9. XML Output Schema

The canonical output format is XML with namespace `urn:guid:work-instruction:1.0`. This proves enterprise-system interoperability to management — the output is not a PDF or proprietary format, but structured data that any MES, PLM, or ERP system can consume.

### XML Schema Definition

```xml
<?xml version="1.0" encoding="UTF-8"?>
<work-instruction
    xmlns="urn:guid:work-instruction:1.0"
    version="1.0"
    schema-version="1.0.0">

  <!-- Section 1: Document Metadata -->
  <metadata>
    <title>{guide title}</title>
    <domain>{content domain}</domain>
    <safety-level>{low|medium|high}</safety-level>
    <estimated-minutes>{integer}</estimated-minutes>
    <persons-required>{integer}</persons-required>
    <skill-level>{none|basic_hand_tools|power_tools_recommended}</skill-level>
    <purpose>{one-sentence purpose statement}</purpose>
    <source-document>
      <filename>{original filename}</filename>
      <format>{pdf|docx}</format>
      <page-count>{integer}</page-count>
    </source-document>
  </metadata>

  <!-- Section 2: Parts List -->
  <parts-list>
    <part id="{letter}" name="{part name}" quantity="{integer}"/>
    <!-- Repeats for all parts -->
  </parts-list>

  <!-- Section 3: Tools Required -->
  <tools-required>
    <tool name="{tool name}" required="{true|false}"/>
    <!-- Repeats for all tools -->
  </tools-required>

  <!-- Section 4: Safety Warnings (guide-level) -->
  <safety-warnings>
    <warning severity="{caution|warning|danger}">{warning text}</warning>
    <!-- Repeats for all guide-level warnings -->
  </safety-warnings>

  <!-- Section 5: Phases and Steps -->
  <phases>
    <phase name="{phase name}">
      <step number="{integer}">
        <title>{step title}</title>
        <instruction>{guideline-compliant instruction text}</instruction>
        <parts>
          <part-ref id="{letter}" quantity="{integer}"/>
          <!-- Parts used in this step -->
        </parts>
        <tools>
          <tool-ref name="{tool name}"/>
          <!-- Tools used in this step -->
        </tools>
        <safety>
          <callout severity="{caution|warning|danger}">{callout text}</callout>
          <!-- Safety callouts for this step (if any) -->
        </safety>
        <illustration src="{relative path to illustration file}"/>
        <two-person-required>{true|false}</two-person-required>
        <complexity>{simple|complex}</complexity>
        <confidence>{0.0 to 1.0}</confidence>
        <source-pages>{comma-separated page numbers}</source-pages>
      </step>
      <!-- More steps in this phase -->
    </phase>
    <!-- More phases -->
  </phases>

  <!-- Section 6: Generation Metadata -->
  <generation-metadata>
    <job-id>{ULID}</job-id>
    <generated-at>{ISO 8601 timestamp}</generated-at>
    <quality-score>{0-100}</quality-score>
    <quality-decision>{approved|revise|hold}</quality-decision>
    <total-cost-usd>{decimal}</total-cost-usd>
    <processing-time-ms>{integer}</processing-time-ms>
    <text-revision-loops>{integer}</text-revision-loops>
    <models-used>
      <model>{model identifier}</model>
      <!-- Repeats for each model used -->
    </models-used>
    <quality-flags>
      <flag severity="{error|warning|info}" step="{number|null}">
        {flag description}
      </flag>
      <!-- Quality flags raised during generation -->
    </quality-flags>
  </generation-metadata>

</work-instruction>
```

### Complete Sample XML Document

```xml
<?xml version="1.0" encoding="UTF-8"?>
<work-instruction
    xmlns="urn:guid:work-instruction:1.0"
    version="1.0"
    schema-version="1.0.0">

  <metadata>
    <title>Assemble KALLAX Shelf Unit</title>
    <domain>furniture</domain>
    <safety-level>medium</safety-level>
    <estimated-minutes>45</estimated-minutes>
    <persons-required>1</persons-required>
    <skill-level>none</skill-level>
    <purpose>Free-standing shelf unit for books and decorative items.</purpose>
    <source-document>
      <filename>KALLAX_assembly.pdf</filename>
      <format>pdf</format>
      <page-count>24</page-count>
    </source-document>
  </metadata>

  <parts-list>
    <part id="A" name="Base panel" quantity="1"/>
    <part id="B" name="Side panel" quantity="2"/>
    <part id="C" name="Wooden dowel" quantity="8"/>
    <part id="D" name="Shelf divider" quantity="4"/>
    <part id="E" name="Cam lock bolt" quantity="8"/>
    <part id="F" name="Cam lock disc" quantity="8"/>
    <part id="G" name="Back panel" quantity="1"/>
    <part id="H" name="Nail" quantity="16"/>
  </parts-list>

  <tools-required>
    <tool name="Phillips screwdriver" required="true"/>
    <tool name="Rubber mallet" required="false"/>
    <tool name="Hammer" required="true"/>
  </tools-required>

  <safety-warnings>
    <warning severity="caution">
      Assemble on a soft surface to prevent scratching finished panels.
    </warning>
    <warning severity="warning">
      Secure to wall with included anchoring hardware to prevent tip-over.
    </warning>
  </safety-warnings>

  <phases>
    <phase name="Frame Assembly">
      <step number="1">
        <title>Prepare the base panel</title>
        <instruction>Place the base panel (A) flat on a clean surface with pre-drilled holes facing upward.</instruction>
        <parts>
          <part-ref id="A" quantity="1"/>
        </parts>
        <tools/>
        <safety>
          <callout severity="caution">Lay cardboard beneath the panel to prevent scratching.</callout>
        </safety>
        <illustration src="illustrations/step-01.png"/>
        <two-person-required>false</two-person-required>
        <complexity>simple</complexity>
        <confidence>0.95</confidence>
        <source-pages>3</source-pages>
      </step>

      <step number="2">
        <title>Insert dowels into base panel</title>
        <instruction>Insert 4 wooden dowels (C) into the pre-drilled holes along the top edge of the base panel (A). Push each dowel firmly until flush.</instruction>
        <parts>
          <part-ref id="C" quantity="4"/>
        </parts>
        <tools/>
        <safety/>
        <illustration src="illustrations/step-02.png"/>
        <two-person-required>false</two-person-required>
        <complexity>simple</complexity>
        <confidence>0.92</confidence>
        <source-pages>3</source-pages>
      </step>

      <step number="3">
        <title>Attach side panel to base</title>
        <instruction>Lower the side panel (B) onto the dowels (C) protruding from the base panel (A). Align the holes and press firmly until the panel seats flush.</instruction>
        <parts>
          <part-ref id="B" quantity="1"/>
        </parts>
        <tools>
          <tool-ref name="Rubber mallet"/>
        </tools>
        <safety/>
        <illustration src="illustrations/step-03.png"/>
        <two-person-required>false</two-person-required>
        <complexity>simple</complexity>
        <confidence>0.90</confidence>
        <source-pages>4</source-pages>
      </step>
    </phase>

    <phase name="Shelf Installation">
      <step number="4">
        <title>Insert cam lock bolts into shelf divider</title>
        <instruction>Screw 2 cam lock bolts (E) into the pre-drilled holes on each end of the shelf divider (D). Tighten until the bolt head is flush with the surface.</instruction>
        <parts>
          <part-ref id="D" quantity="1"/>
          <part-ref id="E" quantity="2"/>
        </parts>
        <tools>
          <tool-ref name="Phillips screwdriver"/>
        </tools>
        <safety/>
        <illustration src="illustrations/step-04.png"/>
        <two-person-required>false</two-person-required>
        <complexity>complex</complexity>
        <confidence>0.88</confidence>
        <source-pages>5,6</source-pages>
      </step>

      <step number="5">
        <title>Lock shelf divider into frame</title>
        <instruction>Slide the shelf divider (D) into position between the side panels. Insert the cam lock bolts (E) into the cam lock discs (F). Tighten each disc with a quarter-turn clockwise.</instruction>
        <parts>
          <part-ref id="F" quantity="2"/>
        </parts>
        <tools>
          <tool-ref name="Phillips screwdriver"/>
        </tools>
        <safety/>
        <illustration src="illustrations/step-05.png"/>
        <two-person-required>false</two-person-required>
        <complexity>complex</complexity>
        <confidence>0.85</confidence>
        <source-pages>7</source-pages>
      </step>
    </phase>

    <phase name="Finishing">
      <step number="6">
        <title>Attach back panel</title>
        <instruction>Position the back panel (G) onto the rear of the assembled frame. Align all edges evenly. Secure with 16 nails (H) spaced evenly along all four sides.</instruction>
        <parts>
          <part-ref id="G" quantity="1"/>
          <part-ref id="H" quantity="16"/>
        </parts>
        <tools>
          <tool-ref name="Hammer"/>
        </tools>
        <safety>
          <callout severity="caution">Strike nails gently to avoid damaging the panel surface.</callout>
        </safety>
        <illustration src="illustrations/step-06.png"/>
        <two-person-required>false</two-person-required>
        <complexity>simple</complexity>
        <confidence>0.93</confidence>
        <source-pages>8,9</source-pages>
      </step>

      <step number="7">
        <title>Secure unit to wall</title>
        <instruction>Position the assembled shelf unit upright against the wall. Attach the included wall anchoring bracket to the rear of the unit and to the wall stud.</instruction>
        <parts/>
        <tools>
          <tool-ref name="Phillips screwdriver"/>
        </tools>
        <safety>
          <callout severity="warning">Secure to wall to prevent tip-over. Required for units over 60 cm tall.</callout>
        </safety>
        <illustration src="illustrations/step-07.png"/>
        <two-person-required>true</two-person-required>
        <complexity>simple</complexity>
        <confidence>0.91</confidence>
        <source-pages>10</source-pages>
      </step>
    </phase>
  </phases>

  <generation-metadata>
    <job-id>01HXYZ123ABC</job-id>
    <generated-at>2026-03-02T10:05:00Z</generated-at>
    <quality-score>92</quality-score>
    <quality-decision>approved</quality-decision>
    <total-cost-usd>0.93</total-cost-usd>
    <processing-time-ms>145000</processing-time-ms>
    <text-revision-loops>0</text-revision-loops>
    <models-used>
      <model>gemini-2.5-flash</model>
      <model>gemini-2.5-pro</model>
      <model>gemini-2.5-flash-preview-image-generation</model>
    </models-used>
    <quality-flags/>
  </generation-metadata>

</work-instruction>
```

### TypeScript Interfaces for the XML Builder

```typescript
interface XmlWorkInstruction {
  metadata: XmlMetadata;
  partsList: XmlPart[];
  toolsRequired: XmlTool[];
  safetyWarnings: XmlWarning[];
  phases: XmlPhase[];
  generationMetadata: XmlGenerationMetadata;
}

interface XmlMetadata {
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

interface XmlPart {
  id: string;
  name: string;
  quantity: number;
}

interface XmlTool {
  name: string;
  required: boolean;
}

interface XmlWarning {
  severity: "caution" | "warning" | "danger";
  text: string;
}

interface XmlPhase {
  name: string;
  steps: XmlStep[];
}

interface XmlStep {
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

interface XmlGenerationMetadata {
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
```

---

## 10. API Routes

All routes are Next.js App Router API routes under `src/app/api/`. No external authentication — this is a single-user demo application.

### Route Map

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| `POST` | `/api/jobs` | Create a new generation job | 201: `{ jobId, status }` |
| `GET` | `/api/jobs` | List all jobs (recent first) | 200: `{ jobs: Job[] }` |
| `GET` | `/api/jobs/[jobId]` | Get job status and metadata | 200: `{ job: Job }` |
| `GET` | `/api/jobs/[jobId]/sse` | SSE stream for pipeline events | SSE stream |
| `GET` | `/api/jobs/[jobId]/result` | Get completed result (guide + XML) | 200: `{ guide, xml }` |
| `POST` | `/api/jobs/[jobId]/cancel` | Cancel a running job | 200: `{ status: "cancelled" }` |

### Endpoint Details

#### `POST /api/jobs` — Create Generation Job

**Request:** Multipart form data.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | PDF or DOCX file (max 50 MB) |
| `documentName` | string | No | Display name (defaults to filename) |
| `domain` | string | No | Content domain (defaults to "general") |
| `qualityThreshold` | number | No | Quality threshold 0-100 (defaults to 85) |
| `generateIllustrations` | boolean | No | Whether to generate illustrations (defaults to true) |

**Response (201):**

```json
{
  "jobId": "01HXYZ123ABC",
  "status": "pending",
  "createdAt": "2026-03-02T10:00:00Z"
}
```

**Behavior:**
1. Validate file type and size
2. Save file to `./storage/uploads/[jobId]/[filename]`
3. Create job record in SQLite
4. Start pipeline execution asynchronously (background)
5. Return immediately with job ID

#### `GET /api/jobs` — List All Jobs

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 20 | Max results |
| `offset` | number | 0 | Pagination offset |
| `status` | string | - | Filter by status |

**Response (200):**

```json
{
  "jobs": [
    {
      "id": "01HXYZ123ABC",
      "status": "completed",
      "filename": "KALLAX_assembly.pdf",
      "documentName": "KALLAX Shelf Unit",
      "qualityScore": 92,
      "qualityDecision": "approved",
      "totalCostUsd": 0.93,
      "createdAt": "2026-03-02T10:00:00Z",
      "completedAt": "2026-03-02T10:02:25Z"
    }
  ],
  "total": 1
}
```

#### `GET /api/jobs/[jobId]` — Get Job Status

**Response (200):**

```json
{
  "job": {
    "id": "01HXYZ123ABC",
    "status": "reviewing",
    "filename": "KALLAX_assembly.pdf",
    "documentName": "KALLAX Shelf Unit",
    "domain": "furniture",
    "pageCount": 24,
    "currentAgent": "quality-reviewer",
    "qualityThreshold": 85,
    "totalCostUsd": 0.23,
    "textRevisionCount": 0,
    "createdAt": "2026-03-02T10:00:00Z",
    "startedAt": "2026-03-02T10:00:02Z"
  }
}
```

#### `GET /api/jobs/[jobId]/sse` — SSE Stream

Returns a Server-Sent Events stream. See [Section 5: SSE Event Specification](#sse-event-specification) for event types and data shapes.

**Headers:**

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Behavior:**
- If job is already completed: sends final `pipeline:complete` event and closes
- If job is in progress: streams events in real time until completion
- If job does not exist: sends error event and closes
- Client should reconnect on connection loss (EventSource auto-reconnects)

#### `GET /api/jobs/[jobId]/result` — Get Completed Result

**Response (200):** Returns the full generation result including XML content, quality report, and illustration paths.

```json
{
  "guide": {
    "title": "Assemble KALLAX Shelf Unit",
    "stepCount": 14,
    "phaseCount": 3,
    "qualityScore": 92,
    "qualityDecision": "approved",
    "safetyLevel": "medium",
    "estimatedMinutes": 45,
    "domain": "furniture"
  },
  "xml": "<?xml version=\"1.0\" ...?>...",
  "illustrations": [
    { "stepNumber": 1, "url": "/storage/jobs/01HXYZ.../illustrations/step-01.png" },
    { "stepNumber": 2, "url": "/storage/jobs/01HXYZ.../illustrations/step-02.png" }
  ],
  "quality": {
    "score": 92,
    "decision": "approved",
    "issues": [],
    "safetyPassed": true
  },
  "cost": {
    "totalUsd": 0.93,
    "breakdown": {
      "document-extractor": 0.00,
      "vision-analyzer": 0.06,
      "instruction-composer": 0.02,
      "guideline-enforcer": 0.03,
      "quality-reviewer": 0.08,
      "safety-reviewer": 0.04,
      "illustration-generator": 0.70,
      "xml-assembler": 0.00
    }
  },
  "metadata": {
    "processingTimeMs": 145000,
    "textRevisionLoops": 0,
    "modelsUsed": ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-preview-image-generation"]
  }
}
```

Returns 404 if the job is not yet completed.

#### `POST /api/jobs/[jobId]/cancel` — Cancel Job

**Response (200):**

```json
{
  "jobId": "01HXYZ123ABC",
  "status": "cancelled"
}
```

Returns 409 if the job is already completed, failed, or cancelled.

### Static File Serving

Generated illustrations and uploaded documents are served as static files:

| Path | Maps To | Purpose |
|------|---------|---------|
| `/storage/uploads/[jobId]/*` | `./storage/uploads/[jobId]/*` | Uploaded documents |
| `/storage/jobs/[jobId]/pages/*` | `./storage/jobs/[jobId]/pages/*` | Extracted page images |
| `/storage/jobs/[jobId]/illustrations/*` | `./storage/jobs/[jobId]/illustrations/*` | Generated illustrations |

Configured via Next.js `next.config.ts` rewrites or a custom API route.

---

## 11. File Structure

Complete monorepo tree with every file location.

```
Guid.me/
├── docs/
│   └── prd.md                              # This document (single source of truth)
│
├── src/
│   ├── app/                                # Next.js App Router
│   │   ├── layout.tsx                      # Root layout (fonts, metadata, providers)
│   │   ├── page.tsx                        # Upload & Configure view (/)
│   │   ├── globals.css                     # Tailwind v4 global styles
│   │   │
│   │   ├── pipeline/
│   │   │   └── [jobId]/
│   │   │       └── page.tsx                # Pipeline Monitor view
│   │   │
│   │   ├── output/
│   │   │   └── [jobId]/
│   │   │       └── page.tsx                # Output Review view
│   │   │
│   │   └── api/
│   │       └── jobs/
│   │           ├── route.ts                # POST /api/jobs (create), GET /api/jobs (list)
│   │           └── [jobId]/
│   │               ├── route.ts            # GET /api/jobs/[jobId] (status)
│   │               ├── sse/
│   │               │   └── route.ts        # GET /api/jobs/[jobId]/sse (SSE stream)
│   │               ├── result/
│   │               │   └── route.ts        # GET /api/jobs/[jobId]/result
│   │               └── cancel/
│   │                   └── route.ts        # POST /api/jobs/[jobId]/cancel
│   │
│   ├── components/                         # React components
│   │   ├── ui/                             # shadcn/ui components (auto-generated)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── collapsible.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   └── table.tsx
│   │   │
│   │   ├── upload/                         # Upload & Configure components
│   │   │   ├── file-dropzone.tsx           # Drag-and-drop file upload
│   │   │   ├── configuration-form.tsx      # Domain, threshold, options
│   │   │   ├── recent-jobs.tsx             # Recent job cards
│   │   │   └── upload-view.tsx             # Composed upload view
│   │   │
│   │   ├── pipeline/                       # Pipeline Monitor components
│   │   │   ├── pipeline-monitor.tsx        # Main monitor (SSE consumer)
│   │   │   ├── agent-card.tsx              # Individual agent status card
│   │   │   ├── agent-timeline.tsx          # Vertical timeline of all agents
│   │   │   ├── detail-drawer.tsx           # Expandable prompt/response viewer
│   │   │   ├── cost-ticker.tsx             # Live cost display
│   │   │   ├── elapsed-timer.tsx           # Running time display
│   │   │   └── pipeline-header.tsx         # Header with status, timer, cost
│   │   │
│   │   ├── output/                         # Output Review components
│   │   │   ├── output-view.tsx             # Composed output view
│   │   │   ├── xml-viewer.tsx              # Syntax-highlighted XML display
│   │   │   ├── illustration-gallery.tsx    # Step-by-step illustration viewer
│   │   │   ├── quality-report.tsx          # Score, issues, safety report
│   │   │   ├── cost-breakdown.tsx          # Per-agent cost table
│   │   │   └── export-dropdown.tsx         # Export XML/JSON buttons
│   │   │
│   │   └── shared/                         # Shared components
│   │       ├── header.tsx                  # App header with logo
│   │       ├── logo.tsx                    # Guid logo
│   │       └── status-badge.tsx            # Colored status badges
│   │
│   ├── lib/                                # Core library code
│   │   ├── agents/                         # 8 agent implementations
│   │   │   ├── base-agent.ts              # Abstract Agent<TInput, TOutput>
│   │   │   ├── document-extractor.ts      # Agent 1: PDF/DOCX extraction
│   │   │   ├── vision-analyzer.ts         # Agent 2: Per-page vision analysis
│   │   │   ├── instruction-composer.ts    # Agent 3: Step sequencing + editing
│   │   │   ├── guideline-enforcer.ts      # Agent 4: YAML compliance
│   │   │   ├── quality-reviewer.ts        # Agent 5: Quality scoring
│   │   │   ├── safety-reviewer.ts         # Agent 6: Hazard verification
│   │   │   ├── illustration-generator.ts  # Agent 7: Per-step illustrations
│   │   │   └── xml-assembler.ts           # Agent 8: XML output assembly
│   │   │
│   │   ├── orchestrator/                   # Pipeline coordination
│   │   │   ├── orchestrator.ts            # State machine implementation
│   │   │   ├── states.ts                  # PipelineStatus type + transitions
│   │   │   ├── event-emitter.ts           # SSE event emission
│   │   │   └── cost-tracker.ts            # Per-agent cost tracking
│   │   │
│   │   ├── guidelines/                     # Guideline system
│   │   │   ├── work-instructions.yaml     # 38 WI requirements (WI-001 to WI-038)
│   │   │   ├── illustrations.yaml         # 18 IL requirements (IL-001 to IL-018)
│   │   │   ├── loader.ts                  # YAML file loader
│   │   │   ├── schema.ts                  # Guideline type definitions
│   │   │   └── post-processor.ts          # Deterministic transforms (Layer 3)
│   │   │
│   │   ├── quality/                        # Quality validation
│   │   │   ├── validator-registry.ts      # 22+ validators
│   │   │   └── quality-checker.ts         # Score computation
│   │   │
│   │   ├── xml/                            # XML output
│   │   │   ├── builder.ts                 # XML document builder
│   │   │   ├── schema.ts                  # XmlWorkInstruction types
│   │   │   └── serializer.ts             # Object → XML string
│   │   │
│   │   ├── db/                             # Database
│   │   │   ├── schema.ts                  # Drizzle schema (all tables)
│   │   │   ├── index.ts                   # Database connection singleton
│   │   │   └── migrations/               # Drizzle migrations
│   │   │
│   │   ├── gemini/                         # Gemini API integration
│   │   │   ├── client.ts                  # Gemini API client wrapper
│   │   │   ├── models.ts                  # Model identifiers and pricing
│   │   │   └── rate-limiter.ts            # API rate limiting
│   │   │
│   │   └── utils/                          # Utilities
│   │       ├── ulid.ts                    # ULID generation
│   │       ├── file-storage.ts            # Local file storage helpers
│   │       └── sse.ts                     # SSE response helper
│   │
│   └── types/                              # Shared TypeScript types
│       ├── agents.ts                      # All agent I/O interfaces
│       ├── pipeline.ts                    # Pipeline state types
│       ├── xml.ts                         # XML builder types
│       └── api.ts                         # API request/response types
│
├── storage/                                # Local file storage (gitignored)
│   ├── uploads/                            # Uploaded documents
│   ├── jobs/                               # Per-job working directories
│   │   └── [jobId]/
│   │       ├── pages/                      # Extracted page images
│   │       ├── illustrations/              # Generated illustrations
│   │       └── output.xml                  # Final XML output
│   └── cache/                              # Pre-cached demo results
│
├── drizzle.config.ts                       # Drizzle ORM configuration
├── next.config.ts                          # Next.js configuration
├── tailwind.config.ts                      # Tailwind v4 configuration
├── tsconfig.json                           # TypeScript configuration
├── package.json                            # Dependencies and scripts
├── pnpm-lock.yaml                          # Lock file
├── .env.local                              # Environment variables (gitignored)
├── .env.example                            # Environment variable template
├── .gitignore                              # Git ignore rules
├── CLAUDE.md                               # Claude Code project reference
└── README.md                               # Project readme (minimal)
```

---

## 12. Implementation Phases

### Phase 0: Foundation

**Goal:** Next.js scaffold, database schema, project structure, shared types, guideline files.

| ID | Task | Description |
|----|------|-------------|
| P0.1 | Next.js scaffold | Create Next.js 15 app with App Router, TypeScript, Tailwind v4, shadcn/ui |
| P0.2 | Drizzle setup | Configure Drizzle ORM with SQLite, create all 4 tables |
| P0.3 | Shared types | Define all TypeScript interfaces in `src/types/` (agent I/O, pipeline, XML, API) |
| P0.4 | Guideline files | Copy `work-instructions.yaml` and `illustrations.yaml` into `src/lib/guidelines/` |
| P0.5 | Guideline loader | Implement YAML loading and parsing in `src/lib/guidelines/loader.ts` |
| P0.6 | Gemini client | Create Gemini API client wrapper with model configuration |
| P0.7 | File storage | Implement local file storage helpers (`storage/` directory structure) |
| P0.8 | ULID generation | Add ULID utility for job and record IDs |
| P0.9 | SSE helper | Create SSE response utility for Next.js API routes |
| P0.10 | Environment config | Set up `.env.local` and `.env.example` |
| P0.11 | Project structure | Create all directories and placeholder files per File Structure |

**Deliverable:** Running Next.js app with empty pages, database, types, and guideline loading.

### Phase 1: Text Pipeline

**Goal:** Document Extractor, Vision Analyzer, Instruction Composer, Guideline Enforcer, and the Orchestrator produce guideline-compliant work instructions from a PDF.

| ID | Task | Description |
|----|------|-------------|
| P1.1 | Base agent class | Abstract `Agent<TInput, TOutput>` with execute, cost tracking, error handling |
| P1.2 | Document Extractor | PDF extraction via pdftoppm, DOCX via mammoth |
| P1.3 | Vision Analyzer | Per-page extraction with Flash/Pro escalation, `responseSchema` enforcement |
| P1.4 | Instruction Composer | Full-sequence composition with editing/polishing in one pass |
| P1.5 | Guideline Enforcer | Full YAML injection, `responseSchema` with `AllowedVerb` enum |
| P1.6 | Post-processor | Implement 9+ deterministic transforms (Layer 3) |
| P1.7 | Orchestrator (text) | State machine for pending → extracting → analyzing → composing → enforcing |
| P1.8 | SSE event emission | Wire orchestrator state transitions to SSE events |
| P1.9 | Job API routes | `POST /api/jobs`, `GET /api/jobs/[jobId]`, `GET /api/jobs/[jobId]/sse` |
| P1.10 | Integration test | End-to-end: PDF upload → text pipeline → enforced guide output |

**Deliverable:** Text pipeline produces guideline-compliant instructions. SSE events stream in real time.

### Phase 2: Frontend Pipeline Monitor

**Goal:** The Pipeline Monitor view shows agents executing in real time via SSE. This is the demo's star feature.

| ID | Task | Description |
|----|------|-------------|
| P2.1 | Upload view | File dropzone, configuration form, generate button |
| P2.2 | Pipeline monitor layout | 8 agent cards in vertical timeline |
| P2.3 | SSE integration | EventSource connection to `/api/jobs/[jobId]/sse` |
| P2.4 | Agent card states | Pending → Running (progress bar) → Done (green, cost) → Error (red) |
| P2.5 | Detail drawer | Expandable panel showing prompt, response, tokens, cost per agent |
| P2.6 | Cost ticker | Live cost total in header, updates per agent completion |
| P2.7 | Elapsed timer | Running time counter in header |
| P2.8 | Parallel badge | Visual indicator for Quality + Safety reviewers |
| P2.9 | Auto-navigation | Auto-navigate to output view on pipeline completion |
| P2.10 | Recent jobs | Job list on upload page with status and score |

**Deliverable:** Full pipeline monitor with real-time SSE updates. Upload → Monitor flow works end-to-end.

### Phase 3: Quality Reviewers + XML Output

**Goal:** Quality Reviewer, Safety Reviewer, XML Assembler, and Output Review view complete the pipeline.

| ID | Task | Description |
|----|------|-------------|
| P3.1 | Quality Reviewer | Pro model scoring, structured feedback, quality categories |
| P3.2 | Safety Reviewer | Hazard verification, parallel execution with Quality |
| P3.3 | Feedback loop | Route revision feedback to Enforcer, max 2 loops |
| P3.4 | Validator registry | Implement 22+ validators producing quality flags |
| P3.5 | XML builder | TypeScript XML builder with namespace support |
| P3.6 | XML Assembler agent | Combine enforced guide into canonical XML |
| P3.7 | Output review view | XML viewer, quality report, cost breakdown tabs |
| P3.8 | Export functionality | XML and JSON download buttons |
| P3.9 | Quality gate UI | Score badge, decision display, issue list |
| P3.10 | Result API route | `GET /api/jobs/[jobId]/result` endpoint |

**Deliverable:** Complete text pipeline with quality gates, XML output, and output review view.

### Phase 4: Illustrations

**Goal:** Illustration Generator produces per-step isometric illustrations.

| ID | Task | Description |
|----|------|-------------|
| P4.1 | Illustration Generator | Per-step generation with style consistency, part labels, arrows |
| P4.2 | Part label mapping | Build global part-to-label mapping (A, B, C... skip I, O) |
| P4.3 | Prompt construction | Internal prompt builder per step (style, parts, arrows, angle) |
| P4.4 | Illustration storage | Save to `./storage/jobs/[jobId]/illustrations/` |
| P4.5 | Illustration gallery | Step-by-step viewer with thumbnail strip |
| P4.6 | XML illustration refs | Include illustration paths in XML output |
| P4.7 | Pipeline integration | Wire into orchestrator after quality approval |
| P4.8 | Illustration DB records | Save to `generated_illustrations` table |

**Deliverable:** Full pipeline with text + illustrations. Illustration gallery in output view.

### Phase 5: Polish + Demo Prep

**Goal:** Cost tracking polish, pre-cached fallback, demo script rehearsal, error handling hardening.

| ID | Task | Description |
|----|------|-------------|
| P5.1 | Cost tracking polish | Accurate per-agent cost display, total cost formatting |
| P5.2 | Pre-cached fallback | Store demo results, replay SSE with timing delays |
| P5.3 | DEMO_MODE env var | Toggle between live and cached execution |
| P5.4 | Error handling | Graceful failures, partial result display, retry indicators |
| P5.5 | Cancel functionality | `POST /api/jobs/[jobId]/cancel` with graceful abort |
| P5.6 | Loading states | Skeleton screens, shimmer effects for all views |
| P5.7 | Mobile responsiveness | Pipeline monitor and output view work on tablet |
| P5.8 | Demo document prep | Pre-process KALLAX PDF, verify quality score >= 85 |
| P5.9 | Side-by-side comparison | Original PDF page vs generated output overlay |
| P5.10 | Final rehearsal | Run demo script 3 times, verify timing and flow |

**Deliverable:** Production-quality demo ready for management presentation.

---

## 13. Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | `AIzaSy...` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./storage/guid.db` | SQLite database path |
| `STORAGE_PATH` | `./storage` | Local file storage directory |
| `GEMINI_FLASH_MODEL` | `gemini-2.5-flash` | Flash model identifier |
| `GEMINI_PRO_MODEL` | `gemini-2.5-pro` | Pro model identifier |
| `GEMINI_IMAGE_MODEL` | `gemini-2.5-flash-preview-image-generation` | Image generation model |
| `QUALITY_THRESHOLD` | `85` | Default quality threshold for auto-approval |
| `MAX_REVISION_LOOPS` | `2` | Maximum text revision loops |
| `MAX_FILE_SIZE_MB` | `50` | Maximum upload file size in MB |
| `DEMO_MODE` | `false` | Use pre-cached results instead of live API calls |
| `LOG_LEVEL` | `info` | Logging verbosity (`debug`, `info`, `warn`, `error`) |
| `PORT` | `3000` | Server port |

### `.env.example`

```bash
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Optional — defaults shown
# DATABASE_URL=file:./storage/guid.db
# STORAGE_PATH=./storage
# GEMINI_FLASH_MODEL=gemini-2.5-flash
# GEMINI_PRO_MODEL=gemini-2.5-pro
# GEMINI_IMAGE_MODEL=gemini-2.5-flash-preview-image-generation
# QUALITY_THRESHOLD=85
# MAX_REVISION_LOOPS=2
# MAX_FILE_SIZE_MB=50
# DEMO_MODE=false
# LOG_LEVEL=info
# PORT=3000
```

---

## 14. The 5-Minute Demo Script

### Pre-Demo Checklist

- [ ] Development server running (`pnpm dev`)
- [ ] GEMINI_API_KEY set and valid
- [ ] KALLAX PDF loaded in browser Downloads folder (quick access)
- [ ] Demo document pre-cached as fallback (`DEMO_MODE=true` tested)
- [ ] Browser at `/` with clean state (no previous jobs visible, or clear recent jobs)
- [ ] Screen sharing active (if remote demo)
- [ ] Pipeline Monitor view tested end-to-end in last 24 hours

### Screenplay

#### ACT 1: The Problem (0:00–0:30)

**[Screen: Landing page with Guid branding]**

> "Let me show you something. Every work instruction we write takes our technical writers hours of manual effort. The output? A Word doc or PDF. No system can consume it — not our MES, not our PLM, not our ERP."
>
> "Quality depends on who wrote it. Did they follow all 38 of our writing guidelines? Maybe. Maybe not. There's no enforcement."
>
> "What if AI could do this in 2 minutes, enforce every guideline by design, and output structured XML that our systems can actually use?"

**Pause for audience reaction.**

#### ACT 2: Upload & Configure (0:30–1:00)

**[Screen: Upload form on landing page]**

> "Watch. I'll upload a real assembly manual — this is a 24-page IKEA KALLAX PDF."

**[Drag PDF into dropzone. File preview appears.]**

> "I select the domain — furniture assembly. Quality threshold stays at 85 — that means anything scoring below 85 gets flagged for human review."

**[Select domain. Leave threshold at 85.]**

> "That's it. No prompt engineering. No configuration files. Click Generate."

**[Click "Generate Work Instructions". Page transitions to Pipeline Monitor.]**

#### ACT 3: The Pipeline (1:00–3:30)

**[Screen: Pipeline Monitor with 8 agent cards]**

> "This is the pipeline. 8 specialized AI agents, each with one job. Watch them work."

**Agent 1 activates:**
> "First — Document Extraction. Pure code, no AI cost. It pulls every page as a high-resolution image."

**Agent 2 activates:**
> "Now Vision Analysis. Gemini Flash examines each page — identifying parts, tools, actions, arrows. See the per-page progress? Complex pages automatically escalate to the more accurate Pro model."

**Agent 3 activates:**
> "The Instruction Composer takes those raw observations and builds a step sequence. It merges multi-page steps, detects phases, and polishes the writing."

**Agent 4 activates:**
> "Here's the key differentiator — the Guideline Enforcer. It receives the full set of 38 writing guidelines as YAML. No truncation. It applies every rule: verb-first syntax, part IDs, safety callouts, sentence length limits."

**[Click on Agent 4 to expand detail drawer]**

> "Look — you can see the exact prompt we sent and the response we got back. Full transparency. Every decision the AI makes is auditable."

**[Close drawer]**

**Agents 5+6 activate (parallel badge visible):**
> "Quality and Safety review run in parallel. Quality scores against all 38 requirements. Safety independently checks for hazards — heavy lifts, tip-over risks, pinch points."

**[Point to cost ticker]**
> "See the cost ticker? We're at [cost] so far. Full cost transparency per agent."

**Agent 7 activates:**
> "Now illustration generation. One isometric illustration per step — consistent style, labeled parts, directional arrows."

**[Illustration thumbnails start appearing]**

**Agent 8 activates:**
> "Finally, the XML Assembler. Combines everything into enterprise-ready structured XML."

**[Pipeline completes. Brief pause.]**

> "Done. [time]. [cost]. Let's look at the result."

**[Auto-navigates to Output Review]**

#### ACT 4: The Output (3:30–4:30)

**[Screen: Output Review with XML Viewer tab active]**

> "This is not a PDF. This is structured XML with a namespace — `urn:guid:work-instruction:1.0`. Any enterprise system can consume this."

**[Scroll through XML, pointing out structure]**

> "Metadata, parts list, tools, safety warnings, phases with steps. Each step has an instruction, parts, safety callouts, and an illustration reference."

**[Switch to Illustrations tab]**

> "Here are the illustrations. Isometric style, consistent labeling, active parts highlighted, directional arrows. One per step."

**[Click through 3-4 illustrations]**

**[Switch to Quality Report tab]**

> "Quality score: [score]. [Decision]. Zero issues."

**[Show cost breakdown table]**

> "Total cost: [cost]. Here's the per-agent breakdown. Document extraction and XML assembly cost zero — they're pure code."

#### ACT 5: The Close (4:30–5:00)

**[Screen: Output Review with metrics visible]**

> "Let me recap. One document. [time]. [cost]. Guaranteed guideline compliance. Structured XML output."
>
> "This is one document. Now imagine this across our entire documentation library. Hundreds of work instructions, all consistent, all compliant, all in a format our systems can use."
>
> "The pipeline is transparent — we can audit every decision. The architecture is modular — we can add new agents for new workflow types."
>
> "This demo is the first product in the Guid platform — the General Unified Industrialization Dashboard. The vision is a complete suite of AI-powered industrialization workflows."
>
> "We need a team to take this from demo to production. The architecture is proven. The pipeline works. The quality system is built on compliance-by-construction, not hope."

**Pause. Take questions.**

### Fallback Procedures

| Scenario | Action |
|---|---|
| Gemini API is slow (> 3 min) | "Let me show you the pre-cached result while we wait." Navigate to a completed job. |
| Gemini API is down | Set `DEMO_MODE=true`, restart server. Pre-cached results replay with realistic timing. |
| Pipeline fails mid-execution | Show the partial results. Explain error handling. Switch to pre-cached result. |
| Quality score < 85 | "This is actually a great demo of the quality gate. Watch — it routes feedback to the Enforcer for revision." |
| Illustration fails | "Individual step failures don't block the pipeline. The text output is still complete." |
| Browser issue | Have backup browser ready. URL is just `localhost:3000`. |

---

## 15. Future Vision

### From Demo to Platform

This demo is the **first product** within the Guid platform vision. The name — **General Unified Industrialization Dashboard** — reflects the full scope:

**Near-term (post-demo funding):**
- **Production deployment** — Docker containerization, PostgreSQL migration, multi-user auth
- **Real semiconductor SOPs** — Process actual fab work instructions, not just assembly manuals
- **Custom guidelines** — Per-team or per-fab guideline YAML sets
- **Batch processing** — Queue multiple documents, process overnight

**Medium-term:**
- **Multiple workflow types** — Not just work instructions: change control, FMEA templates, equipment qualification protocols
- **MES/PLM/ERP integration** — Push XML output directly into manufacturing systems via API
- **Quality analytics** — Dashboard tracking guideline compliance across the documentation library
- **Revision management** — Track changes between document versions, show diff highlights

**Long-term:**
- **Multi-language output** — Generate work instructions in any language (translation agent)
- **Voice-guided execution** — Play work instructions on the fab floor with voice + AR overlay
- **Feedback loop from execution** — Technicians flag confusing steps, pipeline improves
- **Enterprise SaaS** — Multi-tenant hosted platform with API access, billing, admin dashboard

### Architecture Extensibility

The 8-agent pipeline architecture is designed for extension:

| Extension | How |
|---|---|
| New agent types | Implement `Agent<TInput, TOutput>`, register in orchestrator |
| New document formats | Add extraction path in Document Extractor (e.g., HTML, Markdown) |
| New output formats | Add builder alongside XML (e.g., JSON-LD, PDF, HTML) |
| New guideline sets | Add YAML file to `src/lib/guidelines/`, load in Enforcer |
| New quality validators | Register in validator registry |
| New workflow types | New orchestrator state machine per workflow type |

### The Bigger Picture

Guid is not a document converter. It is a platform for **transparent, auditable, AI-powered industrialization workflows**. The demo proves three things:

1. **Multi-agent pipelines produce better output** than single-prompt approaches
2. **Transparency builds trust** — management can see every AI decision
3. **Structured output creates value** — XML integrates where PDFs cannot

The demo is the seed. The platform is the vision. Fund the team. Build the future.
