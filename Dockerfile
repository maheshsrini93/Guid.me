# ── Stage 1: Install dependencies and build ───────────────────────
FROM node:22 AS builder
WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies (cached layer)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Force rebuild better-sqlite3 native addon for this platform
RUN pnpm rebuild better-sqlite3

# Copy source and build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ── Stage 2: Production runner ────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

# Install runtime dependencies: poppler for pdftoppm (PDF extraction)
RUN apt-get update && apt-get install -y poppler-utils && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Create storage directory (will be overlaid by volume mount)
RUN mkdir -p /app/storage

EXPOSE 3000

CMD ["node", "server.js"]
