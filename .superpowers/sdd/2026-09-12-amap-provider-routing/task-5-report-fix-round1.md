# Task 5 fix round 1 report

## Status

Completed within Task 5 scope. Baseline reset and verified at `fc8381d3` before changes. No push or PR performed.

## Changes

- Removed duplicate `ProviderOverride` and `GeographicContext` declarations from `shared/src/maps/maps.schema.ts`; retained schema-derived canonical types.
- Added strict `routeProviderOverrideSchema` / `RouteProviderOverride` supporting only `amap` and `osrm`, and applied it to `mapsRouteRequestSchema`.
- Aligned server route context and `ProviderRouter` with the strict route override. `osrm` explicitly selects OSRM; unsupported values cannot silently map to AMap.
- Reworked `AmapProvider.route` to request each adjacent waypoint pair and merge their geometry, distance, duration, and accurate legs. Removed total-distance/total-duration averaging for multi-waypoint routes.
- Preserved stable `empty_route` and `invalid_response` classifications for empty paths and malformed polylines.
- Extracted shared client `formatRouteSourceLabel` presentation helper and reused it in Leaflet `MapView` and GL `MapViewGL`.
- Added focused provider-router and AMap normalization/error-classification tests.

## Verification

- `git diff --check`: passed.
- Focused server tests were attempted but could not start because dependencies are absent: `vitest: command not found`.
- Build/typecheck was not claimed for the same missing-dependency condition.

## Concerns

- The requested fallback behavior is orchestrated by `MapsService`; AMap provider errors remain eligible for the existing single OSRM fallback. Full regression verification requires installing the repository dependencies.
- AMap multi-waypoint routing now makes one upstream request per adjacent leg, which is intentional for accurate leg metrics but increases request count for long itineraries.
