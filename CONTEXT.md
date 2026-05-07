# CONTEXT.md

Domain language for Guid (General Unified Industrialization Dashboard). Updated as terms are resolved through design conversations.

## Glossary

### Assembly *(noun, CAD-specific)*

A hierarchical aggregate of parts and sub-assemblies — the structural container that an engineer authors in a CAD tool. In NX/SolidWorks/CATIA, this is a top-level file (`.asm`, `.SLDASM`, `.CATProduct`) that references constituent part files.

**In Guid, an Assembly is the input artifact for the 3D-model pipeline.** The user exports their NX assembly as STEP (AP242 preferred); the resulting `.STP` file is what we ingest.

> **Don't conflate with "assembly" as a verb.** The existing PDF pipeline uses "assembly" colloquially to mean *the act of putting parts together*. From now on:
> - When we mean the noun (the CAD container), capitalize: **Assembly**.
> - When we mean the verb / activity, use **build** or **assembly process** explicitly.

### Component

An *instance* of a Part within an Assembly tree. The same underlying Part may appear as multiple Components — e.g., one `M6-Hex-Bolt.prt` Part referenced by four Components in a chassis Assembly. Each Component has its own transform (position, rotation) inside the Assembly.

When the pipeline produces a parts-list with quantities, the quantity is the count of Components that reference the same Part.

### Part *(CAD-specific)*

A single, indivisible solid body — a leaf node in the Assembly tree. In NX, this is a `.prt` file containing one Part (NX also uses `.prt` for assemblies, distinguished by content). In STEP, Parts appear as `PRODUCT_DEFINITION` entities at the bottom of the assembly hierarchy.

> **Collision with existing usage.** The PDF pipeline's `PartReference` type (`{ partNumber, partName, quantity }`) is used for any piece named in an IKEA-style manual — e.g., "wooden dowel A × 4". The CAD-pipeline meaning is more strict: a Part is exactly one CAD body. The data shape is the same; only the *source* differs (vision-extracted from page images vs. deterministically parsed from STEP).
>
> When designing the 3D ingest agent, keep the existing `PartReference` shape but populate it from STEP entities. Don't introduce a parallel type unless a real difference emerges.

### STEP *(file format)*

ISO 10303 — a neutral CAD interchange format. AP214 and AP242 are the two application protocols typically used for mechanical assemblies. AP242 preserves PMI annotations; AP214 doesn't. Open-source parseable via OpenCascade. **The v1 input format for the 3D pipeline.**

### Machine *(colloquial)*

The final, fully-assembled product the user is building — the top-level Assembly viewed from outside. Used in user-facing copy (e.g., "build your machine"). Not a formal type in the codebase.

### Explode view *(CAD)*

A visualization mode in which the parts of an Assembly are spatially displaced along their assembly axes, revealing the build sequence. In NX/SolidWorks/CATIA, an Explode View is an authored artifact (the engineer chooses what gets displaced, in what order, by how much).

In Guid's 3D pipeline, an Explode View is the **canonical source of build-sequence information** — the engineer's authored ordering. We accept it as an exported MP4 video or JT animation file uploaded alongside the STEP. Frame-extracted images from the explode animation feed directly into the existing Vision Analyzer (Agent 2), parallel to how PDF pages are consumed today.

### Build sequence

The ordered list of assembly steps produced by the pipeline. **Authored** by the engineer (encoded in an Explode View), not derived from STEP geometry. If the user uploads only a STEP without an Explode View, the pipeline must either degrade (low-confidence inference) or refuse — see the v1 fallback policy.

### Demo asset

The hand-curated 3D Assembly that ships with the repo for `DEMO_MODE=true`. Built in Fusion 360 (or FreeCAD), 10-15 Parts, with an authored Explode View. Stored at `storage/demo-assets/v1-demo/`. Distinct from the broader **test corpus** of public-domain STEP files used to exercise the STEP-parse code paths.

### Source Adapter *(replaces "Document Extractor")*

Agent 1 in the pipeline. Polymorphic — its job is to convert *any* supported input format into the canonical downstream shape (`ExtractedSource`). Sub-implementations live under `src/lib/agents/source-adapter/{pdf,docx,cad,...}.ts`. Adding a new input type (PPT, video walkthrough, AR scan) is a matter of dropping a new sub-implementation in that folder and registering it; the rest of the pipeline does not change.

The agent's display name in the pipeline UI is **"Source Adapter"**; the type name is `SourceAdapter`. The previous name "Document Extractor" was tied to PDF/DOCX framing and is retired.

### ExtractedSource *(canonical Agent-1 output)*

The data structure produced by Source Adapter, regardless of input type. Two channels:

- **`frames: Frame[]`** — always present. The ordered images that Agent 2 (Vision Analyzer) will analyze. PDF pages, DOCX images, explode-video frames, or multi-view renders of an Assembly all flow through this channel.
- **`structuredMetadata?`** — present only when the source carries deterministic, machine-readable structure (currently: CAD-aware sources). Includes the parts catalog, assembly tree, sequence source, and confidence. Downstream agents that can use it (notably Agent 3 for grounding part identity) pick it up; agents that can't, ignore it.

This shape is the contract that makes the pipeline input-agnostic. Adding a new input type means producing an `ExtractedSource`; no agent past 1 needs to know what the source was.

### Frame *(replaces "Page")*

A single ordered image inside `ExtractedSource.frames`. Naming generalized from "page" because frames now come from sources that aren't documents. The on-disk path, dimensions, and MIME type carry forward from the existing `ExtractedPage` shape.

### Illustration Renderer *(replaces "Illustration Generator")*

Agent 7 in the pipeline. Polymorphic — dispatches on whether `structuredMetadata` is present on the source:

- **Without `structuredMetadata`** (PDF/DOCX inputs): prompts Gemini Flash Image to generate a fresh isometric illustration per step. Existing behavior, ~$0.04/step.
- **With `structuredMetadata`** (CAD inputs): renders the Assembly directly from CAD geometry per step using three.js + headless-gl, with active Parts at full opacity and installed Parts faded; layers motion arrows, part labels, and OK/NOK comparisons via deterministic SVG/canvas overlay code reading the structured annotation fields on `EnforcedStep`. ~$0/step.

Sub-implementations live under `src/lib/agents/illustration-renderer/{gemini,cad,...}.ts`. The output type (`GeneratedIllustration`) is identical for both paths.

### Dispatch contract *(cross-cutting principle)*

Agents that need to adapt their behavior to CAD-aware inputs dispatch on **the presence of `state.extractedSource.structuredMetadata`** — not on input MIME type, file extension, or domain selection. This keeps the pipeline input-agnostic at its boundaries: any future input type that emits `structuredMetadata` automatically gets the CAD-class behavior. See ADR-0002 for the formalization.

Agents currently dispatching on this contract:
- Agent 1 (Source Adapter) — produces `structuredMetadata` for CAD inputs
- Agent 2 (Vision Analyzer) — trimmed CAD prompt; consumes consecutive frame pairs for explode-video inputs
- Agent 7 (Illustration Renderer) — CAD render + overlays vs Gemini Flash Image

### Keyframe

A single frame in `ExtractedSource.frames` representing a moment when a Component finishes moving in the explode-view animation. The CAD sub-implementation of Source Adapter detects keyframes deterministically by frame-difference thresholding on the explode MP4: when motion stalls between successive frames, the latter is emitted as a keyframe. One keyframe per assembly step. Agent 2's CAD path consumes consecutive keyframe pairs `(keyframe[n-1], keyframe[n])` to identify the action verb for step `n`.

## Out of scope

- **Manufacturing instructions** — the pipeline does not produce milling/drilling/turning instructions for individual Parts. Only assembly instructions (joining pre-existing Parts).
- **Native NX (.prt) parsing** — deferred to v2. The v1 expects users to export their NX Assembly as STEP first.
