# Guid -- Task List

> **Last Updated:** 2026-05-07 (Vision Analyzer polymorphism landed: T-083 and T-084 complete)
> **Project:** General Unified Industrialization Dashboard
> **Authoritative Spec:** [`docs/prd.md`](./prd.md)

Task IDs are sequential (`T-001` through `T-095`). Every task declares its dependencies explicitly. Tasks within a milestone are ordered to maximize parallel execution.

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

## Pipeline Retry / Resume (Post-Phase 5)

> **Goal:** Allow retrying a failed pipeline from the last successful agent instead of re-running from scratch.

- [x] `T-069` **Pipeline resume orchestrator** (depends: T-041) -- `resumePipeline()` reads completed `agent_executions` from DB, reconstructs `PipelineState` from `structuredOutput`, emits SSE events for completed agents, resumes from the failure point
- [x] `T-070` **Retry API endpoint** (depends: T-069) -- `POST /api/jobs/[jobId]/retry` validates job is failed, calls `resumePipeline()`
- [x] `T-071` **Retry button in pipeline monitor** (depends: T-070, T-028) -- Retry button in error banner, calls retry API, reloads page for fresh SSE connection
- [x] `T-072` **Cleanup on retry** (depends: T-069) -- Deletes existing `generated_guides` and `generated_illustrations` before re-persisting on successful retry

---

## Phase 6: 3D Model Input

> **Goal:** Accept STEP (CAD assembly) files as a third input type alongside PDF/DOCX. Agents 1, 2, and 7 become polymorphic, dispatching on the presence of `structuredMetadata`. Demo asset is a hand-curated 10-15-Part Assembly with explode view; bare STEP inputs degrade gracefully via Gemini-Pro-based geometry inference. Per-job cost for 3D inputs drops ~75% vs PDF.
>
> **Architecture:** [ADR-0001](./adr/0001-source-adapter-pattern.md), [ADR-0002](./adr/0002-polymorphic-illustration-agent.md). **Glossary:** [`CONTEXT.md`](../CONTEXT.md).

### Type system + storage scaffolding (parallelizable)

- [x] `T-073` **Type system extensions for input-agnostic pipeline** (depends: T-003) -- Generalize `ExtractedDocument` → `ExtractedSource { frames: Frame[], documentMetadata, structuredMetadata? }`; rename `ExtractedPage` → `Frame`; add `StructuredMetadata`, `AssemblyNode`, extended `StructuredPartRef` (with `parentAssemblyPath`, optional `mass`, `material`, `boundingBox`); extend `PipelineState` to carry `extractedSource` instead of `extractedDocument`. Files: `src/types/agents.ts`, `src/types/pipeline.ts`. Update all internal references in agents 2-8 to consume the renamed shape -- no behavior change yet, just type-level rename + field generalization.
- [x] `T-074` **DB schema migration: multi-file source** (depends: T-073, T-002) -- Generalize `jobs` table: `documentPath`/`documentMimeType` fields stay (becomes the "primary source" for the auxiliary file); add `auxiliaryPath`/`auxiliaryMimeType` columns nullable; add `sourceKind` enum (`pdf | docx | step | step+explode-video`); add `sequenceSource` (`explode-video | geometry-inferred | n/a`) and `sequenceConfidence` (0-1, nullable). Drizzle migration generated and applied. Files: `src/lib/db/schema.ts`.
- [x] `T-075` **Storage layout extension** (depends: T-006) -- Update `file-storage.ts` helpers to support per-job source directory `storage/jobs/{jobId}/source/{primary, auxiliary}` while preserving existing `storage/uploads/` for backward compatibility on existing jobs. New helpers: `getSourceDir(jobId)`, `getPrimarySourcePath(jobId, ext)`, `getAuxiliarySourcePath(jobId, ext)`. Files: `src/lib/utils/file-storage.ts`.

### Source Adapter restructure (depends on T-073)

- [x] `T-076` **Rename `DocumentExtractor` → `SourceAdapter` + dispatcher** (depends: T-073) -- Move `src/lib/agents/document-extractor.ts` to `src/lib/agents/source-adapter/index.ts`. Keep `BaseCodeAgent` inheritance. `execute()` dispatches by detecting input type (MIME + extension) and delegates to a sub-implementation interface `SourceAdapterImpl`. Update orchestrator references and all DB enum values (`agent_executions.agent_name`). Display name: "Source Adapter".
- [x] `T-077` **Move PDF/DOCX into sub-implementations** (depends: T-076) -- Extract existing PDF logic (`extractPdf` + `extractWithDocling`-PDF-path) to `src/lib/agents/source-adapter/pdf.ts`; DOCX logic to `src/lib/agents/source-adapter/docx.ts`. Each exports a `SourceAdapterImpl` producing `ExtractedSource` (with `structuredMetadata` undefined). Verify Phase 1-5 PDF/DOCX flows still pass end-to-end via existing demo and test corpus.

### CAD ingestion stack (parallelizable after T-076)

- [x] `T-078` **STEP parser via `occt-import-js`** (depends: T-076) -- Add `occt-import-js` (WASM, OpenCascade compiled) dependency. Implement `parseStep(filePath)` returning parts catalog (StructuredPartRef[]), assembly tree (AssemblyNode), per-part bounding boxes, per-part B-rep-derived triangle meshes. Validate Docker image compatibility — note this in deployment readme. Files: `src/lib/agents/source-adapter/cad/step-parser.ts`.
- [x] `T-079` **Explode-video keyframe extraction** (depends: T-076) -- Add `ffmpeg`-based frame extraction. Implement `extractKeyframes(mp4Path)` that detects motion-stall keyframes by computing frame-difference (mean absolute pixel delta) and emitting frames at local minima. Output: ordered `Frame[]` with timestamps. Empirical threshold tuning to be done against demo asset and test corpus. Files: `src/lib/agents/source-adapter/cad/keyframe-extractor.ts`.
- [x] `T-080` **Multi-view renderer (three.js + headless-gl)** (depends: T-076) -- Set up `three` + `headless-gl` Node-side rendering. Implement `renderAssemblyViews(meshes, transforms)` returning orthographic top/front/side + isometric PNGs at 1024×1024. Camera framing auto-derived from full assembly bounding box. Used both for STEP-only fallback (T-081) and for Agent 7 CAD path (T-088). Validate `headless-gl` Linux/Docker compatibility — fall back to Puppeteer if needed (note in T-074 deliverables). Files: `src/lib/render/three-renderer.ts`.
- [x] `T-081` **Sequence inference (Option A fallback)** (depends: T-078, T-080) -- Gemini Pro prompt taking parts catalog + assembly tree + multi-view renders, returns proposed step ordering as a list of Component IDs with overall confidence (0-1). Triggered only when explode video is absent. Output written into `structuredMetadata.sequenceSource = "geometry-inferred"` with confidence. Files: `src/lib/agents/source-adapter/cad/sequence-inference.ts`, plus prompt + schema files.
- [x] `T-082` **CAD sub-implementation** (depends: T-077, T-078, T-079, T-081) -- Top-level `src/lib/agents/source-adapter/cad/index.ts` orchestrating the sub-stages: STEP parse → branch on auxiliary file presence → (explode video → keyframe extract) OR (no auxiliary → multi-view render + sequence inference) → produce `ExtractedSource` with `structuredMetadata`. Reports sub-progress via `context.reportProgress` (`Parsing STEP`, `Extracting keyframes`, `Rendering multi-views`, `Inferring sequence`).

### Vision Analyzer polymorphism (depends on T-076 + T-082)

- [x] `T-083` **Vision Analyzer dispatcher restructure** (depends: T-076) -- Moved old `configs/vision-analyzer.config.ts` + `prompts/vision-analyzer.ts` + `schemas/vision-analyzer.schema.ts` into `src/lib/agents/vision-analyzer/{document,document.prompt,document.schema}.ts` (existing PDF/DOCX behavior preserved). Added `VisionAnalyzerImpl` interface in `types.ts` and dispatcher `src/lib/agents/vision-analyzer/index.ts` exporting `runVisionAnalyzer()`. Dispatcher walks IMPLS array (CAD first, then document) and selects by `canHandle(state)`. Orchestrator now imports `runVisionAnalyzer` instead of `visionAnalyzerConfig`.
- [x] `T-084` **CAD vision sub-implementation** (depends: T-082, T-083) -- `src/lib/agents/vision-analyzer/cad.ts` with trimmed schema (`cad.schema.ts` — only `actions`, `arrows`, `complexity`, `confidence`, `confirmationCue`) and trimmed prompt (`cad.prompt.ts` — keyframe-pair diff with active-Components candidate list). Two paths: explode-video → per-keyframe-pair Gemini Flash calls; geometry-inferred → deterministic synthesis from ordered partsCatalog with $0 cost. Two-person heuristic flags Components > 15kg or > 1m bounding box. Parts/quantities/tools come from `structuredMetadata`, merged by Agent 3.

### Illustration Renderer polymorphism (depends on T-076 + T-080 + T-082)

- [x] `T-085` **Rename `IllustrationGenerator` → `IllustrationRenderer` + dispatcher** (depends: T-076) -- Move `src/lib/agents/illustration-generator.ts` to `src/lib/agents/illustration-renderer/index.ts`. Dispatcher chooses sub-implementation by `structuredMetadata` presence. Update DB enum values (`agent_executions.agent_name`), pipeline UI agent registry, and SSE event names (preserving backward compatibility for existing jobs). Display name: "Illustration Renderer".
- [x] `T-086` **Move existing Gemini logic to sub-implementation** (depends: T-085) -- Extract existing per-step Gemini Flash Image logic to `src/lib/agents/illustration-renderer/gemini.ts`. PDF/DOCX path is unchanged in behavior.
- [x] `T-087` **CAD renderer sub-implementation: base render** (depends: T-080, T-085) -- Per-step three.js scene composition: load full Assembly (T-080 mesh data), set active Parts to opacity 1.0 (IL-008) and previously-installed Parts to opacity 0.3, hide not-yet-installed Parts. Isometric camera (IL-001). Render to 1600×1200 PNG. No Gemini call. Reports `costUsd: 0`, `modelUsed: "internal-cad-renderer"`. Files: `src/lib/agents/illustration-renderer/cad/base-renderer.ts`.
- [x] `T-088` **Programmatic overlay primitives** (depends: T-087) -- SVG/canvas overlay layer reading `EnforcedStep` annotation fields ([src/types/agents.ts:329-349](../src/types/agents.ts:329)) and drawing them on top of the base render. Primitives: `drawPartLabel(component, anchor)` (IL-002), `drawMotionArrow(start, end, direction)` (IL-010), `drawRotationIndicator(target, direction, amount)` (IL-011), `drawDetailCallout(subject, region)` (IL-009), `drawOkNok(okFrame, nokFrame, descriptions)` (IL-013), `drawTwoPersonGrip(positions)` (IL-015). Leader-line collision avoidance for labels. Files: `src/lib/render/overlays/{labels,arrows,rotation,callout,oknok,grip}.ts`.
- [x] `T-089` **CAD illustration sub-implementation** (depends: T-087, T-088) -- Top-level `src/lib/agents/illustration-renderer/cad/index.ts` orchestrating: for each step, call base renderer, then layer overlays per the EnforcedStep fields, write PNG to `storage/jobs/{jobId}/illustrations/step-NNN.png`. Returns `GeneratedIllustration[]` matching the existing shape. Cost: $0.

### Composer grounding (depends on T-073)

- [ ] `T-090` **Composer grounding against `structuredMetadata.partsCatalog`** (depends: T-073, T-082) -- Update `instruction-composer.ts` prompt and runner: when `state.extractedSource.structuredMetadata` is present, inject the parts catalog into the composer prompt as authoritative ground truth and instruct it to use those exact part IDs/names. Vision-extracted parts are merged as supplementary context only. No behavior change for PDF/DOCX paths. Files: `src/lib/agents/configs/instruction-composer.config.ts`, `src/lib/agents/prompts/instruction-composer.ts`.

### API + DB + UI changes

- [ ] `T-091` **POST /api/jobs accepts multi-file uploads** (depends: T-074, T-075) -- Update job creation endpoint to accept multipart form with `file` (primary) and optional `auxiliaryFile`. Validate combinations: `pdf | docx` standalone OR `step` standalone OR `step + mp4|jt`. Persist both files to `storage/jobs/{jobId}/source/`. Populate new DB columns (`auxiliaryPath`, `sourceKind`). Files: `src/app/api/jobs/route.ts`.
- [ ] `T-092` **Upload page UI: multi-file + 3D format support** (depends: T-091, T-030) -- Update upload page to accept STEP (`.stp`, `.step`) alongside PDF/DOCX. When STEP is selected, show optional second dropzone "Explode view (optional, MP4 or JT)". Show explanatory tooltip about the geometry-inferred fallback when explode video is omitted. Update file-validation logic. Add "Manufacturing / Machinery" option to domain selector. Files: `src/app/page.tsx`.
- [ ] `T-093` **Output page: geometry-inferred banner** (depends: T-091, T-051) -- When `sequenceSource === "geometry-inferred"`, show a prominent advisory banner above the work-instruction viewer: "Sequence inferred from geometry — confidence {N}%. Verify against engineering intent before use." Banner reads from `generated_guides.metadata.sequenceSource` / `sequenceConfidence`. Files: `src/app/output/[jobId]/page.tsx`, result API to surface fields.

### Demo asset + test corpus

- [ ] `T-094` **Hand-curated 3D demo asset** (depends: none -- can start anytime) -- Build a 10-15-Part Assembly in Fusion 360 or FreeCAD (recommended subjects: small geared mechanism, clamping vice, benchtop pulley, servo gripper). Author an Explode View. Export STEP (AP242) and explode-animation MP4. Commit to `storage/demo-assets/v1-demo/{assembly.stp, explode.mp4, README.md}` with provenance and license note. Used as the canonical demo asset for `DEMO_MODE=true` 3D path.
- [ ] `T-095` **Demo mode 3D extension** (depends: T-094, T-082, T-089, T-054) -- Extend `src/lib/demo/` with cached pipeline outputs for the 3D demo asset (Source Adapter ExtractedSource, Vision Analyzer per-keyframe extractions, Composer output, Enforcer output, review scores, CAD-rendered illustrations, final XML). Demo manager dispatches by source kind. Realistic timing per CAD-path agent (longer Source Adapter, faster Agent 7).
- [ ] `T-096` **Test corpus: open-source-hardware STEP files** (depends: none -- can start anytime) -- Collect 5-10 STEP files from RepRap, OpenROV, OSE, NASA open CAD, or similar OSHW-licensed sources. Document each asset's license and provenance in `tests/fixtures/3d/README.md`. Used to exercise the STEP-parse, multi-view-render, and bare-STEP fallback paths. Some assets without explode views to specifically exercise Option A inference.

### Quality + Safety adaptations (deferred — v1.1)

- [ ] `T-097` **Quality Reviewer cross-validation against CAD ground truth** (depends: T-082, T-032) -- When `structuredMetadata` is present, Quality Reviewer's prompt receives the deterministic parts catalog and must validate that every Component in the catalog is referenced in at least one EnforcedStep. New validators in `validator-registry.ts`: `missingPartCoverage`, `extraneousPartReference`. Files: `src/lib/agents/configs/quality-reviewer.config.ts`, `src/lib/quality/validator-registry.ts`. Future ADR likely.

### End-to-end + documentation

- [ ] `T-098` **End-to-end test: explode-video path** (depends: T-082, T-084, T-089, T-090, T-091, T-094) -- Upload demo asset (STEP + explode MP4) → verify Source Adapter produces structured metadata with `sequenceSource: "explode-video"` → verify Agents 2-8 run end-to-end → verify illustrations are CAD renders ($0 cost line for Agent 7) → verify quality score >= 85 → verify XML validates → verify total per-job cost < $0.30.
- [ ] `T-099` **End-to-end test: STEP-only fallback** (depends: T-081, T-082, T-091, T-093, T-096) -- Upload a STEP from the test corpus without an explode video → verify sequence inference runs → verify `sequenceSource: "geometry-inferred"` and confidence reported → verify output page shows the advisory banner → verify pipeline completes (even at lower confidence, it should not refuse).
- [ ] `T-100` **Documentation updates: changelog, master-plan** (depends: T-098, T-099) -- Update `docs/changelog.md` with Phase 6 entries; update `docs/master-plan.md` to mention 3D input as a supported source kind; add brief note in `CLAUDE.md` agent table referencing `SourceAdapter` + `IllustrationRenderer` + ADRs.

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

### Phase 6 Critical Path

```
T-073 (type extensions)
  -> T-076 (Source Adapter rename + dispatcher)
    -> T-082 (CAD sub-implementation, needs T-077, T-078, T-079, T-081)
      -> T-090 (Composer grounding)
        -> T-098 (E2E explode-video path, needs also T-084, T-089, T-091, T-094)
```

**Critical path:** T-073 -> T-076 -> T-082 -> T-090 -> T-098

### Phase 6 Parallelism Opportunities

| Parallel Group | Tasks | Prerequisite |
|----------------|-------|-------------|
| **Scaffolding (start of phase)** | T-073, T-074, T-075 | Existing codebase |
| **Demo + corpus (start anytime)** | T-094, T-096 | None — work in parallel with all coding tasks |
| **PDF/DOCX moves into sub-files** | T-077 | T-076 |
| **CAD ingestion sub-stages** | T-078, T-079, T-080 | T-076 (each independent) |
| **Sequence inference** | T-081 | T-078 + T-080 (both meshes and renders needed) |
| **Vision restructure + CAD impl** | T-083, T-084 | T-076; T-084 also needs T-082 |
| **Illustration restructure + CAD impl** | T-085, T-086, T-087, T-088 | T-080; T-088 chained on T-087 |
| **API + UI + output banner** | T-091, T-092, T-093 | T-074, T-075 (DB + storage) |
| **Demo mode 3D path** | T-095 | T-094, T-082, T-089, T-054 |
| **Quality cross-validation (deferred)** | T-097 | T-082 (can be deferred to v1.1) |
| **End-to-end tests** | T-098, T-099 | All of above |

### Phase 6 Cross-Subsystem Dependencies

| From | To | Via Tasks |
|---|---|---|
| Type extensions | Everything | T-073 -> T-076, T-090 |
| Source Adapter dispatcher | All polymorphic agents | T-076 -> T-083, T-085 |
| CAD Source Adapter output | Vision + Composer + Renderer | T-082 -> T-084, T-090, T-098 |
| Multi-view renderer | Both fallback inference + Agent 7 base render | T-080 -> T-081, T-087 |
| Demo asset | Demo mode + E2E test | T-094 -> T-095, T-098 |

---

*This task list is the operational companion to [`docs/implementation-plan.md`](./implementation-plan.md). The implementation plan defines the architecture and build order. This document defines the executable work items with explicit dependencies for parallel execution.*
