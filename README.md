# Treaty

Full-stack Angular + Bun reference stack with type-safe API contracts, zoneless rendering, and production-ready deployment workflows.

## ✨ Highlights

- Angular 20 frontend with typed route resolvers
- Bun + Elysia backend for API and web delivery
- End-to-end type safety from server routes to Angular client
- Clean architecture boundaries in `backend/` (domain/application/infrastructure/presentation)
- Zoneless Angular setup with Bun-native test/runtime tooling
- SurrealDB-backed data and page-cache options
- Docker + Cloudflare deployment path with encrypted production secrets

## 🧱 Tech Stack

- Angular `20.3.x`
- Bun `1.3.x`
- Elysia `1.4.x`
- SurrealDB `3.x`
- Tailwind CSS `v4` + PostCSS
- Wrangler + Cloudflare Worker/Tunnel (optional production edge proxy)

## 🗺️ System Architecture

```text
Browser
  -> Angular App (CSR shell + typed API calls)
      -> Elysia Server (Bun runtime)
          -> /api/v1/posts/*
              -> Application services
                  -> Repository adapters
                      -> SurrealDB

Elysia Server
  -> Static/browser assets from dist/treaty/browser
  -> HTML cache layer (Surreal | Upstash | in-memory)
  -> Optional clustered startup (Linux-oriented)
```

## 📦 Repository Layout

```text
src/app/                         Angular app, routes, resolvers, views
src/libs/edenclient/             RxJS Treaty/Eden client implementation
backend/application/             Use-cases and service layer
backend/domain/                  Domain entities and repository contracts
backend/infrastructure/          SSR/static serving, cache, DB, clustering, logging
backend/presentation/api/        Elysia API definitions and route wiring
config/env.ts                    Runtime configuration and env parsing
server.ts                        Runtime entrypoint (API + web serving)
```

## 🚀 Quick Start

```bash
bun i
bun run surreal:init   # optional when using remote SurrealDB
bun run build
bun run server
```

Open `http://localhost:4201`.

## 🧪 Developer Workflows

### Local development

```bash
bun run dev
```

Runs Angular watch build + Bun server concurrently.

### Vite frontend mode (API proxied to Elysia)

```bash
bun run dev:vite
```

Open `http://localhost:5173` while API remains on `http://localhost:4201`.

### Tests

```bash
bun test
```

### Build and runtime variants

```bash
bun run build
bun run prod
bun run prod:bundle
bun run prod:bin
```

## 🧩 Type-Safety Contract

Server route types are exported from the backend and consumed by the Angular client. This preserves typed request/response inference end-to-end.

- Server source of truth: Elysia route schema/types
- Client consumption: typed Eden/Treaty client in Angular

This keeps API changes visible at compile time instead of failing at runtime.

## ⚙️ Configuration Notes

### Runtime mode

- The runtime serves built frontend assets and API endpoints from Bun.
- HTML/page cache backend is configurable through env (`surreal`, `upstash`, `memory`).
- Cluster behavior is environment-driven and primarily useful on Linux production hosts.

### HTML cache strategy (CSR shell)

Treaty serves a CSR shell for non-API routes, so route responses often share the same HTML payload.

- Recommended mode: `APP_HTML_CACHE_MODE=shared-shell`
- Alternative mode: `APP_HTML_CACHE_MODE=route`

`shared-shell` stores one HTML shell entry and reuses it across routes. This avoids duplicating identical cached HTML for paths like `/`, `/posts`, and `/post/:id`.

Use `route` mode only when you intentionally need route-specific HTML cache entries.

Example:

```bash
APP_PAGE_CACHE_PROVIDER=upstash
APP_PAGE_CACHE_KEY_PREFIX=page-cache:
APP_HTML_CACHE_MODE=shared-shell
APP_HTML_CACHE_ALLOWLIST=/,/posts,/post/*
APP_HTML_CACHE_PREWARM_ROUTES=/,/posts
```

### Zoneless Angular

- The project uses zoneless change detection with a minimal Zone shim.
- Client hydration is intentionally not enabled in this setup.

### Tailwind

- Source: `src/tailwind.input.css`
- Generated: `src/tailwind.generated.css`
- Build script handles generation automatically.

## 🗄️ SurrealDB Setup

Local default endpoint is `ws://127.0.0.1:8000` unless overridden.

Key envs:

- `SURREAL_ENDPOINT`
- `SURREAL_NAMESPACE`
- `SURREAL_DATABASE`
- `SURREAL_AUTH_MODE`
- `SURREAL_USERNAME` / `SURREAL_PASSWORD`
- `SURREAL_ACCESS_TOKEN`

Initialize schema/seed:

```bash
bun run surreal:init
```

## ☁️ Production Deployment (Docker + Cloudflare)

### One-command deployment path

```bash
bun run deploy:option-a
```

This flow combines container deploy + worker deploy.

### Supporting commands

```bash
bun run docker:prod:up:bin
bun run docker:prod:down
bun run cf:deploy
bun run env:prod:encrypt
```

### Secrets workflow

1. Encrypt production env file:
```bash
bun run env:prod:encrypt
```
2. Keep `.env.keys` local and out of version control.
3. Export `DOTENV_PRIVATE_KEY_PRODUCTION` in shell/CI.
4. Production scripts fail fast if required secrets are missing.

### Cloudflare routing note

Do not point `ORIGIN_URL` at the same hostname already routed through the Worker, or you will create a proxy loop.

## 📚 Project Documentation

- [docs/CLUSTERING_ARCHITECTURE.md](docs/CLUSTERING_ARCHITECTURE.md)
- [docs/DOCKER_CLUSTERING_TESTS.md](docs/DOCKER_CLUSTERING_TESTS.md)
- [docs/REFACTORING_SUMMARY.md](docs/REFACTORING_SUMMARY.md)

## 🤝 Contribution

Contributions are welcome.

Recommended before opening a PR:

```bash
bun run build
bun test
```

## 📄 License

MIT (see `LICENSE` if present in your distribution).
