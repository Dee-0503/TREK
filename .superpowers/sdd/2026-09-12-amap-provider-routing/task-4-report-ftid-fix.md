# Task 4 migration report

- Added an append-only migration tail in `server/src/db/migrations.ts` that backfills provider-neutral identity from legacy Google fields for both `places` and `collection_places`.
- `google_place_id` is preferred; `google_ftid` is the deterministic fallback when the Place ID is absent.
- Backfill runs only for rows with no existing provider identity and no usable OSM identity. Rows carrying both Google and OSM identity remain nullable. Legacy Google columns are untouched, and AMap rows are not written to Google columns.
- Added `server/tests/unit/db/provider-identity-migration.test.ts`, which runs the real migration chain, rewinds one migration, and asserts Google-ftid backfill for both tables, Google Place ID precedence, ambiguous Google+OSM nullability, and preservation of existing day-assignment/collection joins.

## Verification

- `git diff --check`: passed.
- Targeted Vitest regression: blocked because dependencies are not installed (`vitest: command not found`).
- Server typecheck: blocked by the same missing dependency/install state (`@trek/shared`, Nest, zod, Node typings, and other modules unavailable); no implementation-specific diagnostic was produced.

## Concerns

- Fresh runtime test execution requires the repository dependencies and built shared workspace to be installed/generated in this worktree.
