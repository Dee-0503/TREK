# Task 4 collection-copy fix report

## Scope

Directed Task 4 repair only: bulk `copyToTrip` provider identity propagation and provider-aware trip deduplication. No routes, client, i18n, or Docker changes.

## Changes

- `CollectionsService.copyToTrip` source row type and SELECT now read `provider` and `provider_place_id`.
- Target `places` INSERT now includes both provider columns, with matching placeholders and arguments. Existing Google/OSM columns and ordering remain intact; AMap identity is not written to `google_place_id`.
- Existing-trip dedup row type and SELECT now include provider identity, allowing `externalIdsOf` to match provider-qualified identities.
- The duplicate candidate passed to `isPlaceDuplicate` now includes provider identity.
- Added `COLLECTIONS-SVC-020A` regression coverage: an AMap collection place is bulk-copied with identity preserved, then renamed and copied again; the second copy is skipped by provider identity. The SQL-backed assertions also validate the inserted identity fields and the 19-value INSERT binding shape exercised by the test.

## Verification

- `git diff --check`: passed (`DIFF_CHECK_EXIT=0`).
- Focused test command: `npm run test --workspace=server -- collections.service.test.ts`.
- Test execution blocked by missing dependencies: `vitest: command not found`.

## Status and concerns

Implementation is committed in this worktree. Runtime tests could not be run because dependencies are not installed. This worktree is based on the repository baseline before the broader Task 4 provider-column migrations/contracts, so the focused test also depends on those Task 4 changes being present in the target integration branch.
