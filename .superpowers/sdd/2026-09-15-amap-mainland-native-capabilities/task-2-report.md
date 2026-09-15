# Task 2 Report — AMap external place and route opening

## Implementation

- Added `client/src/components/Map/externalNavigation.ts` as the shared AMap place/route URI builder.
- AMap is emitted only for explicit `countryCode: CN` context and `provider: amap` places.
- Place details use the official `https://uri.amap.com/poidetail` contract with `poiid` and optional mobile `callnative=1`; unsupported marker-only parameters are not emitted.
- Route opening uses the documented `https://uri.amap.com/navigation` shape, maps driving/walking/cycling to `car`/`walk`/`ride`, preserves one via point, and returns `null` instead of dropping extra stops.
- WGS84-to-GCJ-02 conversion is isolated in the shared AMap module; desktop/mobile call sites use the same builder.
- Wired planner sidebar/context menu, inspector, mobile place sheet, desktop route calculator, desktop day route, and mobile day route/timeline.

## Independent verification

- `npm run typecheck --workspace=client` — PASS.
- `npm run test --workspace=client -- --run src/components/Map/externalNavigation.test.ts src/components/Planner/placeNavigation.test.ts src/mobile/screens/trip/lib/dayRoute.test.ts` — PASS, 3 files / 26 tests.
- Final focused run after official POI-contract tightening: `npm run test --workspace=client -- --run src/components/Map/externalNavigation.test.ts src/components/Planner/placeNavigation.test.ts` — PASS, 2 files / 17 tests.
- `git diff --check` — PASS.
- Official AMap evidence: URI POI detail documentation lists `https://uri.amap.com/poidetail`, required `poiid`, optional `callnative`; URI marker documentation records `position` as `lon,lat`, default GCJ-02 and explicit coordinate options. Route URI evidence was recorded in the execution ledger from the official URI navigation documentation.

## Commit

`b1083118 feat(maps): add AMap external navigation links`

## Scope boundary

- No private Android/iOS scheme is emitted.
- No AMap API key is placed in client URLs.
- No unsupported multi-via route is emitted.
- Task 3 has not started.
