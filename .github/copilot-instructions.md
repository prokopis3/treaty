# Treaty - Copilot Instructions

Full-stack Angular 20 + Elysia (Bun) application with end-to-end type safety via a custom RxJS-based Eden/Treaty client.

## Primary Runtime Model

- Web rendering mode is **CSR shell**, not server-side HTML rendering.
- `server.ts` serves API routes and static browser assets from `dist/treaty/browser`.
- Catch-all HTML responses return the browser shell (`index.csr.html` or `index.html`).
- HTML cache supports SurrealDB, Upstash Redis, or in-memory adapters.

## Commands (Current)

| Task | Command |
|---|---|
| Install dependencies | `bun i` |
| Build production app | `bun run build` |
| Run server (source) | `bun run server` |
| Run server (watch) | `bun run server:watch` |
| Dev mode (watch + server) | `bun run dev` |
| Dev mode with Vite frontend | `bun run dev:vite` |
| Tests | `bun test` |
| Production (built server) | `bun run prod` |
| Production (bundle runtime) | `bun run prod:bundle` |
| Production (compiled runtime binary) | `bun run prod:bin` |

> Build-first rule: runtime serving requires built assets in `dist/treaty/browser`. Run `bun run build` before `bun run server` when needed.

## Architecture Snapshot

```text
server.ts                         Elysia entrypoint (API + static + CSR shell)
  -> backend/presentation/api/*   HTTP route wiring
  -> backend/application/*        Services/use-cases
  -> backend/domain/*             Domain contracts/models
  -> backend/infrastructure/*     Clustering, cache, SSR helpers, DB, logging

src/app/*                         Angular app routes/components/resolvers
src/libs/edenclient/*             Custom typed Eden client (RxJS + HttpClient)
treaty-utilities/*                Runtime/test shims and Bun preloads
```

## Type-Safety Contract (Critical)

`server.ts` exports `App` type from the Elysia instance, and Angular consumes it in `ApiService` through `edenClient<App>()`.

```typescript
// server.ts
export type App = typeof app;

// src/app/api.service.ts
import type { App } from 'server';
client = edenClient<App>(baseUrl).api;
```

Do not replace this with untyped HTTP wrappers.

## Angular Conventions (Mandatory)

- Zoneless setup is intentional; keep `mock-zone.ts` imports at the top of `main.ts` and `server.ts`.
- Use `ChangeDetectionStrategy.OnPush` for all components.
- Prefer signal APIs (`input()`, `signal()`, `computed()`) over legacy patterns for new code.
- Keep functional resolvers near related feature components when practical.
- Components loaded by `loadComponent()` should keep default class exports where existing routes depend on them.

## HTML Cache Strategy (Important)

Current default: `APP_HTML_CACHE_MODE=shared-shell`

- `shared-shell`: one shared HTML cache key is used for CSR shell responses.
- `route`: one cache key per route path.

Because CSR shell HTML is often identical across `/`, `/posts`, and `/post/:id`, `shared-shell` is preferred to avoid duplicated cache payloads.

Relevant env keys:

- `APP_PAGE_CACHE_PROVIDER` = `surreal` | `upstash` | `memory`
- `APP_PAGE_CACHE_KEY_PREFIX`
- `APP_PAGE_CACHE_TTL_SECONDS`
- `APP_HTML_CACHE_MODE` = `shared-shell` | `route`
- `APP_HTML_CACHE_ALLOWLIST`
- `APP_HTML_CACHE_PREWARM_ROUTES`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Clustering Behavior

- Clustering is orchestrated by `backend/infrastructure/clustering/*`.
- Linux-first optimization with environment-based controls.
- Main entrypoint calls `startServerWithClustering(...)` from `server.ts`.

Use docs for deeper guidance:

- `docs/CLUSTERING_ARCHITECTURE.md`
- `docs/DOCKER_CLUSTERING_TESTS.md`

## Testing Standards (Bun)

- Use `bun:test` APIs only.
- Avoid Jasmine/Jest/Vitest API patterns.
- Test bootstrap is in `treaty-utilities/setup-tests.ts` (preloaded via `bunfig.toml`).

## Deployment Notes

- Canonical Docker production up command: `bun run docker:prod:up:bin`
- Combined deploy path: `bun run deploy:option-a`
- Production env encryption and secret prep are required (`env:prod:*` scripts).

## Key Files

| File | Role |
|---|---|
| [server.ts](../server.ts) | Runtime entrypoint (API + static + cache + clustering) |
| [config/env.ts](../config/env.ts) | Environment parsing and runtime configuration |
| [backend/infrastructure/page-cache/factory/create-page-cache.repository.ts](../backend/infrastructure/page-cache/factory/create-page-cache.repository.ts) | Cache provider selection (surreal/upstash/memory) |
| [backend/infrastructure/page-cache/upstash/upstash-page-cache.repository.ts](../backend/infrastructure/page-cache/upstash/upstash-page-cache.repository.ts) | Upstash cache adapter |
| [backend/infrastructure/surreal/surreal-page-cache.repository.ts](../backend/infrastructure/surreal/surreal-page-cache.repository.ts) | Surreal cache adapter |
| [src/app/api.service.ts](../src/app/api.service.ts) | Typed API client instantiation |
| [src/libs/edenclient/index.ts](../src/libs/edenclient/index.ts) | Proxy factory for typed HTTP calls |
| [treaty-utilities/setup-tests.ts](../treaty-utilities/setup-tests.ts) | Bun test environment bootstrap |
| [bunfig.toml](../bunfig.toml) | Bun preload and test configuration |
