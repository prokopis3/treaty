---
name: angular-bun-elysia-migrator
description: Migrates Angular projects from Node or Firebase Functions backends to Bun + Elysia with typed Eden client and clean architecture.
version: 1.0.0
author: Proko
---

# angular-bun-elysia-migrator

## Purpose

Migrate an existing Angular project (with Node server, Express, Nest, or Firebase Functions backend) to a Bun + Elysia backend with end-to-end typed API access from Angular using an Eden-style client and a clean architecture layout.

This skill is question-first: it must gather key migration constraints from the user before producing a plan or editing files.

## When to Use This Skill

Use this skill when the user asks to:

- Replace a Node.js backend with Bun + Elysia.
- Migrate Firebase Functions HTTP endpoints to Elysia routes.
- Introduce typed frontend-backend contracts for Angular.
- Restructure server code into clean architecture layers.
- Add optional runtime binary build commands.
- Add or standardize HTML/page caching with Redis or in-memory fallback.

Do not use this skill for frontend-only Angular changes with no backend migration.

## Migration Principles

- Keep working behavior stable while changing runtime and structure.
- Preserve public API routes unless user explicitly approves breaking changes.
- Migrate incrementally in phases, with build checks after each phase.
- Prefer typed contracts and compile-time safety over ad-hoc HTTP wrappers.
- Treat database selection as optional and configurable.

## Mandatory Discovery Questions (Ask First)

Before any planning, ask these questions and wait for answers:

1. Backend source type:
   - Express / Fastify / Nest / Firebase Functions / Other
2. Angular version and build mode:
   - Angular CLI only, Vite, SSR, or CSR shell
3. API compatibility requirement:
   - Keep existing paths exactly, or allow path redesign
4. Authentication and middleware:
   - JWT, cookies, Firebase auth, custom middleware
5. Deployment target:
   - Docker, Cloudflare, VM, serverless, mixed
6. Runtime preference:
   - Bun source runtime only, or include optional compiled binary commands
7. Cache preference (if HTML/page cache is needed):
   - Primary: Redis
   - Secondary fallback: in-memory
   - Optional additional provider: SurrealDB, Supabase, or another user choice
8. Database strategy:
   - Keep current DB, replace DB, or postpone DB migration
9. Migration risk tolerance:
   - Big-bang vs phased rollout with side-by-side verification

If the user cannot answer all questions, proceed with safe defaults and state assumptions clearly.

## Default Assumptions (When User Omits Details)

- Keep API paths backward-compatible.
- Use Bun + Elysia for backend HTTP runtime.
- Use typed Eden-style client access from Angular service layer.
- Use clean architecture folders:
  - `backend/domain`
  - `backend/application`
  - `backend/infrastructure`
  - `backend/presentation`
- Use Redis as preferred cache provider when available.
- Fall back to in-memory cache when Redis is missing.
- Add optional hooks for extra cache providers (SurrealDB/Supabase/custom).
- Keep binary runtime commands optional, not mandatory.

## Standard Output Contract

After collecting answers, produce:

1. A migration summary with constraints and assumptions.
2. A phased migration plan (small reversible steps).
3. A file-by-file change map.
4. Risk list and mitigation plan.
5. Validation commands for each phase.

Do not skip directly to large code dumps without this plan.

## Implementation Workflow

### Phase 1: Inventory and Contract Capture

- Detect current backend entrypoints and route definitions.
- List API paths, methods, request/response shapes.
- Identify middleware/auth dependencies.
- Record environment variables and secrets usage.

Deliverable: API and runtime inventory document in the response.

### Phase 2: Elysia Skeleton and Clean Architecture

- Create Bun + Elysia server entrypoint.
- Split code into clean architecture layers.
- Move route wiring to presentation layer.
- Move business logic to application layer.
- Move external adapters (DB/cache/logging) to infrastructure layer.

Deliverable: compiles with placeholder or migrated routes.

### Phase 3: Typed Angular Client Integration

- Export backend app type from server.
- Wire Angular API service to typed client.
- Replace untyped ad-hoc fetch/http wrappers where in scope.
- Keep observable-friendly integration style for Angular usage.

Deliverable: typed client calls compile and route contracts infer correctly.

### Phase 4: Cache Layer Strategy

- Add cache adapter interface.
- Implement Redis adapter as preferred provider.
- Implement in-memory adapter fallback.
- Add optional provider hooks (SurrealDB/Supabase/custom).
- Make provider choice environment-driven.

Deliverable: app works even when optional cache services are unavailable.

### Phase 5: Firebase Functions Migration (If Applicable)

- Map each function endpoint to Elysia route groups.
- Recreate auth verification and middleware behavior.
- Replace Firebase runtime-specific objects with Elysia equivalents.
- Preserve response shape compatibility.

Deliverable: function parity table and migrated route coverage.

### Phase 6: Runtime Commands and Deployment

- Add Bun scripts for dev, build, and prod runtime.
- If requested, add optional compiled binary scripts.
- Preserve or improve Docker/deploy scripts.
- Add environment bootstrap and validation scripts.

Deliverable: documented command matrix for local and production usage.

### Phase 7: Validation and Rollout

- Run build/test/lint/route smoke checks.
- Validate major endpoints and auth flows.
- Compare old vs new behavior on critical routes.
- Provide rollback strategy and cutover checklist.

Deliverable: migration sign-off checklist.

## Decision Rules

- If route compatibility is strict, keep route signatures unchanged.
- If deployment is uncertain, prefer source runtime first, then optional binary support.
- If Redis is unavailable, auto-fallback to in-memory with warning logs.
- If DB migration is deferred, keep DB adapter boundaries stable.
- If SSR behavior is unclear, do not assume SSR; verify existing mode first.

## Quality Bar

A migration is complete only when:

- Backend starts on Bun + Elysia.
- Angular client uses typed contracts for migrated APIs.
- Clean architecture boundaries are present and respected.
- Cache provider fallback behavior is verified.
- Commands and env docs are updated.
- User receives explicit list of assumptions, risks, and next steps.

## Anti-Patterns to Avoid

- Rewriting everything in one unreviewable change.
- Mixing business logic directly in route handlers.
- Hard-coding cache/database provider assumptions.
- Adding binary/runtime complexity when user did not request it.
- Introducing silent API breaking changes.

## Quick Prompt Template for Users

Use this skill request format:

"Migrate my Angular + <current-backend> project to Bun + Elysia using clean architecture and typed Angular client. Keep API paths <same/redesign>. Deployment target is <target>. Cache should prefer Redis, fallback to memory, and optionally support <other provider>. Ask me migration questions first."
