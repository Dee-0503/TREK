# Task 4 schema/migration fix

## Changes

- Added nullable `provider` and `provider_place_id` columns to canonical `places` and `collection_places` definitions while retaining `google_place_id`, `google_ftid`, and `osm_id`.
- Updated the historical collections `CREATE TABLE collection_places` migration path to define both provider columns.
- Appended two migrations without renumbering or rewriting earlier slots:
  - conditionally adds missing provider columns to both tables using `pragma_table_info` checks;
  - backfills deterministic identities in both tables using `google_place_id` first, `google_ftid` fallback, or `osm_id` when no Google identity exists. Rows with both Google and OSM identities remain nullable/ambiguous.
- Added fresh full-chain and old-schema upgrade/backfill regression coverage, including provider-aware inserts and preserved trip/collection joins.

## Verification

- `git diff --check`: passed.
- Focused Vitest command attempted: `npm run test --workspace=server -- tests/unit/db/place-provider-migration.test.ts tests/unit/db/migration-hygiene.test.ts`.
- Test execution is blocked because dependencies are not installed in this worktree (`vitest: command not found`).
- No Task 5+ files were changed.

## Scope

Changed only:

- `server/src/db/schema.ts`
- `server/src/db/migrations.ts`
- `server/tests/unit/db/place-provider-migration.test.ts`
- this report
