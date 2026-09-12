# Task 4 schema cleanup report

## Scope

Final directed schema cleanup only. No push or PR performed.

## Changes

- Removed the duplicate `provider` and `provider_place_id` declarations from the canonical `collection_places` definition in `server/src/db/schema.ts`.
- Added one nullable `provider` / `provider_place_id` pair to the canonical `places` definition and retained the legacy `google_place_id`, `google_ftid`, and `osm_id` columns.
- Kept one nullable provider identity pair in `collection_places`, with all legacy Google/OSM columns intact.
- Added a fresh-schema regression assertion in `server/tests/unit/db/place-provider-migration.test.ts` that runs `createTables()` plus the full migration chain, asserts no duplicate-column error, verifies each provider identity column occurs exactly once, and preserves trip/collection joins for an AMap identity.

The append-only conditional provider migration and historical migration CREATE path are unchanged by this cleanup; the canonical schema now matches their one-pair shape when this commit is applied to the Task 4 implementation branch.

## Verification

- `git diff --check`: passed.
- Targeted migration tests attempted:
  `npm run test --workspace=server -- tests/unit/db/place-provider-migration.test.ts tests/unit/db/migration-hygiene.test.ts`
- Test execution was blocked because this worktree has no installed dependencies: `sh: vitest: command not found` (exit 127).

## Delivery

- Commit: pending
- Push/PR: not performed

## Concerns

Runtime test execution remains unavailable until workspace dependencies are installed. The regression test is intentionally limited to schema creation/full-chain smoke coverage and provider identity/join preservation.
