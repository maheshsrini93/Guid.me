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

# Prepare better-sqlite3 + deps for runner stage (flatten pnpm structure)
RUN mkdir -p /tmp/native-deps && \
    cp -rL node_modules/better-sqlite3 /tmp/native-deps/better-sqlite3 && \
    cp -rL node_modules/.pnpm/bindings@*/node_modules/bindings /tmp/native-deps/bindings && \
    cp -rL node_modules/.pnpm/file-uri-to-path@*/node_modules/file-uri-to-path /tmp/native-deps/file-uri-to-path

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

# Copy better-sqlite3 native bindings (excluded from standalone by serverExternalPackages)
COPY --from=builder /tmp/native-deps/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /tmp/native-deps/bindings ./node_modules/bindings
COPY --from=builder /tmp/native-deps/file-uri-to-path ./node_modules/file-uri-to-path

# Create storage directory (will be overlaid by volume mount)
RUN mkdir -p /app/storage

EXPOSE 3000

CMD ["node", "server.js"]
