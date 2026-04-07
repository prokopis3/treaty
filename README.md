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

## Getting started watching

- `bun run watch` - Known bottleneck it takes roughly 1s to build per change
- `bun run --watch server.ts`

## Unit testing

- `bun test`

### This is still very much POC dont use in production
