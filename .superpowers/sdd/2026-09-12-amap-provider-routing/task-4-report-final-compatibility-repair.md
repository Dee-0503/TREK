# Task 4 Final Compatibility Repair

## Status

Completed in Task 4 scope only. No push or PR.

## Repairs

- Closed the `externalIdsOf` describe block syntax and retained provider-qualified legacy identity assertions (`google:ChIJ`, `google:*`, `osm:*`).
- Added real regression coverage for Google and OSM legacy rows that remain `provider IS NULL` after migration. Google fallback accepts `google` or NULL; OSM fallback accepts `osm` or NULL. AMap identity never falls through to legacy Google/OSM fields.
- Canonicalized `openstreetmap` to `osm` for collection membership and collection dedup paths.
- Made `MapsService` treat every `amap:<id>` as AMap-only. When the AMap provider is unavailable, details return `{ place: null }` without attempting OSM or Google. Added regression coverage.
- Added `osm_id` to the `update_place` MCP input schema and a persistence/parity regression test.
- Repaired adjacent pre-existing test closure syntax encountered while running the required test typecheck (`maps.identity.test.ts`), without changing production behavior.

## Verification

- `git diff --check`: passed.
- `npm run build --workspace=shared`: blocked by missing dependency/tooling: `sh: tsdown: command not found`.
- `npm run typecheck:tests --workspace=server`: reaches type analysis after syntax repairs but is blocked by missing installed dependencies/types (`@trek/shared`, `zod`, Nest packages, Node types, and others). No remaining Task 4 test syntax errors were reported.
- Focused Vitest runs were not available because dependencies are not installed (`vitest`/shared build tooling unavailable).

## Concerns

Fresh runtime test evidence requires installing the repository dependencies and building `shared` first. The integrated Task 4 source already contains the migration/backfill, raw identity, cache, assignment, copy/preflight/dedup, and Google exclusion changes; this final repair did not expand into Task 5+.
