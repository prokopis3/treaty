# angular-bun-elysia-migrator

This skill helps migrate Angular projects from Node-based backends (including Firebase Functions) to Bun + Elysia with a clean architecture layout and typed API consumption from Angular.

## What It Does

- Runs a question-first discovery before any migration plan.
- Produces phased migration plans instead of big-bang rewrites.
- Preserves API compatibility by default unless you approve changes.
- Introduces clean architecture boundaries for backend code.
- Guides typed client integration for Angular services.
- Adds cache strategy with Redis priority and in-memory fallback.
- Supports optional provider extensions (SurrealDB, Supabase, custom).
- Treats binary commands as optional and deployment-specific.

## Typical Inputs It Asks For

- Current backend framework/runtime
- Angular rendering/build mode
- API compatibility constraints
- Auth and middleware dependencies
- Deployment target
- Cache/database preferences
- Rollout strategy and risk tolerance

## Expected Outputs

- Constraint-aware migration summary
- Phase-by-phase implementation plan
- File change map and command checklist
- Risks, assumptions, and rollback approach
- Validation steps for each migration phase

## Trigger Phrases

- migrate angular node backend to bun elysia
- migrate firebase functions to elysia
- angular bun clean architecture migration
- typed eden client migration for angular
- bun elysia backend migration plan

## Recommended Use

Invoke this skill early in migration planning. It is optimized for incremental delivery and compatibility-safe transitions.

If you want a full implementation, tell the skill to continue after plan approval.
