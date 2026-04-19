# Migration Checklist: Angular + Node/Firebase to Bun + Elysia

## 1. Discovery

- Identify backend runtime and framework.
- Inventory all HTTP routes and expected response contracts.
- Inventory auth, middleware, and background jobs.
- Capture environment variables and secret sources.

## 2. Target Architecture

- Define clean architecture boundaries:
  - domain
  - application
  - infrastructure
  - presentation
- Define route grouping strategy.
- Define typed contract strategy for Angular client integration.

## 3. Cache Strategy

- Select primary cache provider (recommended: Redis).
- Configure in-memory fallback.
- Optionally add external providers (SurrealDB/Supabase/custom).
- Verify behavior with cache provider unavailable.

## 4. Angular Integration

- Replace untyped HTTP wrappers where in scope.
- Ensure typed client usage in Angular services.
- Verify compile-time inference for key endpoints.

## 5. Firebase Functions Specific (if applicable)

- Map each function to Elysia route.
- Port auth context and validation logic.
- Preserve status codes and payload shapes.
- Validate each migrated endpoint with smoke tests.

## 6. Build and Deploy

- Add Bun scripts for local development and production runtime.
- Add optional compiled binary scripts only if requested.
- Validate Docker/infra scripts against new runtime entrypoint.

## 7. Rollout and Validation

- Run build/test checks.
- Run endpoint parity tests.
- Validate auth and critical business paths.
- Document rollback and cutover plan.
