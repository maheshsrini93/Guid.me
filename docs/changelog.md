# Changelog

All notable changes to the Guid project are documented here.

Format: Each entry includes a date, category, and description of the change.

---

## 2026-03-05

### Added — Pipeline Retry / Resume from Failure Point (T-069 through T-072)

**Trigger:** Implemented via `/project-docs:implement`

**Tasks completed:** T-069, T-070, T-071, T-072

**New files:**
- **`src/app/api/jobs/[jobId]/retry/route.ts`** — POST endpoint to retry a failed pipeline from last checkpoint

**Modified files:**
- **`src/lib/orchestrator/orchestrator.ts`** — Added `resumePipeline()` that reads completed `agent_executions` from DB, reconstructs `PipelineState` from `structuredOutput`, emits SSE events for completed agents, skips to the failed agent, and continues. Handles cleanup of previous `generated_guides`/`generated_illustrations` on re-runs.
- **`src/components/pipeline/pipeline-monitor.tsx`** — Added Retry button (RotateCcw icon) in the error banner for failed pipelines. Calls `/api/jobs/[jobId]/retry` and reloads the page for fresh SSE connection.

**How it works:**
1. When a pipeline fails, completed agents' outputs are already stored in `agent_executions.structuredOutput`
2. On retry, `resumePipeline()` reads these records, reconstructs the in-memory `PipelineState`, and determines the resume point
3. SSE events are emitted for completed agents so the UI shows them as already done
4. The pipeline continues from the failed agent, saving API cost and time

**Build:** `pnpm build` succeeds

---

## 2026-03-04

### Added — Rich Work Instruction Viewer (T-066 through T-068)

**Trigger:** User-requested feature — rendered work instruction viewer as default output tab

**New files (8):**
- `src/components/output/safety-callout.tsx` — Reusable severity-colored callout banner (danger/warning/caution) with appropriate icons
- `src/components/output/procedure-header.tsx` — Metadata card: title, purpose, badges (domain, safety, skill), info row (time, persons), safety warnings, parts table, tools list
- `src/components/output/step-card.tsx` — Step card: number badge, title, instruction, parts badges, tools, two-person indicator, safety callouts, inline illustration (mobile), confidence indicator
- `src/components/output/phase-section.tsx` — Phase heading + container for step cards
- `src/components/output/instruction-toc.tsx` — Left sidebar: procedure title, overview link, phase/step navigation with active highlight
- `src/components/output/instruction-illustration.tsx` — Right sidebar: illustration for active/hovered step with shimmer loading, lightbox zoom
- `src/components/output/instruction-content.tsx` — Center pane composing procedure header + phase sections
- `src/components/output/instruction-viewer.tsx` — Top-level 3-pane layout with IntersectionObserver scroll tracking, hover state, mobile TOC drawer

**Updated files (1):**
- `src/app/output/[jobId]/page.tsx` — Added "Work Instruction" tab (default), renders InstructionViewer from jsonContent, existing tabs (XML, Illustrations, Quality, Cost) remain

**Layout:** Desktop 3-pane (TOC w-56 | Content flex-1 | Illustration w-72), Mobile single-column with FAB TOC drawer and inline illustrations

**Build:** `pnpm build` succeeds

---

### Completed — Phase 5: Polish + Demo Prep (T-052 through T-062)

**Trigger:** Implemented via plan-mode implementation

**Tasks completed:** T-052, T-053, T-054, T-055, T-056, T-057, T-058, T-059, T-060, T-061, T-062, T-063, T-064

**New files (4):**
- `src/lib/demo/demo-data.ts` — Pre-cached demo data for all 8 agents: 6-step bookshelf assembly guide from 4-page PDF, including extracted document, page extractions, composed guide, enforced guide, quality review (91/100 approved), safety review, pre-built XML, per-agent cost records
- `src/lib/demo/demo-timing.ts` — Per-agent timing configuration matching production latency (300ms-12s depending on agent), sleep utility
- `src/lib/demo/demo-manager.ts` — Full demo pipeline orchestrator: replays cached results with realistic SSE events (agent:start, agent:progress, agent:complete, pipeline:cost), simulates parallel review (agents 5+6), persists demo results to DB, supports cancellation
- `src/components/shared/theme-toggle.tsx` — Sun/moon toggle button with localStorage persistence, hydration-safe mounting

**Updated files (14):**
- `src/lib/config.ts` — Added `agentTimeoutMs` config, centralized `MODEL_PRICING` and `IMAGE_COST_USD` constants
- `src/lib/gemini/models.ts` — Refactored to import pricing from centralized config
- `src/lib/orchestrator/orchestrator.ts` — Demo mode branch (`config.demoMode` → `runDemoPipeline()`), user-friendly error classification via `classifyError()`
- `src/lib/agents/types.ts` — Added `classifyError()` function mapping errors to user-friendly messages (API key, rate limit, timeout, network, parse errors, poppler missing)
- `src/lib/agents/runner.ts` — Uses `classifyError()` for SSE error events
- `src/components/pipeline/pipeline-monitor.tsx` — Added cancelled state banner (amber, XCircle icon)
- `src/components/pipeline/detail-drawer.tsx` — Mobile viewport cap `max-w-[90vw]`
- `src/components/output/illustration-gallery.tsx` — Shimmer placeholder with animate-pulse while images load, opacity transition on load
- `src/app/page.tsx` — Loading skeleton for recent jobs (3 animated rows), empty state ("No recent jobs"), relative date formatting (Just now, 5m ago, 2h ago, 3d ago)
- `src/app/output/[jobId]/page.tsx` — In-progress banner with pulsing dot when pipeline not yet complete, improved download filename (`{name}_{date}.xml`), scrollable tabs on mobile
- `src/app/api/jobs/[jobId]/result/route.ts` — Accept header handling: `application/xml` returns raw XML with Content-Disposition, `sanitizeFilename()` helper
- `src/app/api/jobs/route.ts` — Pagination via `?limit=N&offset=N`, returns `total` count, max 100 per page
- `src/app/layout.tsx` — Inline theme script preventing FOUC, `suppressHydrationWarning`
- `src/components/shared/header.tsx` — Integrated ThemeToggle component

**Build:** `pnpm build` succeeds

---

### Completed — Phase 4: Illustrations

**Trigger:** Implemented via `/project-docs:implement`

**Tasks completed:** T-045, T-046, T-047, T-048, T-049, T-050, T-051

**New files (3):**
- `src/lib/agents/illustration-generator.ts` — Agent 7: standalone class (not BaseCodeAgent) using Gemini Flash Image, per-step illustration generation with IL guidelines in prompts, part label mapping (IL-007: skip I/O), active/inactive part highlighting (IL-006), motion arrows, two-person indicators, per-step cost tracking and SSE progress
- `src/app/api/jobs/[jobId]/illustrations/[step]/route.ts` — GET endpoint serving illustration PNGs from storage with caching headers
- `src/components/output/illustration-gallery.tsx` — Responsive grid (2/3/4 col) of per-step illustration cards with fuchsia step badges, hover zoom, click-to-enlarge lightbox overlay

**Updated files (4):**
- `src/lib/orchestrator/orchestrator.ts` — Added illustrating state between reviewing and assembling, Agent 7 execution, illustration records persisted to generated_illustrations table after guide insert
- `src/lib/agents/xml-assembler.ts` — Updated groupStepsIntoPhases to build stepNumber→filename map from state.illustrations, populates illustrationSrc on each XmlStep
- `src/app/api/jobs/[jobId]/result/route.ts` — Added query for generated_illustrations, returns illustration metadata in response
- `src/app/output/[jobId]/page.tsx` — Added "Illustrations" tab with IllustrationGallery component, step titles from JSON content, count badge

**tasks.md** — Marked T-045 through T-051 as complete, Milestone 4 marked COMPLETED

**Build:** `pnpm build` succeeds

---

### Completed — Phase 3: Quality + XML

**Trigger:** Implemented via `/project-docs:implement`

**Tasks completed:** T-032, T-033, T-034, T-035, T-036, T-037, T-038, T-039, T-040, T-041, T-042, T-043, T-044

**New files (12):**
- `src/lib/agents/schemas/quality-reviewer.schema.ts` — Gemini responseSchema for Agent 5 (QualityReviewResult: overallScore, decision enum, issues array with 12 category enums)
- `src/lib/agents/schemas/safety-reviewer.schema.ts` — Gemini responseSchema for Agent 6 (SafetyReviewResult: safetyPassed, issues with 10 hazardType enums, recommendedSafetyLevel)
- `src/lib/agents/prompts/quality-reviewer.ts` — Agent 5 system prompt (full YAML guidelines injection, 12 scoring criteria with point deductions) + user prompt
- `src/lib/agents/prompts/safety-reviewer.ts` — Agent 6 system prompt (10 safety categories with detailed checks) + user prompt
- `src/lib/agents/configs/quality-reviewer.config.ts` — AgentConfig for Gemini Pro, temp 0.3, 90s timeout
- `src/lib/agents/configs/safety-reviewer.config.ts` — AgentConfig for Gemini Pro, temp 0.2, 90s timeout
- `src/lib/quality/quality-gate.ts` — Quality gate: 70% quality + 30% safety weighted score, approve/revise/hold decision, revision feedback builder
- `src/lib/guidelines/post-processor.ts` — 9 deterministic transforms: verb-first enforcement, sentence length, part ID insertion, safety tag normalization, whitespace cleanup, metric unit conversion, sentence case, hazard keyword detection
- `src/lib/quality/validator-registry.ts` — 22 validators producing QualityFlag arrays with severity levels, covering verbs, sentence length, parts, safety, metadata, structure
- `src/lib/agents/xml-assembler.ts` — Agent 8 BaseCodeAgent: collects pipeline outputs, groups steps into phases, deduplicates parts/tools, builds XmlWorkInstruction
- `src/lib/xml/builder.ts` — XML builder producing canonical XML with namespace urn:guid:work-instruction:1.0, proper escaping, 2-space indentation

**Updated files (3):**
- `src/lib/orchestrator/orchestrator.ts` — Full pipeline: agents 1-4 → post-processor → agents 5+6 (Promise.all) → quality gate → revision loop (max 2) → agent 8 → persist to generated_guides → completed
- `src/app/api/jobs/[jobId]/result/route.ts` — Implemented: returns job info, guide XML/JSON, quality/safety data, per-agent cost breakdown
- `src/app/output/[jobId]/page.tsx` — Full output review: XML viewer (syntax highlighted, line numbers, collapsible, export), quality report (score ring, issue breakdown, quality/safety issue lists), cost breakdown (per-agent table, models used)

**tasks.md** — Marked T-032 through T-044 as complete, Milestone 3 marked COMPLETED

**Build:** `pnpm build` succeeds

---

### Completed — Phase 2: Frontend Pipeline Monitor

**Trigger:** Implemented via `/project-docs:implement`

**Tasks completed:** T-024, T-025, T-026, T-027, T-028, T-029, T-030, T-031

**New files (7):**
- `src/hooks/use-event-source.ts` — Custom React hook managing EventSource connection to SSE endpoint, automatic reconnection with exponential backoff, typed event parsing (7 event types), state reduction via useReducer mapping all SSE events to PipelineMonitorState
- `src/components/pipeline/agent-card.tsx` — Agent card with 4 visual states (idle/active/complete/error), agent-specific color accents (8 colors), Lucide icons per agent, pulsing active dot, progress bar, duration + cost badges
- `src/components/pipeline/pipeline-progress.tsx` — Horizontal connected-dot stepper showing current position in 8-agent sequence, active dots pulse, completed dots fill emerald, connector lines show progress
- `src/components/pipeline/cost-ticker.tsx` — Running cost total in font-mono with brief indigo flash (300ms transition) on value change
- `src/components/pipeline/detail-drawer.tsx` — Slide-in Sheet (480px max) showing agent name, model, token usage (input/output/total), timing, cost, collapsible prompt and response sections, error display
- `src/components/pipeline/pipeline-monitor.tsx` — Full pipeline monitor view: header with elapsed timer + cost ticker + status badge, progress stepper, 8 agent cards in responsive grid, completion/error banners, cancel button, View Output link, detail drawer integration

**Updated files (4):**
- `src/app/page.tsx` — Full upload page: drag-and-drop file dropzone with preview, domain selector (7 options), quality threshold input (50-100), "Generate Work Instructions" button, recent jobs list with status badges
- `src/app/pipeline/[jobId]/page.tsx` — Wired to PipelineMonitor client component with SSE integration
- `src/app/output/[jobId]/page.tsx` — Added navigation header with Back link, View Pipeline link (placeholder for Phase 3 content)
- `src/app/api/jobs/[jobId]/route.ts` — Updated to return full agent execution details including prompt/response for detail drawer

**Dependencies added:**
- `@radix-ui/react-dialog` (via shadcn Sheet component)

**Build:** `pnpm build` succeeds

**tasks.md** — Marked T-024 through T-031 as complete, Milestone 2 marked COMPLETED

---

### Completed — Phase 1: Agent System Architecture + Text Pipeline

**Architecture:**
- Hybrid agent pattern: config-driven for LLM agents (2-7), class inheritance for code agents (1, 8)
- Separate prompt, schema, and config files under `src/lib/agents/prompts/`, `schemas/`, `configs/`
- 3 retry attempts with exponential backoff + jitter, Flash-to-Pro model escalation
- 4 guardrail layers: input validation, Gemini response schemas, post-processing (Phase 3), validators (Phase 3)
- Pipeline runs agents 1-4 sequentially with cancellation checks between each agent
- SSE events: `pipeline:state`, `agent:start`, `agent:progress`, `agent:complete`, `pipeline:cost`, `pipeline:error`

**New files (17):**
- `src/lib/agents/types.ts` — AgentConfig, AgentContext, AgentResult, RetryConfig, EscalationRule, AgentName, error classes (AgentExhaustedError, AgentValidationError, PipelineCancelledError)
- `src/lib/orchestrator/event-emitter.ts` — PipelineEventEmitter singleton (subscribe/emit/dispose per jobId)
- `src/lib/agents/context.ts` — createAgentContext() factory bridging both patterns to SSE, DB, cost tracking
- `src/lib/agents/retry.ts` — withRetry() with exponential backoff, jitter, retryable error detection
- `src/lib/agents/base-code-agent.ts` — Abstract BaseCodeAgent class for code-only agents (1 & 8)
- `src/lib/agents/runner.ts` — runConfigAgent() generic runner for LLM agents with single/per-page/per-step modes
- `src/lib/agents/prompts/vision-analyzer.ts` — Agent 2 system + user prompts
- `src/lib/agents/prompts/instruction-composer.ts` — Agent 3 system + user prompts
- `src/lib/agents/prompts/guideline-enforcer.ts` — Agent 4 system + user prompts (full YAML injection)
- `src/lib/agents/schemas/vision-analyzer.schema.ts` — Gemini responseSchema for RawPageExtraction
- `src/lib/agents/schemas/instruction-composer.schema.ts` — Gemini responseSchema for ComposedGuide
- `src/lib/agents/schemas/guideline-enforcer.schema.ts` — Gemini responseSchema for EnforcedGuide (16 verb enum)
- `src/lib/agents/configs/vision-analyzer.config.ts` — AgentConfig with Flash-to-Pro escalation rules
- `src/lib/agents/configs/instruction-composer.config.ts` — AgentConfig for Flash-only single call
- `src/lib/agents/configs/guideline-enforcer.config.ts` — AgentConfig for Flash-only low-temp compliance
- `src/lib/agents/document-extractor.ts` — Agent 1: PDF (pdftoppm) + DOCX (mammoth) extraction
- `src/lib/orchestrator/orchestrator.ts` — Pipeline state machine running agents 1-2-3-4 with cancellation support

**Updated files (4):**
- `src/app/api/jobs/route.ts` — POST creates jobs + starts pipeline async, GET lists all jobs
- `src/app/api/jobs/[jobId]/route.ts` — GET returns job + agent execution summaries
- `src/app/api/jobs/[jobId]/sse/route.ts` — SSE stream subscribing to pipeline events
- `src/app/api/jobs/[jobId]/cancel/route.ts` — POST cancels running pipeline

**Dependencies added:**
- `mammoth` 1.11.0 — DOCX extraction

---

### Added
- **Project Documentation Suite** — Created 5 structured project documentation files:
  - `docs/master-plan.md` — Vision, problem statement, target users, features, anti-goals, success criteria
  - `docs/implementation-plan.md` — Tech stack, architecture, components, data model, build phases, decisions log
  - `docs/design-guidelines.md` — Color palette, typography, spacing, layout, component specs, pipeline UI, animations
  - `docs/user-journeys.md` — 3 personas, 3 journeys, edge cases, error states, information architecture
  - `docs/tasks.md` — Task breakdown with dependency IDs across 5 milestones for parallel agent-team execution
  - `docs/changelog.md` — This file

### Context
- Phase 0 (Foundation) was completed on 2026-03-03
- Documentation created to guide Phase 1+ implementation by parallel agent teams
- All docs are AI-friendly with structured formats for automated consumption

---

## 2026-03-03

### Completed — Phase 0: Foundation
- Next.js 16 project scaffold with TypeScript, Tailwind v4, shadcn/ui
- 3 page scaffolds: `/` (upload), `/pipeline/[jobId]` (monitor), `/output/[jobId]` (review)
- 6 API route stubs (all returning 501)
- 4 type definition files: `agents.ts`, `pipeline.ts`, `xml.ts`, `api.ts`
- Drizzle ORM schema: 4 tables (`jobs`, `agent_executions`, `generated_guides`, `generated_illustrations`) + 5 indexes
- Gemini API client: text, structured, vision, image generation + rate limiter
- Guideline YAML files + loader with singleton caching
- Utility modules: ULID generator, file storage, SSE stream helper
- Centralized config module (`src/lib/config.ts`)
- shadcn/ui components: button, card, badge, input, select, progress, tabs
- Build verification: `pnpm build` succeeds, `pnpm dev` runs on port 3000
