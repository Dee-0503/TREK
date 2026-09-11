# AMap Provider Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend TREK with server-side AMap place and driving/walking/cycling providers for Mainland China while preserving overseas providers, explicit provider overrides, OSRM route fallback, standard Docker deployment, and an upstream-ready PR series.

**Architecture:** Keep the existing REST and MCP surfaces and add provider-neutral routing behind `MapsService` and the route calculation boundary. AMap credentials stay server-side; provider adapters normalize IDs, addresses, opening hours, and coordinates before returning shared contracts. Mainland-China requests prefer AMap, overseas requests retain Google/Nominatim and OSRM, and failed AMap routes fall back to OSRM with the actual source exposed.

**Tech Stack:** TypeScript, NestJS, Zod, React 19, Zustand, Dexie, Vitest, Docker/Compose, AMap Web Service API, existing Google Places/Nominatim/OSRM integrations.

**Spec:** `DESIGN.md`

## Global Constraints

- Target all upstream pull requests at `dev`, never `main`.
- Keep `origin` pointed at `git@github.com:Dee-0503/TREK.git` and `upstream` pointed at `https://github.com/liketrek/TREK.git`.
- Preserve existing REST URLs and MCP parity; do not expose AMap API keys to the browser.
- Keep TREK internal coordinates WGS84-compatible and isolate AMap coordinate conversion at the AMap adapter boundary.
- Use AMap POI 2.0 with `show_fields=business` for opening hours; missing hours remain valid data.
- AMap is the default for Mainland China place and supported route requests; overseas behavior remains Google/Nominatim and OSRM.
- AMap route failures fall back to OSRM and the response identifies the actual route provider and fallback state.
- Public transport remains on Transitous/MOTIS and is outside this implementation.
- Do not add AMap photos, AMap list URL import, Xiaohongshu, Douyin, or Meituan integrations in this change.
- Use bounded request deduplication and server-side caching for cost control; do not implement a bulk AMap POI mirror.
- Preserve existing UI components and interaction patterns. No visual redesign, color literals, arbitrary theme bypasses, or duplicated desktop/mobile business logic.
- Add tests with the implementation and preserve the repository's 80%+ coverage expectation.
- Do not commit, push, open a pull request, or publish a Docker image until the user explicitly authorizes that delivery step.

---

## File Map

### Create

- `server/src/nest/maps/providers/maps-provider.ts` — provider-neutral place provider and normalized result types.
- `server/src/nest/maps/providers/amap.provider.ts` — AMap Web Service client and normalization.
- `server/src/nest/maps/providers/amap.coordinates.ts` — AMap/internal coordinate conversion boundary.
- `server/src/nest/maps/providers/provider-router.ts` — geographic context, manual override, and provider selection.
- `server/tests/unit/nest/maps.amap.test.ts` — AMap adapter, normalization, errors, and cache-safe behavior.
- `server/tests/unit/nest/maps.provider-router.test.ts` — Mainland/overseas routing and overrides.
- `server/tests/unit/nest/routes.amap-fallback.test.ts` — AMap route fallback behavior.
- `docs/superpowers/plans/2026-09-12-amap-provider-routing.md` — this plan.

### Modify

- `shared/src/maps/maps.schema.ts` — provider-neutral request/result and route-source contracts.
- `shared/src/place/place.schema.ts` — provider identity fields and compatible place payloads.
- `server/src/app-config/env.schema.ts` — AMap runtime configuration and bounded cache/rate-limit options.
- `server/src/app-config/derive.ts` — derived AMap configuration.
- `server/src/app-config/README.md` — deployment configuration reference.
- `server/.env.example` — documented AMap variables without secrets.
- `server/src/nest/maps/maps.module.ts` — provider/router dependency wiring.
- `server/src/nest/maps/maps.service.ts` — provider-neutral facade and AMap delegation.
- `server/src/nest/maps/maps.controller.ts` / `maps.dto.ts` — request context and compatible responses.
- `server/src/nest/maps/maps.mcp.ts` — provider-neutral tool schemas/descriptions.
- `server/src/nest/places/places.service.ts` / `places.helpers.ts` / `places.mcp.ts` — provider-aware save, enrichment, matching, and MCP input.
- `server/src/db/schema.ts` / `server/src/db/migrations.ts` — provider identity migration and compatibility mapping if persistence is retained after the contract spike.
- `server/src/nest/route*` or the existing route service/controller files identified during implementation — route provider routing and fallback at the current route boundary.
- `client/src/api/client.ts` — provider override and geographic context forwarding.
- `client/src/components/Planner/PlaceFormModal.tsx` and helpers — shared search context, manual override, and normalized result persistence.
- `client/src/components/Planner/PlaceDetailsColumn.tsx` / `PlaceInspector.tsx` — source and fallback metadata using existing UI patterns.
- `client/src/components/Map/RouteCalculator.ts` / `client/src/hooks/useRouteCalculation.ts` — route source handling without provider-specific UI forks.
- `client/src/utils/placesSession.ts` — keep Google session tokens limited to Google requests.
- `shared/src/i18n/*/map.ts` and `shared/src/i18n/*/places.ts` — translated source, fallback, and missing-hours copy.
- `README.md`, `wiki/Environment-Variables.md`, relevant Docker/Compose docs, and `unraid-template.xml` — standard Docker deployment and AMap configuration.

### Verify

- `server/tests/integration/maps.test.ts`
- `server/tests/integration/places.test.ts`
- `server/tests/e2e/maps.e2e.test.ts`
- `server/tests/e2e/places.e2e.test.ts`
- `server/tests/unit/mcp/tools-places.test.ts`
- `server/tests/unit/mcp/tools-tags-maps-weather.test.ts`
- `client/src/api/client.surface.test.ts`
- `client/src/api/client.behavior.test.ts`
- `client/src/components/Planner/PlaceFormModal.test.tsx`
- `client/src/components/Planner/PlaceDetailsColumn.test.tsx`
- `client/src/components/Planner/PlaceInspector.test.tsx`
- existing route, hours-formatting, tile, and offline tests.

---

## Task 0: Verify upstream readiness and AMap account/network prerequisites

**Files:**
- Read-only: `CONTRIBUTING.md`, `DESIGN.md`, `server/src/app-config/env.schema.ts`, `server/.env.example`

**Interfaces:**
- Consumes: current `feat/amap-provider-routing`, `origin`, `upstream`, and `upstream/dev`.
- Produces: a recorded precondition checklist for implementation; no source change.

- [ ] **Step 1: Verify the branch and remotes**

Run:

```bash
git status --short --branch
git remote -v
git branch --show-current
git rev-parse --verify upstream/dev
```

Expected: clean `feat/amap-provider-routing`; `origin` is the fork; `upstream` is `liketrek/TREK`; baseline resolves to `upstream/dev`.

- [ ] **Step 2: Verify the contributor gate**

Before any upstream delivery, record whether the idea has been discussed in the repository's required Discord `#github-pr` channel and whether an issue number exists. Do not open a PR without both the discussion approval and linked issue required by `CONTRIBUTING.md`.

- [ ] **Step 3: Validate the server-side key without printing it**

On `cee-server`, run a command that reads the configured variable without outputting its value and calls one harmless geocode request. The command must print only `configured=yes/no`, HTTP status, AMap `status`, `info`, and result count. If the variable is not configured, stop this task and configure it through the server's secret/environment mechanism.

- [ ] **Step 4: Validate the minimum API matrix with a dedicated test key**

From `cee-server`, verify geocode, input tips, POI 2.0 text search with `show_fields=business`, POI 2.0 details with `show_fields=business`, and route endpoints for driving, walking, and cycling. Record only endpoint name, HTTP status, AMap status/info, and whether the expected field exists. Do not run a load test against the production key.

- [ ] **Step 5: Validate coordinate semantics before coding conversion**

Use six known points in Mainland China plus Hong Kong, Tokyo, and New York. Compare AMap geocode, reverse geocode, and coordinate conversion results, documenting the observed input/output coordinate semantics and maximum accepted error for TREK rendering. If the official account documentation or observations do not establish a safe conversion direction, keep the implementation behind a configuration guard and do not silently treat AMap coordinates as WGS84.

**Acceptance:** Network, key permission, route permission, and coordinate behavior are documented as facts or explicit blockers; no secret is exposed and no source file is changed.

---

## Task 1: Define provider-neutral shared contracts

**Files:**
- Modify: `shared/src/maps/maps.schema.ts`
- Modify: `shared/src/place/place.schema.ts`
- Test: `shared/src/maps/maps.schema.spec.ts`
- Test: `shared/src/place/place.schema.spec.ts`

**Interfaces:**
- Consumes: existing `mapsSearchRequest`, `mapsAutocompleteRequest`, details/enrichment, route result, and `placeSchema` contracts.
- Produces: `mapProviderSchema`, `placeProviderIdentitySchema`, `providerOverrideSchema`, geographic context schema, and route source/fallback fields consumed by server and client.

- [ ] **Step 1: Add failing schema tests**

Test these cases:

```ts
expect(mapProviderSchema.parse('amap')).toBe('amap')
expect(placeProviderIdentitySchema.parse({ provider: 'amap', providerPlaceId: 'B0FFFAB6J2' })).toEqual({ provider: 'amap', providerPlaceId: 'B0FFFAB6J2' })
expect(() => providerOverrideSchema.parse('unknown')).toThrow()
expect(routeSourceSchema.parse({ provider: 'osrm', fallback: true, fallbackReason: 'amap_timeout' })).toMatchObject({ provider: 'osrm', fallback: true })
```

Also assert old Google/OSM payloads remain parseable.

- [ ] **Step 2: Run the focused shared tests and verify failure**

Run:

```bash
npm run test --workspace=shared -- maps.schema.spec.ts place.schema.spec.ts
```

Expected: FAIL because the new schemas and fields do not exist.

- [ ] **Step 3: Implement the minimal schemas**

Use explicit provider values `google`, `amap`, and `osm`/`openstreetmap` according to the existing naming convention. Add optional request context fields for `countryCode`, `latitude`, `longitude`, and a manual provider override. Add route metadata:

```ts
{ provider: 'amap' | 'osrm', fallback: boolean, fallbackReason?: string }
```

Keep provider-specific raw payloads out of public shared responses.

- [ ] **Step 4: Run focused tests and rebuild shared**

Run:

```bash
npm run test --workspace=shared -- maps.schema.spec.ts place.schema.spec.ts
npm run build --workspace=shared
```

Expected: PASS and generated shared output is available to dependent workspaces.

- [ ] **Step 5: Commit the contract change when delivery is authorized**

```bash
git add shared/src/maps/maps.schema.ts shared/src/place/place.schema.ts shared/src/maps/maps.schema.spec.ts shared/src/place/place.schema.spec.ts
git commit -m "feat(maps): define provider-neutral place contracts"
```

Do not run this commit step until the user authorizes commits.

**Acceptance:** Shared contracts represent AMap without breaking existing Google/OSM payloads and expose actual route source/fallback state.

---

## Task 2: Add configuration, coordinate boundary, and provider router

**Files:**
- Create: `server/src/nest/maps/providers/maps-provider.ts`
- Create: `server/src/nest/maps/providers/amap.coordinates.ts`
- Create: `server/src/nest/maps/providers/provider-router.ts`
- Modify: `server/src/app-config/env.schema.ts`
- Modify: `server/src/app-config/derive.ts`
- Modify: `server/src/nest/maps/maps.module.ts`
- Test: `server/tests/unit/nest/maps.provider-router.test.ts`
- Test: `server/tests/unit/nest/maps.amap.test.ts`

**Interfaces:**
- Consumes: shared provider/context schemas and verified Task 0 coordinate observations.
- Produces:
  - `MapsProvider.search(query, options)`
  - `MapsProvider.autocomplete(input, options)`
  - `MapsProvider.getDetails(providerPlaceId, options)`
  - `MapsProvider.reverseGeocode(coordinates, options)`
  - `ProviderRouter.resolvePlaceProvider(context)`
  - `ProviderRouter.resolveRouteProvider(context)`
  - `AmapCoordinates.toInternal()` and `AmapCoordinates.toProvider()`.

- [ ] **Step 1: Write provider-router failing tests**

Cover:

```ts
expect(router.resolvePlaceProvider({ countryCode: 'CN' })).toBe('amap')
expect(router.resolvePlaceProvider({ countryCode: 'US' })).toBe('google')
expect(router.resolvePlaceProvider({ override: 'osm', countryCode: 'CN' })).toBe('osm')
expect(router.resolvePlaceProvider({ countryCode: 'HK' })).not.toBe('amap')
expect(router.resolveRouteProvider({ countryCode: 'CN' })).toBe('amap')
```

Cover unknown context using the configured default provider rather than guessing from UI language.

- [ ] **Step 2: Write coordinate conversion failing tests**

Use the Task 0 known points and assert that provider-to-internal-to-provider round trips stay within the observed tolerance. Include Mainland China and a non-Mainland point so the adapter never applies Mainland-only conversion outside its scope.

- [ ] **Step 3: Add typed configuration**

Add runtime-only settings with safe defaults:

```text
AMAP_API_KEY
AMAP_API_BASE=https://restapi.amap.com
PLACES_PROVIDER_MODE=auto
AMAP_TIMEOUT_MS
AMAP_CACHE_TTL_SECONDS
AMAP_RATE_LIMIT_PER_MINUTE
```

Keep the key secret and reject invalid public endpoints using the existing SSRF/configuration validation patterns. Do not reuse `PLACES_API_KEY`, whose existing meaning is Google Places.

- [ ] **Step 4: Implement the provider interface and router**

Keep routing server-side. Manual override must be validated against enabled providers. Mainland China means explicit `CN` context or a verified Mainland result; Hong Kong, Macau, Taiwan, and unknown regions must not be silently grouped into Mainland China.

- [ ] **Step 5: Implement and test the coordinate boundary**

Apply only the verified conversion direction at the AMap adapter boundary. Normalized results leaving the adapter use TREK's internal coordinate convention. Never convert coordinates in React components, route line rendering, or generic place persistence code.

- [ ] **Step 6: Run focused tests and typecheck**

Run:

```bash
npm run test --workspace=server -- maps.provider-router.test.ts maps.amap.test.ts
npm run typecheck --workspace=server
```

Expected: PASS with no API calls to AMap in unit tests.

**Acceptance:** Provider selection is deterministic, overrideable, explicitly handles unknown/edge regions, configuration is runtime-only, and coordinate conversion has tested boundaries.

---

## Task 3: Implement the AMap place adapter

**Files:**
- Create: `server/src/nest/maps/providers/amap.provider.ts`
- Modify: `server/src/nest/maps/maps.service.ts`
- Modify: `server/src/nest/maps/maps.controller.ts`
- Modify: `server/src/nest/maps/maps.dto.ts`
- Modify: `server/src/nest/maps/maps.module.ts`
- Test: `server/tests/unit/nest/maps.amap.test.ts`
- Modify: `server/tests/integration/maps.test.ts`
- Modify: `server/tests/e2e/maps.e2e.test.ts`

**Interfaces:**
- Consumes: `MapsProvider`, `ProviderRouter`, AMap runtime config, existing HTTP client and detail-cache patterns.
- Produces: provider-neutral search, autocomplete, details, and reverse-geocode results with `provider: 'amap'`, stable opaque/namespaced IDs, normalized address/phone/website, and shared `PlaceHours`.

- [ ] **Step 1: Add failing adapter tests using mocked HTTP responses**

Cover:

- POI 2.0 text search requests `show_fields=business`.
- POI 2.0 details requests `show_fields=business`.
- `business.opentime_today` and `business.opentime_week` map to the existing hours contract.
- Empty business fields produce absent/partial hours, not fabricated hours.
- Chinese query parameters are encoded once.
- AMap errors distinguish empty results, timeout, rate limit, permission failure, and server failure.
- Key, signature private data, and full credential-bearing URLs never occur in thrown errors or logs.
- IDs are namespaced or paired with explicit provider identity and cannot enter the Google details branch.

- [ ] **Step 2: Implement request construction and response normalization**

Use the official endpoints verified in Task 0: geocode, input tips, POI 2.0 text/detail, reverse geocode. Keep AMap raw response types private to the adapter. Normalize only fields the shared contract and existing UI consume.

- [ ] **Step 3: Implement bounded request deduplication and cache use**

Deduplicate identical in-flight requests by provider, endpoint, normalized query, context, language, and requested fields. Reuse the existing details cache where its data-use policy permits; use a bounded, configurable short TTL for search/details to reduce duplicate calls. Never prefetch pages of POIs or turn the cache into a complete AMap mirror. Store provider and fetched-at metadata with cached details.

- [ ] **Step 4: Wire AMap into `MapsService`**

Replace the current key-only Google/OSM decision with `ProviderRouter`. Keep existing URLs and response envelopes. Preserve Google session-token behavior exclusively in the Google path. Ensure all REST and MCP callers receive the same normalized result.

- [ ] **Step 5: Run focused server tests**

Run:

```bash
npm run test --workspace=server -- maps.amap.test.ts maps.service.test.ts maps.controller.test.ts
npm run test --workspace=server -- maps.test.ts
npm run typecheck --workspace=server
```

Expected: PASS; existing Google/OSM branches remain green.

**Acceptance:** A Chinese Mainland address can search, autocomplete, resolve details, and show available hours through AMap; overseas behavior remains unchanged; no client-visible key or raw AMap payload is exposed.

---

## Task 4: Make saved places and enrichment provider-aware

**Files:**
- Modify: `server/src/db/schema.ts`
- Modify: `server/src/db/migrations.ts`
- Modify: `shared/src/place/place.schema.ts`
- Modify: `server/src/nest/places/places.service.ts`
- Modify: `server/src/nest/places/places.helpers.ts`
- Modify: `server/src/nest/place-enrichment/place-enrichment.service.ts`
- Modify: `server/src/nest/places/places.mcp.ts`
- Test: `server/tests/integration/places.test.ts`
- Test: `server/tests/e2e/places.e2e.test.ts`
- Test: `server/tests/e2e/place-enrichment.e2e.test.ts`

**Interfaces:**
- Consumes: normalized provider results and namespaced IDs from Tasks 1–3.
- Produces: saved places with compatible `provider`/`provider_place_id`, provider-neutral matching, details refresh, and enrichment that accepts AMap without treating it as Google.

- [ ] **Step 1: Add migration and compatibility tests first**

Assert that:

- Existing rows with `google_place_id`, `google_ftid`, or `osm_id` still read correctly.
- New AMap rows preserve provider identity.
- Duplicate matching includes provider identity and coordinates.
- Existing collection and trip-place joins remain valid.
- Details cache keys cannot collide between Google, AMap, and OSM IDs.

- [ ] **Step 2: Add the append-only migration**

Prefer `provider` and `provider_place_id` columns while retaining old fields for compatibility. Backfill only deterministic Google/OSM identities where the existing row makes the mapping unambiguous. Do not copy provider payloads or opening hours into the base place table.

- [ ] **Step 3: Update row mapping and CRUD writes**

Use provider-neutral fields on new writes. Keep legacy fields readable and populate them only where current API compatibility requires it. Never put an AMap ID into `google_place_id`.

- [ ] **Step 4: Make matching and enrichment provider-aware**

Update `externalIdsOf`, `pickEnrichmentMatch`, `enrichOne`, and detail/photo dispatch so AMap results match on AMap identity and coordinate distance, use AMap details for hours, and do not enter Google photo logic. Keep AMap photos out of the initial implementation.

- [ ] **Step 5: Update MCP input validation and descriptions**

Make `search_place`, `get_place_details`, and place mutation descriptions provider-neutral. Accept explicit provider identity where needed; keep REST and MCP error semantics aligned.

- [ ] **Step 6: Run migration, integration, and MCP tests**

Run:

```bash
npm run test --workspace=server -- places.test.ts place-enrichment.e2e.test.ts
npm run test --workspace=server -- tools-places.test.ts tools-tags-maps-weather.test.ts
npm run typecheck --workspace=server
```

Expected: existing saved Google/OSM places and new AMap places both work.

**Acceptance:** A selected AMap result can be saved, reopened, matched, and refreshed without Google-specific misclassification; opening hours remain in the existing detail-cache/enrichment path.

---

## Task 5: Add Mainland AMap routes with OSRM fallback

**Files:**
- Create or modify the existing route service/provider files identified by the current route module.
- Modify: `shared/src/maps/maps.schema.ts`
- Modify: `server/src/nest/maps/maps.module.ts`
- Modify: `client/src/components/Map/RouteCalculator.ts`
- Modify: `client/src/hooks/useRouteCalculation.ts`
- Test: `server/tests/unit/nest/routes.amap-fallback.test.ts`
- Test: existing route calculator and hook integration tests.

**Interfaces:**
- Consumes: `ProviderRouter`, coordinate boundary, AMap route permissions verified in Task 0, and current OSRM route contract.
- Produces: `calculateRoute({ profile, waypoints, context, override })` returning the existing route geometry plus `{ provider, fallback, fallbackReason? }`.

- [ ] **Step 1: Inspect and lock the existing route boundary**

Locate the current OSRM request construction and route result type before editing. Keep route optimization, hotel anchors, locked stops, and leg profiles unchanged. The provider selection belongs around the existing route request, not inside route ordering algorithms.

- [ ] **Step 2: Add failing fallback tests**

Cover:

- Mainland driving/walking/cycling selects AMap.
- Overseas routes select existing OSRM behavior.
- AMap success returns `provider: 'amap', fallback: false`.
- AMap timeout, rate limit, permission failure, empty route, and unsupported profile retry OSRM once and return `provider: 'osrm', fallback: true` with a stable reason.
- OSRM failure after AMap failure returns the existing error semantics without claiming a successful source.
- Public transport never enters the AMap route path.

- [ ] **Step 3: Implement AMap route normalization**

Use the official AMap route endpoints confirmed during Task 0. Convert request coordinates at the provider boundary and convert returned geometry back to TREK internal coordinates before route optimization/rendering. Normalize distance, duration, steps if currently exposed, and geometry to the current route contract.

- [ ] **Step 4: Implement one controlled fallback**

Do not retry indefinitely or hide all errors. Classify timeout, rate-limit, permission, unsupported-profile, malformed-response, and upstream-server failures as fallback-eligible; preserve a fallback reason without logging secrets or full user addresses.

- [ ] **Step 5: Update client route source display**

Reuse the existing route result presentation pattern. Show actual source/fallback as text accessible to keyboard and screen readers. Do not create separate desktop/mobile route business logic.

- [ ] **Step 6: Run route and regression tests**

Run:

```bash
npm run test --workspace=server -- routes.amap-fallback.test.ts
cd client && npm run test -- src/components/Map/RouteCalculator.test.ts tests/integration/hooks/useRouteCalculation.test.ts
npm run typecheck --workspace=server
```

Expected: AMap-first Mainland route behavior with deterministic OSRM fallback and unchanged optimization behavior.

**Acceptance:** Domestic driving/walking/cycling works through AMap when available, falls back once to OSRM when necessary, and always reports the actual source.

---

## Task 6: Update client search, details, and offline-compatible flows

**Files:**
- Modify: `client/src/api/client.ts`
- Modify: `client/src/components/Planner/PlaceFormModal.tsx`
- Modify: `client/src/components/Planner/PlaceFormModal.helpers.ts`
- Modify: `client/src/components/Planner/AddressInput.tsx`
- Modify: `client/src/components/Planner/LocationSelect.tsx`
- Modify: `client/src/components/Planner/PlaceDetailsColumn.tsx`
- Modify: `client/src/components/Planner/PlaceInspector.tsx`
- Modify: `client/src/utils/placesSession.ts`
- Test: existing client API, form, details, inspector, and hours tests.

**Interfaces:**
- Consumes: provider-neutral REST responses and request context from shared/server work.
- Produces: existing search/select/save/detail UX with shared geographic context, explicit provider override, source metadata, and no Google session token on AMap requests.

- [ ] **Step 1: Add failing client behavior tests**

Cover:

- Search and autocomplete send the same geographic context.
- Manual provider override is forwarded.
- An AMap result fills the existing fields and saves with provider identity.
- AMap hours render through `OpeningHoursBlock`.
- Missing hours render the existing empty/partial state.
- AMap details do not trigger Google session-token or Google URL behavior.
- A route fallback source is rendered as accessible text.

- [ ] **Step 2: Extend `mapsApi` request methods**

Forward `countryCode`, location bias, language, and validated provider override through existing REST calls. Keep response parsing derived from shared schemas.

- [ ] **Step 3: Keep provider selection in form-level state**

Add only the smallest control needed for manual override inside existing search/details interaction. Do not add global Zustand state for transient provider selection and do not split the form into AMap-specific components.

- [ ] **Step 4: Preserve offline semantics**

Saved place basics remain available through existing Dexie/placeRepo flows. Do not cache arbitrary AMap search results in IndexedDB. Details remain network/cache dependent and show the existing network-empty state when unavailable.

- [ ] **Step 5: Run client tests and page/theme gates**

Run:

```bash
cd client && npm run test
cd client && npm run lint:pages
cd client && npm run theme:lint
npm run typecheck --workspace=client
```

Expected: existing desktop/mobile components pass without visual redesign or duplicated business logic.

**Acceptance:** Users can paste or type a Mainland address, select an AMap result, save it, reopen details, and see available hours using the existing interaction pattern.

---

## Task 7: Add i18n, Docker, environment, and deployment documentation

**Files:**
- Modify: `shared/src/i18n/*/map.ts`
- Modify: `shared/src/i18n/*/places.ts`
- Modify: `server/src/app-config/README.md`
- Modify: `server/.env.example`
- Modify: `README.md`
- Modify: `wiki/Environment-Variables.md`
- Modify: relevant Docker/Compose documentation and `unraid-template.xml`

**Interfaces:**
- Consumes: final config names, provider behavior, cache policy, and UI source/fallback states.
- Produces: reproducible standard Docker deployment instructions and complete locale parity.

- [ ] **Step 1: Add English copy and parity fixtures**

Document concise strings for AMap, Google Maps, OpenStreetMap, route fallback, unavailable provider, unavailable hours, and source/fetched-time metadata. Keep provider labels as text, not color-only indicators.

- [ ] **Step 2: Add real translations to every locale**

Translate all new keys in every locale directory; do not use English placeholders in non-English locales.

- [ ] **Step 3: Document runtime configuration**

Explain:

- `AMAP_API_KEY` is server-only;
- optional `AMAP_API_BASE`, timeout, cache TTL, and rate limit settings;
- provider mode and manual override behavior;
- Mainland/overseas routing;
- AMap-to-OSRM route fallback;
- fixed egress IP and key restrictions;
- no key in client bundle;
- cache is bounded and not a bulk POI mirror;
- server must reach `restapi.amap.com`.

- [ ] **Step 4: Verify standard Docker path**

Build using the existing Dockerfile and run the existing Compose shape with a runtime environment file. Confirm the image needs no second AMap container and no client build-time key. Do not publish the image in this task.

- [ ] **Step 5: Run documentation gates**

Run:

```bash
npm run i18n:parity --workspace=shared
npm run i18n:parity:strict --workspace=shared
npm run build
```

Expected: parity and ordered monorepo build pass.

**Acceptance:** A new operator can configure AMap using the standard Docker deployment without exposing credentials or guessing provider behavior.

---

## Task 8: Full verification, security review, and upstream PR packaging

**Files:**
- Modify only files required by failing verification or review.
- Verify: all changed source/test/docs files and `.github/PULL_REQUEST_TEMPLATE.md`.

**Interfaces:**
- Consumes: completed Tasks 1–7 and fresh AMap server/network evidence.
- Produces: review-ready commits/branches and a PR sequence targeting `upstream/dev`.

- [ ] **Step 1: Run the focused complete test matrix**

Run:

```bash
npm run test
npm run typecheck --workspace=server
npm run typecheck --workspace=client
npm run lint
npm run format:check
npm run i18n:parity:strict --workspace=shared
cd client && npm run lint:pages
cd client && npm run theme:lint
```

Expected: all required gates pass; investigate failures instead of lowering thresholds or adding broad suppressions.

- [ ] **Step 2: Run the real server golden path on `cee-server`**

With the runtime key configured through the server's secret mechanism, verify:

1. Mainland Chinese address search;
2. autocomplete and submitted search consistency;
3. selecting and saving a place;
4. details and available hours;
5. domestic driving, walking, and cycling route;
6. forced AMap failure followed by OSRM fallback;
7. overseas search and route regression;
8. key absence from logs and client assets.

Record concise PASS/FAIL evidence only; never copy secrets or full API payloads.

- [ ] **Step 3: Review security and data-use boundaries**

Check that keys are server-only, configurable endpoints use existing SSRF protection, logs redact credentials and unnecessary full addresses, cache TTL is bounded, no bulk prefetch exists, and AMap data is not silently treated as an unrestricted cross-provider POI database. Preserve source/fetched-at metadata and document the unresolved provider-terms authorization boundary if no written confirmation exists.

- [ ] **Step 4: Review Git diff and commit boundaries**

Separate the work into focused conventional commits/PRs:

1. `feat(maps): define provider-neutral place contracts`;
2. `feat(maps): add amap place provider`;
3. `feat(maps): add amap route fallback`;
4. `feat(deploy): document amap docker configuration`.

If the upstream maintainer prefers a different split, keep each PR independently testable and avoid unrelated reformatting.

- [ ] **Step 5: Sync before delivery**

Run:

```bash
git fetch upstream dev
git diff --check upstream/dev...HEAD
git status --short --branch
git log --oneline upstream/dev..HEAD
```

Rebase or merge only after reviewing uncommitted work and only if the user authorizes that history operation. The branch must be current with `dev` immediately before PR creation.

- [ ] **Step 6: Push and open PR only after explicit delivery approval**

Push the feature branch to `origin`, then create PRs against `liketrek/TREK:dev` using the repository template. Include 1–3 summary bullets, the exact test plan/evidence, the linked issue, Docker deployment notes, fallback behavior, and known AMap data-use/cross-border constraints. Do not merge, publish, or delete the worktree without separate authorization.

**Acceptance:** The fork branch is tested, Docker-deployable, aligned with `upstream/dev`, and packaged into focused upstream PRs without claiming unresolved authorization or network assumptions are solved.

---

## Self-review checklist

- [x] Every design requirement in `DESIGN.md` maps to Tasks 1–8.
- [x] Provider-neutral place search/details, AMap hours, route fallback, coordinate boundary, manual override, cost controls, Docker configuration, REST/MCP parity, i18n, tests, and upstream delivery all have explicit tasks.
- [x] No task asks for a bulk AMap POI mirror, client-side key, AMap photo integration, or unrelated visual redesign.
- [x] Existing Google/OSM/OSRM behavior is preserved as the compatibility path.
- [x] The plan identifies the `DESIGN.md` source and the required `dev` PR target.
- [x] The plan distinguishes local implementation from authorized push/PR/publication.
