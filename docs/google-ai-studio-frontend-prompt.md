# Build a Complete Frontend for "Guid" — AI Work Instruction Generator

You are building a **new frontend** for an existing Next.js 15+ application called **Guid** (General Unified Industrialization Dashboard). The backend API is already built and working. You are replacing the entire frontend UI/UX — all pages, components, hooks, and styling — while keeping the same API contracts and data flow.

## What the App Does

Users upload a PDF or DOCX (e.g., an IKEA furniture manual), and 8 AI agents process it into structured work instructions with illustrations. The pipeline runs in real-time, streaming progress via Server-Sent Events (SSE). The output is a structured instruction guide with phases, steps, parts lists, safety warnings, illustrations, quality scores, and exportable XML.

## Tech Stack (Do NOT Change)

- **Next.js 15+ App Router** (TypeScript)
- **Tailwind CSS v4** (PostCSS, oklch colors, `@theme` in `globals.css`)
- **shadcn/ui** components (already installed: button, card, badge, input, select, progress, tabs, sheet)
- **Lucide React** for icons
- **Server components** for pages, **client components** (`"use client"`) for interactive parts

## 3 Pages to Build

### Page 1: Upload & Configure (`/` — `src/app/page.tsx`)

**Purpose:** User uploads a document and configures generation settings.

**Must include:**

- Drag-and-drop file upload zone (accepts PDF and DOCX, max 50MB)
- File validation (MIME type + size)
- Domain selector dropdown: "general", "semiconductor", "automotive", "aerospace", "pharmaceutical", "consumer", "furniture"
- Quality threshold slider (range 50–100, default 85)
- Submit button → POSTs to `/api/jobs` as FormData, then redirects to `/pipeline/{jobId}`
- Recent jobs list fetched from `GET /api/jobs` with links to pipeline or output page based on status
- Loading skeleton for the jobs list

**API call on submit:**

```
POST /api/jobs
Content-Type: multipart/form-data
Body: { file, documentName?, domain?, qualityThreshold?, generateIllustrations? }
Response: { jobId: string }
```

**API call on mount:**

```
GET /api/jobs?limit=20&offset=0
Response: {
  jobs: [{ id, status, filename, documentName, qualityScore, qualityDecision, totalCostUsd, createdAt, completedAt }],
  total: number
}
```

### Page 2: Pipeline Monitor (`/pipeline/[jobId]` — `src/app/pipeline/[jobId]/page.tsx`)

**Purpose:** Real-time visualization of the 8-agent pipeline processing the document.

**Must include:**

- SSE connection to `/api/jobs/{jobId}/sse` (use the `useEventSource` hook described below)
- 8 agent cards in a grid, each showing: status (idle/active/complete/error), progress bar, duration, cost, status message
- Pipeline progress stepper (horizontal dots with connector lines)
- Live cost ticker showing running total ($ format, flashes on change)
- Elapsed timer (M:SS format, stops on terminal state)
- Cancel button (POST `/api/jobs/{jobId}/cancel`) while running
- Retry button (POST `/api/jobs/{jobId}/retry`) on failure
- "View Output" link on completion → navigates to `/output/{jobId}`
- Detail drawer (Sheet component, 480px) — click an agent card to see: model used, tokens, cost, duration, prompt sent, response received
- Completion/Error/Cancelled banners
- Connection status indicator

**The 8 agents (in order):**

| # | Agent | Icon | Color |
|---|-------|------|-------|
| 1 | Document Extractor | FileText | slate |
| 2 | Vision Analyzer | Eye | blue |
| 3 | Instruction Composer | Pen | violet |
| 4 | Guideline Enforcer | Shield | indigo |
| 5 | Quality Reviewer | CheckCircle | emerald |
| 6 | Safety Reviewer | AlertTriangle | amber |
| 7 | Illustration Generator | Image | fuchsia |
| 8 | XML Assembler | Code | cyan |

**Agent status states:**

- `idle` → gray dot
- `active` → colored dot with pulse animation + progress bar
- `complete` → green dot + duration/cost badges
- `error` → red dot + error message

**Note:** Agents 5 and 6 run in parallel (shown simultaneously active).

### Page 3: Output Review (`/output/[jobId]` — `src/app/output/[jobId]/page.tsx`)

**Purpose:** View, explore, and export the generated work instruction.

**Must include 5 tabs:**

1. **Instruction tab** — Structured view of the work instruction:
   - Left sidebar Table of Contents (phases → steps, click to scroll, active step highlight)
   - Procedure header: title, purpose, domain/safety/skill badges, time estimate, persons required
   - Parts list table (ID, Name, Quantity)
   - Tools list (with Required/Optional badges)
   - Guide-level safety warnings
   - Phase sections containing step cards
   - Each step card shows: step number badge, title, instruction text, parts badges with quantity, tools, two-person indicator, safety callouts (color-coded by severity), inline illustration, confidence indicator (if < 80%)

2. **XML tab** — Syntax-highlighted XML viewer (tags=indigo, attributes=violet, values=emerald)

3. **Illustrations tab** — Grid gallery of generated illustrations with lightbox on click. Each card shows image, step number badge, step title. Shimmer loading placeholder while images load.

4. **Quality tab** — Score ring/card (0-100), decision badge (approved/revise/hold), quality issues list grouped by severity (error/warning/info), safety issues list

5. **Cost tab** — Table of per-agent costs (agent name, model, cost, duration, input/output tokens), models used badges, total cost

**Summary cards at top:** Quality score, safety level, steps/phases count, total cost

**Download XML button** — creates blob download with filename `{sanitized_name}_{date}.xml`

**Handle edge cases:** in-progress job (show link to pipeline monitor), failed job (error banner)

**API call:**

```
GET /api/jobs/{jobId}/result
Response: {
  guide: { title, stepCount, phaseCount, qualityScore, qualityDecision, safetyLevel, estimatedMinutes, domain },
  xml: string,
  illustrations: [{ stepNumber, url }],
  quality: { score, decision, issues: QualityIssue[], safetyPassed, safetyIssues: SafetyIssue[] },
  cost: { totalUsd, breakdown: Record<string, number> },
  metadata: { processingTimeMs, textRevisionLoops, modelsUsed: string[] }
}
```

**Illustration images served at:** `GET /api/jobs/{jobId}/illustrations/{stepNumber}`

## SSE Hook (`src/hooks/use-event-source.ts`)

This is critical — the pipeline monitor depends entirely on it.

```typescript
// State shape managed by useReducer:
interface PipelineMonitorState {
  status: PipelineStatus;
  agents: Record<AgentName, AgentState>;
  totalCost: number;
  costBreakdown: Record<string, number>;
  error?: string;
  errorAgent?: AgentName;
  isConnected: boolean;
  qualityScore?: number;
  qualityDecision?: string;
  durationMs?: number;
}

interface AgentState {
  name: AgentName;
  displayName: string;
  status: "idle" | "active" | "complete" | "error";
  progress: number; // 0-100
  message: string;
  durationMs?: number;
  costUsd?: number;
  summary?: string;
  startedAt?: string;
}

type AgentName =
  | "document-extractor"
  | "vision-analyzer"
  | "instruction-composer"
  | "guideline-enforcer"
  | "quality-reviewer"
  | "safety-reviewer"
  | "illustration-generator"
  | "xml-assembler";
```

**SSE events to handle:**

| Event | Data Shape |
|-------|-----------|
| `pipeline:state` | `{ state: PipelineStatus, timestamp: string }` |
| `agent:start` | `{ agent: string, startedAt: string, parallel?: boolean }` |
| `agent:progress` | `{ agent: string, progress: number, message: string }` |
| `agent:complete` | `{ agent: string, durationMs: number, costUsd: number, summary: string }` |
| `pipeline:cost` | `{ totalUsd: number, breakdown: Record<string, number> }` |
| `pipeline:error` | `{ error: string, agent?: string, recoverable: boolean }` |
| `pipeline:complete` | `{ state: "completed", qualityScore: number, qualityDecision: string, totalCostUsd: number, durationMs: number }` |

**Implementation:** Use `new EventSource(url)`, listen via `addEventListener` for each event type, parse `JSON.parse(e.data)`, dispatch to reducer. Include exponential backoff reconnection (max 5 attempts, base 1s delay).

## Data Types for the Output Viewer

```typescript
// The JSON content parsed from the guide for the Instruction tab:
interface XmlWorkInstruction {
  metadata: {
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
  };
  partsList: { id: string; name: string; quantity: number }[];
  toolsRequired: { name: string; required: boolean }[];
  safetyWarnings: { severity: "caution" | "warning" | "danger"; text: string }[];
  phases: {
    name: string;
    steps: {
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
    }[];
  }[];
  generationMetadata: {
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
  };
}

interface QualityIssue {
  severity: "error" | "warning" | "info";
  category: string;
  stepNumber: number | null;
  description: string;
  responsibleAgent: "enforcer" | "composer";
  suggestedFix?: string;
}

interface SafetyIssue {
  severity: "warning" | "critical";
  stepNumber: number | null;
  hazardType: string;
  description: string;
  requiredAction: string;
}
```

## Shared Layout & Components

- **Root layout** (`src/app/layout.tsx`): Include dark mode prevention script (reads `localStorage.theme`, sets `.dark` class before paint)
- **Header** component: Logo ("Guid" + indigo dot) linking to `/`, optional center slot for children, ThemeToggle (sun/moon) on right
- **ThemeToggle**: Reads/writes `localStorage.theme`, toggles `document.documentElement.classList.dark`
- **StatusBadge**: Maps PipelineStatus → colored Badge (pending=gray, running states=blue, completed=green, failed=red, cancelled=amber)
- **SafetyCallout**: Color-coded by severity (caution=amber, warning=orange, danger=red) with AlertTriangle icon

## Design Direction

**I want a premium, modern, visually stunning UI.** The current UI feels too generic and plain. Here's what I want:

- **Visual hierarchy**: Clear distinction between primary actions, content, and secondary info
- **Microinteractions**: Smooth transitions, hover effects, subtle animations that make it feel alive
- **Pipeline visualization**: This is the showpiece — make the agent cards and progress visualization feel like a mission control dashboard. Think: glowing active states, smooth progress fills, satisfying completion animations
- **The output instruction viewer should feel like reading a beautifully typeset technical manual** — not a data dump
- **Dark mode should be the default and look incredible** — deep backgrounds, vibrant accent colors, subtle gradients
- **Use spacing generously** — don't cram things together
- **The upload page should feel inviting and premium** — large dropzone, clear call to action
- **Status colors should be vivid and intentional**, not just default Tailwind grays
- **Cards should have depth** — subtle shadows, borders, maybe glass morphism effects
- **Typography should be clean and hierarchical** — clear headings, readable body text

## File Structure to Generate

```
src/app/layout.tsx                           — Root layout with theme script
src/app/globals.css                          — Tailwind v4 theme with custom CSS variables
src/app/page.tsx                             — Upload & Configure page
src/app/pipeline/[jobId]/page.tsx            — Pipeline Monitor page (server wrapper)
src/app/output/[jobId]/page.tsx              — Output Review page

src/hooks/use-event-source.ts                — SSE hook with reconnection

src/components/header.tsx                    — App header with logo + theme toggle
src/components/logo.tsx                      — Guid logo
src/components/theme-toggle.tsx              — Dark/light switcher
src/components/status-badge.tsx              — Pipeline status badge

src/components/pipeline/pipeline-monitor.tsx  — Main pipeline client component
src/components/pipeline/agent-card.tsx        — Individual agent card
src/components/pipeline/pipeline-progress.tsx — Horizontal step indicator
src/components/pipeline/cost-ticker.tsx       — Live cost display
src/components/pipeline/detail-drawer.tsx     — Agent detail sheet/drawer

src/components/output/instruction-viewer.tsx  — Main instruction layout (TOC + content)
src/components/output/instruction-toc.tsx     — Table of contents sidebar
src/components/output/instruction-content.tsx — Main content area
src/components/output/procedure-header.tsx    — Title, metadata, parts, tools
src/components/output/phase-section.tsx       — Phase with step cards
src/components/output/step-card.tsx           — Individual step card
src/components/output/illustration-gallery.tsx— Image gallery with lightbox
src/components/output/safety-callout.tsx      — Safety warning callout
src/components/output/xml-viewer.tsx          — Syntax-highlighted XML
src/components/output/quality-report.tsx      — Quality score + issues
src/components/output/cost-breakdown.tsx      — Cost table
```

## Important Implementation Notes

1. Next.js 15+ page params are `Promise<{ jobId: string }>` — must `await params` in server components
2. Use `"use client"` directive on all interactive components
3. Import shadcn components from `@/components/ui/` (button, card, badge, input, select, progress, tabs, sheet already exist)
4. Use `cn()` utility from `@/lib/utils` for conditional classnames
5. Use `next/link` for navigation, `useRouter` from `next/navigation` for programmatic navigation
6. For illustrations, use `<img>` tags pointing to `/api/jobs/{jobId}/illustrations/{stepNumber}`
7. The `GET /api/jobs/{jobId}/result` response includes both `xml` (string) and `guide` (parsed metadata) — the full `XmlWorkInstruction` JSON is available in the guide record's `jsonContent` field. Fetch it and parse for the instruction viewer.
8. SSE endpoint: `/api/jobs/{jobId}/sse` — use native `EventSource` API
9. All API routes already exist and work — do NOT modify anything in `src/app/api/`, `src/lib/`, `src/types/`, or any backend code

**Generate ALL the files listed above with complete, production-ready code. Do not use placeholder comments or TODO markers. Every component should be fully implemented and styled.**
