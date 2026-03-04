# Guid -- Task List

> **Last Updated:** 2026-03-04 (Rich Work Instruction Viewer T-066–T-068 completed)
> **Project:** General Unified Industrialization Dashboard
> **Authoritative Spec:** [`docs/prd.md`](./prd.md)

Task IDs are sequential (`T-001` through `T-069`). Every task declares its dependencies explicitly. Tasks within a milestone are ordered to maximize parallel execution.

---

## Phase 0: Foundation (COMPLETED)

- [x] `T-001` **Project scaffold** (depends: none) -- Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui + pnpm
- [x] `T-002` **Database schema** (depends: T-001) -- Drizzle ORM + SQLite, 4 tables (jobs, agent_executions, generated_guides, generated_illustrations), 5 indexes
- [x] `T-003` **Type definitions** (depends: T-001) -- 4 type files: agents.ts, pipeline.ts, xml.ts, api.ts
- [x] `T-004` **Gemini client** (depends: T-001) -- API wrapper for text, structured output, vision, and image generation + rate limiter
- [x] `T-005` **Guidelines loader** (depends: T-001) -- YAML parser for work-instructions.yaml and illustrations.yaml with singleton caching
- [x] `T-006` **Utility functions** (depends: T-001) -- ULID generator, file-storage helper, SSE stream helper
- [x] `T-007` **Page scaffolds** (depends: T-001) -- 3 page shells: `/` (upload), `/pipeline/[jobId]`, `/output/[jobId]`
- [x] `T-008` **API route stubs** (depends: T-001) -- 6 API routes returning 501 placeholders (POST/GET jobs, GET status, GET SSE, GET result, POST cancel)
- [x] `T-009` **Config module** (depends: T-001) -- Centralized `src/lib/config.ts` reading all environment variables with defaults
- [x] `T-010` **shadcn/ui components** (depends: T-001) -- Button, Card, Badge, Input, Select, Progress, Tabs components installed
- [x] `T-011` **Build verification** (depends: T-002, T-003, T-004, T-005, T-006, T-007, T-008, T-009, T-010) -- `pnpm build` succeeds, `pnpm dev` runs on port 3000

---

## Milestone 1: Text Pipeline (Phase 1) (COMPLETED)

> **Goal:** A PDF goes in, guideline-enforced steps come out. No illustrations, no quality loop, no frontend yet.

### Agents (parallelizable -- all depend on T-011 and T-012, not on each other)

- [x] `T-012` **Base agent class** (depends: T-011) -- Hybrid agent infrastructure: `src/lib/agents/types.ts` (AgentConfig, AgentContext, AgentResult, RetryConfig, EscalationRule, error classes), `src/lib/agents/base-code-agent.ts` (abstract class for code-only agents 1 & 8), `src/lib/agents/runner.ts` (generic runConfigAgent() for LLM agents with single/per-page/per-step modes), `src/lib/agents/context.ts` (createAgentContext() factory bridging both patterns to SSE, DB, cost tracking), `src/lib/agents/retry.ts` (withRetry() with exponential backoff, jitter, retryable error detection)
- [x] `T-013` **Agent 1: Document Extractor** (depends: T-012) -- PDF page extraction via pdftoppm (configurable DPI), DOCX conversion via mammoth, outputs page images (PNG) + extracted text to `storage/temp/`. Implemented as BaseCodeAgent subclass in `src/lib/agents/document-extractor.ts`. Added `mammoth` 1.11.0 dependency.
- [x] `T-014` **Agent 2: Vision Analyzer** (depends: T-012) -- Gemini Flash per-page vision analysis with response schema (objects, actions, sequences), automatic escalation to Pro model on low confidence or complex schematics. Config-driven: `src/lib/agents/configs/vision-analyzer.config.ts`, `src/lib/agents/prompts/vision-analyzer.ts`, `src/lib/agents/schemas/vision-analyzer.schema.ts`
- [x] `T-015` **Agent 3: Instruction Composer** (depends: T-012) -- Gemini Flash step sequencing from vision analysis + extracted text, outputs ordered steps with parts, tools, and safety references. Config-driven: `src/lib/agents/configs/instruction-composer.config.ts`, `src/lib/agents/prompts/instruction-composer.ts`, `src/lib/agents/schemas/instruction-composer.schema.ts`
- [x] `T-016` **Agent 4: Guideline Enforcer** (depends: T-012) -- Gemini Flash with full YAML guidelines injected (no truncation), enforces 38 WI rules including 16 approved verbs, outputs compliant step sequence. Config-driven: `src/lib/agents/configs/guideline-enforcer.config.ts`, `src/lib/agents/prompts/guideline-enforcer.ts`, `src/lib/agents/schemas/guideline-enforcer.schema.ts` (16 verb enum)

### Infrastructure (parallelizable with agents)

- [x] `T-017` **SSE event emitter** (depends: T-011) -- PipelineEventEmitter singleton in `src/lib/orchestrator/event-emitter.ts` emitting typed events (agent:start, agent:progress, agent:complete, pipeline:state, pipeline:cost, pipeline:error), supports multiple concurrent listeners per job via subscribe/emit/dispose per jobId, auto-cleans on disconnect
- [x] `T-018` **Job API: POST /api/jobs** (depends: T-002, T-006) -- Create job from multipart form upload, validate file type (PDF/DOCX) and size (<= 50 MB), save file to `storage/uploads/`, create job record in DB, start orchestrator asynchronously, return `{ jobId }`
- [x] `T-019` **Job API: GET /api/jobs/[jobId]** (depends: T-002) -- Return job status, config, timing, cost, and agent execution summaries from DB
- [x] `T-020` **Job API: GET /api/jobs/[jobId]/sse** (depends: T-017) -- SSE endpoint subscribing to pipeline events for a specific job, streams typed events to the client
- [x] `T-020b` **Job API: POST /api/jobs/[jobId]/cancel** (depends: T-017) -- Cancel endpoint sets cancellation flag, orchestrator checks between agent steps

### Orchestrator (depends on all agents + SSE)

- [x] `T-021` **Orchestrator state machine** (depends: T-013, T-014, T-015, T-016, T-017) -- State machine in `src/lib/orchestrator/orchestrator.ts` coordinating agents 1-4 in sequence (pending -> extracting -> analyzing -> composing -> enforcing), managing state transitions, cost accumulation, event emission, error handling, and cancellation checks between steps
- [x] `T-022` **Job API: start orchestrator from POST** (depends: T-018, T-021) -- POST /api/jobs creates job and starts orchestrator asynchronously. GET /api/jobs lists all jobs.

### Integration

- [ ] `T-023` **Pipeline integration test (Phase 1)** (depends: T-021, T-022, T-020) -- End-to-end test: upload PDF via POST /api/jobs, verify orchestrator runs agents 1-4, confirm enforced steps stored in DB, verify SSE events emitted correctly

---

## Milestone 2: Frontend Pipeline Monitor (Phase 2) (COMPLETED)

> **Goal:** The pipeline monitor page shows agents executing in real time with SSE. Upload page is fully functional.

### Components (parallelizable -- all depend on types, not on each other)

- [x] `T-024` **SSE client hook (useEventSource)** (depends: T-020) -- Custom React hook in `src/hooks/use-event-source.ts` managing EventSource connection, automatic reconnection, typed event parsing, and state mapping for pipeline monitor
- [x] `T-025` **Agent card component** (depends: T-003) -- `src/components/pipeline/agent-card.tsx` with 4 visual states (idle/active/complete/error), agent-specific color accents, status icon, progress bar, duration and cost badges, click target for detail drawer
- [x] `T-026` **Pipeline progress indicator** (depends: T-003) -- `src/components/pipeline/pipeline-progress.tsx` horizontal connected-dot stepper showing current position in 8-agent sequence, active dot pulses, completed dots filled emerald
- [x] `T-027` **Cost ticker component** (depends: T-003) -- `src/components/pipeline/cost-ticker.tsx` displaying running total in `font-mono`, brief indigo color flash on value change fading in 300ms, positioned top-right of pipeline header

### Detail view

- [x] `T-028` **Agent detail drawer** (depends: T-025) -- `src/components/pipeline/detail-drawer.tsx` slide-in panel (480px max) showing agent name, model used, full prompt sent, raw response, token usage (input/output/total), timing breakdown, per-agent cost

### Page integration

- [x] `T-029` **Pipeline monitor page integration** (depends: T-024, T-025, T-026, T-027, T-028) -- Wire SSE hook to all pipeline components in `src/app/pipeline/[jobId]/page.tsx`: agent cards update in real time, progress indicator advances, cost ticker increments, detail drawer opens on card click, cancel button visible while running, "View Output" link on completion

### Upload page

- [x] `T-030` **Upload page implementation** (depends: T-022) -- Full upload page in `src/app/page.tsx`: drag-and-drop file dropzone with instant preview (filename, size, page count), domain selector dropdown (Semiconductor, Automotive, Aerospace, Pharmaceutical, Consumer, Furniture Assembly), quality threshold input (default 85, range 50-100), "Generate Work Instructions" button, client-side file validation (type + size)

### Navigation

- [x] `T-031` **Page navigation flow** (depends: T-029, T-030) -- Navigation between upload -> pipeline -> output: "Generate" navigates to `/pipeline/[jobId]`, "View Output" navigates to `/output/[jobId]`, "Back to Upload" returns to `/`, recent jobs list on upload page linking to previous outputs

---

## Milestone 3: Quality + XML (Phase 3) (COMPLETED)

> **Goal:** Quality and safety review with feedback loop, XML output, output review page.

### Review agents (parallelizable)

- [x] `T-032` **Agent 5: Quality Reviewer** (depends: T-012) -- Gemini Pro agent evaluating enforced steps against full YAML guidelines, produces quality score (0-100), per-step quality flags with severity levels, per-category breakdown (structure, safety, style, content). Config-driven: `src/lib/agents/configs/quality-reviewer.config.ts`, `src/lib/agents/prompts/quality-reviewer.ts`, `src/lib/agents/schemas/quality-reviewer.schema.ts`
- [x] `T-033` **Agent 6: Safety Reviewer** (depends: T-012) -- Gemini Pro agent verifying safety compliance: hazard identification, PPE requirements, chemical handling, tool safety, ESD precautions, produces safety pass/fail and hazard report. Config-driven: `src/lib/agents/configs/safety-reviewer.config.ts`, `src/lib/agents/prompts/safety-reviewer.ts`, `src/lib/agents/schemas/safety-reviewer.schema.ts`

### Parallel execution and quality gate

- [x] `T-034` **Parallel execution of agents 5+6** (depends: T-032, T-033) -- Orchestrator runs Quality and Safety reviewers concurrently via `Promise.all()`, combines scores into weighted quality score (70% quality + 30% safety)
- [x] `T-035` **Quality gate logic** (depends: T-034) -- Quality gate in `src/lib/quality/quality-gate.ts`: >= 85 approved, 70-84 revise (if revision budget remains), < 70 hold, returns decision + combined score + revision feedback

### Feedback loop

- [x] `T-036` **Feedback loop (revision routing)** (depends: T-035, T-016) -- Orchestrator revision loop: route reviewer feedback to Guideline Enforcer (Agent 4), re-run enforcement + post-processing then re-review, maximum 2 iterations, track revision count in job record, emit SSE events for revision state

### Compliance layers 3 and 4 (parallelizable)

- [x] `T-037` **Post-processor (9+ deterministic transforms)** (depends: T-005) -- `src/lib/guidelines/post-processor.ts`: verb-first sentence enforcement (WI-022, 16 approved verbs), part ID insertion, safety tag normalization, whitespace/formatting cleanup, metric unit enforcement, sentence case, maximum sentence length enforcement, hazard keyword detection (9 transforms)
- [x] `T-038` **Validator registry (22+ validators)** (depends: T-005) -- `src/lib/quality/validator-registry.ts`: 22 validators covering unapproved verbs, verb-first sentences, sentence length, missing parts refs, missing quantity, part ID format, missing safety warnings, two-person consistency, step numbering, empty instruction, confidence range, low confidence, passive voice, metadata completeness, safety level consistency, duplicate titles, instruction min length, phase transitions, source pages, complexity, title-instruction match, minimum steps

### XML assembly

- [x] `T-039` **Agent 8: XML Assembler** (depends: T-012, T-035) -- BaseCodeAgent subclass in `src/lib/agents/xml-assembler.ts`, collects all pipeline outputs, groups steps into phases, deduplicates parts and tools, builds XmlWorkInstruction data structure
- [x] `T-040` **XML builder** (depends: T-039) -- `src/lib/xml/builder.ts` producing canonical XML with namespace `urn:guid:work-instruction:1.0`: metadata, parts-list, tools-required, safety-warnings, phases/steps, generation-metadata with quality flags, proper XML escaping

### Orchestrator update

- [x] `T-041` **Orchestrator: full pipeline through assembling** (depends: T-036, T-037, T-038, T-040) -- Full orchestrator: agents 1-4 → post-processor → agents 5+6 (parallel) → quality gate → [revision loop, max 2] → agent 8 → persist to generated_guides → completed. SSE events for all states including reviewing, revising.

### Output page and API

- [x] `T-042` **GET /api/jobs/[jobId]/result endpoint** (depends: T-040) -- Returns job info, guide (XML content, JSON, quality score/decision, issues, safety issues, step/phase counts, models used, costs), and per-agent cost breakdown
- [x] `T-043` **Output review page: XML viewer** (depends: T-042) -- XML viewer with line numbers and syntax highlighting (tags in indigo, attributes in violet, values in emerald), collapsible, export XML download button
- [x] `T-044` **Output review page: Quality report** (depends: T-042) -- Quality report tab: score ring with color-coded threshold, issue summary by severity, review details (safety level, revisions, safety issues), full quality issues list with category/step/description/fix, safety issues list with hazard type and required actions. Cost breakdown tab with per-agent table.

---

## Milestone 4: Illustrations (Phase 4) (COMPLETED)

> **Goal:** AI-generated isometric illustrations for each step, integrated into XML and the output view.

- [x] `T-045` **Agent 7: Illustration Generator** (depends: T-012) -- Standalone agent class (not BaseCodeAgent — makes real API calls with per-step cost tracking) using Gemini Flash Image. Per-step illustration generation with IL guidelines in prompts, part label mapping (IL-007: skip I/O), active/inactive part highlighting (IL-006), motion arrows, two-person indicators. Saves PNGs to `storage/jobs/{jobId}/illustrations/`, reports per-step progress via SSE.
- [x] `T-046` **Illustration storage and DB tracking** (depends: T-045, T-006) -- PNGs saved by Agent 7 to `storage/jobs/{jobId}/illustrations/`. API route `GET /api/jobs/[jobId]/illustrations/[step]` serves illustration PNGs with caching headers. DB insert handled in orchestrator after guide persistence (generated_illustrations table requires guideId FK).
- [x] `T-047` **Orchestrator: illustrating state** (depends: T-045, T-041) -- Added illustrating state between reviewing and assembling. Agent 7 runs after quality gate approval, emits per-step progress SSE ("Generating illustration 5 of 12..."). Illustration records persisted to generated_illustrations table after guide insert (guideId FK constraint).
- [x] `T-048` **XML illustration references** (depends: T-046, T-040) -- Updated XML assembler to build stepNumber→filename map from `state.illustrations` and populate `illustrationSrc` on each XmlStep. XML builder already renders `<illustration ref="step-001.png" />`.
- [x] `T-049` **Illustration gallery component** (depends: T-046) -- `src/components/output/illustration-gallery.tsx`: responsive grid (2/3/4 col), per-step cards with fuchsia step badges, Image hover zoom icon, click-to-enlarge lightbox overlay with header/instruction/close, Next.js Image optimization
- [x] `T-050` **Pipeline monitor: illustration agent card** (depends: T-025, T-047) -- Already configured in Phase 2: `AGENT_VISUALS["illustration-generator"]` (fuchsia, Image icon), `AGENT_REGISTRY` entry, `AGENT_ORDER[7]`. SSE events from Agent 7 (per-step progress messages, cost) automatically drive the card state — no changes needed.
- [x] `T-051` **Output review: illustration tab integration** (depends: T-049, T-043) -- Added "Illustrations" tab to output page (between XML and Quality), result API returns illustration metadata, IllustrationGallery wired with step titles/instructions from JSON content, count badge on tab

---

## Milestone 5: Polish + Demo Prep (Phase 5)

> **Goal:** Production-quality demo experience, pre-cached fallback mode, rehearsed 5-minute flow.

### Cost and tracking

- [x] `T-052` **Cost tracking refinement** (depends: T-027, T-041) -- Per-agent cost breakdown stored in agent_executions, cumulative cost in jobs table updated after each agent, cost displayed in pipeline monitor header, final cost in XML generation-metadata, per-model pricing configuration

### Cancellation

- [x] `T-053` **Cancel job implementation** (depends: T-021) -- POST /api/jobs/[jobId]/cancel sets cancellation flag, orchestrator checks flag between agent steps and aborts gracefully, job status transitions to `cancelled`, SSE emits pipeline:cancelled event, pipeline monitor shows cancelled state

### Demo mode

- [x] `T-054` **Demo mode: pre-cached results** (depends: T-041) -- `src/lib/demo/` directory with stored results for a demo document (extracted pages, vision analysis, composed steps, enforced steps, review scores, illustrations, final XML), orchestrator detects `DEMO_MODE=true` and replays cached results
- [x] `T-055` **Demo mode: realistic timing** (depends: T-054) -- Configurable delays simulating actual API latency per agent, SSE events emitted with realistic timing, cost ticker increments match production behavior, pipeline monitor animates identically to live execution

### Error handling

- [x] `T-056` **Error handling polish** (depends: T-041) -- Graceful failure handling across all agents: exponential backoff with jitter (up to 3 retries), per-agent 60-second timeout, user-facing error messages in agent cards, pipeline transitions to `failed` on unrecoverable errors, full error details in agent_executions table
- [x] `T-057` **Loading and empty states** (depends: T-029, T-043) -- Skeleton loading states for all async content areas, empty state on upload page when no jobs exist, "Pipeline in progress" banner on output page when job is not complete, shimmer placeholders in illustration gallery

### Export

- [x] `T-058` **Export functionality** (depends: T-043) -- XML download button on output page triggering browser file download, JSON available via GET /api/jobs/[jobId]/result with Accept header, filename derived from job name and timestamp

### Theme

- [x] `T-059` **Light/dark mode toggle** (depends: T-007) -- Sun/moon icon button in page header, respect `prefers-color-scheme` on first visit, persist preference in localStorage, all components use Tailwind `dark:` variants per design guidelines

### Responsive

- [x] `T-060` **Responsive layout verification** (depends: T-029, T-030, T-043) -- Upload page centered single-column (`max-w-xl`), pipeline monitor responsive grid (1 col mobile / 2 col `md:` / 4 col `lg:`), output review two-column `lg:` (XML + sidebar) stacked on mobile, drawer adapts to mobile viewport

### Job history

- [x] `T-061` **GET /api/jobs (list all jobs)** (depends: T-002) -- Return paginated list of all jobs with status, filename, domain, quality score, created date, total cost, sorted by most recent first
- [x] `T-062` **Recent jobs list on upload page** (depends: T-061, T-030) -- Table or card list below the upload form showing recent jobs: filename, status badge, date, quality score, cost, link to output or pipeline monitor

### Rehearsal

- [x] `T-063` **Demo rehearsal script** (depends: T-054, T-055) -- Written walkthrough script aligned with Alex's user journey (30s intro, 5s upload, 10s configure, 2.5 min pipeline, 1.5 min output review), timing targets per agent, talking points for each step
- [x] `T-064` **End-to-end test with demo document** (depends: T-041, T-047) -- Full pipeline test with the demo PDF: upload -> agents 1-8 -> XML output + illustrations, verify quality score >= 85, verify all illustrations generated, verify XML validates, verify total time < 5 minutes
- [ ] `T-065` **Timing optimization** (depends: T-064) -- Profile pipeline execution, identify bottlenecks, optimize illustration generation parallelism where possible, tune SSE event frequency, ensure demo completes within the 5-minute target

---

## Rich Work Instruction Viewer (Post-Phase 5)

> **Goal:** Rendered work instruction view as the default output tab, replacing raw XML for end-users.

- [x] `T-066` **Instruction viewer components** (depends: T-043) -- 8 new components in `src/components/output/`: safety-callout (severity-colored banners), procedure-header (metadata + parts + tools), step-card (instruction + badges + inline illustration), phase-section (phase heading + steps), instruction-toc (left sidebar navigation), instruction-illustration (right sidebar with scroll/hover sync), instruction-content (center pane), instruction-viewer (3-pane orchestrator with IntersectionObserver)
- [x] `T-067` **Output page integration** (depends: T-066) -- Added "Work Instruction" as default tab on output page, renders InstructionViewer from jsonContent, existing XML/Illustrations/Quality/Cost tabs preserved
- [x] `T-068` **Documentation updates** (depends: T-067) -- Updated changelog, tasks, master-plan with new viewer feature

---

## Dependency Graph Summary

### Critical Path

The longest dependency chain determines the minimum total build time:

```
T-001 (scaffold)
  -> T-011 (build verification)
    -> T-012 (base agent)
      -> T-013..T-016 (agents 1-4, parallel)
        -> T-021 (orchestrator)
          -> T-036 (feedback loop, needs T-032..T-035)
            -> T-041 (full orchestrator)
              -> T-047 (illustrating state, needs T-045)
                -> T-064 (end-to-end test)
                  -> T-065 (timing optimization)
```

**Critical path:** T-001 -> T-011 -> T-012 -> T-013 -> T-021 -> T-036 -> T-041 -> T-047 -> T-064 -> T-065

### Parallelism Opportunities

| Parallel Group | Tasks | Prerequisite |
|----------------|-------|-------------|
| **Agents 1-4** | T-013, T-014, T-015, T-016 | T-012 (base agent) |
| **SSE + API routes** | T-017, T-018, T-019, T-020 | T-011 (build verification) |
| **Pipeline UI components** | T-025, T-026, T-027 | T-003 (types) |
| **Review agents 5+6** | T-032, T-033 | T-012 (base agent) |
| **Post-processor + Validators** | T-037, T-038 | T-005 (guidelines loader) |
| **Output page tabs** | T-043, T-044 | T-042 (result API) |
| **Illustration components** | T-049, T-050, T-051 | T-046 (illustration storage) |
| **Polish tasks** | T-052..T-062 | Various (see individual deps) |

### Cross-Milestone Dependencies

| From (Milestone) | To (Milestone) | Via Tasks |
|-------------------|----------------|-----------|
| M1 -> M2 | SSE endpoint enables client hook | T-020 -> T-024 |
| M1 -> M2 | Job API enables upload page | T-022 -> T-030 |
| M1 -> M3 | Base agent enables review agents | T-012 -> T-032, T-033 |
| M1 -> M3 | Enforcer enables feedback loop | T-016 -> T-036 |
| M3 -> M4 | Full orchestrator enables illustrating state | T-041 -> T-047 |
| M3 -> M4 | XML builder enables illustration refs | T-040 -> T-048 |
| M3 -> M5 | Full orchestrator enables demo mode | T-041 -> T-054 |
| M4 -> M5 | Illustrations enable end-to-end test | T-047 -> T-064 |

---

*This task list is the operational companion to [`docs/implementation-plan.md`](./implementation-plan.md). The implementation plan defines the architecture and build order. This document defines the executable work items with explicit dependencies for parallel execution.*
