# CLAUDE.md — Guid (General Unified Industrialization Dashboard)

## Project Overview

**Guid** is an AI-powered work instruction generator — the first product in the General Unified Industrialization Dashboard platform. Upload a PDF/DOCX, watch 8 specialized AI agents transform it into structured XML work instructions with illustrations, in real time. Built as a 5-minute management demo to secure funding for a full industrialization platform. The authoritative spec is **`docs/prd.md`** — read it before making architectural decisions.

## Commands

```bash
pnpm dev              # Start Next.js dev server (port 3000)
pnpm build            # Production build
pnpm lint             # ESLint
pnpm db:push          # Push Drizzle schema to SQLite
pnpm db:studio        # Open Drizzle Studio (DB browser)
pnpm db:generate      # Generate Drizzle migrations
```

## Architecture

**Stack:** Next.js 15, TypeScript, Tailwind v4, shadcn/ui, Drizzle ORM (SQLite), Google Gemini API

**8-Agent Pipeline:**

```
[PDF/DOCX] → [1] Document Extractor (code)
           → [2] Vision Analyzer (Flash→Pro)
           → [3] Instruction Composer (Flash)
           → [4] Guideline Enforcer (Flash + full YAML)
           → [5] Quality Reviewer (Pro)    ─┐ parallel
           → [6] Safety Reviewer (Pro)     ─┘
           → [7] Illustration Generator (Flash Image)
           → [8] XML Assembler (code)
           → [Structured XML + Illustrations]
```

**Pipeline flow:** pending → extracting → analyzing → composing → enforcing → reviewing → [revising, max 2x] → illustrating → assembling → completed

**Real-time updates:** SSE (Server-Sent Events) from `/api/jobs/[jobId]/sse` — agent:start, agent:progress, agent:complete, pipeline:state, pipeline:cost

## Key Files

| Path | Purpose |
|------|---------|
| `docs/prd.md` | **Authoritative PRD** — 15 sections, all types, all specs |
| `src/app/page.tsx` | Upload & Configure view (`/`) |
| `src/app/pipeline/[jobId]/page.tsx` | Pipeline Monitor view |
| `src/app/output/[jobId]/page.tsx` | Output Review view |
| `src/lib/agents/` | 8 agent implementations (base-agent.ts + one per agent) |
| `src/lib/orchestrator/orchestrator.ts` | State machine coordinating all agents |
| `src/lib/orchestrator/event-emitter.ts` | SSE event emission |
| `src/lib/guidelines/work-instructions.yaml` | 38 writing requirements (WI-001 to WI-038) |
| `src/lib/guidelines/illustrations.yaml` | 18 illustration requirements (IL-001 to IL-018) |
| `src/lib/guidelines/post-processor.ts` | 9+ deterministic transforms (Layer 3) |
| `src/lib/quality/validator-registry.ts` | 22+ validators producing quality flags |
| `src/lib/xml/builder.ts` | XML document builder (namespace: urn:guid:work-instruction:1.0) |
| `src/lib/db/schema.ts` | Drizzle schema (jobs, agent_executions, generated_guides, generated_illustrations) |
| `src/lib/gemini/client.ts` | Gemini API client wrapper |
| `src/types/` | Shared TypeScript interfaces (agents.ts, pipeline.ts, xml.ts, api.ts) |

## Routes

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Upload & Configure — file dropzone, domain selector, quality threshold |
| `/pipeline/[jobId]` | Pipeline Monitor — 8 agent cards, SSE updates, cost ticker, detail drawer |
| `/output/[jobId]` | Output Review — XML viewer, illustration gallery, quality report, export |

### API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/jobs` | Create generation job (multipart form) |
| `GET` | `/api/jobs` | List all jobs |
| `GET` | `/api/jobs/[jobId]` | Get job status |
| `GET` | `/api/jobs/[jobId]/sse` | SSE event stream |
| `GET` | `/api/jobs/[jobId]/result` | Get completed result |
| `POST` | `/api/jobs/[jobId]/cancel` | Cancel running job |

## Database (Drizzle + SQLite)

| Table | Purpose |
|-------|---------|
| `jobs` | Job lifecycle: status, document info, config, timing, costs |
| `agent_executions` | Per-agent: prompt, response, tokens, cost, duration, model |
| `generated_guides` | Final output: XML, JSON, quality scores, metadata |
| `generated_illustrations` | Per-step: file path, dimensions, model, cost |

## Guidelines System

**4-layer Compliance by Construction:**
1. **Prompt injection** — Full YAML guidelines into agent prompts (no truncation)
2. **Response schema** — Gemini `responseSchema` enforcing enums/required fields
3. **Post-processing** — 9+ deterministic transforms (verb-first fix, part ID insertion, etc.)
4. **Validation** — 22+ validators producing quality flags

**Guideline files:**
- `work-instructions.yaml`: WI-001 to WI-038 (structure, metadata, safety, style, content, DIY)
- `illustrations.yaml`: IL-001 to IL-018 (style, parts, motion, comparative, quality)

**Quality gates:** >= 85 approved | 70-84 revise (max 2 loops) | < 70 hold

## Output Format

**Canonical XML** with namespace `urn:guid:work-instruction:1.0`:
- `<metadata>` — title, domain, safety-level, estimated-minutes, source-document
- `<parts-list>` — all parts with id/name/quantity
- `<tools-required>` — required and optional tools
- `<safety-warnings>` — guide-level warnings
- `<phases>` → `<step>` — instruction, parts, tools, safety, illustration ref, confidence
- `<generation-metadata>` — job-id, quality-score, cost, models-used, quality-flags

## Key Constraints

- **No auth** — single-user demo, no login or API keys
- **SQLite only** — local database, no external DB dependency
- **Gemini API required** — `GEMINI_API_KEY` must be set (or use `DEMO_MODE=true` for cached results)
- **pdftoppm required** — poppler must be installed for PDF extraction (`brew install poppler`)
- **SSE not WebSocket** — one-directional server→client push for pipeline updates
- **XML is canonical output** — JSON available via API but XML is the primary format
- **16 approved verbs** — Insert, Attach, Tighten, Slide, Place, Align, Press, Push, Lower, Lift, Flip, Screw, Snap, Hook, Position, Secure (WI-022)
- **Agents 5+6 run in parallel** — Quality and Safety reviewers execute via Promise.all()
- **Max 2 revision loops** — Feedback routes to Guideline Enforcer, not separate agents
- **Pre-cached fallback** — `DEMO_MODE=true` replays stored results with realistic timing

## Agent Models

| Agent | Model | Cost |
|-------|-------|------|
| [1] Document Extractor | Pure code (pdftoppm/mammoth) | $0.00 |
| [2] Vision Analyzer | Flash (default), Pro (escalation) | ~$0.06 |
| [3] Instruction Composer | Flash | ~$0.02 |
| [4] Guideline Enforcer | Flash | ~$0.03 |
| [5] Quality Reviewer | Pro | ~$0.08 |
| [6] Safety Reviewer | Pro | ~$0.04 |
| [7] Illustration Generator | Flash Image | ~$0.70 |
| [8] XML Assembler | Pure code | $0.00 |
| **Total (24-page PDF)** | | **~$0.93** |

## Environment Variables

**Required:** `GEMINI_API_KEY`

**Optional:** `DATABASE_URL` (default: `file:./storage/guid.db`), `STORAGE_PATH` (default: `./storage`), `GEMINI_FLASH_MODEL`, `GEMINI_PRO_MODEL`, `GEMINI_IMAGE_MODEL`, `QUALITY_THRESHOLD` (default: 85), `MAX_REVISION_LOOPS` (default: 2), `DEMO_MODE` (default: false)

## Implementation Phases

| Phase | Focus |
|-------|-------|
| **Phase 0** | Foundation — scaffold, DB, types, guidelines, Gemini client |
| **Phase 1** | Text Pipeline — agents 1-4, orchestrator, SSE, job API |
| **Phase 2** | Frontend Pipeline Monitor — SSE integration, agent cards, detail drawer |
| **Phase 3** | Quality + XML — agents 5-6, feedback loop, XML assembler, output view |
| **Phase 4** | Illustrations — agent 7, gallery view, XML refs |
| **Phase 5** | Polish + Demo Prep — cost tracking, pre-cached fallback, rehearsal |

## Demo Mode

Set `DEMO_MODE=true` to use pre-cached results. The pipeline monitor animates identically — agent cards activate, progress updates, cost ticks — but uses stored results instead of live API calls. Useful for offline demos or when the Gemini API is unavailable.

## Source Material

- `Input-docs/prd.md` — Instructo PRD (predecessor, 11-agent microservice design, no UI)
- `Input-docs/work-instructions.yaml` — 38 writing requirements (WI-001 to WI-038)
- `Input-docs/illustrations.yaml` — 18 illustration requirements (IL-001 to IL-018)
- `Input-docs/CLAUDE.md` — Guid.how CLAUDE.md (previous project, IKEA-focused)
