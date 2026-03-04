# Guid Master Plan

> **Last Updated:** 2026-03-04

---

## 1. Vision Statement

> Upload a document, watch 8 AI agents transform it into enterprise-grade work instructions — live, in real time.

Guid (General Unified Industrialization Dashboard) is the first product in a platform vision for AI-driven industrialization tooling. It exists to prove one thesis: **visible, auditable multi-agent AI can replace weeks of manual authoring in regulated industries — and management should fund it.**

The immediate deliverable is a 5-minute demo product. Upload a PDF or DOCX, watch 8 specialized agents process it through a transparent pipeline, and receive structured XML work instructions with AI-generated illustrations. Every agent's input, output, prompt, and cost is visible. Nothing is a black box.

---

## 2. Problem Statement

Manual work instruction authoring in regulated industries is slow, inconsistent, and disconnected from modern systems.

| Problem | Impact |
|---------|--------|
| **Manual authoring overhead** | A single 24-page assembly procedure can take days to author, review, and format. Technical writers and industrial engineers spend most of their time on structure and compliance, not content. |
| **Inconsistent quality across authors** | Different authors produce different styles, verb usage, safety callout placement, and metadata. There is no enforcement mechanism beyond manual review. |
| **No structured output** | Word and PDF documents are not machine-readable. MES and PLM systems need structured data (XML, JSON), but the authoring tools produce flat files. |
| **Black-box AI** | Existing AI writing tools produce output with no transparency. Management cannot see the value, cannot audit the reasoning, and cannot justify the spend. |
| **Compliance gaps** | Guideline documents exist (38 writing rules, 18 illustration rules), but enforcement is manual. Authors forget rules, reviewers miss violations, and compliance degrades over time. |

---

## 3. Target Users

### Industrial Engineers

- Create and manage assembly, manufacturing, and maintenance procedures
- Need structured output (XML) for integration with MES, PLM, and ERP systems
- Care about accuracy, part traceability, and safety compliance
- Want to reduce time-to-publish from days to minutes

### Technical Writers

- Author work instructions, standard operating procedures, and training materials
- Need consistency enforcement — verb usage, sentence structure, metadata completeness
- Want AI assistance that respects their domain guidelines, not generic writing tools
- Care about auditability — they need to review and approve AI output, not blindly trust it

---

## 4. Demo Audience

**Semiconductor manufacturing management** — technical enough to appreciate structured data and multi-agent orchestration, business-oriented enough to care about cost transparency and scalability.

Key demo hooks for this audience:

- **Structured XML output** — they understand why machine-readable formats matter for MES integration
- **Per-agent cost breakdown** — they can calculate ROI against current manual authoring costs
- **Quality scoring** — they value quantifiable metrics over subjective assessments
- **Safety review agent** — regulatory compliance is non-negotiable in semiconductor manufacturing
- **Real-time visibility** — they can watch the AI work, building trust through transparency

---

## 5. Emotional Outcome

The product should make users feel:

| Feeling | How We Achieve It |
|---------|-------------------|
| **Professional** | Clean, minimal UI. No playful illustrations, no emoji, no casual language. Enterprise-grade aesthetic. |
| **Reliable** | Deterministic post-processing. Quality scoring with clear thresholds. Structured output with namespace-versioned XML. |
| **Transparent** | Every agent's work is visible. Prompts, responses, token counts, costs — all inspectable. Progressive disclosure keeps it clean but nothing is hidden. |
| **Educational** | The pipeline monitor teaches users what each agent does. The quality report explains every flag. Users learn the system by watching it work. |

Users should feel confident in the AI's work **because they can see every step**, not because they are asked to trust it.

---

## 6. Core Value Proposition

> Visible, auditable multi-agent AI pipeline producing structured XML. Not a black box — every agent's input, output, prompt, and cost is visible.

What separates Guid from "paste into ChatGPT":

- **8 specialized agents** — each with a single responsibility, a tuned prompt, and a constrained output schema
- **4-layer compliance** — guidelines are enforced at the prompt level, the schema level, the post-processing level, and the validation level
- **Structured output** — canonical XML with a versioned namespace, not prose in a chat window
- **Cost transparency** — per-agent token counts, model costs, and a running total visible in real time
- **Quality gates** — automated scoring with clear thresholds (>= 85 approved, 70-84 revise, < 70 hold)
- **Auditability** — every agent execution is logged with its prompt, response, model, duration, and cost

---

## 7. Key Features

### 7.1 Eight-Agent Pipeline

```
[PDF/DOCX] --> [1] Document Extractor (code — pdftoppm/mammoth)
           --> [2] Vision Analyzer (Gemini Flash, escalates to Pro)
           --> [3] Instruction Composer (Gemini Flash)
           --> [4] Guideline Enforcer (Gemini Flash + full YAML guidelines)
           --> [5] Quality Reviewer (Gemini Pro)    --+-- parallel
           --> [6] Safety Reviewer (Gemini Pro)     --+
           --> [7] Illustration Generator (Gemini Flash Image)
           --> [8] XML Assembler (code)
           --> [Structured XML + Illustrations]
```

Pipeline states: `pending` --> `extracting` --> `analyzing` --> `composing` --> `enforcing` --> `reviewing` --> `[revising, max 2x]` --> `illustrating` --> `assembling` --> `completed`

### 7.2 Real-Time Pipeline Monitor (Star Feature)

The pipeline monitor page is the centerpiece of the demo. It uses Server-Sent Events (SSE) to push updates from the server to the client in real time:

- **Agent cards** — 8 cards showing status (pending, running, complete, error), with live progress text
- **Cost ticker** — running total that updates as each agent completes
- **Detail drawer** — click any agent card to see its prompt, response, token count, model, and duration
- **Progressive disclosure** — the overview is clean and scannable; details are one click away

### 7.3 Canonical XML Output

Namespace: `urn:guid:work-instruction:1.0`

Structure:
- `<metadata>` — title, domain, safety level, estimated minutes, source document
- `<parts-list>` — all parts with id, name, and quantity
- `<tools-required>` — required and optional tools
- `<safety-warnings>` — guide-level safety warnings
- `<phases>` containing `<step>` elements — instruction text, parts, tools, safety notes, illustration reference, confidence score
- `<generation-metadata>` — job ID, quality score, total cost, models used, quality flags

### 7.4 Four-Layer Compliance System

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| 1. Prompt injection | Full YAML guidelines injected into agent prompts (no truncation) | Agents are aware of all 38 writing + 18 illustration rules |
| 2. Response schema | Gemini `responseSchema` with enums and required fields | Structural compliance is enforced by the model API |
| 3. Post-processing | 9+ deterministic transforms (verb-first fix, part ID insertion, etc.) | Catches what the model misses — no LLM randomness |
| 4. Validation | 22+ validators producing quality flags | Quantifiable scoring and actionable feedback |

### 7.5 AI-Generated Illustrations

- One isometric technical illustration per assembly step
- Generated by Gemini Flash Image model
- Follows 18 illustration guidelines (IL-001 to IL-018)
- Referenced in XML output via `<illustration>` elements

### 7.6 Quality Scoring and Feedback Loop

- Quality and Safety reviewers run in parallel (agents 5 and 6)
- Combined score determines outcome: >= 85 approved, 70-84 triggers revision, < 70 holds for manual review
- Revision routes feedback back to the Guideline Enforcer (agent 4), not separate agents
- Maximum 2 revision loops to prevent infinite cycles

### 7.7 Cost Transparency

- Per-agent cost calculated from token counts and model pricing
- Running total displayed in the pipeline monitor
- Final cost included in XML `<generation-metadata>`
- Typical 24-page PDF costs approximately $0.93

### 7.8 Demo Mode

- Set `DEMO_MODE=true` to use pre-cached results
- Pipeline monitor animates identically — agent cards activate, progress updates, cost ticks
- Uses stored results instead of live API calls
- Essential for offline demos and when the Gemini API is unavailable

### 7.9 Form-Driven Upload

- Drag-and-drop file upload (PDF or DOCX)
- Domain selector (e.g., semiconductor assembly, general manufacturing)
- Quality threshold configuration
- No CLI, no API keys, no prompt engineering required

---

## 8. Anti-Goals (Explicitly Out of Scope)

These are deliberate exclusions, not oversights:

- **No authentication or multi-user support** — this is a single-user demo product
- **No batch processing** — one document at a time; batch is a platform feature
- **No custom guideline upload** — guidelines are baked into the system; customization is post-demo
- **No external API for third-party consumers** — the API serves the frontend only
- **No multi-language output** — English only for the demo
- **No Docker containerization** — runs locally with `pnpm dev`
- **No production PostgreSQL** — SQLite is sufficient for single-user demo
- **No WebSocket** — SSE is simpler and sufficient for one-directional server-to-client push

---

## 9. Success Criteria

### Primary

> The 5-minute demo convinces management to fund a full team for the Guid platform.

### Supporting Metrics

| Metric | Target |
|--------|--------|
| Demo duration | <= 5 minutes end-to-end |
| Pipeline completion | 100% on the demo document (no errors, no stalls) |
| Quality score | >= 85 (approved without revision) on the demo document |
| Agent visibility | All 8 agents visible with status, progress, and cost |
| XML validity | Output renders correctly in the output review view |
| Illustrations | Generated for every step in the output |
| Cost display | Per-agent and total cost visible throughout the pipeline |
| Offline fallback | Demo mode works without network connectivity |

---

## 10. Design Inspiration

### Aesthetic

**Vercel/Linear** — minimal, fast, monochrome with subtle accents. The interface should feel like a developer tool built for engineers, not a consumer app.

### Color

- **Primary accent:** Indigo/Violet — conveys AI, technology, and precision
- **Base palette:** Monochrome grays with the indigo accent for interactive elements, status indicators, and focus states
- **Status colors:** Standard semantic colors for pipeline states (green/complete, blue/running, amber/warning, red/error)

### Mode

- **Light mode default** — optimized for meeting room projectors and screen sharing
- **Dark mode supported** — for individual use and developer preference

### Layout Principles

- **Progressive disclosure** — clean overview by default, expandable details on interaction
- **Information density** — show enough to be useful at a glance, never overwhelming
- **Motion** — subtle transitions for state changes; no decorative animation
- **Typography** — system font stack, clear hierarchy, generous spacing

---

## 11. Technical Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (New York style, neutral theme) |
| Database | SQLite via Drizzle ORM |
| AI | Google Gemini API (Flash + Pro + Image models) |
| Real-time | Server-Sent Events (SSE) |

### Agent Models and Costs

| Agent | Model | Approximate Cost |
|-------|-------|-----------------|
| [1] Document Extractor | Pure code (pdftoppm/mammoth) | $0.00 |
| [2] Vision Analyzer | Flash (default), Pro (escalation) | ~$0.06 |
| [3] Instruction Composer | Flash | ~$0.02 |
| [4] Guideline Enforcer | Flash | ~$0.03 |
| [5] Quality Reviewer | Pro | ~$0.08 |
| [6] Safety Reviewer | Pro | ~$0.04 |
| [7] Illustration Generator | Flash Image | ~$0.70 |
| [8] XML Assembler | Pure code | $0.00 |
| **Total (24-page PDF)** | | **~$0.93** |

### Guidelines

- `work-instructions.yaml` — 38 requirements (WI-001 to WI-038) covering structure, metadata, safety, style, content, and DIY
- `illustrations.yaml` — 18 requirements (IL-001 to IL-018) covering style, parts, motion, comparative views, and quality
- 16 approved verbs: Insert, Attach, Tighten, Slide, Place, Align, Press, Push, Lower, Lift, Flip, Screw, Snap, Hook, Position, Secure

---

## 12. Implementation Phases

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 0** | Foundation — scaffold, DB, types, guidelines, Gemini client | Completed |
| **Phase 1** | Text Pipeline — agents 1-4, orchestrator, SSE, job API | Next |
| **Phase 2** | Frontend Pipeline Monitor — SSE integration, agent cards, detail drawer | Planned |
| **Phase 3** | Quality + XML — agents 5-6, feedback loop, XML assembler, output view | Planned |
| **Phase 4** | Illustrations — agent 7, gallery view, XML refs | Planned |
| **Phase 5** | Polish + Demo Prep — cost tracking, pre-cached fallback, rehearsal | Planned |

---

## 13. Future Vision (Post-Demo)

The demo product is the tip of the iceberg. If funded, the full Guid platform expands in several directions:

- **Multiple workflow types** — beyond work instructions to standard operating procedures, maintenance manuals, training materials, and quality checklists
- **Multi-user support** — role-based access, team workspaces, approval workflows
- **Enterprise deployment** — PostgreSQL, Docker, Kubernetes, SSO/SAML integration
- **Custom guidelines** — per-organization YAML guideline upload and management
- **Batch processing** — queue multiple documents, track progress across a document set
- **MES/PLM integration** — direct export to manufacturing execution systems and product lifecycle management tools
- **Version control** — track revisions, diff work instructions, audit trail
- **Feedback learning** — human corrections improve agent prompts over time
- **Multi-language** — localized output with terminology management

The demo proves the technology. The platform serves the enterprise.

---

> **This document is the strategic companion to `docs/prd.md` (the authoritative technical specification). The PRD defines _what_ to build and _how_. This master plan defines _why_ and _for whom_.**
