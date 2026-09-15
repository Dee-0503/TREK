# AMap Mainland Native Capabilities — Incremental Implementation Plan

> **Status:** preparation only. This plan is for the controller to implement one task at a time with an independent review after each task. It does not authorize implementation, commit, push, deployment, deletion, or any network/test execution during preparation.
>
> **Baseline:** `feat/amap-routing-final` at `1d6018fe67a2edd6faf73a9eaed8cbfdffdcac77`, expected clean.
>
> **Purpose:** extend the existing AMap integration with Mainland-native place, POI, route-opening, reverse-geocode, detail projection, and narrowly scoped share/import capabilities without replacing the existing overseas providers or TREK's offline-first architecture.

## Global Constraints

- Add only AMap capabilities. Preserve native Google, OSM/Nominatim, OSRM, and existing Transitous behavior for their current scopes; do not expand Transitous into another transport provider.
- TREK's internal place and route coordinate boundary remains WGS84-compatible. All AMap-specific conversion is isolated inside the AMap adapter boundary; never convert in React, generic persistence, route ordering, or rendering code.
- Preserve the existing offline/repository/Dexie/mutation-queue architecture. Saved place basics remain offline-compatible; do not cache arbitrary provider search pages in IndexedDB or bypass repos with component-level API calls.
- REST, MCP, and `@trek/shared` contracts must agree on URL/method/body/query/status/envelope and provider identity. A REST change must have the corresponding MCP change in the same task.
- Do not create a second provider registry, duplicate service facade, or large framework. Extend the current `MapsService`, `ProviderRouter`, `MapsProvider`/`RouteProvider`, and existing cache/config seams.
- Native desktop and mobile entries share builders/hooks/helpers. No duplicated business logic between desktop and phone shells.
- Every new translation key is added with a real translation to every locale under `shared/src/i18n/*`; parity and placeholder checks remain mandatory.
- Do not change security gates, auth defaults, SSRF rules, quality thresholds, or fallback safety. Never expose AMap credentials, signed URLs, or raw provider errors.
- Do not claim tests, official parameter support, network behavior, or real-device behavior until actually verified. Preparation is offline and does not run tests.
- Keep scope away from real-time navigation: no turn-by-turn instructions, navigation voice, live traffic, dynamic rerouting, traffic-aware ETA, or navigation SDK embedding.
- “Upstream update” means compatibility with future TREK upstream merges. Keep AMap protocol assumptions in a small adapter/config seam so upstream changes and AMap API changes remain isolated.

## Required precondition: official AMap documentation verification

Before implementing any provider-specific request, the controller must verify current official AMap documentation and account authorization, recording the exact endpoint, required parameters, response fields, coordinate semantics, quota/product permission, and terms for:

1. POI text search, input tips, details, reverse geocode, and viewport/nearby POI search;
2. driving, walking, and cycling route endpoints and their supported waypoint limits;
3. official place URL/search URL and multi-point route URL formats for external opening;
4. any documented share-URL import mechanism.

No parameter names, signing rules, URL format, coordinate conversion direction, or authorization may be inferred from memory. If share import has no stable, documented, authorized interface, the feature is explicitly blocked or limited to a safe “unsupported link” response; never scrape arbitrary AMap pages.

## Shared interfaces and sequencing

The tasks are serial. Each task consumes the shared interface produced by the preceding task and leaves a testable boundary for the next one.

### Task 1 — Reconcile geographic context and provider identity end to end

**Files to inspect/modify**

- `shared/src/maps/maps.schema.ts`
- `shared/src/place/place.schema.ts`
- `server/src/nest/maps/maps.dto.ts`
- `server/src/nest/maps/maps.controller.ts`
- `server/src/nest/maps/maps.service.ts`
- `server/src/nest/maps/maps.mcp.ts`
- `server/src/nest/maps/providers/provider-router.ts`
- `client/src/api/client.ts`
- `client/src/components/Planner/PlaceFormModal.tsx`
- `client/src/components/Planner/AddressInput.tsx`
- `client/src/components/Planner/LocationSelect.tsx`
- `client/src/components/Planner/PlaceInspector.tsx`
- `client/src/mobile/journey/MJourneyEntrySheet.tsx`
- relevant maps/controller/API/MCP/client tests already covering context

**Interface**

- Normalize one `GeographicContext` shape for search, autocomplete, details, reverse, POI, and route requests.
- Keep `providerOverride` distinct from persisted `providerIdentity`; namespaced AMap IDs must not enter Google branches.
- Add context-bearing REST and MCP inputs where missing, including reverse-geocode context. The client must forward the same context for autocomplete and submitted search.
- Define an explicit mainland decision: only verified `CN` context or a separately documented, validated provider result may select AMap. `HK`, `MO`, `TW`, unknown context, and overseas trips must not silently route to AMap. UI language is never geographic evidence.

**Tests and acceptance**

- Add controller, shared schema, client API, and MCP tests for reverse context propagation, case normalization, invalid context, explicit override, unknown context, and overseas non-routing.
- Assert REST/MCP details and reverse calls preserve provider identity and context, while legacy calls remain compatible.
- Acceptance: the same context arrives at provider selection from desktop and mobile paths; an overseas trip cannot be accidentally routed to AMap; no implementation code is added in this task beyond the controller-approved change set.

### Task 2 — Add one shared builder for native AMap place and route opening

**Files to inspect/modify**

- `client/src/components/Planner/placeNavigation.ts`
- `client/src/components/Map/RouteCalculator.ts`
- `client/src/mobile/screens/trip/lib/dayRoute.ts`
- `client/src/components/Planner/DayPlanSidebar.tsx`
- `client/src/components/Planner/PlaceInspector.tsx`
- `client/src/components/Collections/CollectionPlaceDetail.tsx`
- `client/src/mobile/sheets/MPlaceSheet.tsx`
- `client/src/components/shared/NavigationMenu.tsx`
- related navigation/day-route tests

**Interface**

- Extend the existing `NavigationTarget`/route-link helper rather than adding an AMap-only component. A place target receives normalized name, address, coordinates, provider identity, and optional details URL; a day target receives ordered named waypoints and the selected profile.
- Add AMap as a native external target only for supported Mainland contexts and only after Task 0 official URL/parameter verification. Use a single builder consumed by `placeNavigation`, `RouteCalculator`, desktop day routes, and mobile `dayRoute`.
- Preserve current Google, CoMaps, OSM, Waze, and Apple behavior and installed-PWA handoff semantics. Do not put API keys in URLs.
- For one place, prefer the documented AMap place/search URL; for a day, use the documented multi-point route URL and preserve ordering. This is external opening, not in-app navigation.

**Tests and acceptance**

- Test place navigation from planner, inspector, collection, and mobile sheet inputs through the shared builder; test one-day/multi-point links from desktop and mobile helpers.
- Cover missing coordinates, unsafe/unverified URLs, non-Mainland context, long names, URL encoding, profile mapping, and provider identity collisions.
- Acceptance: all existing entry points expose the same native target decision and URL builder; no desktop/mobile business-logic copy; no unsupported AMap URL is emitted.

### Task 3 — Replace Mainland Overpass-only POI exploration with an AMap-capable provider path

**Files to inspect/modify**

- `server/src/nest/maps/maps.service.ts`
- `server/src/nest/maps/maps.controller.ts`
- `server/src/nest/maps/maps.mcp.ts`
- `server/src/nest/maps/maps.helpers.ts`
- `server/src/nest/maps/providers/maps-provider.ts`
- `server/src/nest/maps/providers/amap.provider.ts`
- `server/src/nest/maps/providers/provider-router.ts`
- `client/src/api/client.ts`
- `client/src/components/Map/usePoiExplore.ts`
- `client/src/components/Map/poiCategories.ts`
- corresponding server/client/MCP POI tests

**Interface**

- Generalize the existing `pois(category, bbox, lang)` facade to accept geographic context and return a provider-neutral POI projection with `source`, `providerIdentity`, `truncated/clamped` (where applicable), and normalized coordinates/address fields.
- In Mainland China, use the officially verified AMap nearby/viewport-capable operation instead of treating Overpass as the only path. Outside Mainland China, preserve the current Overpass/OSM behavior. A manual provider override is validated and cannot silently turn an overseas request into AMap.
- Keep the existing viewport bounds, result caps, request deduplication, short TTL, timeout, response-size cap, and error envelope. Do not build a bulk AMap mirror or prefetch across pages.
- Ensure MCP `search_pois` describes the actual provider-neutral behavior and calls the same service path as REST.

**Tests and acceptance**

- Test Mainland AMap selection, overseas Overpass selection, explicit overrides, unknown context, empty/error responses, viewport limits, bounded cache, and identity-safe result mapping.
- Test client forwarding and rendering of normalized results without a provider-specific UI fork; test MCP result parity with REST.
- Acceptance: Mainland POI explore no longer depends on Overpass-only coverage, while overseas OSM behavior and existing offline/read architecture remain unchanged.

### Task 4 — Structured address, reverse geocode, and verified AMap details projection

**Files to inspect/modify**

- `server/src/nest/maps/providers/amap.provider.ts`
- `server/src/nest/maps/maps.service.ts`
- `server/src/nest/maps/maps.controller.ts`
- `server/src/nest/maps/maps.mcp.ts`
- `shared/src/maps/maps.schema.ts`
- `shared/src/place/place.schema.ts`
- `server/src/nest/places/places.service.ts`
- `server/src/nest/places/places.helpers.ts`
- `client/src/api/client.ts`
- `client/src/components/Planner/PlaceFormModal.tsx`
- `client/src/components/Planner/PlaceDetailsColumn.tsx`
- `client/src/components/Planner/PlaceInspector.tsx`
- `client/src/mobile/journey/MJourneyEntrySheet.tsx`
- all relevant place/maps/reverse/MCP tests

**Interface**

- Define a minimal structured-address projection only from fields confirmed in official AMap responses, while retaining the existing display `address` string and nullable semantics. Do not expose raw provider payloads.
- Project only proven AMap details fields already consumed by TREK: stable provider identity, name, address, coordinates, phone, website where valid, category/types, and opening-hours fields where the current `PlaceHours` contract supports them. Missing or partial fields remain missing.
- Reverse geocode uses the same provider router/context path as search/details; failures retain existing empty-result semantics and must not break offline editing.
- Preserve provider-aware persistence and cache identity. AMap details never enter Google photos/reviews/session-token branches.

**Tests and acceptance**

- Mock official-shaped responses and assert field projection, malformed/partial payload rejection, coordinate boundary conversion, missing hours, provider-qualified ID handling, cache-key separation, and REST/MCP parity.
- Verify desktop and mobile place forms/inspectors reopen AMap places and show the existing empty/partial state when details are unavailable.
- Acceptance: structured address and details are useful but conservative, with no invented data or provider leakage; reverse context works through REST, client, and MCP.

### Task 5 — Incrementally expose native route planning and candidate routes without navigation semantics

**Files to inspect/modify**

- `server/src/nest/maps/providers/amap.provider.ts`
- `server/src/nest/maps/maps.service.ts`
- `server/src/nest/maps/maps.controller.ts`
- `server/src/nest/maps/maps.mcp.ts`
- `shared/src/maps/maps.schema.ts`
- `client/src/api/client.ts`
- `client/src/components/Map/RouteCalculator.ts`
- `client/src/hooks/useRouteCalculation.ts`
- `client/src/hooks/useTransportRoutes.ts`
- `client/src/components/Planner/DayPlanSidebar.tsx`
- `client/src/mobile/screens/trip/lib/dayRoute.ts`
- route fallback, route source, and route UI tests

**Interface**

- Keep `calculateRoute({ profile, waypoints, context, override })` and the existing `routeSource` metadata. AMap remains limited to driving/walking/cycling; Transitous stays untouched.
- Use only officially verified route parameters and waypoint limits. Normalize a primary route and, if the official response provides stable alternatives, expose a bounded candidate-route projection (provider, distance, duration, geometry, fallback metadata) without turn instructions, traffic, or dynamic recomputation.
- Preserve one controlled AMap-to-OSRM fallback with stable reason, internal WGS84 geometry, existing optimization/locked-stop/hotel-anchor behavior, and cache keys including provider/context.
- Native external route opening from Task 2 remains separate from route calculation; calculated routes do not become navigation sessions.

**Tests and acceptance**

- Test all three profiles in Mainland China, overseas OSRM regression, explicit override, candidate-route truncation/normalization, malformed/unsupported responses, one fallback, OSRM failure, cache identity, and no traffic/instruction fields.
- Test route source display as accessible text in existing desktop/mobile presentation without duplicate logic.
- Acceptance: native AMap route planning is an additive provider path, not real-time navigation; actual source/fallback remains inspectable.

### Task 6 — AMap share URL import decision, limits, and operational compatibility

**Files to inspect/modify**

- `server/src/nest/maps/maps.service.ts`
- `server/src/nest/maps/maps.controller.ts`
- `server/src/nest/maps/maps.dto.ts`
- `server/src/nest/maps/maps.mcp.ts`
- `shared/src/maps/maps.schema.ts`
- `client/src/api/client.ts`
- `client/src/components/Planner/PlaceFormModal.tsx`
- `client/src/mobile/sheets/PlPlaceSearch.tsx`
- existing Google URL resolver/import surfaces and tests
- `server/src/app-config/env.schema.ts`, `server/src/app-config/derive.ts`, `server/src/app-config/README.md`, `server/.env.example`
- every affected `shared/src/i18n/*` map/place/undo file

**Interface**

- Treat AMap share URL import as the native counterpart to the existing Google capability. The controller must first record official support and authorization. If no stable official interface exists, return a safe, translated unsupported result or keep the path explicitly blocked; never scrape or follow arbitrary pages.
- If supported, accept only an allow-listed AMap host and documented URL shape through the existing SSRF and bounded-fetch rules; normalize to the same provider-neutral place projection and preserve provider identity. No arbitrary redirect chains, credentials, or bulk-list import.
- Make rate limiting an enforced runtime boundary for AMap requests, not merely a reserved setting, using the existing app-config and bounded-cache/dedup seams. Tests must prove per-instance/user scope, retry behavior, and no secret-bearing logs.
- Verify offline compatibility: saved imported basics use existing repositories and mutation queue; failed or unsupported imports do not create phantom Dexie rows.
- Add real translations for source labels, unsupported link, rate-limit, fallback, missing hours, structured-address, and fetched-time text in all locales. Do not modify `DESIGN.md`; record the required design-source amendments for controller follow-up.

**Tests and acceptance**

- Test supported and unsupported URL decisions, host allow-list/SSRF rejection, malformed links, bounded response size/time, rate limiting, cache/dedup identity, REST/MCP parity, offline save/replay/rollback, and i18n parity/placeholders.
- Acceptance: either a documented, narrowly safe AMap import works through the existing flow, or the absence of an official stable interface is clearly surfaced and the feature remains blocked without scraping.

## Final controller verification (not performed during preparation)

After Tasks 1–6 are implemented and independently reviewed, the controller should run the smallest relevant tests per task, then the shared build before server/client typechecks, followed by REST/MCP parity, i18n strict parity, client page/theme gates, and the repository's normal quality gates. Official AMap endpoint/parameter evidence, account permission, cache/rate-limit behavior, and any real-device URL handoff must be recorded as verified facts or explicit blockers. No commit, push, PR, deployment, or design-file edit is implied by this plan.

## Design-source synchronization items for controller review

`DESIGN.md` currently describes the initial AMap scope as excluding AMap URL import and does not spell out viewport POI replacement, native external place/day route links, structured-address projection, or candidate routes. The controller must not silently edit it during implementation. Before delivery, decide whether to amend the design source to document these newly authorized incremental behaviors, while retaining the existing entry points, semantic tokens, desktop/mobile shells, source text accessibility, WGS84 boundary, offline/cache constraints, Transitous scope, and explicit exclusion of navigation instructions/live traffic.
