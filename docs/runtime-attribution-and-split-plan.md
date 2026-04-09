# Runtime Attribution And Split Plan (2026-04-09)

## Scope

This report attributes runtime-size pressure for the compiled binary path and defines a concrete separation plan.

## Measured Artifacts

- Baseline `dist/runtime/treaty-server-local.exe`: 179.03 MB
- Optimized `dist/runtime/treaty-server-local.exe`: 112.75 MB
- `dist/runtime/server.js.map`: 26.49 MB

Net binary reduction: 66.28 MB (~37.0%)

## Attribution (Top Sources by Referenced Source Bytes)

From `dist/runtime/server.js.map` source references grouped by package:

1. `@angular/core`: 1.79 MB
2. `@angular/compiler`: 1.36 MB
3. `@opentelemetry/sdk-node`: 1.19 MB
4. `@opentelemetry/exporter-metrics-otlp-http`: 0.95 MB
5. `@opentelemetry/exporter-trace-otlp-http`: 0.95 MB
6. `@opentelemetry/exporter-logs-otlp-proto`: 0.95 MB
7. `@opentelemetry/exporter-logs-otlp-http`: 0.95 MB
8. `@opentelemetry/exporter-metrics-otlp-proto`: 0.94 MB
9. `@opentelemetry/exporter-trace-otlp-grpc`: 0.92 MB
10. `@opentelemetry/exporter-logs-otlp-grpc`: 0.92 MB
11. `@opentelemetry/exporter-metrics-otlp-grpc`: 0.90 MB
12. `@opentelemetry/otlp-transformer`: 0.83 MB
13. `@grpc/grpc-js`: 0.64 MB
14. `@angular/platform-server`: 0.55 MB
15. `@angular/ssr`: 0.54 MB
16. `@angular/common`: 0.47 MB
17. `@sinclair/typebox`: 0.38 MB
18. `elysia`: 0.34 MB
19. `rxjs`: 0.33 MB
20. `@angular/router`: 0.31 MB

## Key Conclusions

- Runtime weight is dominated by Angular SSR and OpenTelemetry/exporter stacks.
- Eden *types* do not affect runtime output.
- Runtime leaks happen when value imports create graph edges. A concrete leak was removed in `src/app/api.service.ts` by switching to `import type { App } from 'server'`.
- Biggest practical reductions came from compile flags and reducing compile-time edges for optional runtime features.

## Implemented Optimizations

1. Binary compile flags switched to size-first mode.
	- Removed `--sourcemap` and `--bytecode` from runtime bin scripts.
	- File: `package.json`

2. Optional Elysia telemetry/server-timing imports moved behind bundler-opaque dynamic imports.
	- Prevents optional plugin stacks from being strongly linked into binary graphs when disabled.
	- File: `backend/infrastructure/http/plugins.ts`

3. SSR entry resolution hardened for runtime modes.
	- Added `resolveServerMainEntry` and expanded index/server path candidates.
	- File: `backend/infrastructure/ssr/browser-dist.resolver.ts`

4. Server bootstrap loading adjusted to preserve standalone binary behavior while minimizing graph leakage.
	- Keeps source bootstrap bundled for binary mode.
	- Keeps built-artifact bootstrap for compiled Angular server runtime mode.
	- File: `server.ts`

5. Guard remains in place to prevent client-side runtime imports from server module values.
	- Script: `backend/scripts/check-type-only-imports.ts`
	- CI workflow: `.github/workflows/runtime-ssr-smoke.yml`

## Concrete Split Plan

### Step 1: Freeze Import Boundaries

- Keep backend entry (`server.ts`) as server-only.
- Keep app runtime (`src/app/**`) free from server value imports.
- Enforce with guard script and CI (`guard:imports`).

### Step 2: Move Shared Contracts To Type-Only Boundary

- Add `src/shared/api-contracts.ts` with type-only structures needed by both sides.
- Avoid importing backend implementation modules from client/SSR app code.

### Step 3: Reduce Optional Runtime Features In Binary Builds

- Keep telemetry and tracing plugins behind strict env flags.
- For `build:runtime:bin*`, default OTEL features to disabled unless explicitly required.
- If needed, split telemetry into a separate deployment profile.

### Step 4: Decide Deployment Mode Per Goal

- If minimum binary size is priority: prefer the lightest runtime profile (no OTEL exporters, no extra instrumentation).
- If feature completeness is priority: keep current profile and accept larger binary.

### Step 5: Add Reproducible Size Baselines

- Record binary size in CI artifacts for each runtime mode (`bundle`, `bin`).
- Fail CI on unexpected growth beyond agreed thresholds.

## Immediate Guard Implemented

- Script: `backend/scripts/check-type-only-imports.ts`
- Package script: `guard:imports`
- CI workflow step: Runtime SSR smoke workflow now runs `bun run guard:imports` before build.

## Final Verification (Local)

- Guard check: `bun run guard:imports` passed.
- Rebuild command: `bun run build:runtime:bin:local` passed.
- Rebuilt binary size: `118,227,968` bytes (`112.75 MB`).
- Smoke runtime probe:
	- Started `dist/runtime/treaty-server-local.exe` with `RUN_AS_BIN=true`.
	- Health endpoint `GET http://127.0.0.1:4319/api/health` returned `200` and body `{"status":"ok"}`.
