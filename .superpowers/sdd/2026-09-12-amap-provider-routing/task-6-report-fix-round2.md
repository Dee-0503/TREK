# Task 6 fix round 2 report

Status: implemented against integration HEAD `65e546a3`.

Implemented:
- Fixed `PlaceFormModal` autocomplete to pass the complete shared `locationBias` `{ low, high }` bounding box instead of converting it to a center point. This now matches `mapsAutocompleteRequestSchema` and the server's autocomplete request shape.
- Kept autocomplete request context intact: `countryCode`, `locationBias`, `lang`, `providerOverride`, and Google session-token omission for AMap.
- Kept full text search behavior unchanged: search still uses its existing center `locationBias`, with the same country, language, and provider override context.
- Added real MSW request-body assertions covering the autocomplete bbox and full-search center bias, including country normalization and explicit AMap override.

Verification:
- `git diff --check`: passed.
- `npm run lint:pages --workspace=client`: passed (`Page pattern OK`).
- `npm run theme:lint --workspace=client`: completed; repository-wide existing report shows 704 hardcoded-style hits across 148 files. No new styling was added.
- Focused client tests: blocked because `vitest` is unavailable (`vitest: command not found`).
- Client typecheck: blocked by missing workspace dependencies/types (`react`, `axios`, `zod`, `vitest`, `msw`, Node types, etc.); output also contains existing unrelated test typing errors.

Concerns:
- Runtime regression tests require restored/installable client dependencies.
- Task 6 scope only: `client/src/components/Planner/PlaceFormModal.tsx` and its co-located test were changed; no provider identity, session-token, offline, or UI behavior was otherwise changed.
