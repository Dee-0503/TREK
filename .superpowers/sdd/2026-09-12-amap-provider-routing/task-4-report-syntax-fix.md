# Task 4 final SQL/test syntax repair

- Fixed `CollectionsService.copyToTrip` provider-aware `INSERT INTO places`: 18 columns, 18 placeholders, and 18 `run` arguments now agree; provider/provider_place_id and legacy Google/OSM identity fields are retained.
- Restored the missing `it(...)` wrappers and describe/it brace nesting in the Task 4-modified collection, integration, e2e, enrichment, and places tests. Existing assertions and provider-aware regressions remain present.

## Verification

- `npm run typecheck:tests --workspace=server`: attempted. No TS1128/TS1005/TS1109/TS1136/TS1127 syntax diagnostics remain. The command still exits non-zero because this worktree has no installed dependencies/generated shared declarations; it reports missing modules/types such as `vitest`, `@nestjs/*`, `zod`, `@trek/shared`, and Node typings.
- Focused Vitest run: attempted, but `vitest` is unavailable (`sh: vitest: command not found`).
- `git diff --check`: passed.

Scope is limited to Task 4 files plus this report.
