# Example: Firebase Functions to Elysia Migration Prompt

Use this prompt with the skill:

```text
Migrate my Angular + Firebase Functions project to Bun + Elysia.

Requirements:
- Keep existing API paths unless a path is technically impossible.
- Ask discovery questions first before writing code.
- Use clean architecture folders for server code.
- Integrate typed Angular client access to migrated endpoints.
- Cache strategy: Redis first, in-memory fallback, optional SurrealDB provider.
- Binary command support is optional; include it only if low effort.
- Deployment target is Docker.

Return:
1) migration summary,
2) phased plan,
3) file-by-file change list,
4) risks and rollback strategy.
```

Suggested follow-up prompt after plan approval:

```text
Proceed with Phase 1 and Phase 2 implementation only. Stop after build validation and show diffs.
```
