# Task 4 — Test-only repair report

## Scope

Updated only `shared/src/place/place-match.spec.ts` and this report. Production matching logic was not changed.

## Changes

- Updated `externalIdsOf` expectations to use provider-qualified legacy IDs (`google:...` and `osm:...`).
- Preserved trim and blank-ID coverage.
- Preserved provider ordering coverage.
- Added coverage that legacy providers remain distinct when bare values match.
- Added coverage for IDs containing extra colons.
- Kept the `describe`/`it` structure valid and retained assertions.

## Verification

- `git diff --check`: passed.
- Focused test command: `npm run test --workspace=shared -- src/place/place-match.spec.ts`
- Result: not run because the worktree has no installed Vitest binary (`sh: vitest: command not found`, npm exit 127).

## Concerns

None identified. This is a test-only contract alignment; no production files were modified.
