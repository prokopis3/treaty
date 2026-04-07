# Treaty

Is Angular in perfect harmony in the Bun runtime using Elysia.js and Surrealdb

- Angular v17.2.0
- Bun 1.0.26
- Surrealdb.node 0.3
- Elysia 0.8

## Extra features

- Custom elysia (eden/treaty) that uses httpClient under the hood
- It's Zoneless together with SSR
- Server running with bun
- Tests running with bun
- Tailwind CSS v4 configured through PostCSS
- Vite dev server option that proxies API requests to Elysia

## Runtime note

- This repo intentionally keeps zoneless SSR without client hydration.
- Enabling `provideClientHydration(...)` together with the custom/noop Zone shim leads to Angular hydration warning/error `NG05000` in current versions.

## Getting started

- `bun i`
- `bun run build`
- `bun run server.ts`

## Vite + Elysia dev

- `bun run dev:vite`
- Open `http://localhost:5173`
- Elysia API continues to run on `http://localhost:4201`

## Tailwind v4 usage

- Tailwind is enabled globally in `src/styles.scss`
- PostCSS plugin config is in `postcss.config.mjs`
- Add utility classes directly in component templates

## Cloudflare Option A (Wrangler proxy + Bun origin)

This project runs SSR/API on Bun+Elysia. Use Cloudflare Worker as a reverse proxy in front of your Bun host.

1. Deploy your Bun origin (VM/container) and expose HTTPS (for example `https://origin.example.com`)
2. Build and run app on origin:
	- `bun i`
	- `bun run build`
	- `bun run server`
3. Configure Wrangler Worker in this repo:
	- `wrangler login`
	- edit `wrangler.toml` and set `ORIGIN_URL` to your Bun origin
4. Deploy proxy Worker:
	- `bun run cf:deploy`
5. Attach your domain route in Cloudflare dashboard to the Worker

For local Worker testing against local Bun server:

- Terminal A: `bun run prod`
- Terminal B: `bun run cf:dev --var ORIGIN_URL:http://localhost:4201`

### Production one-command path (Docker + cloudflared + Wrangler)

Files added for this flow:

- `Dockerfile`
- `docker-compose.prod.yml`
- `.env.production.example`

Setup once:

1. Create a Cloudflare Tunnel in Zero Trust and copy the tunnel token
2. Copy `.env.production.example` to `.env.production` and set `CLOUDFLARED_TOKEN`
3. In Cloudflare Tunnel `Public Hostname`, configure an origin host (example: `origin.example.com`) pointing to service URL `http://app:4201`
4. In `wrangler.toml`, set `ORIGIN_URL` to your origin host URL (example: `https://origin.example.com`)
5. In Cloudflare Workers routes, map your app host (example: `app.example.com/*`) to this worker

Deploy with one command:

- `bun run deploy:option-a`

Supporting commands:

- `bun run docker:prod:up`
- `bun run docker:prod:down`
- `bun run cf:deploy`

Routing note:

- Do not set `ORIGIN_URL` to the same hostname that is routed to the Worker, or you will create a proxy loop.

## Getting started watching

- `bun run watch` - Known bottleneck it takes roughly 1s to build per change
- `bun run --watch server.ts`

## Unit testing

- `bun test`

### This is still very much POC dont use in production
