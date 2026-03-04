# Guid -- Design Guidelines

> Visual language and component rules for the General Unified Industrialization Dashboard.
> Inspired by Vercel and Linear: minimal, fast, monochrome with indigo/violet accents.

**Last Updated:** 2026-03-04

---

## 1. Visual Tone & Philosophy

| Principle | Description |
|-----------|-------------|
| Content-first | Every element earns its space. No decorative filler. |
| Information density without overwhelm | Show data, not chrome. Use progressive disclosure to manage complexity. |
| Trust through transparency | A visible pipeline equals trust. Users watch each agent work in real time. |
| Engineered feel | Clean geometry, monospace numbers, precise spacing -- built for industrial engineers and technical writers. |
| Professional restraint | No bouncy animations, no playful illustrations, no emoji. Calm confidence. |

---

## 2. Color Palette

### Primary Accent -- Indigo/Violet

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| Primary | `#4F46E5` | `indigo-600` | CTAs, active states, links, pipeline progress |
| Primary hover | `#4338CA` | `indigo-700` | Hover states on primary elements |
| Primary subtle (light) | `#EEF2FF` | `indigo-50` | Tinted backgrounds, selected rows |
| Primary subtle (dark) | `#1E1B4B` | `indigo-950` | Tinted backgrounds in dark mode |
| Accent alt | `#7C3AED` | `violet-600` | Secondary accent where differentiation from primary is needed |

### Neutral Grays

| Token | Light | Dark | Tailwind (light / dark) |
|-------|-------|------|-------------------------|
| Background | `#FFFFFF` | `#020617` | `white` / `slate-950` |
| Surface | `#F8FAFC` | `#0F172A` | `slate-50` / `slate-900` |
| Border | `#E2E8F0` | `#1E293B` | `slate-200` / `slate-800` |
| Text primary | `#0F172A` | `#F8FAFC` | `slate-900` / `slate-50` |
| Text secondary | `#64748B` | `#94A3B8` | `slate-500` / `slate-400` |
| Text muted | `#94A3B8` | `#64748B` | `slate-400` / `slate-500` |

### Semantic Colors (Pipeline States)

| State | Color | Hex | Tailwind |
|-------|-------|-----|----------|
| Idle / Pending | Gray | `#CBD5E1` | `slate-300` |
| Active / Running | Indigo | `#6366F1` | `indigo-500` |
| Complete / Success | Green | `#10B981` | `emerald-500` |
| Error / Failed | Red | `#F43F5E` | `rose-500` |
| Warning / Revise | Amber | `#F59E0B` | `amber-500` |
| Hold | Orange | `#F97316` | `orange-500` |

### Agent-Specific Colors

Each agent receives a subtle color accent used for its pipeline card border-left and icon tint.

| # | Agent | Color | Tailwind |
|---|-------|-------|----------|
| 1 | Document Extractor | Slate | `slate-500` |
| 2 | Vision Analyzer | Blue | `blue-500` |
| 3 | Instruction Composer | Violet | `violet-500` |
| 4 | Guideline Enforcer | Indigo | `indigo-500` |
| 5 | Quality Reviewer | Emerald | `emerald-500` |
| 6 | Safety Reviewer | Amber | `amber-500` |
| 7 | Illustration Generator | Fuchsia | `fuchsia-500` |
| 8 | XML Assembler | Cyan | `cyan-500` |

---

## 3. Typography

| Element | Font | Size | Weight | Line Height | Tailwind |
|---------|------|------|--------|-------------|----------|
| Page title | Geist Sans / Inter / system | 24px | 600 | 1.25 | `text-2xl font-semibold leading-tight` |
| Section heading | Same stack | 18px | 600 | 1.25 | `text-lg font-semibold leading-tight` |
| Body | Same stack | 14px | 400 | 1.625 | `text-sm leading-relaxed` |
| Labels | Same stack | 14px | 500 | 1.5 | `text-sm font-medium` |
| Secondary / captions | Same stack | 12px | 400 | 1.5 | `text-xs` |
| Code / XML / costs | JetBrains Mono / system mono | 13px | 400 | 1.5 | `font-mono text-[13px]` |

**Rules:**

- Never use more than two font weights within a single section.
- Bold (700) is reserved for rare emphasis only -- prefer semibold (600).
- All monetary values and token counts use `font-mono`.

---

## 4. Spacing System

Base unit: **4px**

| Token | Value | Tailwind |
|-------|-------|----------|
| 1 | 4px | `p-1`, `gap-1` |
| 2 | 8px | `p-2`, `gap-2` |
| 3 | 12px | `p-3`, `gap-3` |
| 4 | 16px | `p-4`, `gap-4` |
| 5 | 20px | `p-5`, `gap-5` |
| 6 | 24px | `p-6`, `gap-6` |
| 8 | 32px | `p-8`, `gap-8` |
| 10 | 40px | `p-10`, `gap-10` |
| 12 | 48px | `p-12`, `gap-12` |
| 16 | 64px | `p-16`, `gap-16` |

| Context | Spacing |
|---------|---------|
| Component internal padding | `p-4` (16px) |
| Card padding | `p-6` (24px) |
| Section gaps | `gap-6` or `gap-8` |
| Page horizontal padding | `px-4` mobile, `px-8` desktop |

---

## 5. Layout

| Property | Value | Tailwind |
|----------|-------|----------|
| Max content width | 1280px | `max-w-7xl mx-auto` |
| Breakpoint sm | 640px | `sm:` |
| Breakpoint md | 768px | `md:` |
| Breakpoint lg | 1024px | `lg:` |
| Breakpoint xl | 1280px | `xl:` |

### Page Layouts

| Page | Layout |
|------|--------|
| Upload (`/`) | Centered single-column, `max-w-xl mx-auto` |
| Pipeline Monitor | Responsive grid of agent cards: 1 col (mobile) / 2 col `md:` / 4 col `lg:` |
| Output Review | Two-column `lg:` (XML viewer + sidebar), stacked on mobile |

---

## 6. Components (shadcn/ui -- New York Style)

### Shared Properties

| Property | Value | Tailwind |
|----------|-------|----------|
| Border radius (standard) | 6px | `rounded-md` |
| Border radius (cards) | 8px | `rounded-lg` |
| Border | 1px solid | `border border-slate-200 dark:border-slate-800` |
| Shadow | Small, subtle | `shadow-sm` |

### Component Specs

| Component | Spec |
|-----------|------|
| **Button (Primary)** | `bg-indigo-600 text-white hover:bg-indigo-700 h-10 px-4 rounded-md font-medium text-sm` |
| **Button (Secondary)** | `border border-slate-200 bg-white hover:bg-slate-50 h-10 px-4 rounded-md text-sm` |
| **Button (Ghost)** | `bg-transparent hover:bg-slate-100 h-10 px-4 rounded-md text-sm` |
| **Card** | `bg-white dark:bg-slate-900 border rounded-lg p-6 shadow-sm` |
| **Badge** | Inline pill with semantic background color, `text-xs font-medium px-2 py-0.5 rounded-full` |
| **Progress bar** | `h-1` or `h-2`, `rounded-full`, indigo fill on slate-200 track |
| **Input** | `h-10 border rounded-md px-3 text-sm ring-indigo-500 focus:ring-2` |
| **Tabs** | Underline style for page-level navigation |
| **Drawer / Sheet** | Slides from right for agent detail view, `w-[480px]` max |

---

## 7. Pipeline-Specific Design

### Agent Card States

| State | Visual Treatment |
|-------|------------------|
| **Idle** | Muted card. Gray icon, dashed border (`border-dashed border-slate-300`). Opacity reduced (`opacity-60`). |
| **Active** | Elevated card. Solid indigo left border (`border-l-4 border-l-indigo-500`). Pulsing status dot. Live progress text in `text-xs text-slate-500`. |
| **Complete** | Green checkmark icon. Duration and cost shown as badges. Solid border. Full opacity. |
| **Error** | Rose left border (`border-l-4 border-l-rose-500`). Error icon. Inline error message in `text-xs text-rose-600`. |

### Progress Indicators

| Element | Design |
|---------|--------|
| Pipeline overview | Horizontal connected-dot stepper. Active dot pulses. Completed dots filled emerald. Line between dots shows progress. |
| Agent progress | Thin progress bar (`h-1`) inside the agent card below the header. |
| Page-level progress | Text: "Page 12 of 24" with a small circular progress ring beside it. |

### Cost Ticker

- Position: Top-right of the pipeline monitor header.
- Font: `font-mono text-sm`.
- Format: `$0.87` (always 2 decimal places).
- Update animation: Brief color flash (`text-indigo-500`) on value change, fading back to default in 300ms.

### Progressive Disclosure

- **Default view:** Clean card with agent name, status icon, duration badge, cost badge.
- **Expanded view (click):** Drawer/sheet slides from right showing full detail -- prompt sent, raw response, token count, timing breakdown, model used.

---

## 8. Animation & Transitions

| Context | Duration | Easing |
|---------|----------|--------|
| Micro-interactions (hover, focus) | 150ms | `ease-out` |
| State changes (card activation) | 200ms | `ease-out` |
| Drawers, modals, overlays | 300ms | `ease-out` (enter), `ease-in` (exit) |

| Animation | Implementation |
|-----------|----------------|
| Active agent pulse | `animate-pulse` on a small indigo dot (`w-2 h-2 rounded-full bg-indigo-500`) |
| Card activation | `transition-all duration-200` with subtle `scale-[1.01]` and border color change |
| Progress bar fill | `transition-[width] duration-300 ease-out` |
| Skeleton loading | `animate-pulse` on `bg-slate-200 dark:bg-slate-700 rounded-md` blocks |
| Cost ticker update | `transition-colors duration-300` flash to `text-indigo-500` then back |

**Rule:** Never animate anything purely for decoration. Every animation must indicate a state change or provide feedback.

---

## 9. Light / Dark Mode

- **Default:** Light mode.
- **Toggle:** Sun/moon icon button in the page header.
- **Detection:** Respect `prefers-color-scheme` on first visit.
- **Implementation:** Tailwind `dark:` variant. All theme colors defined as CSS custom properties in `globals.css`.

All color tokens above include both light and dark values. Components must always specify both variants:

```
bg-white dark:bg-slate-900
text-slate-900 dark:text-slate-50
border-slate-200 dark:border-slate-800
```

---

## 10. Iconography

**Library:** Lucide React (ships with shadcn/ui).

| Context | Size | Tailwind |
|---------|------|----------|
| Inline (with text) | 16px | `w-4 h-4` |
| Buttons | 20px | `w-5 h-5` |
| Card headers | 24px | `w-6 h-6` |

**Stroke width:** 1.5 (Lucide default).

### Agent Icons

| # | Agent | Lucide Icon |
|---|-------|-------------|
| 1 | Document Extractor | `FileText` |
| 2 | Vision Analyzer | `Eye` |
| 3 | Instruction Composer | `Pen` |
| 4 | Guideline Enforcer | `Shield` |
| 5 | Quality Reviewer | `CheckCircle` |
| 6 | Safety Reviewer | `AlertTriangle` |
| 7 | Illustration Generator | `Image` |
| 8 | XML Assembler | `Code` |

---

## 11. Do's and Don'ts

### Do

- Use consistent spacing tokens from the 4px base scale.
- Show skeleton/loading states for every async content area.
- Use semantic colors for pipeline states (emerald = success, rose = error, amber = warning).
- Keep text concise -- labels, not sentences.
- Use `font-mono` for XML, code blocks, and monetary values.
- Provide visual feedback for all interactive elements (hover, focus, active).
- Maintain a minimum 4.5:1 contrast ratio (WCAG AA).
- Pair color with icons or text -- never rely on color alone to convey meaning.
- Stick to `rounded-md` (standard) and `rounded-lg` (cards) -- do not mix other radii.

### Don't

- Add decorative elements that serve no functional purpose.
- Use more than two font weights within a single component or section.
- Animate anything that does not indicate a state change.
- Display raw JSON to users -- always format structured data.
- Put long text in tooltips -- use a drawer or inline expansion instead.
- Use heavy box shadows -- `shadow-sm` is the maximum.
- Introduce colors outside the defined palette without updating this document.
- Use emoji or playful iconography -- maintain the engineered, professional tone.
