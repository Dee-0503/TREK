# Task 4 final identity repair report

## Scope

Final Task 4 identity-only repair. No Task 5+ changes, push, or PR.

## Changes

- Fixed collection provider-qualified dedup parsing to split only at the first colon, preserving IDs such as `osm:node:42:way`.
- Tightened collection legacy fallback: Google legacy fields match canonical `google` or nullable-provider legacy rows; OSM legacy fields match only canonical `osm`; AMap never falls through to legacy Google/OSM fields.
- Added provider/provider_place_id to assignment shared projection schema, `AssignmentRow`, SQL selects, and both assignment row mappers (including day assignment reads), preserving AMap identity through assignment APIs.
- Added shared matching coverage for provider IDs containing additional colons and collection coverage for provider-scoped legacy fallback/collision behavior.

## Verification

- `git diff --check`: passed.
- `npm run test --workspace=shared -- place-match.spec.ts`: blocked because `vitest` is not installed (`sh: vitest: command not found`).
- `npm run typecheck:tests --workspace=server`: blocked by a pre-existing syntax error in `server/tests/unit/nest/maps.identity.test.ts` at lines 233-234 (`TS1128`); no Task 4 files were reported after the collection test syntax was corrected.

## Concerns

Runtime focused tests and clean typecheck require repository dependencies and the unrelated existing `maps.identity.test.ts` syntax repair. Existing Task 1-3 and Task 4 migration/cache/enrichment work was retained from integrated commit `deadc05c`; this repair only touches identity parsing, legacy scoping, assignment projection, and tests.
