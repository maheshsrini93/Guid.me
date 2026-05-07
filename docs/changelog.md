# Changelog

All notable changes to the Guid project are documented here.

Format: Each entry includes a date, category, and description of the change.

---

## 2026-05-07

### Completed — Phase 6 output banner + demo asset scaffold + demo-mode 3D path (T-093, T-094, T-095)

**Trigger:** Close out the Phase 6 surface area now that the CAD ingestion stack (T-076–T-082), Vision Analyzer polymorphism (T-083–T-084), Illustration Renderer polymorphism (T-085–T-089), and the user-visible upload path (T-090–T-092) are wired. The output page needed an advisory when the build sequence was inferred from geometry, the demo asset slot needed a canonical home, and the demo manager needed a CAD branch so `DEMO_MODE=true` exercises the 3D path end-to-end.

**Tasks completed:** T-093, T-094, T-095.

**Changes:**
- `src/app/output/[jobId]/output-client.tsx` — Added a prominent amber advisory above the work-instruction tabs that renders when `data.job.sequenceSource === "geometry-inferred"`, surfacing the inferred-sequence confidence (`Math.round(sequenceConfidence × 100)%`) with copy directing the operator to verify against engineering intent before use. Banner is suppressed for the explode-video path (confidence 1.0) and for non-CAD jobs.
- `src/app/api/jobs/[jobId]/result/route.ts` — Result API now surfaces `sourceKind`, `sequenceSource`, and `sequenceConfidence` on the `job` payload so the output banner has data to render.
- `src/lib/orchestrator/orchestrator.ts` — After Agent 1 runs, the orchestrator persists `sequenceSource` + `sequenceConfidence` from `state.extractedSource.structuredMetadata` to the `jobs` row (both in the main pipeline and the resume path). Without this the banner could never fire on a real job.
- `.gitignore` — Replaced the wholesale `storage/` ignore with explicit subdirectory ignores (`storage/cache/`, `storage/jobs/`, `storage/uploads/`, `storage/*.db*`) so `storage/demo-assets/` can travel with the repo. Git's negation rules can't re-include children of an ignored parent, so this is the only safe pattern.
- `storage/demo-assets/v1-demo/README.md` — New canonical home for the hand-curated 3D demo asset (T-094). README documents the asset spec (10–15-part assembly, STEP AP242, mm units, stable component names), the explode-video spec (MP4 H.264, 1080p, motion-stall keyframes), the provenance/license table the author must fill in, and a status checklist. The actual `assembly.stp` + `explode.mp4` files require manual CAD authoring (Fusion 360 or FreeCAD) and are not yet committed — see the README's status section.
- `src/lib/demo/demo-data-cad.ts` (new, ~580 lines) — Pre-cached pipeline outputs for a 5-step benchtop pulley assembly (11 components, parts catalog, assembly tree, sequenceSource `"explode-video"` at 1.0 confidence). Includes `DEMO_CAD_EXTRACTED_SOURCE`, `DEMO_CAD_FRAME_EXTRACTIONS` (5 keyframe-pair extractions), `DEMO_CAD_COMPOSED_GUIDE`, `DEMO_CAD_ENFORCED_GUIDE` (verb-first WI-022-compliant), `DEMO_CAD_QUALITY_REVIEW` (score 93), `DEMO_CAD_SAFETY_REVIEW`, `DEMO_CAD_XML_CONTENT`, and `DEMO_CAD_COST_RECORDS`. Per-agent costs reflect the CAD path: $0 for Source Adapter (code), $0 for Illustration Renderer (`internal-cad-renderer`), Flash Lite for Vision Analyzer/Composer/Enforcer (trimmed prompts), Pro for the reviewers. Total ≈ $0.21/job vs. $0.93 on the PDF path.
- `src/lib/demo/demo-timing.ts` — Added `DEMO_AGENT_TIMING_CAD` table reflecting the CAD path's latency profile: longer Source Adapter (STEP parse + ffmpeg + three.js renders), faster Vision Analyzer (per-keyframe diffs vs. per-page extraction), much faster Illustration Renderer (no Gemini round-trips). `getAgentTiming(agent, kind)` now takes a path discriminator.
- `src/lib/demo/demo-manager.ts` — Refactored to a cassette pattern: a `DemoCassette` interface bundles the cached outputs, per-agent progress messages, summaries, and illustration metadata for one path. `pdfCassette()` and `cadCassette()` build the two cassettes; `selectCassette(jobId)` reads `jobs.sourceKind` and dispatches. The simulator (`simulateAgent`, `recordDemoCost`, `persistGuide`, `buildDemoXmlWorkInstruction`) is shared. On completion the manager also writes `sourceKind`, `sequenceSource`, and `sequenceConfidence` for CAD jobs so the T-093 banner renders correctly in demo mode. PDF behavior is byte-equivalent — same SSE event sequence, same persisted rows.
- `src/types/xml.ts` — Widened `XmlMetadata.sourceDocument.format` from `"pdf" | "docx"` to include `"step"` and `"step+explode-video"` so the CAD demo XML round-trips through the result API.

**Why:**
- The output banner (T-093) is the user-visible signal that a CAD job came through the geometry-inferred fallback rather than the authored explode-video path. Without it, a low-confidence sequence could be mistaken for ground truth.
- T-094's scaffold + README is the contract for the eventual hand-authored asset — without it the asset has no canonical home and the demo manager has nothing concrete to point at.
- T-095 makes `DEMO_MODE=true` exercise the entire 3D path: parts catalog grounding, $0 CAD illustration, sequence-source persistence, and the T-093 banner. Without it the demo would still fall through to the PDF path even when a STEP file is uploaded.

**Caveats:**
- The actual STEP and MP4 binaries for the demo asset (T-094) are not yet committed. They require manual CAD authoring; the README documents the spec and the status checklist tracks progress.
- The CAD demo cached outputs in `demo-data-cad.ts` are representative placeholders. When the real binary asset lands they should be regenerated against the live pipeline so the cached data matches what the real Source Adapter / Vision Analyzer would produce.

### Completed — Phase 6 Composer grounding + multi-file API + STEP upload UI (T-090, T-091, T-092)

**Trigger:** Wire the user-visible 3D path. T-090 makes Agent 3 honor the deterministic CAD parts catalog as ground truth; T-091 lets the API accept a STEP primary plus an optional explode-video auxiliary; T-092 surfaces both in the upload UI.

**Tasks completed:** T-090, T-091, T-092.

**Changes:**
- `src/lib/agents/prompts/instruction-composer.ts` — When `state.extractedSource.structuredMetadata` is present, inject an authoritative parts-catalog table into the user prompt and instruct the composer to use exact CAD `id`/`name` values, follow the catalog's build order, and treat vision-extracted parts as supplementary context only. Prompt version bumped to `instruction-composer@1.1`. PDF/DOCX behaviour unchanged.
- `src/app/api/jobs/route.ts` — POST accepts `file` (PDF/DOCX/STEP) plus optional `auxiliaryFile` (MP4/JT). Validates combinations: `pdf|docx` standalone, `step` standalone, `step + mp4|jt`. Persists to `storage/jobs/{jobId}/source/{primary,auxiliary}.{ext}` via the Phase 6 storage helpers. Populates `sourceKind`, `auxiliaryPath`, `auxiliaryMimeType` on the job row. STEP files served as `application/octet-stream` are accepted via extension fallback. Auxiliary size cap is `2× MAX_FILE_SIZE_MB` to accommodate explode-view videos. Response now also returns `sourceKind`.
- `src/app/page.tsx` — Upload dropzone accepts `.pdf`/`.docx`/`.step`/`.stp`. When the primary is STEP, a second optional dropzone appears for the explode video (MP4/JT) with an inline `Info` banner explaining the geometry-inferred fallback. Switching back to a non-STEP primary auto-clears the auxiliary. Added `Manufacturing / Machinery` to the domain selector. Improved error reporting: surfaces the API's `error` field instead of a generic alert.

**Why:**
- Without T-090, the composer would still rely on Vision Analyzer's vision-only part references — defeating the purpose of having a deterministic STEP-derived catalog.
- T-091 + T-092 are the missing user-facing entry point for the entire Phase 6 ingestion stack (T-076–T-082, T-083–T-084, T-085–T-089).



**Trigger:** ADR-0002 (CAD-render + programmatic overlays for the 3D path) needed code. Agent 7's display name and module layout had to generalize from "Illustration Generator" to "Illustration Renderer" so the CAD branch can plug in without touching the PDF/DOCX behavior.

**Tasks completed:** T-085, T-086, T-087, T-088, T-089.

**Goal:** Polymorphic Agent 7 that dispatches on `state.extractedSource.structuredMetadata`. PDF/DOCX → Gemini Flash Image (unchanged, ~$0.04/image). STEP/CAD → three.js render + Canvas2D overlays ($0).

**Dispatcher + Gemini move (T-085, T-086):**
- New module `src/lib/agents/illustration-renderer/` with `index.ts` (lifecycle owner), `types.ts` (`IllustrationRendererImpl` contract), `gemini.ts` (existing Phase 4 logic moved verbatim).
- `src/lib/agents/illustration-generator.ts` deleted.
- `AgentName` rename: `"illustration-generator"` → `"illustration-renderer"` (DB column, SSE event payloads, UI registry, demo data, demo timing, demo manager).
- Resume path canonicalizes legacy `"illustration-generator"` rows so retries on jobs run before the rename keep working.
- Display name now "Illustration Renderer" everywhere.

**CAD base renderer (T-087):**
- `src/lib/agents/illustration-renderer/cad/base-renderer.ts`. `renderStepBase({ meshes, activeComponentIds, installedComponentIds, outputPath, width, height })` returns `{ filePath, width, height, project, boundsOnScreen }`.
- IL-008 opacity policy: active=1.0, installed=0.3, hidden=0. Delegates rasterization to existing `renderSingleView` to avoid duplicating the z-buffer rasterizer.
- Replicates the isometric camera math from `three-renderer.ts` (offsets `(maxExtent*1.8, 1.6, 2.0)`, FOV 30°, near/far ratios) so `project()` and `boundsOnScreen()` map to actual rendered pixels. Uses bbox over *all* meshes (matching `renderSingleView`'s framing behavior — see three-renderer.ts:123).

**Overlay primitives (T-088):**
- New dep: `@napi-rs/canvas` (prebuilt napi binary — no node-gyp, works with the spaces-in-path worktree). Added to `next.config.ts` `serverExternalPackages` so Turbopack doesn't try to bundle the `.node` binding.
- Six primitives, one per file under `src/lib/render/overlays/`: `drawPartLabel` (IL-002 with greedy collision avoidance), `drawMotionArrow` (IL-010 straight + curved), `drawRotationIndicator` (IL-011 arc + arrowhead), `drawDetailCallout` (IL-009 source balloon + framed inset), `drawOkNok` (IL-013 borders + ✓/✗ badges + wrapped text), `drawTwoPersonGrip` (IL-015 numbered grip circles + "2 PERSON" badge).
- Shared `OverlayContext` (`{ canvas, ctx, width, height }`) + `OVERLAY_STYLE` tokens.

**CAD orchestrator (T-089):**
- `src/lib/agents/illustration-renderer/cad/index.ts`. Registered ahead of `geminiRenderer` in the dispatcher so `structuredMetadata` short-circuits the per-image cost line.
- Re-parses STEP file once via `parseStep(state.documentPath)` (mesh data isn't persisted in `ExtractedSource`).
- Per-step: resolve active component IDs (id-equality match against `partsCatalog`, fallback to case-insensitive name match for the pre-T-090 era), call `renderStepBase()`, build `OverlayContext`, blit base, layer overlays per `EnforcedStep` fields, encode + write PNG, intermediate base PNG cleaned up.
- Anchor resolution: descriptive strings (`arrowDirection`, `rotationTarget`, `gripPositions`) map to pixel coords via `findComponentByName` + `baseResult.project()`, with sane fallbacks (canvas center, default left/right grip points).
- `parseRotationAmount` understands "¼ turn", "½ turn", "90°", "full", "quarter" etc.
- OK/NOK (IL-013) compositing deferred — requires a second base render for the NOK case which the current pipeline doesn't supply. Documented in code.
- Cost line is $0; logs `modelUsed: "internal-cad-renderer"` and `promptVersion: "illustration-renderer.cad@1.0"`.

**Validation:**
- `pnpm exec tsc --noEmit` passes with zero errors.
- `pnpm build` succeeds (Turbopack + standalone output).
- Unit tests: 94/96 pass — same 2 pre-existing failures in `quality-gate.test.ts` (unrelated, present on `main`).

**Files changed:**
- New: `src/lib/agents/illustration-renderer/{index.ts, types.ts, gemini.ts}`, `src/lib/agents/illustration-renderer/cad/{index.ts, base-renderer.ts}`, `src/lib/render/overlays/{index, labels, arrows, rotation, callout, oknok, grip}.ts`.
- Deleted: `src/lib/agents/illustration-generator.ts`.
- Modified: `src/lib/agents/types.ts`, `src/lib/agents/context.ts`, `src/lib/orchestrator/orchestrator.ts`, `src/app/api/jobs/[jobId]/sse/route.ts`, `src/components/pipeline/{agent-card,pipeline-monitor}.tsx`, `src/hooks/use-event-source.ts`, `src/lib/demo/{demo-data,demo-manager,demo-timing}.ts`, `src/types/agents.ts` (renamed input type), `next.config.ts`, `package.json`, `pnpm-lock.yaml`, `docs/tasks.md`.

---

## 2026-05-07

### Completed — Phase 6 Vision Analyzer Polymorphism (T-083, T-084)

**Trigger:** Vision Analyzer needed to dispatch on the source adapter's output (CAD vs document) so STEP-derived assemblies skip the document-tuned prompt and ride the CAD-specific schema instead.

**Tasks completed:** T-083, T-084.

**Goal:** Make Agent 2 input-agnostic. The dispatcher inspects `state.extractedSource.structuredMetadata`; the document path stays unchanged for PDF/DOCX, and a new CAD path consumes keyframe pairs (or the inferred sequence) without re-extracting parts/tools/quantities the source adapter already produced.

**Dispatcher restructure (T-083):**
- New module `src/lib/agents/vision-analyzer/`. Old config files removed: `src/lib/agents/configs/vision-analyzer.config.ts`, `src/lib/agents/prompts/vision-analyzer.ts`, `src/lib/agents/schemas/vision-analyzer.schema.ts`.
- New `VisionAnalyzerImpl` interface in `vision-analyzer/types.ts` (`name`, `canHandle(state)`, `run(ctx)`) — same shape as `SourceAdapterImpl`.
- `vision-analyzer/document.ts` re-hosts the existing `runConfigAgent`-driven config (`documentVisionConfig`) and exports `documentVisionImpl` whose `canHandle` returns true when `structuredMetadata` is absent. Prompt and schema relocated to `document.prompt.ts` and `document.schema.ts` with a renamed prompt version (`vision-analyzer-document@3.0`).
- `vision-analyzer/index.ts` exports `runVisionAnalyzer(ctx)` which walks `[cadVisionImpl, documentVisionImpl]` and delegates to the first matching impl. Throws `AgentValidationError` if no impl handles the state.
- Orchestrator (`src/lib/orchestrator/orchestrator.ts`) imports `runVisionAnalyzer` and replaces both call sites (initial run and resume) — `visionAnalyzerConfig` is no longer imported there.

**CAD vision sub-implementation (T-084):**
- `src/lib/agents/vision-analyzer/cad.ts` exposes `cadVisionImpl`. `canHandle` returns true when `structuredMetadata` is present. Two paths:
  - **`sequenceSource: "explode-video"`** → walks frames pairwise. For each transition (frame[n-1] → frame[n]) it picks an active-Components candidate window from the parts catalog (proportional to step position, ±25%, clamped), reads both keyframes, and calls Gemini Flash with the trimmed CAD schema. Per-pair retries via `withRetry`, rate-limited via `waitForSlot(FLASH_MODEL)`. Falls back to per-component synthesis if the source has only one frame.
  - **`sequenceSource: "geometry-inferred"`** → emits one minimal `RawFrameExtraction` per ordered Component with **zero Gemini calls** (cost $0). First step uses verb `Place` with target `workspace`; subsequent steps use `Attach` against the running assembly. Confidence is carried over from `meta.sequenceConfidence`.
- Trimmed CAD schema (`cad.schema.ts`): only `actions`, `arrows` (rotation cues only — translation arrows come from Agent 7), `complexity`, `confidence`, `confirmationCue`. Required fields: `actions`, `complexity`, `confidence`. Parts/quantities/tools/warnings are intentionally absent — they come from `structuredMetadata` and are merged in by Agent 3.
- CAD prompt (`cad.prompt.ts`): keyframe-pair diff with active-Components candidate list, assembly tree as context, and a "previous step summary" slot for cross-step continuity. Honesty rules: empty `actions` + low confidence rather than invented transitions; subject must be a Component name/ID from the candidate list.
- Two-person heuristic (`estimateTwoPersonNeed`): flags `pageIndicators.hasTwoPersonWarning` true when an active Component has mass > 15kg or any bounding-box dimension > 1m. Uses `StructuredPartRef.mass` and `boundingBox` populated by the STEP parser.
- Lifecycle parity with `runConfigAgent`: emits `agent:start` / `agent:complete` / `pipeline:error`, records cost, persists an `agent_executions` row (model `"code"` for the synthesis path, `FLASH_MODEL` for the explode-video path).

**Tests (8 new, all passing — `tests/unit/vision-analyzer-dispatcher.test.ts`):**
- Dispatcher selection: document impl handles state without `structuredMetadata`; CAD impl handles state with it; neither handles a state without an extracted source; dispatcher throws when no impl matches.
- CAD synthesis fallback: emits one extraction per Component, preserves stable `stepNumber`, sets `partsShown`/`toolsShown`/`fasteners` to empty arrays, reports `costUsd: 0` and `model: "code"`, emits `agent:start`/`agent:complete` events, records exactly one cost entry and one persisted execution row.
- First step uses `Place` verb against `workspace`; subsequent steps use `Attach` against `previously-installed assembly`.
- Two-person heuristic flags heavy Components and clears for light ones.
- Confidence is clamped to [0, 1] when the source adapter reports a value > 1.

**Verified:**
- `pnpm build` succeeds.
- `pnpm lint` reports no new warnings or errors (vision-analyzer module is clean).
- `pnpm vitest run tests/unit/vision-analyzer-dispatcher.test.ts` — 8/8 pass.
- Pre-existing quality-gate test failures are unrelated to this work (verified by stashing changes — same failures with both states).

**Files added/modified:**
- Added: `src/lib/agents/vision-analyzer/{index,types,document,document.prompt,document.schema,cad,cad.prompt,cad.schema}.ts`, `tests/unit/vision-analyzer-dispatcher.test.ts`.
- Removed: `src/lib/agents/configs/vision-analyzer.config.ts`, `src/lib/agents/prompts/vision-analyzer.ts`, `src/lib/agents/schemas/vision-analyzer.schema.ts`.
- Modified: `src/lib/orchestrator/orchestrator.ts` (2 call-site updates), `docs/tasks.md` (T-083, T-084 marked complete).

---

### Completed — Phase 6 CAD Ingestion Stack (T-078 through T-082)

**Trigger:** Implementation slice on `worktree-phase-6-3d-model-input` branch.

**Tasks completed:** T-078, T-079, T-080, T-081, T-082.

**Goal:** Land all four CAD ingestion sub-stages and wire them into the Source Adapter dispatcher so STEP files (with or without an authored explode video) flow through Agent 1 and produce `ExtractedSource.structuredMetadata`. From here, agents 2 / 3 / 7 can be made CAD-aware without further changes to Agent 1.

**STEP parser (T-078):**
- Added `occt-import-js` (LGPL-2.1 WASM build of OpenCascade) plus `three`, `pngjs`, and their `@types`.
- New module `src/lib/agents/source-adapter/cad/step-parser.ts` (`parseStep(filePath)`): walks the `occt-import-js` hierarchy depth-first, emits one `StructuredPartRef` per Component (assembly-path-based stable IDs), per-Component triangle meshes (`Float32Array` positions + optional normals + `Uint32Array` indices) and axis-aligned bounding boxes. Handles missing names with `"unnamed"` slugs and preserves STEP-attribute colors when present.
- Module declaration `src/types/occt-import-js.d.ts` since the package ships no `.d.ts`.

**Keyframe extractor (T-079):**
- New module `src/lib/agents/source-adapter/cad/keyframe-extractor.ts`. Strategy:
  - ffmpeg samples the explode video at 10 fps and 480-px wide thumbnails.
  - `pngjs` decodes consecutive samples; we compute mean-absolute-pixel-delta as a 1D motion signal.
  - 3-frame box-filter smoothing → motion/stall state machine (motion > 6.0, stall < 1.5, min stall length 3 frames).
  - For each motion → stall transition, emit a keyframe at the stall midpoint. First frame and last frame always included; if no motion is detected at all, fall back to evenly-spaced samples.
- Re-extracts each keyframe at full resolution via a second ffmpeg call (`-ss N -frames:v 1`), writes PNGs to `storage/jobs/{jobId}/keyframes/`, cleans up the diff-resolution samples.
- ffmpeg presence is probed lazily (cached after first call) and surfaces a clear install hint on miss, matching the pdftoppm pattern.

**Multi-view renderer (T-080):**
- Headless-gl was the original plan; on macOS its node-gyp build breaks against any path containing a space (clang interprets spaces as argument separators). Rather than ship a fragile native dep, the renderer is a pure-TS software rasterizer in `src/lib/render/three-renderer.ts`:
  - Three.js's `Vector3` / `Matrix4` for camera & projection math (no `WebGLRenderer`).
  - Per-triangle barycentric scan-line rasterization with a `Float32Array` Z-buffer.
  - Per-triangle Lambert shading (35% ambient + 65% diffuse) with stable hash-based palette colors when STEP attributes don't provide one.
  - 4 canonical views (top, front, side, isometric); ortho frustums fit the bounding box with 5% padding; iso uses a 30° FOV perspective.
  - Per-component opacity overrides (used by the future T-087 base render to fade installed Parts per IL-008).
  - PNG output via `pngjs`. Public API: `renderAssemblyViews(meshes, outDir, opts)` and `renderSingleView(meshes, view, filePath, opts)` — the implementation is swappable so a hardware-WebGL backend can drop in later.

**Sequence inference (T-081):**
- New module `src/lib/agents/source-adapter/cad/sequence-inference.ts`. Calls Gemini Pro with the parts catalog, assembly tree, and the four multi-view PNGs. Strict JSON schema (`SchemaType.OBJECT`) enforces per-step `componentId` + `rationale` + overall `confidence` (0-1) + `reasoning`.
- Prompt encodes the standard sequencing principles (base/fixture first, bottom-up, sub-assemblies before integration, inserted-into precedes inserted, fasteners last, symmetry handling).
- Validation: invalid Component IDs are dropped, missing IDs are appended at the end, confidence is capped at 0.4 if the inferred sequence wasn't a valid permutation of the catalog. Cost is recorded onto the Source Adapter's ledger via `context.recordCost`.
- New helper `generateTextWithImages` in `src/lib/gemini/client.ts` (multi-image input — also future-needed by the T-084 CAD Vision Analyzer for keyframe pairs).

**CAD sub-implementation (T-082):**
- `src/lib/agents/source-adapter/cad/index.ts` — top-level `cadImpl: SourceAdapterImpl` registered alongside `pdfImpl` / `docxImpl` in the dispatcher. Branches on auxiliary file presence:
  - With explode video → `parseStep` → `extractKeyframes` → `structuredMetadata.sequenceSource = "explode-video"`, confidence 1.0.
  - STEP only → `parseStep` → `renderAssemblyViews` → `inferSequence` → `structuredMetadata.sequenceSource = "geometry-inferred"` with model-reported confidence; parts catalog is reordered into the inferred build order.
- Multi-view renders are also copied into the standard `pages/` directory so Agent 2 receives them as plain `Frame[]` — no agent past 1 needs to know whether the source was a STEP.
- Reports sub-progress (`Parsing STEP` / `Extracting keyframes` / `Rendering multi-view CAD images` / `Inferring build sequence with Gemini Pro`) so the SSE-driven UI doesn't appear stuck during the heavier CAD path.

**Pipeline plumbing:**
- `PipelineState` carries optional `auxiliaryPath` / `auxiliaryMimeType`; `SourceAdapterInput` extended likewise. `SourceAdapterMimeType` widened to include `model/step` / `application/step` / `application/STEP` / `application/octet-stream` (extension fallback for browsers that mislabel STEP).
- `runPipeline` and `resumePipeline` hydrate the auxiliary fields from the job row so the CAD sub-impl can locate the explode video without changing the existing `runPipeline(jobId, documentPath, mimeType)` signature.
- `SourceAdapter.summarize` now reports parts-count + sequence source/confidence when CAD metadata is present.

**Tests (12 new, all passing):**
- `tests/unit/keyframe-selection.test.ts` (7) — pure motion/stall state-machine cases including no-motion fallback and tail handling.
- `tests/unit/three-renderer.test.ts` (3) — synthetic two-cube assembly rendered to all four views, opacity-0 hides components, blank PNG fallback.
- `tests/unit/step-parser.test.ts` (2) — module loads lazily, parser fails fast on missing/non-STEP content with a clear error.

**Out of scope (deferred):**
- Vision Analyzer dispatcher / CAD prompt (T-083, T-084).
- Illustration Renderer rename + CAD overlay primitives (T-085 through T-089).
- Composer grounding against the parts catalog (T-090).
- Multi-file upload API + UI (T-091, T-092) — until then the CAD path is reachable only by manually pre-populating `auxiliaryPath` on the jobs row or by hitting the orchestrator with a STEP file as the primary upload.
- Demo asset + test corpus (T-094, T-096).

### Completed — Phase 6 Foundation Slice (T-073 through T-077)

**Trigger:** Implementation slice on `worktree-phase-6-3d-model-input` branch (commit `c085e9e`).

**Tasks completed:** T-073, T-074, T-075, T-076, T-077.

**Goal:** Establish the polymorphism scaffolding from [ADR-0001](./adr/0001-source-adapter-pattern.md) so CAD support (T-078+) can drop in without touching agents 2-8. No CAD code yet; PDF/DOCX flow preserved end-to-end.

**Type system (T-073):**
- Renamed `ExtractedDocument` → `ExtractedSource` with nested `documentMetadata: { filename, format, pageCount, doclingMarkdown, textContent }` and optional `structuredMetadata` field that agents 2/7 will dispatch on for CAD inputs.
- Renamed `ExtractedPage` → `Frame` (with `frameNumber`), `RawPageExtraction` → `RawFrameExtraction`, `PipelineState.pageExtractions` → `frameExtractions`, `DocumentExtractorInput` → `SourceAdapterInput`.
- Added `AssemblyNode`, `StructuredMetadata`, and CAD-only optional fields on `StructuredPartRef` (`parentAssemblyPath`, `mass`, `material`, `boundingBox`).

**DB schema (T-074):**
- Added 5 nullable columns to `jobs`: `source_kind` (enum, defaults `pdf`), `auxiliary_path`, `auxiliary_mime_type`, `sequence_source`, `sequence_confidence`. Applied via `pnpm db:push`.

**Storage helpers (T-075):**
- Added `getSourceDir(jobId)`, `getPrimarySourcePath(jobId, ext)`, `getAuxiliarySourcePath(jobId, ext)` for the new `storage/jobs/{jobId}/source/{primary,auxiliary}` layout (existing helpers preserved).

**Source Adapter restructure (T-076 / T-077):**
- Moved `src/lib/agents/document-extractor.ts` → `src/lib/agents/source-adapter/`. Now a directory with:
  - `index.ts` — `SourceAdapter` (extends `BaseCodeAgent`) walking a registered `IMPLS: SourceAdapterImpl[]` array.
  - `types.ts` — `SourceAdapterImpl` interface (`name`, `canHandle`, `extract`).
  - `pdf.ts` — `pdfImpl` (Docling-first with pdftoppm fallback).
  - `docx.ts` — `docxImpl` (Docling-first with mammoth fallback).
  - `shared.ts` — `runDocling()`, `isDoclingAvailable()`, `getImageDimensions()`.
- Renamed agent everywhere: `AgentName` union (backend + frontend duplicate in `use-event-source.ts`), `STATUS_TO_AGENT`, orchestrator `AGENT_ORDER`, SSE route, agent-card config, demo timing/cost records, display name → "Source Adapter".
- Resume/retry tolerates legacy `agent_executions.agent_name = 'document-extractor'` rows via a `canonicalizeAgentName()` alias on the read boundary in `resumePipeline()`. No DB rewrite.

**Out of scope (deferred):** Upload UI/API multi-file (T-091/T-092), CAD libraries — `occt-import-js`, `three.js`, `headless-gl`, `ffmpeg` (T-078+), Vision Analyzer / Illustration Renderer dispatchers (T-083, T-085), Composer grounding (T-090), full doc sweep (T-100).

**Verification:**
- `pnpm exec tsc --noEmit` and `pnpm build` clean.
- Demo pipeline runs end-to-end, all 8 agents complete, quality score 91/100.
- Pipeline UI shows first agent labelled "Source Adapter".
- XML output renders with populated `<source-document>` block (`filename`, `format=pdf`, `pageCount=4`).
- DB `jobs` row has the 5 new columns (`source_kind=pdf` for new rows); `agent_executions.agent_name` records as `source-adapter`.

**Stats:** 27 files changed, +713 / −500 lines. 5 new files (`source-adapter/{index,types,pdf,docx,shared}.ts`); 1 deleted (`document-extractor.ts`).

---

### Planned — Phase 6: 3D Model Input (T-073 through T-100, planning artifacts only)

**Trigger:** `/grill-with-docs` design session on `feat/3d-model-input` branch.

**Tasks added:** T-073 through T-100 (all open). T-100 (final documentation sweep) intentionally left open.

**Architecture decisions captured:**
- **`docs/adr/0001-source-adapter-pattern.md`** — Single polymorphic Source Adapter (renamed from Document Extractor) for multi-format inputs. Adds STEP (CAD) ingestion alongside PDF/DOCX. Output type generalizes to `ExtractedSource { frames, structuredMetadata? }`. Rejected alternatives: two parallel ingest agents (rejected for orchestrator complexity); native NX in v1 (deferred to v2 due to Siemens licensing); LLM-only sequence inference as primary (kept as fallback only).
- **`docs/adr/0002-polymorphic-illustration-agent.md`** — Agent 7 renames to Illustration Renderer and dispatches on `structuredMetadata` presence. CAD inputs render directly from the engineer's geometry via three.js + headless-gl with programmatic SVG/canvas overlays for IL-002/008/010/011/013/015 annotations. PDF/DOCX inputs continue using Gemini Flash Image. Per-job cost for 3D inputs drops from ~$0.93 to ~$0.21–$0.26 (~75% reduction). Establishes the cross-cutting "dispatch on `structuredMetadata` presence" contract.

**New domain documentation:**
- **`CONTEXT.md`** (created at repo root) — Glossary covering Assembly (CAD noun, distinct from "assembly" the verb), Component, Part (with collision note vs IKEA usage), STEP, Explode View, Build sequence, Demo asset, Source Adapter, ExtractedSource, Frame, Keyframe, Illustration Renderer, and the Dispatch contract.

**Updated planning documents:**
- **`docs/implementation-plan.md`** — Added Phase 6 section (architectural shifts table, 14 subsystem deliverables, 3D-pipeline cost model, risks/unknowns to validate during scaffolding) and three new entries to the Technical Decisions Log (Decisions 8, 9, 10) referencing ADRs 0001 and 0002.
- **`docs/tasks.md`** — 28 new tasks T-073 through T-100, organized into 8 parallelizable groups, with explicit dependency declarations. Critical path: T-073 → T-076 → T-082 → T-090 → T-098. Phase 6 dependency graph and parallelism table appended at the bottom.
- **`docs/master-plan.md`** — Updated §7.1 (pipeline diagram), §7.5 (illustrations now dual-path), §7.8 (cost transparency adds 3D figure), §7.9 (upload accepts STEP), §11 (Agent Models and Costs table now distinguishes PDF/DOCX vs CAD paths), §12 (Phase 6 added, prior phases marked completed), §13 (Future Vision adds native NX integration and improved geometry-only inference).
- **`CLAUDE.md`** — Updated agent table to reflect Source Adapter / Illustration Renderer renames and polymorphic behavior. Pointers to ADR-0001, ADR-0002, and `CONTEXT.md` added.

**Scope confirmed during the design session:**
- Assembly instructions only (not manufacturing instructions like milling/drilling/turning).
- v1 input format: STEP (AP242 preferred). Native NX deferred to v2.
- v1 supports both STEP+explode-video (high-confidence path) and bare STEP (Option A geometry-inferred fallback with explicit confidence flagging).
- Demo asset: hand-curated 10-15-Part Assembly authored in Fusion 360 or FreeCAD with an explode view, shipping at `storage/demo-assets/v1-demo/`.
- Test corpus: 5-10 STEP files from open-source hardware repos (RepRap, OpenROV, OSE) with explicit OSHW licenses, at `tests/fixtures/3d/`.

**No code changes in this changelog entry** — only planning artifacts. Implementation tasks T-073 through T-099 remain open.

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
