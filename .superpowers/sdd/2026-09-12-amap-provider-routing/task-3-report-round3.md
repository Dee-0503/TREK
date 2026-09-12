# Task 3 fix round 3 report

## Changes

- Updated the shared search request contract with `countryCode` and `providerOverride`, and constructed the search `ProviderContext` from the validated POST body (including location-bias coordinates).
- Routed expanded `amap:` details through `AmapProvider.getDetails()` instead of returning null.
- Made AMap POI and tip identity fields strict; malformed successful elements now produce stable `invalid_response` errors, including details without valid coordinates.
- Added recursive canonical cache identity serialization so object property insertion order does not defeat cache or in-flight deduplication.
- Parsed weekly and today hours independently, falling back to today when weekly data has no valid parsed result.
- Added focused regression tests for contract context, malformed elements, canonical identity, hours fallback, and details validation.

## Verification

- `git diff --check`: passed.
- Focused Vitest command attempted: `npx vitest run tests/unit/nest/maps.amap.test.ts`.
- Test execution was blocked by the worktree dependency/module environment; the ad-hoc Vitest runner resolved the import root incorrectly (`Cannot find module '/src/nest/maps/providers/amap.provider'`).
- Prettier could not run because `prettier-plugin-organize-imports` is unavailable.

## Concerns

- Full focused tests, typecheck, and lint require the repository workspace dependencies and generated shared declarations to be installed/built.
- The requested search body fields were absent from the prior shared schema; this round adds them as the contract source of truth. Query compatibility is not retained for search because the shared body contract now governs precedence.
