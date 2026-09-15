# Task 3 Report — Mainland POI provider routing

- `MapsService.pois` now resolves the existing `ProviderRouter`; explicit Mainland `CN` context with enabled AMap uses the existing normalized `AmapProvider.search` boundary.
- Overseas and unknown contexts retain the existing bounded Overpass path.
- REST accepts optional `countryCode` and `providerOverride`; MCP accepts the shared geographic context and calls the same service path.
- AMap results are projected into the existing provider-neutral POI result shape with namespaced identity, source, coordinates, address, phone, website and opening-hours text.

Verification:
- `npm run typecheck --workspace=server` — PASS.
- `npm run typecheck --workspace=client` — PASS.
- `npm run test --workspace=server -- --run tests/unit/nest/maps.controller.test.ts tests/unit/mcp/tools-tags-maps-weather.test.ts` — PASS, 2 files / 88 tests.
- `git diff --check` — PASS.

Commit: `3ee26b40 feat(maps): route mainland POI exploration through AMap`

Known limitation: the client POI explore hook retains its legacy call shape and does not yet source trip country context; REST/MCP callers can provide explicit context. Task 4–6 remain pending.
