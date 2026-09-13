# Task 4 final SQL/canonical matching repair

## Status

Implemented and committed in this worktree. No push or PR performed.

## Repairs

- Fixed `PlacesService.create` so the provider-aware `places` INSERT has the same 24 columns, 24 placeholders, and 24 bound arguments; legacy Google/OSM fields and canonical provider identity remain stored.
- Fixed `CollectionsService.saveFromTripPlaces` so its 24-column INSERT has 24 placeholders and 24 bound arguments, including the real `'idea'` status value rather than a surplus placeholder/fixed-value mismatch.
- Kept `CollectionsService.copyToTrip` provider identity in source reads, dedup rows, INSERT columns, placeholders, and arguments; its 19-column, 19-binding provider-aware shape retains provider and provider_place_id without losing legacy fields.
- Extended status/membership matching to canonical provider/provider_place_id and provider-qualified legacy Google/OSM matching. Canonical AMap identity cannot collide with Google/OSM legacy IDs. Coordinate fallback is provider-scoped when a provider is supplied, while legacy rows remain compatible through `provider IS NULL`.
- Updated collection REST membership and MCP input/description to accept provider-neutral identity plus legacy Google/OSM identifiers.
- Added a real SQLite regression covering bulk trip-to-collection save and collection-to-trip copy, asserting provider identity and null Google legacy identity at both storage boundaries.

## Verification

- `git diff --check`: passed.
- Focused test attempted: `npm run test --workspace=server -- tests/unit/nest/collections.service.test.ts`; blocked by missing dependency/tooling (`vitest: command not found`).
- `npm run typecheck:tests --workspace=server`: collection test syntax errors are resolved; command remains blocked by an existing unrelated syntax error in `server/tests/unit/nest/maps.identity.test.ts:233` (`TS1128`).
- SQL shape inspection confirms the create/save/copy target statements have matching columns/placeholders/arguments; runtime SQL execution awaits dependency restoration.

## Concerns

The repository's integrated Task 4 branch already contains the schema/migration/backfill, AMap Google exclusion, nested identity, cache isolation, enrichment, and collection preflight/copy/dedup work; this repair did not revert those changes. Runtime focused tests and complete typecheck require the missing workspace dependencies and the pre-existing maps test syntax repair. No Task 5+ files were intentionally changed.
