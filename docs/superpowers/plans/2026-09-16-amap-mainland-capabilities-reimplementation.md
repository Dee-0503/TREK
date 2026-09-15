# AMap Mainland Capabilities Reimplementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with an independent review after every task.

**Goal:** Reimplement Tasks 1–6 from verified contracts so Mainland AMap behavior is context-safe, provider-neutral, testable, and does not claim unsupported share import.

**Architecture:** Keep `GeographicContext` as the single routing input and extend the existing `ProviderRouter`, `MapsService`, provider adapters, REST/MCP contracts, and offline-first client seams. AMap-specific coordinate conversion and upstream payload parsing remain inside `server/src/nest/maps/providers/`; desktop and mobile external links share one pure client builder. Unsupported AMap share URLs return a translated, typed result without scraping.

**Tech Stack:** TypeScript, NestJS, React 19, Zod, Vitest, Axios, SQLite, existing MapsProvider/RouteProvider abstractions.

**Spec:** `docs/superpowers/plans/2026-09-15-amap-mainland-native-capabilities.md` and `DESIGN.md`.

## Global Constraints

- Internal coordinates remain WGS84; AMap conversion is provider-boundary code only.
- Only explicit, validated `CN` context selects AMap automatically; `HK`, `MO`, `TW`, unknown, and overseas contexts never infer Mainland.
- REST, MCP, shared schemas, client API, and provider identity must agree.
- Preserve Google, OSM/Nominatim, OSRM, Transitous, offline repositories, cache bounds, timeout bounds, auth, SSRF, and quality gates.
- Never put AMap keys in client URLs; never expose raw provider payloads or raw upstream errors.
- Never scrape AMap pages or invent private mobile schemes.
- Every task ends with focused tests, typecheck where applicable, independent diff review, and a Conventional Commit.
- Do not push, deploy, delete, reset, or overwrite unrelated worktrees during implementation.

---

### Task 1: Rebuild the geographic-context contract end to end

**Files:**
- Modify: `shared/src/maps/maps.schema.ts`, `shared/src/maps/maps.schema.spec.ts`
- Modify: `server/src/nest/maps/maps.dto.ts`, `server/src/nest/maps/maps.controller.ts`, `server/src/nest/maps/maps.mcp.ts`, `server/src/nest/maps/providers/provider-router.ts`
- Modify: `client/src/api/client.ts`, `client/src/mobile/screens/trip/sheets/PlPlaceSearch.tsx`, `client/src/mobile/screens/trip/sheets/MPlaceEditSheet.tsx`
- Test: `server/tests/unit/nest/maps.controller.test.ts`, `server/tests/unit/mcp/tools-tags-maps-weather.test.ts`, `client/src/api/client.behavior.test.ts`, `client/src/api/client.surface.test.ts`

**Interfaces:**
- `geographicContextSchema` produces `{ countryCode?: Uppercase<string>; latitude?: number; longitude?: number; providerOverride?: 'google'|'amap'|'osm' }`.
- `ProviderRouter.resolvePlaceProvider(context)` and `resolveRouteProvider(context)` accept only this request context plus their existing legacy alias.
- Legacy client signatures remain valid; new context-bearing overloads forward the same normalized fields.

- [ ] Write tests for lower-case country normalization, invalid country/coordinates, explicit override, unknown context, reverse REST/MCP parity, and overseas non-routing.
- [ ] Run the shared/controller/MCP/client focused tests and confirm the new assertions fail before changing implementation.
- [ ] Implement schema normalization and controller parsing outside service error-swallowing blocks; preserve legacy calls when no context exists.
- [ ] Forward context from desktop/mobile search, autocomplete, details, and reverse calls without deriving geography from UI language.
- [ ] Run focused tests, all three package typechecks, and `git diff --check`.
- [ ] Review the diff for provider identity leakage into Google branches; commit `fix(maps): normalize geographic context contracts`.

### Task 2: Rebuild one shared AMap external-link boundary

**Files:**
- Create/replace: `client/src/components/Map/externalNavigation.ts`, `client/src/components/Map/externalNavigation.test.ts`
- Modify: `client/src/components/Planner/placeNavigation.ts`, `client/src/components/Map/RouteCalculator.ts`, `client/src/mobile/screens/trip/lib/dayRoute.ts`
- Modify: `client/src/components/Planner/DayPlanSidebar.tsx`, `client/src/components/Planner/PlaceInspector.tsx`, `client/src/components/Collections/CollectionPlaceDetail.tsx`, `client/src/mobile/screens/trip/sheets/MPlaceSheet.tsx`, `client/src/mobile/screens/trip/plan/useMPlanTimeline.ts`, `client/src/mobile/screens/trip/plan/MPlanTimeline.tsx`
- Test: existing planner navigation and mobile day-route tests

**Interfaces:**
- `buildAmapPlaceUrl(input, context, options): string|null` accepts a provider-qualified AMap ID and emits only documented POI-detail parameters.
- `buildAmapRouteUrl(waypoints, profile, context, options): string|null` accepts 2–3 ordered WGS84 waypoints and returns null for unsupported profiles/counts.
- `getNavigationTargets(place, detailsUrl, context)` remains compatible with all existing providers.

- [ ] Add failing tests for CN/non-CN, provider collision, missing coordinates/ID, URL encoding, driving/walking/cycling, one via, and more-than-one via.
- [ ] Verify current official URI docs for endpoint, parameters, mobile handoff, coordinate semantics, and waypoint limit; record source URL and exact supported fields in the task report.
- [ ] Implement the pure builder with conversion isolated in this module, no API key, no private scheme, and no undocumented query fields.
- [ ] Wire every existing desktop/mobile entry point through the shared builder; do not create an AMap-only component.
- [ ] Run focused tests and client typecheck; independently inspect every call site; commit `feat(maps): add verified AMap external links`.

### Task 3: Implement a real bounded AMap viewport/nearby POI adapter

**Files:**
- Modify: `server/src/nest/maps/providers/maps-provider.ts`, `server/src/nest/maps/providers/amap.provider.ts`, `server/src/nest/maps/providers/amap.coordinates.ts`
- Modify: `server/src/nest/maps/maps.service.ts`, `server/src/nest/maps/maps.controller.ts`, `server/src/nest/maps/maps.mcp.ts`, `server/src/nest/maps/maps.helpers.ts`, `server/src/nest/maps/providers/provider-router.ts`
- Modify: `shared/src/maps/maps.schema.ts`, `client/src/api/client.ts`, `client/src/components/Map/usePoiExplore.ts`
- Test: `server/tests/unit/nest/maps.amap.test.ts`, `server/tests/unit/nest/maps.service.test.ts`, controller/MCP maps tests, `client/src/components/Map/usePoiExplore.test.tsx`

**Interfaces:**
- `MapsProvider.searchPois?(category, bbox, options): Promise<ProviderPoiSearchResult>` is provider-neutral and bounded.
- `MapsService.pois(category, bbox, lang?, context?): Promise<PoiSearchResult>` selects AMap only for valid CN context and otherwise calls Overpass.
- `PoiSearchResult` includes `source`, `providerIdentity`, normalized WGS84 coordinates, `truncated`, and `clamped`.

- [ ] Confirm the official AMap viewport/nearby endpoint, required category/location/bounds fields, response fields, quotas, and coordinate semantics; do not reuse text search as a viewport substitute.
- [ ] Add failing adapter tests for official-shaped success, malformed payload, empty response, bounds clamp, result cap, timeout, cache key, and namespaced identity.
- [ ] Implement the AMap POI operation inside `AmapProvider`, including GCJ-02/WGS84 conversion only at the adapter boundary and bounded cache/inflight behavior.
- [ ] Route REST and MCP through the same service method; preserve Overpass for non-CN and invalid/unknown contexts; reject invalid manual overrides instead of silently changing geography.
- [ ] Forward context from the client hook and verify normalized results render through the existing POI UI.
- [ ] Run server/client focused tests and typechecks; review for accidental text-search fallback; commit `feat(maps): add bounded AMap POI exploration`.

### Task 4: Make details, reverse geocode, and structured address conservative

**Files:**
- Modify: `server/src/nest/maps/providers/amap.provider.ts`, `server/src/nest/maps/maps.service.ts`, `server/src/nest/maps/maps.controller.ts`, `server/src/nest/maps/maps.mcp.ts`
- Modify: `shared/src/maps/maps.schema.ts`, `shared/src/place/place.schema.ts`
- Modify: `server/src/nest/places/places.service.ts`, `server/src/nest/places/places.helpers.ts`, `client/src/api/client.ts`, `client/src/components/Planner/PlaceFormModal.tsx`, `client/src/components/Planner/PlaceDetailsColumn.tsx`, `client/src/components/Planner/PlaceInspector.tsx`, `client/src/mobile/journey/MJourneyEntrySheet.tsx`
- Test: AMap adapter, maps controller/MCP, place persistence, reverse, and client details tests

**Interfaces:**
- Structured address fields are nullable and contain only verified AMap response fields.
- AMap details return namespaced identity and never enter Google session-token/photos/reviews branches.
- Reverse uses the same context/router path and preserves empty-result failure semantics.

- [ ] Add failing tests for complete/partial/malformed details, missing hours, reverse context, cache-key separation, coordinate boundaries, and provider-qualified IDs.
- [ ] Verify official AMap detail/reverse response fields and document the exact allow-listed projection.
- [ ] Implement conservative parsing and projection; reject malformed provider payloads with bounded internal errors.
- [ ] Update persistence and desktop/mobile forms to preserve optional fields without creating phantom offline rows.
- [ ] Run focused tests, i18n parity if keys change, and typechecks; commit `feat(maps): project conservative AMap place details`.

### Task 5: Rebuild route planning as additive AMap provider behavior

**Files:**
- Modify: `server/src/nest/maps/providers/amap.provider.ts`, `server/src/nest/maps/maps.service.ts`, `server/src/nest/maps/maps.controller.ts`, `server/src/nest/maps/maps.mcp.ts`
- Modify: `shared/src/maps/maps.schema.ts`, `client/src/api/client.ts`, `client/src/components/Map/RouteCalculator.ts`, `client/src/hooks/useRouteCalculation.ts`, `client/src/hooks/useTransportRoutes.ts`, planner/mobile route views
- Test: `server/tests/unit/nest/routes.amap-fallback.test.ts`, route controller/MCP tests, client route tests

**Interfaces:**
- `calculateRoute({ profile, waypoints, context, override })` preserves existing route source/fallback metadata.
- AMap is limited to driving/walking/cycling; Transitous remains unchanged.
- Candidate routes, if official response supports them, are capped and contain only provider, distance, duration, geometry, and fallback metadata.

- [ ] Verify official route endpoints, required parameters, waypoint limit, supported profiles, alternative-route fields, and coordinate semantics.
- [ ] Add failing tests for each profile, Mainland/overseas/override selection, alternatives cap, malformed response, one fallback, OSRM failure, cache identity, and no traffic/instruction fields.
- [ ] Implement normalized primary/candidate routes and exactly one controlled OSRM fallback.
- [ ] Keep WGS84 geometry at the service boundary and expose route source as accessible text in existing desktop/mobile views.
- [ ] Run focused tests and typechecks; commit `feat(maps): normalize additive AMap routes`.

### Task 6: Implement safe AMap share-link handling and operational limits

**Files:**
- Modify: `shared/src/maps/maps.schema.ts`, `server/src/nest/maps/maps.dto.ts`, `server/src/nest/maps/maps.controller.ts`, `server/src/nest/maps/maps.service.ts`, `server/src/nest/maps/maps.mcp.ts`
- Modify: `client/src/api/client.ts`, `client/src/components/Planner/PlaceFormModal.tsx`, `client/src/mobile/sheets/PlPlaceSearch.tsx`
- Modify: app-config/env docs and every affected locale file under `shared/src/i18n/*`
- Test: URL resolver, SSRF/bounded-fetch, rate-limit/cache/dedup, REST/MCP parity, offline mutation queue, i18n parity

**Interfaces:**
- `mapsResolveUrlResultSchema` becomes a discriminated result: `{ status: 'resolved', place: ... } | { status: 'unsupported', provider: 'amap', reason: ... }` while preserving a compatibility adapter for the existing Google response.
- AMap URL acceptance is host-allow-listed and only uses a documented URL shape; absent official import support returns translated `unsupported` without network scraping.
- AMap requests use an enforced per-instance/user limiter at the existing provider boundary.

- [ ] Verify whether an official stable authorized AMap share-import endpoint exists; if absent, write the unsupported contract test first.
- [ ] Add failing tests for supported/unsupported decisions, malicious host/redirect/credential rejection, malformed links, size/time caps, limiter retry behavior, cache/dedup identity, REST/MCP parity, and no phantom offline rows.
- [ ] Implement the discriminated result and safe unsupported UI path; never fetch arbitrary AMap HTML.
- [ ] Enforce the existing rate-limit seam for AMap calls and ensure logs contain no key or signed URL.
- [ ] Add real translations to every locale and run strict i18n parity/placeholders.
- [ ] Run focused tests and typechecks; commit `feat(maps): handle AMap share links safely`.

### Final verification and delivery

- [ ] Build shared before server/client typechecks.
- [ ] Run focused T1–T6 suites, then shared/server/client full suites with captured exit codes.
- [ ] Run `npm run i18n:parity:strict --workspace=shared`, client `lint:pages`, `theme:lint`, and repository quality checks.
- [ ] Independently review the complete diff and commit history; fix every new failure before delivery.
- [ ] Push `feat/amap-routing-final` only after all required gates pass and the user’s existing delivery authorization remains applicable.
- [ ] Deploy using the repository’s documented deployment path; run health checks and record exact results.
