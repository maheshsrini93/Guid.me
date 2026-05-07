# ADR-0002: Polymorphic illustration generation — Gemini for non-CAD, CAD-render + programmatic overlays for CAD

- **Status:** Accepted
- **Date:** 2026-05-07
- **Deciders:** maheshsuresh.ms17

## Context

Agent 7 (Illustration Generator) is the most expensive agent in the pipeline. For PDF/DOCX inputs it prompts **Gemini Flash Image** to draw a fresh illustration per step (~$0.04/image × ~17 steps ≈ $0.70/job, ~75% of total per-job cost). It does this because for IKEA manuals there is no underlying 3D model — only the rendered PDF page — so generating a clean isometric illustration requires an image model.

For 3D pipelines we have the actual CAD model. The Source Adapter (ADR-0001) produces a deterministic parts catalog, an assembly tree, per-Component transforms, and B-rep geometry. With this in hand, *generating* an illustration of an "engine block" is wasteful — and worse, the model Gemini draws will not match the engineer's actual engine block, which undermines credibility with the manufacturing audience that is the demo's target.

Four options were considered for the 3D path:

1. **Keep Gemini Flash Image, same as PDF.** Style consistency, zero new code, but loses geometry credibility and keeps the $0.70 cost line.
2. **Render directly from CAD with no annotations.** Ground-truth geometry, near-zero cost, but fails IL-002 (part labels), IL-010 (motion arrows), IL-013 (OK/NOK), IL-015 (two-person grip) — half-built.
3. **Hybrid — render CAD base, ask Gemini image-to-image to add stylization and annotations.** Ground-truth + Gemini's annotation richness, but two-stage complexity and retains a per-step Gemini cost.
4. **Render from CAD, layer annotations programmatically (SVG/canvas overlay) using the structured fields already on `EnforcedStep`.** Ground-truth + deterministic annotations + near-zero cost.

## Decision

**For 3D pipelines: option 4 — CAD-render + programmatic overlays.**

**For PDF/DOCX pipelines: unchanged — Gemini Flash Image.**

Concretely:

- Agent 7's display name generalizes from **"Illustration Generator"** to **"Illustration Renderer"** to reflect the broader role.
- The agent is polymorphic, dispatching on a single criterion: **does `state.extractedSource.structuredMetadata` exist?**
  - If yes → use the CAD-render + overlay sub-implementation
  - If no → use the existing Gemini Flash Image sub-implementation
- Sub-implementations live under `src/lib/agents/illustration-renderer/{gemini,cad,...}.ts`, mirroring the Source Adapter folder layout from ADR-0001.
- The output type (`GeneratedIllustration`) is unchanged — both implementations produce a PNG, dimensions, cost, model used.
- The CAD sub-implementation:
  - Uses three.js + headless-gl (Node-native) to render the Assembly per step, with active Parts at full opacity and previously-installed Parts at low opacity (per IL-008).
  - Reads `EnforcedStep` annotation fields (`arrowDirection`, `arrowStart`, `arrowEnd`, `rotationDirection`, `rotationTarget`, `rotationAmount`, `gripPositions`, `isOkNok`, etc. — see [src/types/agents.ts:329-349](../../src/types/agents.ts:329)) and overlays them programmatically via SVG/canvas.
  - Reports `costUsd: 0` (compute only).
  - Reports `modelUsed: "internal-cad-renderer"` rather than a Gemini model name.

## Consequences

**Positive**

- **Per-job cost for 3D pipelines drops from ~$0.93 to ~$0.23** — a 75% reduction. Strong business-case point for the demo.
- **Illustrations match the engineer's actual geometry** — credibility with the manufacturing audience.
- **IL-001/002/008/010/013/015 are deterministically satisfied** by render parameters and overlay code, instead of relied on via prompt instructions to an image model that may or may not comply.
- **Visual consistency across steps** is automatic — same camera, same lighting, same label-layout algorithm — no per-step Gemini variance.
- **Validates the "polymorphism via `structuredMetadata` presence" pattern** that ADR-0001 established for Agent 1. The same dispatch criterion now applies to two agents; future CAD-aware adaptations (Agent 3 grounding, Agent 5 cross-validation) follow the same rule.

**Negative**

- **Real implementation work**: three.js scene setup, label-layout algorithm with leader-line collision avoidance, SVG/canvas overlay layer, motion-arrow rendering primitive, OK/NOK side-by-side composition, two-person grip indicator. Realistic estimate: 2-3 days of focused work.
- **Style divergence between PDF-sourced and CAD-sourced outputs**: the former are Gemini's hand-drawn-isometric look; the latter are CAD-shaded. Not a problem per se (each is appropriate to its source) but worth noting for any future "house style" effort.
- **Renderer shipping**: `headless-gl` requires platform-native compilation. Must be validated in the deployment Docker image.

## Alternatives considered

### Option 1 (Gemini for both paths)

Rejected. Cost stays high. Loses the credibility argument that is the strongest part of the demo pitch to a manufacturing audience.

### Option 2 (CAD render with no annotations)

Rejected. Half-built — fails the IL guidelines that explicitly require part labels, motion arrows, OK/NOK comparisons, and two-person indicators. The structured fields on `EnforcedStep` exist precisely so these annotations can be drawn; not drawing them wastes the upstream work.

### Option 3 (Hybrid CAD + Gemini image-to-image)

Rejected. Retains a per-step Gemini cost and the "Gemini guesses some details" failure mode while adding two-stage complexity. Worst of both worlds.

## Dispatch contract (cross-cutting principle)

This ADR formalizes a contract that ADR-0001 introduced and that future ADRs may extend:

> **Agents that need to adapt their behavior to CAD-aware inputs dispatch on the presence of `state.extractedSource.structuredMetadata`. They do not branch on input MIME type, file extension, or domain selection.**

This keeps the pipeline input-agnostic at its boundaries: any future input type (`.pptx`, video walkthroughs, AR scans) that produces `structuredMetadata` automatically gets the CAD-class behavior; any input type that produces only `frames[]` automatically gets the document-class behavior. No agent needs to be modified when input types are added.

Agents currently expected to dispatch on `structuredMetadata`:
- Agent 1 (Source Adapter) — produces it (ADR-0001)
- Agent 2 (Vision Analyzer) — trimmed CAD prompt; consumes consecutive keyframe pairs (decision captured in CONTEXT.md, no separate ADR — direct application of this contract)
- Agent 7 (Illustration Renderer) — consumes it (this ADR)

Agents likely to dispatch on it in future ADRs:
- Agent 3 (Instruction Composer) — grounds part references against the catalog
- Agent 5 (Quality Reviewer) — cross-validates parts list against CAD ground truth
