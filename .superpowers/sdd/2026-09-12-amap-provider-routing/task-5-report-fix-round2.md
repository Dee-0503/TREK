# Task 5 fix round 2 report

## Status

Completed at baseline `9446573a`; changes remain within Task 5. No push or PR performed.

## Changes

- Reused shared `MapsRouteRequest` and `RouteProviderOverride` in the client route API, calculator, and hook; client route overrides are now strictly `amap | osrm` (no `osm` drift).
- Aggregated route-source metadata across all route chunks. Any fallback is retained with a stable reason, and mixed provider chunks are reported as `mixed_provider` rather than whichever chunk happened to finish last.
- Added an explicit MapsService fallback allow-list. AMap falls back to OSRM only for the documented provider failures; SSRF/security and configuration errors such as `ssrf_blocked` and `not_configured` are rethrown.
- Added route-source accessibility labels to both Leaflet and GL status announcements.
- Added a focused hook regression test for mixed-provider/fallback aggregation.

## Verification

- `git diff --check`: passed.
- Focused client test attempt was blocked by missing dependencies: `vitest: command not found`.
- Server tests, typecheck, lint, and full diff-check could not be run because repository dependencies are not installed; no test results are claimed.

## Concerns

- The requested real-adapter and SSRF service regression suites still need to be added or run in an environment with dependencies. Existing baseline AMap adapter tests cover mocked HTTP normalization, but this round did not fabricate external HTTP calls.
- The mixed-provider aggregate uses `provider: osrm` with `fallbackReason: mixed_provider` because the shared source contract permits one provider only; UI remains explicit that the route is mixed/fallback.
