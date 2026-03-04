# Demo Rehearsal Script

> **Duration:** 5 minutes | **Audience:** VPs / decision-makers | **Goal:** Secure funding for full industrialization platform
>
> **Setup:** Laptop connected to projector, browser at `http://localhost:3000`, dark mode ON (looks better on projector). Have a PDF ready on the desktop (or use any file — demo mode ignores the actual content).

---

## Pre-Demo Checklist

- [ ] `.env.local` has `DEMO_MODE=true` (for reliable offline demo) or `GEMINI_API_KEY` set (for live demo)
- [ ] `pnpm dev` running on port 3000
- [ ] Browser at `/` with no previous jobs visible (clear DB if needed: `rm storage/guid.db && pnpm db:push`)
- [ ] Screen resolution: 1920x1080 or higher, browser zoom ~110%
- [ ] A sample PDF on your desktop for drag-and-drop (any PDF works in demo mode)

---

## Act 1: Introduction (0:00 – 0:30)

**On screen:** Landing page — clean upload interface, "AI-Powered Work Instruction Generator" heading.

**Say:**
> "Work instructions are the backbone of manufacturing — every assembly line, every technician depends on them. Today they're written manually, taking hours per document, and quality varies wildly."
>
> "What I'm about to show you is Guid — an AI-powered system that transforms any assembly document into structured, validated work instructions in under 3 minutes. Let me show you."

**Action:** None yet — let the audience absorb the clean UI.

---

## Act 2: Upload & Configure (0:30 – 0:45)

**Say:**
> "I'll start with this bookshelf assembly manual — 4 pages, typical of what our teams process daily."

**Action:**
1. **Drag the PDF** from desktop onto the dropzone (the green confirmation appears)
2. **Select domain:** Click the dropdown, choose **"Furniture Assembly"**
3. Quality threshold: leave at **85** (default)

**Say:**
> "I've selected the domain — this tailors the AI's vocabulary and safety checks. Quality threshold is 85 out of 100 — anything below that triggers automatic revision."

**Action:**
4. **Click "Generate Work Instructions"** — you'll be redirected to the pipeline monitor.

---

## Act 3: Pipeline Monitor (0:45 – 3:15)

> **Timing note:** In demo mode the pipeline runs ~35 seconds. In live mode it takes ~2-3 minutes. Adjust your narration pace accordingly.

**On screen:** Pipeline monitor with 8 agent cards in a grid, elapsed timer ticking, cost ticker at $0.00.

### Agent 1: Document Extractor (~1s)
**Say:** "First, the system extracts every page from the PDF as high-resolution images."

**Watch:** Card lights up slate, progress bar fills, completes quickly. Cost stays $0.00 — this is pure code, no AI cost.

### Agent 2: Vision Analyzer (~8s)
**Say:** "Now our vision AI examines each page — identifying parts, tools, arrows, fasteners, spatial relationships. It's reading the document like an experienced technician would."

**Watch:** Progress shows "Analyzing page 1 of 4... page 2 of 4..." — the blue card pulses. Cost ticks to ~$0.06.

**Point out:** "Notice the cost ticker — we're tracking every API call. This page-by-page analysis costs about 6 cents."

### Agent 3: Instruction Composer (~3s)
**Say:** "The composer merges all those observations into coherent step-by-step instructions — proper sequencing, phase boundaries, transition notes."

**Watch:** Violet card activates. Cost ticks to ~$0.08.

### Agent 4: Guideline Enforcer (~4s)
**Say:** "This is where it gets interesting. The enforcer applies 38 manufacturing writing rules — verb-first sentences, standardized part references, sentence length limits. Every instruction is rewritten to comply."

**Watch:** Indigo card. Cost to ~$0.11.

**Point out:** "There are only 16 approved verbs in our standard — Insert, Attach, Tighten, Align, and so on. The AI enforces this automatically."

### Agents 5+6: Quality & Safety Review (~5s, parallel)
**Say:** "Now two reviewers run in parallel — one checking instruction quality, one checking safety compliance. Both use our more powerful Pro model."

**Watch:** Emerald and amber cards activate simultaneously. Cost jumps to ~$0.23.

**Point out:** "These run in parallel — no wasted time. The quality reviewer scores against our 38 guidelines. The safety reviewer checks for missing warnings, heavy-lift callouts, tip-over risks."

### Agent 7: Illustration Generator (~12s)
**Say:** "And here's the visual layer — the AI generates a custom isometric illustration for every single step. Parts are labeled, active components are highlighted, motion arrows show assembly direction."

**Watch:** Fuchsia card, progress showing "Generating illustration for step 1... step 2..." Cost climbs to ~$0.47.

**Point out:** "This is the most expensive agent — about 4 cents per illustration. Still a fraction of what a technical illustrator would charge."

### Agent 8: XML Assembler (~1s)
**Say:** "Finally, everything is assembled into our canonical XML format — structured, machine-readable, ready for any downstream system."

**Watch:** Cyan card completes instantly. Completion banner appears: **91/100 — approved**.

**Say:**
> "91 out of 100 quality score — approved on the first pass. Total cost: 47 cents. Total time: [glance at timer]. Let's look at the output."

**Action:** Click **"View Output"** button.

---

## Act 4: Output Review (3:15 – 4:45)

**On screen:** Output review page with summary cards and tabs.

### Summary Cards (15s)
**Point out the four cards:**
> "Quality score: 91 — approved. Safety level: medium — it detected a two-person lift requirement. 6 steps across 3 phases. Total cost: 47 cents."

### XML Tab (20s)
**Say:** "The primary output is structured XML. Every step has the instruction text, part references, safety callouts, illustration references, and confidence scores. This can feed directly into an MES, a training system, or a printed work card."

**Scroll briefly** through the XML to show structure.

### Illustrations Tab (20s)
**Action:** Click **"Illustrations"** tab.

**Say:** "Each step has a custom illustration. Isometric view, labeled parts, motion arrows showing assembly direction."

**Click one illustration** to open the lightbox. Point out the part labels (A, B, C...).

> "These are generated on-the-fly — no clip art library, no manual drawing. Every illustration is unique to the instruction."

### Quality Tab (15s)
**Action:** Click **"Quality Report"** tab.

**Say:** "The quality report shows exactly what was checked. Two minor suggestions — both informational. No errors, no warnings. The system tells you precisely where it's confident and where it flagged a potential improvement."

### Cost Tab (10s)
**Action:** Click **"Cost Breakdown"** tab.

**Say:** "Full cost transparency. Every agent, every model call, every token. Under 50 cents for a complete work instruction set with illustrations."

---

## Act 5: Close (4:45 – 5:00)

**Action:** Click **"Export XML"** — the download triggers.

**Say:**
> "That's it. A PDF goes in, and in under 3 minutes, you get validated, illustrated, structured work instructions — for less than a dollar."
>
> "This is just the first product. The full General Unified Industrialization Dashboard will handle process control, equipment monitoring, and continuous improvement — all powered by the same AI pipeline architecture."
>
> "I'd like to discuss funding for the full platform. Questions?"

---

## Fallback Notes

| Scenario | Action |
|----------|--------|
| **No internet** | Use `DEMO_MODE=true` — works fully offline |
| **API rate limit** | Switch to demo mode mid-presentation |
| **Pipeline fails** | Say "Let me show you a completed result" — navigate directly to `/output/{jobId}` of a previous run |
| **Quality score < 85** | The system auto-revises (up to 2 loops). Say "Watch — it detected issues and is automatically revising." |
| **Audience asks about cost** | Point to cost breakdown tab: Flash model = $0.15/M tokens, Pro = $1.25/M, images = $0.04 each |
| **"How long for a 24-page doc?"** | ~2-3 minutes live, scales linearly with page count. Vision analysis is the bottleneck. |

---

## Timing Reference (Demo Mode)

| Phase | Clock | Duration |
|-------|-------|----------|
| Intro narration | 0:00 | 30s |
| Upload + configure | 0:30 | 15s |
| Pipeline runs | 0:45 | ~35s (demo) / ~2.5 min (live) |
| Output review | ~1:20 (demo) / ~3:15 (live) | 90s |
| Close | ~2:50 (demo) / ~4:45 (live) | 15s |
| **Total** | | **~3 min (demo) / ~5 min (live)** |
