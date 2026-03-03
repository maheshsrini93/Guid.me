# CLAUDE.md — Guid (guid.how)

## Project Overview
**Guid** — product guides for everything. Step-by-step assembly, setup, troubleshooting, and maintenance guides for any product from any brand. Built with Next.js, currently seeded with IKEA product data via the scraper (`/Users/hashincloud/Ikea Scraper/`). Shares a **Supabase PostgreSQL** database with the scraper.

## Task & Documentation Workflow

**After completing any task from `docs/tasks.md`, immediately:**
1. Mark the task as `[x]` in `docs/tasks.md`
2. Add a dated entry to `docs/changelog.md` describing what was done

**Project documentation lives in `docs/`:**
| File | Purpose |
|------|---------|
| `docs/master-plan.md` | Vision, personas, roadmap, business model, success metrics |
| `docs/implementation-plan.md` | Technical architecture, phase-by-phase build plan, database models |
| `docs/design-guidelines.md` | Colors, typography, components, illustration style, badges |
| `docs/user-journeys.md` | Persona flows, edge cases, cross-journey patterns |
| `docs/tasks.md` | All tasks derived from the above docs — the implementation checklist |
| `docs/changelog.md` | Log of all doc changes — newest first |

When making changes that affect the project plan (new features, changed approaches, removed scope), update all affected docs and log the change in `docs/changelog.md`.

## UI/UX Development Workflow

**When doing ANY UI/UX work** (creating new pages/components, editing existing UI, reviewing designs, fixing layout/style issues), follow this workflow using the **UI/UX Pro Max** skill:

### Step 1: Read Design Guidelines First
Before writing any UI code, read `docs/design-guidelines.md` for the project's design system: color tokens, typography (IBM Plex Sans + JetBrains Mono), spacing, component specs, accessibility requirements, and the guide viewer three-column layout spec.

### Step 2: Run UI/UX Pro Max Design System Check
For new features or significant UI changes, generate recommendations:
```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<feature description keywords>" --design-system -p "Guid"
```

### Step 3: Run Domain-Specific Searches (as needed)
Get targeted guidance for specific concerns:
```bash
# Accessibility review
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "accessibility contrast focus" --domain ux

# Animation best practices
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "animation loading skeleton" --domain ux

# Typography guidance
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "technical documentation" --domain typography

# shadcn/ui component patterns
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<component name>" --stack shadcn

# Next.js implementation patterns
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<feature>" --stack nextjs
```

### Step 4: Pre-Delivery Checklist
Before delivering any UI code, verify:
- [ ] No emojis used as icons (use Lucide SVG icons)
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states with smooth transitions (200ms ease-out)
- [ ] Light mode: text contrast meets 4.5:1 minimum (WCAG AA)
- [ ] Dark mode: all tokens applied, illustrations have border on white bg
- [ ] Focus-visible states on all interactive elements (2px amber ring)
- [ ] `prefers-reduced-motion` respected (no animations when reduced)
- [ ] Touch targets meet 44px minimum
- [ ] Responsive at 375px, 640px, 768px, 1024px, 1280px
- [ ] No horizontal scroll on mobile
- [ ] All icon-only buttons have `aria-label`
- [ ] Form inputs have associated `<label>` elements
- [ ] Colors never used as sole indicator (always paired with icon/text)
- [ ] Uses project design tokens (`bg-primary`, `text-muted-foreground`) not hardcoded values
- [ ] Typography follows type scale from design-guidelines.md (IBM Plex Sans body, JetBrains Mono for technical)

### When to Use UI/UX Pro Max
| Scenario | Required? | What to Run |
|----------|-----------|-------------|
| **New page or feature** | Yes | Full `--design-system` + relevant domain searches |
| **Editing existing component** | Yes (for non-trivial changes) | Domain search for the specific area (ux, typography, etc.) |
| **Bug fix (visual/layout)** | Recommended | Quick domain search for the issue area |
| **Code review of UI changes** | Yes | Run pre-delivery checklist |
| **Non-UI work (API, DB, backend)** | No | Skip entirely |

## Commands

```bash
# Dev server
npm run dev

# Build
npm run build

# Prisma
npx prisma generate        # Regenerate client after schema changes
npx prisma db push          # Push schema changes to Supabase
npx prisma db pull          # Introspect existing tables from Supabase
npx tsx prisma/seed.ts      # Seed admin user

# Note: Prisma introspection/migrations MUST use DIRECT_URL (port 5432), not pgbouncer (6543)
```

## Architecture

**Stack:** Next.js 16, TypeScript, Tailwind v4, shadcn/ui, Prisma v6, NextAuth v5 (beta)
**Fonts:** IBM Plex Sans (primary sans) + JetBrains Mono (technical/mono) — loaded via `next/font/google`

**Database:** Supabase PostgreSQL (shared with scraper)
- `DATABASE_URL` (port 6543) = pgbouncer, used at runtime
- `DIRECT_URL` (port 5432) = direct connection, used by Prisma CLI

**Prisma:** v6 with `prisma-client-js` generator (NOT v7 `prisma-client` — that requires ESM and doesn't support `datasources` option)
- Schema: `prisma/schema.prisma`
- Client: `@prisma/client` (standard import)
- Singleton: `src/lib/prisma.ts`

**Auth:** NextAuth v5 (beta) with credentials provider
- Config: `src/lib/auth.ts`
- Route: `src/app/api/auth/[...nextauth]/route.ts`
- Registration: `src/app/api/auth/register/route.ts`
- Admin: `admin@ikea-guide.local` / `admin123`
- JWT sessions, `/studio/*` routes are admin-only via `src/app/studio/layout.tsx`
- Type casts needed for `session.user.role` — use `as unknown as { role: string }` pattern

**Images:** `next/image` with `remotePatterns` configured for `**.ikea.com` and `**.ikeaimg.com`
- `ImageWithFallback` — client component with loading/error states
- `ProductImageGallery` — clickable thumbnail gallery for product detail

## Routes

### Implemented

| Route | Type | Description |
|-------|------|-------------|
| `/` | Dynamic | Landing page (guide-centric: "Find step-by-step instructions for any product") |
| `/products` | Dynamic | Product grid with search, filters, sort & pagination (cards show guide availability status) |
| `/products/[articleNumber]` | Dynamic | **Guide-first:** shows guide viewer if published guide exists, falls back to product detail page otherwise |
| `/products/[articleNumber]/details` | Dynamic | Full product detail page (images, docs, ratings, metadata) — always accessible, linked from guide viewer's Product Info Card |
| `/login` | Client | Login form |
| `/register` | Client | Registration form |
| `/profile` | Auth-gated | User profile with saved products |
| `/studio` | Admin-only | Dashboard with stats |
| `/studio/products` | Admin-only | Product catalog with assembly PDF filter |
| `/studio/guides` | Admin-only | Assembly guides list |
| `/studio/guides/new` | Admin-only | Create new assembly guide |
| `/studio/guides/[id]` | Admin-only | Edit guide details & steps |

### Planned (Phase 1: AI Guide Generation)

| Route | Type | Description |
|-------|------|-------------|
| `/studio/ai-generate` | Admin-only | AI generation dashboard — start jobs, view queue, batch controls |
| `/studio/ai-generate/[jobId]` | Admin-only | Review single AI-generated guide vs. original PDF |
| `/studio/ai-config` | Admin-only | Prompt template management, model configuration |
| `/studio/catalog-sync` | Admin-only | Monthly catalog sync dashboard — sync history, new products, scraper health |
| `/studio/submissions` | Admin-only | Community guide submission review queue |
| `/products/[articleNumber]/submit-guide` | Auth-gated | User guide submission form — contribute assembly knowledge |

### Planned (Phase 3: AI Troubleshooting Assistant)

| Route | Type | Description |
|-------|------|-------------|
| `/chat` | Public | Standalone troubleshooting chat — user describes product + problem |
| `/products/[articleNumber]/chat` | Public | Product-specific chat — context pre-loaded |
| `/api/chat` | API | Streaming chat endpoint (SSE) |

### Planned (Phase 4: Premium Subscription)

| Route | Type | Description |
|-------|------|-------------|
| `/pricing` | Public | Plan comparison page |
| `/subscribe` | Auth-gated | Stripe Checkout redirect |
| `/account/billing` | Auth-gated | Subscription management |
| `/creators/register` | Auth-gated | Creator registration — link YouTube channel |
| `/creators/[id]` | Public | Creator profile — channel info, submitted videos |
| `/creators/submit` | Creator-only | Video submission form — submit YouTube link for a product |
| `/studio/videos` | Admin-only | Video submission review queue |

### Planned (Phase 7: Public API & Agent Ecosystem)

| Route | Type | Description |
|-------|------|-------------|
| `/api/v1/products` | API (key auth) | Product search & list |
| `/api/v1/guides/:articleNumber` | API (key auth) | Rich structured guide with per-step parts, callouts, confidence |
| `/api/v1/guides/generate` | API (pro+ key) | Submit PDF for AI guide generation (async) |
| `/api/v1/troubleshoot` | API (pro+ key) | Product troubleshooting (streaming SSE) |
| `/api/v1/search` | API (key auth) | Unified product + guide search |
| `/developers` | Public | API landing page — value prop, pricing, quick start |
| `/developers/docs` | Public | Interactive API documentation |
| `/developers/keys` | Auth-gated | API key management |
| `/developers/usage` | Auth-gated | Usage dashboard |

## Database Tables (Prisma models)

### Existing

**From scraper (read-only in this app):**
- `Product` → `products` (12,961 rows) — 38 columns including JSONB dashboard fields
- `ProductImage` → `product_images` (60,607 rows)
- `ProductDocument` → `product_documents` (11,294 rows)
- `ScrapeUrl` → `scrape_urls` (12,745 rows)

**App-owned:**
- `User` → `users` (auth, with role field)
- `Session` → `sessions` (auth)
- `SavedProduct` → `saved_products` (user bookmarks, unique per user+product)
- `AssemblyGuide` → `assembly_guides` (one-to-one with Product, has title/difficulty/tools/published)
- `AssemblyStep` → `assembly_steps` (belongs to guide, ordered by stepNumber)

### Planned (Phase 1)

- `AIGenerationJob` — tracks AI guide generation jobs (status, confidence, models used, priority, triggeredBy)
- `AIGenerationConfig` — prompt templates, model config, auto-publish thresholds (one active at a time)
- `Product` extensions — `guideStatus`, `firstDetectedAt`, `lastScrapedAt`, `isNew`, `discontinued`
- `GuideSubmission` — community guide submissions (productId, userId, textContent, photos, videoLinks, externalLinks, status, review fields)

### Planned (Phase 3)

- `ChatSession` — troubleshooting chat sessions (userId, productId, status, resolution)
- `ChatMessage` — individual messages (role, content, imageUrl)

### Planned (Phase 4)

- `CreatorProfile` — YouTube creator profiles (userId, channelUrl, channelName, subscriberCount, isVerified)
- `VideoSubmission` — creator video submissions (productId, creatorId, youtubeUrl, status, helpfulVotes)

### Planned (Phase 5)

- `Retailer` — retailer definitions (name, slug, baseUrl, adapterType, affiliateConfig, rateLimitConfig)
- `Product` extensions — `manufacturerSku`, `upcEan`, `matchGroupId`, `matchConfidence` for cross-retailer dedup

### Planned (Phase 7)

- `ApiKey` — API keys for public API (keyHash, keyPrefix, tier, rateLimitRpm, usageCount, expiresAt, revokedAt)
- `ApiUsageLog` — per-call usage tracking (endpoint, method, statusCode, responseMs, tokensUsed)

## Key Components

**Filter system (`/products`):**
- `SearchInput` — debounced client-side search (300ms)
- `ProductSortSelect` — 6 sort options (name, price, rating, newest)
- `ProductFilters` — sidebar with category, price range, rating, assembly filters
- `ActiveFilters` — removable filter badges
- `MobileFilterSheet` — slide-in sheet for mobile filter access
- `product-filters.ts` — builds Prisma `where` clause from URL params

**Assembly guides:**
- Server Actions in `src/lib/actions/guides.ts` — CRUD for guides and steps
- `AssemblyGuideViewer` — step-by-step viewer with progress indicators
- Published guides appear on product detail pages automatically

## Roadmap Summary

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 1** | AI Guide Generation — vision model pipeline, illustration generation (Nano Banana / Nano Banana Pro), pilot-first with quality gates, monthly catalog sync & auto-generation | Next |
| **Phase 2** | Polish — design system (amber theme), guide viewer UX, search improvements, performance, SEO | Planned |
| **Phase 3** | AI Troubleshooting Assistant — conversational chatbot, product-aware RAG, photo diagnosis, guided intake | Planned |
| **Phase 4** | Premium Subscription — Stripe, offline access, video guides, ad-free | Planned |
| **Phase 5** | Multi-Retailer Expansion — Wayfair, Amazon, Home Depot, Target adapters | Planned |
| **Phase 6** | Native Mobile Apps — React Native (Expo), camera-first, offline, push notifications | Planned |
| **Phase 7** | Public API, MCP Server & Agent Skills — versioned REST API (`/api/v1/*`), API key auth, MCP server for agent integration, SKILL.md for agent discovery, developer portal | Planned |

**Phase 1 blockers:** Instruction writing guidelines and illustration creation guidelines must be provided by product owner before prompt fine-tuning can begin. See `docs/implementation-plan.md` for details.

## AI Pipeline (Phase 1 — Planned)

**Multi-model strategy (all-Gemini, Flash-first + Pro-on-fail):**
- **Primary vision model:** Gemini 2.5 Pro (`gemini-2.5-pro`) — highest accuracy for diagram interpretation, complex/ambiguous pages, escalation target
- **Secondary vision model (default):** Gemini 2.5 Flash (`gemini-2.5-flash`) — cost-efficient bulk processing, panel detection, formatting; escalates to Pro on triggers (multiple arrows, hinge/rotation, fastener ambiguity, low confidence)
- **Illustration (simple steps):** Nano Banana (`gemini-2.5-flash-image`) — cheaper, faster
- **Illustration (complex steps):** Nano Banana Pro (`gemini-3-pro-image-preview`) — higher fidelity, up to 4K

**Monthly catalog sync:** Once per month, scan each retailer's catalog → detect new products → auto-scrape → auto-queue AI generation → auto-publish high-confidence guides. Manual single-product scrape available in Studio for urgent requests.

**API integrations:** Google Gemini API, `pdf-lib` or `pdfjs-dist` for PDF processing

## Key Constraints
- Prisma v7 `prisma-client` generator does NOT work with this setup — stay on v6 `prisma-client-js`
- pgbouncer (port 6543) does NOT support Prisma introspection — always use DIRECT_URL for CLI operations
- IKEA product images are external URLs (ikea.com CDN) — `next.config.ts` has `remotePatterns` configured
- NextAuth v5 type augmentation conflicts — use `as unknown as` cast pattern for `session.user.role`

## Related Project
- Scraper: `/Users/hashincloud/Ikea Scraper/` — populates the shared Supabase DB
- Scraper GitHub: `maheshsrini93/ikea-scraper`

## Project Docs

Before starting any task, read all files in `docs/` for full project context:
- docs/master-plan.md — vision, scope, and anti-goals
- docs/implementation-plan.md — architecture and tech decisions
- docs/design-guidelines.md — UI/design system constraints
- docs/user-journeys.md — user flows and edge cases
- docs/tasks.md — current task list and progress
- docs/changelog.md — history of all changes

### Task Workflow

- Work through tasks in `docs/tasks.md` in milestone order
- After completing any task, **immediately** mark it `[x]` in `docs/tasks.md` — do not batch updates
- After marking a task done, append an entry to `docs/changelog.md` with the date, task name, and files changed
- Never skip marking a task done — if the session ends unexpectedly, progress must already be saved
