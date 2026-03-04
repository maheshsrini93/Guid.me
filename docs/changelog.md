# Changelog

All notable changes to the Guid project are documented here.

Format: Each entry includes a date, category, and description of the change.

---

## 2026-03-04

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
