# User Journeys — Guid (General Unified Industrialization Dashboard)

> **Last Updated:** 2026-03-04
> **Status:** Active
> **Companion to:** `docs/prd.md` (authoritative PRD)

---

## Table of Contents

1. [Personas](#1-personas)
2. [Journey 1: First-Time Demo (Alex)](#2-journey-1-first-time-demo-alex)
3. [Journey 2: Returning User — New Document (Priya)](#3-journey-2-returning-user--new-document-priya)
4. [Journey 3: Output Review Deep-Dive (Marcus)](#4-journey-3-output-review-deep-dive-marcus)
5. [Edge Cases & Error States](#5-edge-cases--error-states)
6. [Entry Points](#6-entry-points)
7. [Information Architecture](#7-information-architecture)

---

## 1. Personas

### Alex — Demo Presenter (Operations Manager)

| Attribute | Detail |
|-----------|--------|
| **Role** | Operations manager in semiconductor manufacturing |
| **Goal** | Demonstrate AI capability to VP-level management and secure funding for the full industrialization platform |
| **Context** | Presenting in a conference room, laptop connected to a projector, 5 minutes on the agenda |
| **Tech comfort** | Moderate — comfortable with web applications, not a developer |
| **Key needs** | Smooth flow with zero errors, impressive visuals, clear cost and time metrics |
| **Success criteria** | Management approves funding for the full General Unified Industrialization Dashboard platform |

### Priya — Industrial Engineer

| Attribute | Detail |
|-----------|--------|
| **Role** | Process engineer responsible for assembly procedures in a semiconductor fab |
| **Goal** | Generate structured work instructions from engineering documents for integration into PLM/MES systems |
| **Context** | Post-demo adoption phase, working at her desk with real manufacturing procedures |
| **Tech comfort** | High — uses MES, PLM, and ERP systems daily, understands structured data and XML |
| **Key needs** | Accurate output with correct part IDs, XML that integrates with existing systems, reliable quality scoring |
| **Success criteria** | Correct, guideline-compliant work instructions in XML that import cleanly into her PLM system |

### Marcus — Technical Writer

| Attribute | Detail |
|-----------|--------|
| **Role** | Technical writer authoring assembly manuals and standard operating procedures |
| **Goal** | Accelerate work instruction creation with AI assistance, comparing AI output to manual authoring |
| **Context** | Post-demo adoption, evaluating whether Guid output matches his professional standards |
| **Tech comfort** | Moderate — expert in documentation tooling and style guides, less familiar with engineering data systems |
| **Key needs** | Clear verb-first language, safety compliance, illustration quality, adherence to writing guidelines |
| **Success criteria** | AI-generated output that matches or exceeds his manual writing quality, reducing turnaround from days to minutes |

---

## 2. Journey 1: First-Time Demo (Alex)

**Trigger:** Alex opens his laptop in the conference room and navigates to `localhost:3000`. Five VPs are watching.

**Total duration:** ~3 minutes of pipeline execution + ~2 minutes of walkthrough = 5 minutes.

### Step-by-Step Flow

#### Step 1 — Landing Page (`/`)

| Aspect | Detail |
|--------|--------|
| **Sees** | Clean upload interface with Guid branding, a prominent file dropzone, and a domain selector |
| **Feels** | Professional and simple — this looks enterprise-grade, not a hackathon project |
| **Action** | Gives 30 seconds of verbal context: "This tool takes any engineering document and produces structured, illustrated work instructions using 8 specialized AI agents" |
| **Duration** | 30 seconds |

#### Step 2 — Upload Document

| Aspect | Detail |
|--------|--------|
| **Action** | Drags a KALLAX assembly PDF (24 pages) into the dropzone |
| **Sees** | Instant file preview showing filename, file size, and detected page count |
| **Feels** | Responsive, no confusion — the system immediately acknowledged the file |
| **Pain point avoided** | No "browse files" dialog, no ambiguity about supported formats |
| **Duration** | 5 seconds |

#### Step 3 — Configure

| Aspect | Detail |
|--------|--------|
| **Action** | Selects "Furniture Assembly" from the domain dropdown, leaves quality threshold at the default of 85 |
| **Sees** | Simple configuration form with clear labels and sensible defaults |
| **Action** | Clicks the "Generate Work Instructions" button |
| **Feels** | Confident — minimal decisions required, the tool knows what it is doing |
| **Duration** | 10 seconds |

#### Step 4 — Pipeline Monitor (`/pipeline/[jobId]`)

This is the centerpiece of the demo. Alex narrates as agents activate.

| Agent | What Alex Sees | What Alex Says | Duration |
|-------|---------------|----------------|----------|
| **1. Document Extractor** | Card activates, progress bar fills, "Extracting 24 pages..." | "The system reads every page of the document" | ~5s |
| **2. Vision Analyzer** | Thumbnails appear page by page, "Analyzing page 12 of 24..." | "It understands diagrams, not just text" | ~20s |
| **3. Instruction Composer** | Step count building: "Composing step 8 of 14..." | "Now it writes the actual procedures" | ~15s |
| **4. Guideline Enforcer** | Compliance checks ticking, "Enforcing 38 writing requirements..." | "Every instruction is checked against our standards" | ~15s |
| **5. Quality Reviewer** | Dual progress bars (parallel with Agent 6), quality score climbing | "Two independent reviewers run simultaneously" | ~20s |
| **6. Safety Reviewer** | Safety flags appearing alongside quality review | "One for quality, one for safety — like peer review" | (parallel) |
| **7. Illustration Generator** | Illustration thumbnails appearing step by step | "And it generates isometric illustrations for each step" | ~60s |
| **8. XML Assembler** | Brief flash, "Assembling XML...", completion checkmark | "Finally, everything is packaged into structured XML" | ~3s |

**Running cost ticker** in the corner: `$0.00 → $0.06 → $0.08 → $0.11 → $0.19 → $0.23 → $0.87 → $0.87`

| Aspect | Detail |
|--------|--------|
| **Feels** | Engaged, impressed by the transparency — every agent is visible, nothing is a black box |
| **Action** | Clicks an agent card to open the detail drawer showing the actual prompt and response |
| **Key moment** | When Agents 5+6 run in parallel — demonstrates architectural sophistication |
| **Duration** | ~2.5 minutes total |

#### Step 5 — Output Review (`/output/[jobId]`)

| Aspect | Detail |
|--------|--------|
| **Sees** | XML viewer with syntax highlighting, structured steps, quality badge showing "92/100 — Approved" |
| **Action** | Scrolls through the XML steps, each with verb-first instructions and part references |
| **Action** | Clicks "Illustrations" tab — grid of isometric, per-step images |
| **Action** | Clicks "Quality Report" tab — score breakdown, individual flags, safety review summary |
| **Action** | Clicks "Export XML" — file downloads immediately |
| **Feels** | Convinced — this is real, structured, and enterprise-ready |
| **Duration** | ~1.5 minutes of walkthrough |

#### Step 6 — Close

| Aspect | Detail |
|--------|--------|
| **Points to** | Total cost ($0.87) and total time (2:30) displayed in the output header |
| **Says** | "Under a dollar, under three minutes. Imagine this across our entire documentation library." |
| **Feels** | The room is interested. Questions begin. |

### Demo Edge Cases

| Scenario | Mitigation |
|----------|------------|
| Gemini API is slow | SSE keeps the UI alive — progress indicators animate continuously, agent cards show incremental updates |
| Gemini API is down | Set `DEMO_MODE=true` before the demo — replays pre-cached results with realistic timing, pipeline monitor animates identically |
| Quality score comes in low | This actually helps — shows the revision loop in action, demonstrating the system's depth and self-correction |
| Network drops mid-pipeline | SSE reconnects automatically with state recovery from the database |

---

## 3. Journey 2: Returning User — New Document (Priya)

**Trigger:** Priya bookmarks `localhost:3000` after seeing Alex's demo. She returns the next day with her own semiconductor manufacturing procedure document.

### Step-by-Step Flow

#### Step 1 — Upload

| Aspect | Detail |
|--------|--------|
| **Action** | Drags her own manufacturing procedure PDF (a real production document, not a demo file) |
| **Sees** | File preview, page count — same smooth experience as the demo |
| **Feels** | Familiar from watching the demo, no learning curve |

#### Step 2 — Configure

| Aspect | Detail |
|--------|--------|
| **Action** | Selects "Semiconductor Manufacturing" from the domain dropdown |
| **Action** | Raises the quality threshold slider to 90 (higher than the default 85) |
| **Thinks** | "For production use, I want stricter quality gates" |

#### Step 3 — Monitor

| Aspect | Detail |
|--------|--------|
| **Action** | Watches the pipeline execute, but this time clicks agent cards to inspect the actual prompts being sent |
| **Sees** | Detail drawer with full prompt text, Gemini response, token counts, model used, and per-agent cost |
| **Thinks** | "I can verify what the AI is being asked to do — this is not a black box" |
| **Notes** | Vision Analyzer escalates to Pro model on a complex schematic page — she sees the "Escalating to Pro model..." message |

#### Step 4 — Review

| Aspect | Detail |
|--------|--------|
| **Action** | Examines the XML structure in detail, expanding each `<step>` element |
| **Checks** | Part IDs in the XML `<parts-list>` match her Bill of Materials |
| **Checks** | Tool references are accurate for her manufacturing domain |
| **Checks** | Safety warnings are appropriate for the chemicals and equipment involved |
| **Feels** | Analytical — she is evaluating, not being impressed |

#### Step 5 — Export

| Aspect | Detail |
|--------|--------|
| **Action** | Downloads the XML file |
| **Action** | Imports the XML into her PLM system to test schema compatibility |
| **Result** | XML namespace (`urn:guid:work-instruction:1.0`) parses correctly |

#### Step 6 — Compare

| Aspect | Detail |
|--------|--------|
| **Action** | Reviews the quality flags in the quality report tab |
| **Notes** | Two flags about part ID formatting — she makes a mental note for feedback |
| **Thinks** | "85% of this is usable as-is. The remaining 15% would take me 10 minutes to fix versus 4 hours to write from scratch" |

### Key Differences from the Demo Journey

| Aspect | Demo (Alex) | Real Use (Priya) |
|--------|-------------|-------------------|
| Document | Pre-selected KALLAX PDF | Her own production procedure |
| Domain | Furniture Assembly | Semiconductor Manufacturing |
| Quality threshold | Default (85) | Raised to 90 |
| Inspection depth | Surface-level, narrated | Deep — inspects prompts, checks part IDs |
| Output use | Shown on projector | Exported and imported into PLM |
| Success metric | Audience reaction | XML accuracy and integration |

---

## 4. Journey 3: Output Review Deep-Dive (Marcus)

**Trigger:** Priya sends Marcus a direct link to a completed job: `/output/[jobId]`. He has not seen the pipeline run.

### Step 1 — XML Inspection (`/output/[jobId]`)

| Aspect | Detail |
|--------|--------|
| **Sees** | Output page loads directly — no need to re-run the pipeline |
| **Action** | Expands each `<step>` in the XML viewer |
| **Checks** | Every instruction begins with one of the 16 approved verbs (Insert, Attach, Tighten, etc.) |
| **Checks** | Part ID references in step text match entries in `<parts-list>` |
| **Checks** | Safety callouts are present for steps involving risk |
| **Checks** | Estimated time per step is reasonable |
| **Feels** | Professional scrutiny — he is evaluating this against his own writing standards |

### Step 2 — Illustration Gallery

| Aspect | Detail |
|--------|--------|
| **Action** | Switches to the Illustrations tab, scrolls through the per-step image grid |
| **Checks** | Isometric perspective is consistent across all illustrations |
| **Checks** | Arrow directions match the written instruction (e.g., "Slide left" has a leftward arrow) |
| **Checks** | Active parts are highlighted, inactive parts are ghosted |
| **Checks** | No text is embedded in illustrations (per IL-008 guideline) |
| **Feels** | Surprised — the illustration quality is higher than expected from AI generation |

### Step 3 — Quality Report

| Aspect | Detail |
|--------|--------|
| **Action** | Switches to the Quality Report tab |
| **Reads** | Overall score (e.g., 92/100) and per-category breakdown |
| **Reads** | Individual quality flags with severity levels |
| **Reads** | Safety review results — chemicals, PPE requirements, hazard classifications |
| **Reads** | Revision loop history — whether the pipeline self-corrected and how many loops it took |
| **Thinks** | "The quality system caught the same things I would have caught manually" |

### Step 4 — Export

| Aspect | Detail |
|--------|--------|
| **Action** | Downloads the XML for archival and comparison |
| **Plans** | Will compare this output side-by-side with a manually authored instruction for the same procedure |
| **Thinks** | "If this holds up, it will save the team 80% of initial drafting time" |

---

## 5. Edge Cases & Error States

### Empty States

| State | What the User Sees | Developer Action |
|-------|-------------------|-----------------|
| No jobs exist yet | Upload page with a helpful message and suggestion to try a sample document | Display an empty state component with a call-to-action pointing to the dropzone |
| Pipeline not started | All 8 agent cards in idle/grey state with "Waiting" labels | Each card renders its default idle state from the agent status enum |
| No illustrations generated yet | Skeleton placeholders in the illustration gallery grid | Show shimmer/skeleton components in the gallery layout |
| Job exists but output not ready | Output page shows pipeline status and a link back to the monitor view | Redirect or show a "Pipeline in progress" banner with a live link |

### Upload Errors

| Error | User Message | Technical Detail |
|-------|-------------|-----------------|
| Wrong file type | "Only PDF and DOCX files are supported" (inline, below the dropzone) | Client-side MIME type check before upload; server validates again |
| File too large | "File exceeds the maximum size of 50 MB" (inline) | Multipart form rejects with 413; client pre-checks `file.size` |
| Corrupted file | "This file could not be processed. Please check the file and try again." | Document Extractor (Agent 1) fails; pipeline transitions to `failed` state |
| Zero-page PDF | "This PDF appears to be empty or unreadable" | Extractor detects zero extracted pages and reports an error |

### Pipeline Failures

| Failure | User Experience | System Behavior |
|---------|----------------|-----------------|
| Gemini API rate limit | Agent card shows "Retrying..." with a countdown | Exponential backoff with jitter, up to 3 retries per agent |
| Agent timeout | Specific agent card turns red with "Timed out" message | 60-second per-agent timeout; pipeline marks agent as failed |
| Network loss during SSE | Brief disconnect indicator, then automatic reconnection | SSE client reconnects; server replays missed events from DB state |
| All agents fail | Pipeline status badge shows "Failed" with an error summary | Pipeline transitions to `failed`; all error details stored in `agent_executions` table |
| Gemini returns malformed JSON | Agent retries with adjusted prompt | Response parsing catches JSON errors; retry with stricter schema enforcement |

### Quality Gate Outcomes

| Score Range | Status | Color | User Experience |
|-------------|--------|-------|-----------------|
| >= 85 | **Approved** | Green | Pipeline proceeds to Illustration Generator, output is marked as production-ready |
| 70 - 84 | **Revise** | Yellow | Pipeline loops back to Guideline Enforcer with reviewer feedback, user sees "Revision loop 1 of 2" on the monitor |
| < 70 | **Hold** | Orange | Pipeline completes but output is flagged for human review; quality report highlights all failing criteria |
| After 2 revision loops, still below 85 | **Hold (max revisions)** | Orange | Pipeline completes with best-effort output; status indicates revision limit was reached |

### Slow Agent Scenarios

| Scenario | User Experience | Technical Detail |
|----------|----------------|-----------------|
| Vision Analyzer on complex pages | Agent card shows "Escalating to Pro model..." | Flash model times out or returns low confidence; orchestrator escalates to Pro |
| Illustration Generator (slowest agent) | Card shows "Generating illustration 5 of 12..." with per-step sub-progress | Each illustration is a separate API call; progress updates per completion |
| Overall pipeline exceeds 5 minutes | Timer in the pipeline header continues; no hard cutoff for the user | 10-minute server-side maximum; graceful degradation if exceeded |
| Document Extractor on a 100-page PDF | Progress bar shows "Extracting page 47 of 100..." | pdftoppm processes sequentially; progress emitted per page |

---

## 6. Entry Points

| Entry Point | URL | Persona | Context |
|-------------|-----|---------|---------|
| **Direct URL (demo setup)** | `localhost:3000` | Alex | Opens browser in conference room, navigates directly |
| **Bookmark (returning user)** | `localhost:3000` | Priya | Saved the URL after watching the demo, returns to upload her own document |
| **Shared output link** | `/output/[jobId]` | Marcus | Receives a link from Priya to review a completed job's output directly |
| **Pipeline monitor link** | `/pipeline/[jobId]` | Any | Shared link to a running or completed pipeline — useful for remote observers |
| **Job list navigation** | `/` (recent jobs section) | Priya | Returns to the upload page and clicks a previous job to revisit results |

### Navigation Between Views

```
/ (Upload & Configure)
    │
    ├── "Generate" button ──────► /pipeline/[jobId] (Pipeline Monitor)
    │                                  │
    │                                  ├── "View Output" link ──► /output/[jobId] (Output Review)
    │                                  │                               │
    │                                  └── "Cancel" button             ├── "Export XML" ──► file download
    │                                                                  │
    └── Recent jobs list ──────► /output/[jobId] or /pipeline/[jobId]  └── "Back to Upload" ──► /
```

---

## 7. Information Architecture

### Upload & Configure (`/`)

```
/
├── Page header
│   ├── Guid logo and wordmark
│   └── Tagline: "AI-Powered Work Instruction Generator"
│
├── File dropzone (primary action area)
│   ├── Drag-and-drop zone with icon and helper text
│   ├── "or click to browse" fallback
│   └── File preview (after upload): name, size, page count, remove button
│
├── Configuration panel
│   ├── Domain selector (dropdown)
│   │   └── Options: Furniture Assembly, Semiconductor Manufacturing, Automotive, Electronics, General
│   ├── Quality threshold (slider or number input, default: 85, range: 50-100)
│   └── Generate button (disabled until file is uploaded)
│
└── Recent jobs list (optional, below fold)
    └── Table or card list: job name, status badge, date, quality score, link to output
```

### Pipeline Monitor (`/pipeline/[jobId]`)

```
/pipeline/[jobId]
├── Pipeline header
│   ├── Job name (derived from uploaded filename)
│   ├── Status badge (pending | running | completed | failed)
│   ├── Elapsed timer (live, MM:SS format)
│   └── Cost ticker (live, running total in USD)
│
├── Agent card grid (2x4 or responsive layout, 8 cards total)
│   └── Each agent card
│       ├── Agent icon (unique per agent type)
│       ├── Agent name and number (e.g., "1. Document Extractor")
│       ├── Status indicator (idle | running | completed | failed)
│       ├── Progress bar (determinate where possible, indeterminate otherwise)
│       ├── Status message (e.g., "Extracting page 12 of 24...")
│       ├── Duration (elapsed time for this agent)
│       ├── Cost (per-agent cost in USD)
│       └── Click target → opens detail drawer
│
├── Detail drawer (slide-in panel, opened by clicking an agent card)
│   ├── Agent name and model used
│   ├── Prompt sent (collapsible, full text)
│   ├── Response received (collapsible, full text or structured JSON)
│   ├── Token usage (input / output / total)
│   ├── Timing breakdown
│   └── Cost for this agent call
│
├── Pipeline progress indicator
│   └── Horizontal step indicator showing current position in the 8-agent sequence
│
└── Action bar
    ├── Cancel button (visible while pipeline is running)
    └── "View Output" button (visible after pipeline completes)
```

### Output Review (`/output/[jobId]`)

```
/output/[jobId]
├── Output header
│   ├── Job name
│   ├── Quality score badge (e.g., "92/100 — Approved" in green)
│   ├── Export XML button
│   └── Generation metadata summary (cost, duration, model count)
│
├── Tab navigation
│   ├── [XML] — default active tab
│   ├── [Illustrations]
│   └── [Quality Report]
│
├── XML viewer tab
│   ├── Syntax-highlighted XML with collapsible sections
│   ├── <metadata> section (title, domain, safety-level, estimated-minutes)
│   ├── <parts-list> section (expandable, all parts with id/name/quantity)
│   ├── <tools-required> section
│   ├── <safety-warnings> section
│   ├── <phases> section
│   │   └── Each <step> (expandable)
│   │       ├── Instruction text
│   │       ├── Referenced parts and tools
│   │       ├── Step-level safety notes
│   │       ├── Illustration reference
│   │       └── Confidence score
│   └── <generation-metadata> section
│
├── Illustrations tab
│   ├── Grid of per-step illustration cards
│   │   └── Each card: step number, illustration image, caption
│   └── Click to enlarge (modal or lightbox)
│
└── Quality Report tab
    ├── Overall score with visual indicator (gauge or progress ring)
    ├── Per-category score breakdown (structure, safety, style, content)
    ├── Individual quality flags (list with severity: info, warning, error)
    ├── Safety review summary (hazards identified, PPE requirements, compliance status)
    └── Revision history (if any loops occurred: loop count, score progression, feedback given)
```

---

*This document describes the primary user journeys for Guid. For technical specifications, agent designs, and implementation details, see `docs/prd.md`.*
