# Guid -- Implementation Plan

> **Last Updated:** 2026-03-04
> **Status:** Active -- Phase 1 completed, Phase 2 next
> **Authoritative Spec:** [`docs/prd.md`](./prd.md)

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Architecture Overview](#2-architecture-overview)
3. [Major Components](#3-major-components)
4. [Data Model](#4-data-model)
5. [Build Order (Implementation Phases)](#5-build-order-implementation-phases)
6. [Component Dependencies Map](#6-component-dependencies-map)
7. [Technical Decisions Log](#7-technical-decisions-log)
8. [Environment Variables](#8-environment-variables)

---

## 1. Technology Stack

| Technology | Version | Role | Rationale |
|---|---|---|---|
| **Next.js** | 16.x | Full-stack framework | App Router, API routes, React Server Components. Single deployment artifact -- no separate backend. |
| **TypeScript** | 5.x | Language | Type safety for complex agent I/O schemas, pipeline state, and XML structures. |
| **Tailwind CSS** | v4 | Styling | Utility-first, consistent with shadcn/ui. v4 brings CSS-native configuration. |
| **shadcn/ui** | latest | Component library | New York style, accessible, fully customizable. Not a dependency -- code is copied in. |
| **Drizzle ORM** | latest | Database ORM | Lightweight, type-safe, SQLite-native. Schema-as-code with push/generate/studio. |
| **SQLite** | via better-sqlite3 | Database | Zero-config local database. No external services. Perfect for single-user demo scope. |
| **Google Gemini API** | 2.5 Flash/Pro | AI provider | Flash for bulk work (~$0.02/call), Pro for review quality (~$0.08/call), Flash Image for illustrations (~$0.70/call). Single API for text + vision + image generation. |
| **pdftoppm (poppler)** | system install | PDF processing | High-quality page-to-image conversion at configurable DPI. Required: `brew install poppler`. |
| **mammoth** | latest | DOCX processing | Reliable DOCX-to-HTML conversion with semantic preservation. |
| **Server-Sent Events** | native | Real-time updates | One-directional server-to-client push. Simpler than WebSocket for read-only pipeline monitoring. |
| **pnpm** | latest | Package manager | Fast installs, disk-efficient via content-addressable storage. |

### System Requirements

```
Node.js >= 20
pnpm >= 9
poppler (pdftoppm) -- brew install poppler
```

---

## 2. Architecture Overview

Guid is a **monolithic Next.js application** -- no microservices, no separate backend, no message queues. All 8 AI agents, the orchestrator, the database, and the frontend live in a single deployable unit.

### High-Level Architecture

```
+------------------------------------------------------------------+
|                        Next.js Application                        |
|                                                                    |
|  +-------------------+  +-------------------+  +----------------+ |
|  |  Upload & Config  |  | Pipeline Monitor  |  | Output Review  | |
|  |     /             |  |  /pipeline/[id]   |  | /output/[id]   | |
|  +--------+----------+  +--------+----------+  +-------+--------+ |
|           |                      |                      |          |
|           |                SSE Stream                   |          |
|           v                      ^                      v          |
|  +-------------------+  +--------+----------+  +----------------+ |
|  | POST /api/jobs    |  | GET /sse          |  | GET /result    | |
|  +--------+----------+  +--------+----------+  +-------+--------+ |
|           |                      |                      |          |
|           v                      |                      |          |
|  +-------------------------------------------------------+        |
|  |                     Orchestrator                       |        |
|  |              (State Machine + Event Bus)               |        |
|  +---+---+---+---+---+---+---+---+-----------------------+        |
|      |   |   |   |   |   |   |                                    |
|      v   v   v   v   v   v   v   v                                |
|     [1] [2] [3] [4] [5] [6] [7] [8]   <-- 8 Agents               |
|      |   |   |   |   |   |   |   |                                |
|      +---+---+---+---+---+---+---+                                |
|                      |                                             |
|          +-----------+-----------+                                 |
|          |                       |                                 |
|  +-------v--------+    +--------v-------+                         |
|  |  Gemini API    |    |  SQLite + FS   |                         |
|  |  (Flash/Pro)   |    |  (storage/)    |                         |
|  +----------------+    +----------------+                         |
+------------------------------------------------------------------+
```

### Request Flow

```
User uploads PDF/DOCX
  --> POST /api/jobs (multipart form)
    --> Save file to storage/uploads/
    --> Create job record (status: pending)
    --> Start orchestrator (async, non-blocking)
    --> Return { jobId } to client

Client navigates to /pipeline/[jobId]
  --> GET /api/jobs/[jobId]/sse (EventSource)
    <-- agent:start { agentId, name }
    <-- agent:progress { agentId, message, pct }
    <-- agent:complete { agentId, cost, duration }
    <-- pipeline:state { state }
    <-- pipeline:cost { totalCost }
    <-- pipeline:error { error } (if failed)

Client navigates to /output/[jobId]
  --> GET /api/jobs/[jobId]/result
    <-- { xml, json, quality, illustrations, costs }
```

### Pipeline State Machine

```
pending --> extracting --> analyzing --> composing --> enforcing
                                                         |
                                                         v
         completed <-- assembling <-- illustrating <-- reviewing
                                                         |
                                                    (score < 85?)
                                                         |
                                                         v
                                                      revising
                                                    (max 2 loops)
                                                         |
                                                         v
                                                      enforcing
                                                      (re-enter)
```

Error and cancellation can occur from any state:
- `failed` -- unrecoverable error in any agent
- `cancelled` -- user-initiated via POST /api/jobs/[jobId]/cancel

---

## 3. Major Components

### 3.1 Orchestrator

**File:** `src/lib/orchestrator/orchestrator.ts`

The orchestrator is a TypeScript state machine that coordinates all 8 agents in sequence (with agents 5 and 6 running in parallel). It manages:

- **State transitions** -- advancing through the pipeline states
- **Agent execution** -- calling each agent with correct inputs
- **Quality gate** -- evaluating review scores and deciding approve/revise/hold
- **Revision loop** -- routing feedback to the Guideline Enforcer (max 2 iterations)
- **Cost accumulation** -- summing per-agent costs
- **Event emission** -- broadcasting SSE events at each transition
- **Error handling** -- catching agent failures, updating job status
- **Cancellation** -- checking cancellation flag between agent steps

### 3.2 Agent Pipeline

**Directory:** `src/lib/agents/`

Agents use a hybrid architecture:
- **Code agents (1, 8):** Extend `BaseCodeAgent` abstract class providing logging, timing, cost tracking, error wrapping, and event emission.
- **LLM agents (2-7):** Config-driven via `runConfigAgent()` runner, with separate config (`configs/`), prompt (`prompts/`), and schema (`schemas/`) files. Supports single-call, per-page, and per-step execution modes.
- **Shared infrastructure:** `AgentContext` (created via `createAgentContext()`) bridges both patterns to SSE emission, DB persistence, and cost tracking. `withRetry()` provides exponential backoff with jitter and retryable error detection.

| # | Agent | Type | Model | Input | Output |
|---|---|---|---|---|---|
| 1 | Document Extractor | Code | none ($0.00) | PDF/DOCX file path | Page images (PNG) + extracted text |
| 2 | Vision Analyzer | AI | Flash, escalate to Pro | Page images | Per-page structured analysis (objects, actions, sequences) |
| 3 | Instruction Composer | AI | Flash | Vision analysis + text | Ordered step sequence with parts, tools, safety |
| 4 | Guideline Enforcer | AI | Flash | Steps + full YAML guidelines | Guideline-compliant steps (verb-first, safety-tagged) |
| 5 | Quality Reviewer | AI | Pro | Enforced steps + guidelines | Quality score (0-100) + per-step flags |
| 6 | Safety Reviewer | AI | Pro | Enforced steps + guidelines | Safety score + hazard verification |
| 7 | Illustration Generator | AI | Flash Image | Per-step description | Isometric technical illustration (PNG) per step |
| 8 | XML Assembler | Code | none ($0.00) | All outputs | Canonical XML document |

**Parallel execution:** Agents 5 and 6 run concurrently via `Promise.all()`. Their combined scores determine the quality gate outcome.

**Revision loop:** If the combined quality score falls between 70 and 84, the pipeline re-enters at Agent 4 (Guideline Enforcer) with reviewer feedback. This loop runs a maximum of 2 times before the pipeline proceeds regardless.

### 3.3 SSE Event Bus

**File:** `src/lib/orchestrator/event-emitter.ts`

Server-Sent Events are the sole real-time communication channel. The event bus:

- Emits typed events: `agent:start`, `agent:progress`, `agent:complete`, `pipeline:state`, `pipeline:cost`, `pipeline:error`
- Supports multiple concurrent listeners per job (multiple browser tabs)
- Auto-cleans listeners when clients disconnect
- Integrates with the API route at `GET /api/jobs/[jobId]/sse`

**Client-side:** A custom `useEventSource` React hook manages the EventSource connection, reconnection, and state mapping.

### 3.4 Guidelines System

**Directory:** `src/lib/guidelines/`

The guidelines system enforces compliance through 4 layers:

```
Layer 1: Prompt Injection
  Full YAML guidelines injected into agent prompts.
  No truncation -- all 38 WI + 18 IL rules included.

Layer 2: Response Schema
  Gemini responseSchema constrains output structure.
  Enums for verbs, safety levels, domains.

Layer 3: Post-Processing (src/lib/guidelines/post-processor.ts)
  9+ deterministic transforms applied after AI response:
  - Verb-first sentence enforcement (WI-022: 16 approved verbs)
  - Part ID insertion
  - Safety tag normalization
  - Whitespace and formatting cleanup
  - Metric unit enforcement
  - Step numbering normalization

Layer 4: Validation (src/lib/quality/validator-registry.ts)
  22+ validators producing quality flags:
  - Missing parts references
  - Unapproved verbs
  - Missing safety warnings for flagged steps
  - Step length violations
  - Illustration requirement gaps
```

**Guideline files:**
- `src/lib/guidelines/work-instructions.yaml` -- WI-001 to WI-038 (structure, metadata, safety, style, content, DIY)
- `src/lib/guidelines/illustrations.yaml` -- IL-001 to IL-018 (style, parts, motion, comparative, quality)

### 3.5 Quality Gates

**Directory:** `src/lib/quality/`

Quality scoring determines pipeline flow after the review phase:

| Score Range | Decision | Action |
|---|---|---|
| >= 85 | Approved | Proceed to illustration generation |
| 70 -- 84 | Revise | Route feedback to Guideline Enforcer (max 2 loops) |
| < 70 | Hold | Mark job as requiring manual review |

The quality score is a weighted combination of the Quality Reviewer (Agent 5) and Safety Reviewer (Agent 6) outputs. Quality flags are attached to the final XML output for transparency.

### 3.6 XML Builder

**File:** `src/lib/xml/builder.ts`

Produces canonical XML with namespace `urn:guid:work-instruction:1.0`:

```xml
<work-instruction xmlns="urn:guid:work-instruction:1.0">
  <metadata>
    <title>...</title>
    <domain>semiconductor|automotive|aerospace|pharmaceutical|consumer</domain>
    <safety-level>standard|elevated|critical</safety-level>
    <estimated-minutes>...</estimated-minutes>
    <source-document>...</source-document>
  </metadata>
  <parts-list>
    <part id="P-001" name="..." quantity="..." />
  </parts-list>
  <tools-required>
    <tool category="required|optional">...</tool>
  </tools-required>
  <safety-warnings>
    <warning severity="caution|warning|danger">...</warning>
  </safety-warnings>
  <phases>
    <phase name="...">
      <step number="1">
        <instruction>Insert the connector into slot A.</instruction>
        <parts><part-ref id="P-001" /></parts>
        <tools><tool-ref>...</tool-ref></tools>
        <safety><warning severity="caution">...</warning></safety>
        <illustration ref="step-001.png" />
        <confidence>0.92</confidence>
      </step>
    </phase>
  </phases>
  <generation-metadata>
    <job-id>...</job-id>
    <quality-score>87</quality-score>
    <total-cost>0.93</total-cost>
    <models-used>...</models-used>
    <quality-flags>...</quality-flags>
  </generation-metadata>
</work-instruction>
```

---

## 4. Data Model

Four SQLite tables managed by Drizzle ORM.

### 4.1 `jobs`

| Column | Type | Description |
|---|---|---|
| id | TEXT (ULID) | Primary key |
| status | TEXT | pending, extracting, analyzing, composing, enforcing, reviewing, revising, illustrating, assembling, completed, failed, cancelled |
| file_name | TEXT | Original upload filename |
| file_path | TEXT | Storage path to uploaded file |
| file_type | TEXT | pdf or docx |
| file_size | INTEGER | File size in bytes |
| domain | TEXT | semiconductor, automotive, aerospace, pharmaceutical, consumer |
| quality_threshold | INTEGER | Minimum quality score (default 85) |
| total_cost | REAL | Accumulated cost across all agents |
| total_tokens | INTEGER | Accumulated token usage |
| revision_count | INTEGER | Number of revision loops executed |
| error_message | TEXT | Error details if failed |
| created_at | TEXT | ISO 8601 timestamp |
| started_at | TEXT | Pipeline start time |
| completed_at | TEXT | Pipeline completion time |

### 4.2 `agent_executions`

| Column | Type | Description |
|---|---|---|
| id | TEXT (ULID) | Primary key |
| job_id | TEXT | Foreign key to jobs |
| agent_id | TEXT | Agent identifier (1-8) |
| agent_name | TEXT | Human-readable agent name |
| status | TEXT | pending, running, completed, failed, skipped |
| model | TEXT | Gemini model used (or "code") |
| prompt_tokens | INTEGER | Input token count |
| completion_tokens | INTEGER | Output token count |
| cost | REAL | Cost for this execution |
| duration_ms | INTEGER | Execution time in milliseconds |
| input_summary | TEXT | Truncated input for debugging |
| output_summary | TEXT | Truncated output for debugging |
| error_message | TEXT | Error details if failed |
| created_at | TEXT | ISO 8601 timestamp |

### 4.3 `generated_guides`

| Column | Type | Description |
|---|---|---|
| id | TEXT (ULID) | Primary key |
| job_id | TEXT | Foreign key to jobs |
| xml_content | TEXT | Full canonical XML output |
| json_content | TEXT | JSON representation of the guide |
| quality_score | INTEGER | Final quality score (0-100) |
| safety_score | INTEGER | Safety review score (0-100) |
| step_count | INTEGER | Number of steps in the guide |
| parts_count | INTEGER | Number of unique parts |
| flags | TEXT | JSON array of quality flags |
| metadata | TEXT | JSON metadata (models, costs, timing) |
| created_at | TEXT | ISO 8601 timestamp |

### 4.4 `generated_illustrations`

| Column | Type | Description |
|---|---|---|
| id | TEXT (ULID) | Primary key |
| job_id | TEXT | Foreign key to jobs |
| step_number | INTEGER | Associated step number |
| file_path | TEXT | Storage path to PNG file |
| width | INTEGER | Image width in pixels |
| height | INTEGER | Image height in pixels |
| model | TEXT | Gemini model used |
| cost | REAL | Generation cost |
| created_at | TEXT | ISO 8601 timestamp |

### Indexes

- `jobs.status` -- filter by pipeline state
- `agent_executions.job_id` -- all agents for a job
- `agent_executions.job_id + agent_id` -- specific agent execution
- `generated_guides.job_id` -- guide for a job
- `generated_illustrations.job_id` -- all illustrations for a job

---

## 5. Build Order (Implementation Phases)

### Phase 0: Foundation -- COMPLETED

Everything needed before any agent can execute.

| Step | Deliverable | Status |
|---|---|---|
| 0.1 | Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui scaffold | Done |
| 0.2 | 3 page shells (upload, pipeline, output) | Done |
| 0.3 | 6 API route stubs (501 placeholders) | Done |
| 0.4 | 4 type definition files (agents, pipeline, xml, api) | Done |
| 0.5 | Drizzle ORM + SQLite schema (4 tables, 5 indexes) | Done |
| 0.6 | Gemini API client (text, structured, vision, image) | Done |
| 0.7 | Rate limiter for Gemini API | Done |
| 0.8 | Guideline YAML loader with singleton caching | Done |
| 0.9 | Utility modules (ULID, file-storage, SSE stream) | Done |
| 0.10 | Centralized config from env vars | Done |
| 0.11 | Build verification (pnpm build succeeds) | Done |

### Phase 1: Text Pipeline -- COMPLETED

Goal: A PDF goes in, guideline-enforced steps come out. No illustrations, no quality loop, no frontend yet.

| Step | Deliverable | Key Files | Status |
|---|---|---|---|
| 1.1 | Hybrid agent infrastructure (config-driven LLM agents + class-based code agents) | `src/lib/agents/types.ts`, `src/lib/agents/base-code-agent.ts`, `src/lib/agents/runner.ts`, `src/lib/agents/context.ts`, `src/lib/agents/retry.ts` | Done |
| 1.2 | Agent 1: Document Extractor (pdftoppm + mammoth) | `src/lib/agents/document-extractor.ts` | Done |
| 1.3 | Agent 2: Vision Analyzer (Gemini Flash, Pro escalation) | `src/lib/agents/configs/vision-analyzer.config.ts`, `src/lib/agents/prompts/vision-analyzer.ts`, `src/lib/agents/schemas/vision-analyzer.schema.ts` | Done |
| 1.4 | Agent 3: Instruction Composer (Gemini Flash) | `src/lib/agents/configs/instruction-composer.config.ts`, `src/lib/agents/prompts/instruction-composer.ts`, `src/lib/agents/schemas/instruction-composer.schema.ts` | Done |
| 1.5 | Agent 4: Guideline Enforcer (Gemini Flash + full YAML) | `src/lib/agents/configs/guideline-enforcer.config.ts`, `src/lib/agents/prompts/guideline-enforcer.ts`, `src/lib/agents/schemas/guideline-enforcer.schema.ts` | Done |
| 1.6 | Orchestrator state machine (pending through enforcing) | `src/lib/orchestrator/orchestrator.ts` | Done |
| 1.7 | SSE event emitter (singleton with subscribe/emit/dispose) | `src/lib/orchestrator/event-emitter.ts` | Done |
| 1.8 | POST /api/jobs -- file upload + job creation + orchestrator start | `src/app/api/jobs/route.ts` | Done |
| 1.9 | GET /api/jobs/[jobId] -- job status + agent summaries | `src/app/api/jobs/[jobId]/route.ts` | Done |
| 1.10 | GET /api/jobs/[jobId]/sse -- SSE event stream | `src/app/api/jobs/[jobId]/sse/route.ts` | Done |
| 1.11 | POST /api/jobs/[jobId]/cancel -- cancel running pipeline | `src/app/api/jobs/[jobId]/cancel/route.ts` | Done |
| 1.12 | End-to-end test: upload PDF, verify enforced steps in DB | manual | Pending |

**Architecture note:** The original plan called for a single `BaseAgent` class. The implementation uses a hybrid pattern instead: `BaseCodeAgent` (abstract class) for pure-code agents (1 and 8), and `runConfigAgent()` (config-driven runner) for LLM agents (2-7). Agent configs, prompts, and schemas are in separate files under `src/lib/agents/configs/`, `prompts/`, and `schemas/` respectively.

### Phase 2: Frontend Pipeline Monitor

Goal: The pipeline monitor page shows agents executing in real time with SSE.

| Step | Deliverable | Key Files |
|---|---|---|
| 2.1 | `useEventSource` hook (connect, reconnect, typed events) | `src/hooks/use-event-source.ts` |
| 2.2 | AgentCard component (idle, active, complete, error states) | `src/components/pipeline/agent-card.tsx` |
| 2.3 | PipelineProgress component (8-step horizontal tracker) | `src/components/pipeline/pipeline-progress.tsx` |
| 2.4 | CostTicker component (running total, per-agent breakdown) | `src/components/pipeline/cost-ticker.tsx` |
| 2.5 | DetailDrawer component (expandable agent I/O viewer) | `src/components/pipeline/detail-drawer.tsx` |
| 2.6 | Pipeline page integration (wire SSE to components) | `src/app/pipeline/[jobId]/page.tsx` |
| 2.7 | Upload page with file dropzone, domain selector, threshold | `src/app/page.tsx` |
| 2.8 | Navigation and job status polling | shared components |

### Phase 3: Quality + XML

Goal: Quality and safety review with feedback loop, XML output, output review page.

| Step | Deliverable | Key Files |
|---|---|---|
| 3.1 | Agent 5: Quality Reviewer (Gemini Pro) | `src/lib/agents/quality-reviewer.ts` |
| 3.2 | Agent 6: Safety Reviewer (Gemini Pro) | `src/lib/agents/safety-reviewer.ts` |
| 3.3 | Parallel execution of agents 5+6 in orchestrator | `src/lib/orchestrator/orchestrator.ts` |
| 3.4 | Quality gate logic (approve/revise/hold) | `src/lib/quality/quality-gate.ts` |
| 3.5 | Revision loop (feedback to Enforcer, max 2 iterations) | orchestrator update |
| 3.6 | Post-processor (9+ deterministic transforms) | `src/lib/guidelines/post-processor.ts` |
| 3.7 | Validator registry (22+ validators) | `src/lib/quality/validator-registry.ts` |
| 3.8 | Agent 8: XML Assembler | `src/lib/agents/xml-assembler.ts` |
| 3.9 | XML builder with namespace and full schema | `src/lib/xml/builder.ts` |
| 3.10 | GET /api/jobs/[jobId]/result -- completed output | `src/app/api/jobs/[jobId]/result/route.ts` |
| 3.11 | Output review page (XML viewer, quality report) | `src/app/output/[jobId]/page.tsx` |

### Phase 4: Illustrations

Goal: AI-generated isometric illustrations for each step, integrated into XML and the output view.

| Step | Deliverable | Key Files |
|---|---|---|
| 4.1 | Agent 7: Illustration Generator (Gemini Flash Image) | `src/lib/agents/illustration-generator.ts` |
| 4.2 | Illustration storage and path management | `src/lib/utils/file-storage.ts` |
| 4.3 | Orchestrator update (illustrating state between reviewing and assembling) | orchestrator update |
| 4.4 | Illustration gallery component | `src/components/output/illustration-gallery.tsx` |
| 4.5 | XML illustration references (`<illustration ref="..."/>`) | XML builder update |
| 4.6 | Pipeline monitor illustration card updates | pipeline page update |

### Phase 5: Polish + Demo Prep

Goal: Production-quality demo experience, pre-cached fallback mode, rehearsed 5-minute flow.

| Step | Deliverable | Key Files |
|---|---|---|
| 5.1 | Cost tracking refinement (per-agent, cumulative, in DB) | orchestrator + DB |
| 5.2 | POST /api/jobs/[jobId]/cancel -- cancellation support | `src/app/api/jobs/[jobId]/cancel/route.ts` |
| 5.3 | Demo mode: pre-cached results with realistic timing | `src/lib/demo/` |
| 5.4 | Error handling polish (graceful failures, user-friendly messages) | all components |
| 5.5 | Loading states and empty states across all pages | all pages |
| 5.6 | Demo rehearsal: upload -> monitor -> review in under 5 minutes | manual |
| 5.7 | Performance optimization (SSE reconnection, image lazy loading) | various |

---

## 6. Component Dependencies Map

```
+-------------------+
|   Upload Page     |
|   (/)             |
+--------+----------+
         |
         | POST /api/jobs
         v
+-------------------+       +-------------------+
|   Job API         | ----> |   Orchestrator    |
|   (route.ts)      |       |   (state machine) |
+-------------------+       +--------+----------+
                                      |
                    +-----------------+-----------------+
                    |                 |                 |
              +-----v-----+   +------v------+   +-----v-----+
              | Agents 1-4 |   | Agents 5-6  |   | Agent 7   |
              | (text)     |   | (parallel)  |   | (images)  |
              +-----+------+   +------+------+   +-----+-----+
                    |                 |                 |
              +-----v-----+   +------v------+         |
              | Gemini     |   | Quality     |         |
              | Client     |   | Gate        |         |
              +-----+------+   +------+------+         |
                    |                 |                 |
              +-----v-----+         |                 |
              | Guidelines |   +------v------+         |
              | Loader     |   | Post-       |         |
              +-----------+   | Processor   |         |
                              +------+------+         |
                                     |                 |
                              +------v------+   +-----v-----+
                              | Agent 8     |   | File      |
                              | XML Assemb. |   | Storage   |
                              +------+------+   +-----------+
                                     |
                              +------v------+
                              | XML Builder |
                              +------+------+
                                     |
                                     v
                              +-------------+
                              | DB (SQLite) |
                              +------+------+
                                     |
         +---------------------------+
         |                           |
+--------v----------+       +--------v----------+
| Pipeline Monitor   |       | Output Review     |
| /pipeline/[jobId]  |       | /output/[jobId]   |
+---------+----------+       +---------+---------+
          |                            |
    SSE EventSource              GET /result
```

### Dependency Summary

| Component | Depends On |
|---|---|
| Orchestrator | All 8 agents, SSE event bus, DB, config |
| Agents 1-4 | Gemini client, guidelines loader, types, file storage |
| Agents 5-6 | Gemini client, guidelines loader, types |
| Agent 7 | Gemini client (image generation), guidelines loader, file storage |
| Agent 8 | XML builder, types |
| SSE Event Bus | Types (event schemas) |
| Guidelines Loader | YAML files, schema definitions |
| Quality Gate | Validator registry, types |
| Post-Processor | Guidelines loader, types |
| Pipeline Monitor page | useEventSource hook, AgentCard, CostTicker, DetailDrawer |
| Output Review page | XML viewer, illustration gallery, quality report |
| Upload page | File dropzone, domain selector, job API |

---

## 7. Technical Decisions Log

### Decision 1: Gemini over OpenAI

**Context:** Needed an AI provider for text analysis, structured output, and image generation.

**Decision:** Google Gemini API (Flash + Pro models).

**Rationale:**
- Flash model is significantly cheaper for bulk work (~$0.02/call vs ~$0.10 for GPT-4o-mini equivalent)
- Pro model available for quality-critical review tasks
- Flash Image model enables illustration generation within the same API -- no separate DALL-E/Midjourney integration
- Structured output via `responseSchema` parameter enforces type-safe responses
- Single API key for all modalities (text, vision, image generation)

### Decision 2: SQLite over PostgreSQL

**Context:** Needed a database for job tracking, agent execution logs, and output storage.

**Decision:** SQLite via better-sqlite3, managed by Drizzle ORM.

**Rationale:**
- Zero configuration -- no Docker, no connection strings, no managed service
- Single file at `storage/guid.db` -- trivial backup and reset
- Appropriate for single-user demo scope (no concurrent write pressure)
- Drizzle ORM provides type-safe queries identical to what a PostgreSQL migration would use

**Trade-off:** Cannot scale to multi-user without migration to PostgreSQL. Acceptable for demo scope.

### Decision 3: SSE over WebSocket

**Context:** Pipeline monitor needs real-time updates as agents execute.

**Decision:** Server-Sent Events (SSE) via native `ReadableStream`.

**Rationale:**
- Pipeline updates are strictly server-to-client (no bidirectional need)
- SSE is natively supported by all browsers via `EventSource` API
- Simpler server implementation -- no WebSocket upgrade, no ping/pong
- Automatic reconnection built into EventSource
- Works through standard HTTP proxies and load balancers

**Trade-off:** Cannot send client-to-server messages over the same connection. Acceptable because cancellation uses a separate POST endpoint.

### Decision 4: 8 Agents (down from 11)

**Context:** The predecessor project (Instructo) used 11 microservice agents.

**Decision:** Consolidated to 8 agents in a monolithic process.

**Rationale:**
- Merged Editor agent into Instruction Composer (Agent 3) -- editing is part of composition
- Merged 4 separate illustration agents (Generator, Annotator, Reviewer, Optimizer) into 1 Illustration Generator (Agent 7) -- Gemini Flash Image handles the full pipeline
- Fewer agents = faster pipeline execution, simpler orchestrator, lower cost
- Each remaining agent has a clear, distinct responsibility

### Decision 5: XML as Canonical Output

**Context:** Need an output format that demonstrates enterprise-system interoperability.

**Decision:** XML with namespace `urn:guid:work-instruction:1.0` as the primary output format.

**Rationale:**
- Management audience associates XML with enterprise systems (MES, PLM, ERP)
- Demonstrates structured, machine-readable output (not just another PDF)
- Namespace and schema show forward-thinking architecture
- JSON available via API for programmatic consumers

### Decision 6: No Authentication

**Context:** This is a 5-minute management demo, not a production product.

**Decision:** No authentication, no user accounts, no API keys in the UI.

**Rationale:**
- Removes all friction from the demo flow (upload and go)
- Avoids login screen eating into the 5-minute demo window
- GEMINI_API_KEY is set server-side via environment variable
- Single-user assumption means no access control needed

### Decision 7: Feedback Routes to Enforcer Only

**Context:** When quality review fails, the pipeline needs a revision mechanism.

**Decision:** Revision feedback routes exclusively to Agent 4 (Guideline Enforcer), not to separate revision agents.

**Rationale:**
- The Enforcer already has the full YAML guidelines in its prompt
- Re-running enforcement with reviewer feedback is simpler than a separate revision agent
- Maximum 2 revision loops prevents infinite cycles
- Keeps the pipeline linear with a single well-defined loop point

---

## 8. Environment Variables

### Required

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key. Required for all AI agent calls. |

### Optional

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `file:./storage/guid.db` | SQLite database file path |
| `STORAGE_PATH` | `./storage` | Root directory for uploads, illustrations, and temp files |
| `GEMINI_FLASH_MODEL` | `gemini-2.5-flash` | Model for Agents 2, 3, 4 |
| `GEMINI_PRO_MODEL` | `gemini-2.5-pro` | Model for Agents 5, 6 |
| `GEMINI_IMAGE_MODEL` | `gemini-2.5-flash` | Model for Agent 7 (image generation) |
| `QUALITY_THRESHOLD` | `85` | Minimum score for auto-approval |
| `MAX_REVISION_LOOPS` | `2` | Maximum feedback loops before forced proceed |
| `DEMO_MODE` | `false` | Use pre-cached results instead of live API calls |

### Demo Mode

When `DEMO_MODE=true`:
- All agent executions replay pre-cached results from `src/lib/demo/`
- Pipeline monitor animates identically (agent cards, progress, cost)
- Realistic timing delays simulate actual API latency
- No Gemini API key required
- Useful for: offline demos, API outage, rehearsal, CI testing

---

## Appendix: 16 Approved Verbs (WI-022)

Every step instruction must begin with one of these imperative verbs:

```
Insert    Attach    Tighten    Slide
Place     Align     Press      Push
Lower     Lift      Flip       Screw
Snap      Hook      Position   Secure
```

---

## Appendix: Cost Model

Estimated per-document cost for a 24-page PDF:

| Agent | Model | Est. Cost |
|---|---|---|
| 1. Document Extractor | Code | $0.00 |
| 2. Vision Analyzer | Flash (Pro escalation) | ~$0.06 |
| 3. Instruction Composer | Flash | ~$0.02 |
| 4. Guideline Enforcer | Flash | ~$0.03 |
| 5. Quality Reviewer | Pro | ~$0.08 |
| 6. Safety Reviewer | Pro | ~$0.04 |
| 7. Illustration Generator | Flash Image | ~$0.70 |
| 8. XML Assembler | Code | $0.00 |
| **Total** | | **~$0.93** |

Illustration generation dominates cost (~75%). For demos without illustrations, cost drops to ~$0.23 per document.

---

## Appendix: File Structure

```
Guid.me/
  docs/
    prd.md                          # Authoritative PRD
    implementation-plan.md          # This document
  src/
    app/
      page.tsx                      # Upload & Configure (/)
      layout.tsx                    # Root layout
      pipeline/[jobId]/page.tsx     # Pipeline Monitor
      output/[jobId]/page.tsx       # Output Review
      api/
        jobs/
          route.ts                  # POST (create) + GET (list)
          [jobId]/
            route.ts                # GET (status)
            sse/route.ts            # GET (SSE stream)
            result/route.ts         # GET (completed output)
            cancel/route.ts         # POST (cancel job)
    components/
      ui/                           # shadcn/ui components
      shared/                       # Header, logo, status badge
      pipeline/                     # Agent cards, progress, cost ticker
      output/                       # XML viewer, gallery, quality report
    hooks/                          # useEventSource, etc.
    lib/
      agents/
        types.ts                    # AgentConfig, AgentContext, AgentResult, error classes
        base-code-agent.ts          # Abstract class for code-only agents (1, 8)
        runner.ts                   # runConfigAgent() generic LLM agent runner
        context.ts                  # createAgentContext() factory
        retry.ts                    # withRetry() exponential backoff + jitter
        document-extractor.ts       # Agent 1 (BaseCodeAgent)
        configs/
          vision-analyzer.config.ts       # Agent 2 config (Flash→Pro escalation)
          instruction-composer.config.ts  # Agent 3 config (Flash)
          guideline-enforcer.config.ts    # Agent 4 config (Flash, low-temp)
        prompts/
          vision-analyzer.ts              # Agent 2 prompts
          instruction-composer.ts         # Agent 3 prompts
          guideline-enforcer.ts           # Agent 4 prompts (full YAML injection)
        schemas/
          vision-analyzer.schema.ts       # Agent 2 responseSchema
          instruction-composer.schema.ts  # Agent 3 responseSchema
          guideline-enforcer.schema.ts    # Agent 4 responseSchema (16 verb enum)
        quality-reviewer.ts         # Agent 5 (Phase 3)
        safety-reviewer.ts          # Agent 6 (Phase 3)
        illustration-generator.ts   # Agent 7 (Phase 4)
        xml-assembler.ts            # Agent 8 (Phase 3)
      orchestrator/
        orchestrator.ts             # State machine
        event-emitter.ts            # SSE event bus
      guidelines/
        work-instructions.yaml      # WI-001 to WI-038
        illustrations.yaml          # IL-001 to IL-018
        loader.ts                   # YAML parser + singleton cache
        schema.ts                   # Guideline type definitions
        post-processor.ts           # 9+ deterministic transforms
      quality/
        validator-registry.ts       # 22+ validators
        quality-gate.ts             # Score evaluation logic
      xml/
        builder.ts                  # XML document builder
      gemini/
        client.ts                   # Gemini API wrapper
        models.ts                   # Model configurations
        rate-limiter.ts             # Request rate limiting
      db/
        schema.ts                   # Drizzle table definitions
        index.ts                    # DB connection
      demo/                         # Pre-cached demo results
      config.ts                     # Centralized env var config
      utils.ts                      # General utilities (cn, etc.)
      utils/
        ulid.ts                     # ULID generator
        file-storage.ts             # File system operations
        sse.ts                      # SSE stream helper
    types/
      agents.ts                     # Agent type definitions
      pipeline.ts                   # Pipeline state types
      xml.ts                        # XML schema types
      api.ts                        # API request/response types
  storage/                          # Runtime storage (gitignored)
    guid.db                         # SQLite database
    uploads/                        # Uploaded documents
    illustrations/                  # Generated illustrations
    temp/                           # Temporary processing files
```
