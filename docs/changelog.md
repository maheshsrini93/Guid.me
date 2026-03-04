# Changelog

All notable changes to the Guid project are documented here.

Format: Each entry includes a date, category, and description of the change.

---

## 2026-03-04

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
