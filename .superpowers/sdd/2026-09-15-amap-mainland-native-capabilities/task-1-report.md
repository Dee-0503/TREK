# Task 1 Report — Geographic Context and Provider Identity

## Modified files

- `/Users/ceemac/my_product/TREK/shared/src/maps/maps.schema.ts`
  - Unified `GeographicContext` with normalized two-letter `countryCode` and optional `providerOverride`.
  - Reused the same context fields for search, autocomplete, reverse, and details-facing MCP inputs.
- `/Users/ceemac/my_product/TREK/server/src/nest/maps/providers/provider-router.ts`
  - Kept `providerOverride` distinct from persisted provider identity and normalized the legacy `openstreetmap` alias to `osm`.
- `/Users/ceemac/my_product/TREK/server/src/nest/maps/maps.mcp.ts`
  - Added geographic context to details and reverse-geocode MCP tools and forwarded it to the same MapsService path.
- `/Users/ceemac/my_product/TREK/client/src/api/client.ts`
  - Added context-bearing details and reverse API parameters while preserving legacy string signatures.
- `/Users/ceemac/my_product/TREK/client/src/mobile/screens/trip/sheets/PlPlaceSearch.tsx`
  - Forwarded trip context, provider override, bias, and provider-qualified detail identity through mobile autocomplete/search/details.
- `/Users/ceemac/my_product/TREK/client/src/mobile/screens/trip/sheets/MPlaceEditSheet.tsx`
  - Passed normalized trip country context into the mobile place-search surface.

## Design decisions

- `providerIdentity` remains result/persistence identity; `providerOverride` is request-scoped routing intent and is never inferred from an ID except for the existing provider-qualified AMap details path.
- Country codes normalize case at the shared contract boundary. ProviderRouter still selects AMap automatically only for explicit `CN`; `HK`, `MO`, `TW`, unknown, and overseas contexts do not become Mainland China through language or fallback.
- Reverse-geocode callers can now pass `{ countryCode, latitude, longitude, providerOverride, lang }`; old `mapsApi.reverse(lat, lng, lang)` remains valid.
- The mobile place-search path now carries the same geographic evidence as the desktop path. No AMap endpoint or parameter was added.

## Test evidence

- `npm run test --workspace=shared -- --run src/maps/maps.schema.spec.ts` — PASS, 1 file / 19 tests.
- `npm run test --workspace=server -- --run tests/unit/nest/maps.controller.test.ts tests/unit/nest/maps.provider-router.test.ts` — PASS, 2 files / 49 tests.
- `npm run test --workspace=client -- --run src/api/client.behavior.test.ts src/api/client.surface.test.ts` — PASS, 2 files / 98 tests.
- `npm run typecheck --workspace=shared` — PASS.
- `npm run typecheck --workspace=server` — PASS.
- `npm run typecheck --workspace=client` — PASS.

## Unresolved risks

- Existing desktop `AddressInput`/`LocationSelect` props remain compatible but do not themselves own a richer context object; their existing country/provider props continue to be forwarded.
- Existing journey data does not expose a verified country code in `JourneyTrip`, so journey reverse calls retain the legacy no-context behavior rather than guessing geography.
- Existing controller unit coverage does not yet assert every new reverse/details context query permutation; implementation typechecks and the pre-existing controller/router suites pass.

## Round 2 fix attempt — 2026-09-15

### Changes

- `/Users/ceemac/my_product/TREK/client/src/mobile/screens/trip/sheets/PlPlaceSearch.tsx`
  - Confirmed fallback text search carries the full language, country, provider override, and location bias context.
  - Confirmed `fetchSuggestions` captures `countryCode` and `providerOverride` in its callback dependencies.
- `/Users/ceemac/my_product/TREK/server/src/nest/maps/maps.controller.ts`
  - Removed the invalid `@Query('lang')` search parameter and now reads `lang` only from the validated `MapsSearchDto` body, matching `mapsSearchRequestSchema` and `mapsApi.search`.
  - Reverse context parsing now occurs outside the service-error-swallowing `try` block, so invalid context returns HTTP 400 instead of being converted to an empty reverse result.
- `/Users/ceemac/my_product/TREK/server/tests/unit/nest/maps.controller.test.ts`
  - Updated search language assertions to the body contract and added reverse normalization/invalid/unknown-override coverage.
- `/Users/ceemac/my_product/TREK/server/tests/unit/mcp/tools-tags-maps-weather.test.ts`
  - Updated details assertions for the context argument and added explicit/invalid details and reverse context parity coverage.

### Verification commands and results

- `npm run build --workspace=shared` — PASS.
- `npm run test --workspace=shared -- --run src/maps/maps.schema.spec.ts` — PASS, 1 file / 21 tests.
- `npm run test --workspace=server -- --run tests/unit/nest/maps.controller.test.ts` — PASS, 1 file / 44 tests.
- `npm run test --workspace=server -- --run tests/unit/mcp/tools-tags-maps-weather.test.ts` — PASS, 1 file / 44 tests.
- `npm run test --workspace=client -- --run src/api/client.behavior.test.ts src/api/client.surface.test.ts` — PASS, 2 files / 98 tests.
- `npm run typecheck --workspace=shared` — PASS.
- `npm run typecheck --workspace=server` — PASS.
- `npm run typecheck --workspace=client` — PASS.
- `git diff --check` — PASS.

### Failed attempt resolved

- The first combined server run failed because newly added MCP assertions expected service calls from a separately instantiated service prototype path, and reverse controller invalid-context assertions were swallowed by the existing `try/catch`. Tests were corrected and rerun individually; both now pass.

### Remaining concerns

- No official AMap documentation/account authorization verification was performed, as prohibited by this task's no-network instruction and outside this round's scope.
- Existing POI REST/MCP paths remain intentionally unchanged; route `countryCode` schema unification was not expanded.

Working tree remains uncommitted. No network, browser, deployment, or provider documentation lookup was performed.
