# ADR-0001: Single polymorphic Source Adapter for multi-format inputs

- **Status:** Accepted
- **Date:** 2026-05-07
- **Deciders:** maheshsuresh.ms17

## Context

Phase 0 of Guid established Agent 1 as `DocumentExtractor`, polymorphic over PDF and DOCX inputs (`pdftoppm` + `mammoth`, with optional Docling). Both formats produce the same downstream shape: an ordered list of rasterized page images, optionally accompanied by extracted text/Markdown.

Phase 6 (this branch, `feat/3d-model-input`) adds a fundamentally different input type: STEP files (CAD assemblies), optionally accompanied by an explode-view video. STEP carries data the existing flow does not: a deterministic parts catalog, a hierarchical assembly tree, exact instance counts, per-part bounding boxes, and B-rep geometry. The explode video provides an authored build sequence; without one, the pipeline must fall back to LLM-based sequence inference from geometry.

Two architectures were considered:

1. **Two parallel ingest agents.** Keep `DocumentExtractor` for PDF/DOCX. Add a separate `ThreeDExtractor` for STEP. Both produce `RawPageExtraction[]` and converge at Agent 3 (Instruction Composer).
2. **One polymorphic Source Adapter.** Generalize Agent 1 to dispatch internally on input type. Output a unified `ExtractedSource` shape. Add new input types by adding new sub-implementations.

## Decision

**Adopt option 2: a single polymorphic `SourceAdapter` agent.**

Concretely:

- Agent 1 is renamed from `DocumentExtractor` to `SourceAdapter`. Display name in the pipeline UI is **"Source Adapter"**.
- Sub-implementations live under `src/lib/agents/source-adapter/{pdf,docx,cad,...}.ts`. Each exports a `SourceAdapterImpl` that produces `ExtractedSource`. The top-level `source-adapter/index.ts` dispatches by input type.
- Output shape:
  ```ts
  interface ExtractedSource {
    frames: Frame[];                    // always present — fed to Agent 2
    documentMetadata: { ... };
    structuredMetadata?: {              // CAD-aware sources only
      partsCatalog: StructuredPartRef[];
      assemblyTree: AssemblyNode;
      sourceFormat: "step" | "step+explode-video";
      sequenceSource: "explode-video" | "geometry-inferred";
      sequenceConfidence: number;
    };
  }
  ```
- The convergence point between input types is **Agent 2's input** (frames are frames, regardless of source). The `structuredMetadata` side channel reaches Agent 3+ unchanged for CAD-aware sources; PDF/DOCX paths leave it `undefined`.
- Adding a new input type (e.g., `.pptx`, video walkthroughs, AR scans) is a matter of dropping a new sub-implementation under `source-adapter/` and registering it in the dispatcher. No agent past 1 needs to be modified.

## Consequences

**Positive**

- The pipeline is input-agnostic from Agent 2 onward. Agents 3-8 do not branch on source type; they operate on `Frame[]` + (optional) `structuredMetadata`.
- The "8 specialized agents" branding survives. Pipeline UI still shows 8 cards.
- The orchestrator does not fork by input type — `runPipeline()` is unchanged.
- Future input types are pluggable; adding one is a localized change.
- The existing `DocumentExtractor` polymorphism over PDF/DOCX is the same pattern at smaller scale, validating it.
- Agent 3 can opportunistically prefer `structuredMetadata.partsCatalog` over deduced part references when present — a quality win for CAD inputs without complicating the schema for non-CAD inputs.

**Negative**

- The CAD sub-implementation is meaningfully heavier than its PDF/DOCX siblings: STEP parsing (occt-import-js / WASM), 3D rendering (three.js + headless-gl), optional video frame extraction (ffmpeg), optional sequence inference (Gemini Pro). The single agent's responsibility surface is wider than before.
- The renaming touches code, types, DB enum values, telemetry strings, and prior docs. One-time cost.

**Neutral**

- The decision is not load-bearing for the demo path itself — the demo asset uses the explode-video high-confidence flow, which would work under either architecture. The decision matters most for code health as input types proliferate.

## Alternatives considered

### Two parallel ingest agents

Rejected because:

- The actual merge point is Agent 2's input (frames), not Agent 3's. A separate top-level agent overstates the divergence between paths.
- Breaks the existing pattern in `DocumentExtractor`, which is already polymorphic over PDF/DOCX.
- Forces orchestrator branching by input type.
- "Pipeline has 9 agents but only 8 of them run on any given job" is a worse story than "pipeline has 8 agents, Agent 1 adapts."
- Each future input type would force another top-level agent.

The argument *for* this option — file-level separation of concerns — is real but addressable via modular sub-files under one agent. We get the cleanliness without the orchestrator-level fork.

### Native NX (.prt) ingest in v1

Rejected for v1, deferred to v2. Native NX requires Siemens NX licensed software on the server and the NXOpen SDK (Java/C++/Python), neither of which fits the current Node.js stack. STEP export from NX is a one-click operation for users and is the universal CAD interchange format anyway.

### LLM-based sequence inference (Option A) as the primary path

Rejected as primary. Assembly sequence planning from geometry alone is a long-standing open problem; Gemini handles small assemblies (~10 parts) acceptably but degrades fast on larger machines. A wrong sequence in a management demo would be catastrophic. Used as a **fallback** for STEP-only inputs (no explode video provided), with explicit confidence flagging in the output.
