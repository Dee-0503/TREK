# Task 4 load-bearing repair report

## Scope

This repair remains limited to Task 4 provider-aware place identity and its regression coverage. No Task 5+ work was included.

## Repairs

- Excluded `amap:` identities from Google place-id classification, preventing AMap IDs from reaching Google details, photo, or editorial-summary paths.
- Made enrichment matching consume nested `providerIdentity` values, including AMap results, while retaining raw provider IDs for persistence and avoiding duplicate namespace handling.
- Added provider/provider-place-id projection to collection importable-place rows so preflight dedup uses the same identity as collection save.
- Restricted collection legacy fallback by provider: Google checks only `google_place_id`/`google_ftid`, OSM checks only `osm_id`, and AMap has no legacy fallback.
- Preserved canonical provider columns, legacy compatibility columns, migrations/backfill, cache isolation, collection/trip copy, MCP contracts, and AMap's prohibition on writing Google legacy IDs.
- Repaired the previously isolated integration and E2E test blocks without deleting coverage; retained real HTTP/SQLite assertions.

## Regression coverage

Added or updated tests for provider-aware matching, nested AMap enrichment identity, AMap Google-ID exclusion, migrations/backfill, collection dedup/copy, AMap enrichment/cache isolation, and the repaired integration/E2E paths.

## Verification

- `git diff --check`: passed.
- `npm run typecheck:tests --workspace=server`: blocked by the worktree environment's missing dependencies and type declarations (`@trek/shared`, `zod`, Nest packages, `better-sqlite3`, `@types/node`, and related globals); the earlier TS1128 syntax errors in the repaired tests no longer appeared.
- Focused Vitest tests: blocked because `vitest` is not installed in this worktree.
