# ============================================================================
# STAGE 1: Dependencies — install ALL packages (dev deps needed for ng build)
# ============================================================================
FROM oven/bun:1.3.11 AS deps

WORKDIR /app

# Disable Husky hooks for clean CI builds
ENV HUSKY=0 \
    CI=1

# Copy only package manifests — layer is cached until these files change
COPY package.json bun.lockb ./

# Install all deps (dev included: Angular CLI, TypeScript, Tailwind, etc.)
# --ignore-scripts: skip postinstall hooks (Husky, etc.)
RUN bun install --frozen-lockfile --ignore-scripts

# ============================================================================
# STAGE 2: Build — Angular production bundle
# ============================================================================
FROM deps AS build

WORKDIR /app

ENV HUSKY=0 \
    CI=1

# Reuse node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy full source tree — Angular compiler needs tsconfig, src/, backend/, etc.
COPY . .

# Compile Angular app in production mode
# Outputs: dist/treaty/browser/ (static assets) + dist/treaty/server/ (SSR)
RUN bun run build

# Prune to production-only node_modules
# Removes: @angular/cli, @angular/build, typescript, vite, wrangler, husky, etc.
RUN bun install --frozen-lockfile --production --ignore-scripts
# Trust all packages so their postinstall/lifecycle scripts are allowed to run
RUN bun pm trust --all
# Re-run install (no --ignore-scripts) so trusted packages execute their lifecycle scripts
# (e.g. SurrealDB downloading its native WASM binary, etc.)
RUN bun install --production

# ============================================================================
# STAGE 3: Runtime — minimal image, no build tools
# ============================================================================
FROM oven/bun:1.3.11 AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=4201 \
    APP_LOG_LEVEL=info \
    APP_DEBUG_LOGS=false

# Production node_modules only (~60 MB vs ~500 MB with devDeps)
# Contains: @angular/*, elysia, rxjs, surrealdb, @dotenvx/dotenvx, etc.
COPY --from=build /app/node_modules ./node_modules

# Pre-compiled Angular browser assets (JS chunks, CSS, index.html, favicon)
COPY --from=build /app/dist ./dist

# Server TypeScript source — Bun transpiles natively via its Zig-based parser.
# NOTE: bun build --target=bun cannot be used here because Angular's AOT/Linker
# compilation relies on a specific module initialization order that bun's bundler
# disrupts (causing "JIT compiler not available" errors at runtime). Bun's native
# TypeScript execution is essentially zero-overhead and the correct approach per
# the Bun docs: "it isn't necessary to bundle server-side code."
COPY --from=build /app/server.ts ./
COPY --from=build /app/backend ./backend
COPY --from=build /app/src ./src
COPY --from=build /app/treaty-utilities ./treaty-utilities
COPY --from=build /app/tsconfig.json ./
COPY --from=build /app/package.json /app/bun.lockb ./

EXPOSE 4201

# Health check — waits up to 20 s for startup before marking unhealthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD bun -e "fetch('http://127.0.0.1:4201').then(()=>process.exit(0)).catch(()=>process.exit(1))"

# Bun transpiles TypeScript natively — no intermediate build step needed.
# --watch: automatically restarts the process if it crashes (unlimited restarts).
# Docker's `restart: unless-stopped` handles container-level recovery on top of this.
CMD ["bun", "--watch", "server.ts"]
