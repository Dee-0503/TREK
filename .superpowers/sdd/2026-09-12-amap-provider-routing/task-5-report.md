# Task 5 report

## Status

Implemented the Task 5 route-provider foundation in this worktree.

## Changes

- Added the shared `mapsRouteRequestSchema` for supported road profiles and waypoints.
- Added a route-provider interface and profile-aware `ProviderRouter` selection that excludes public transport and plugin profiles from AMap.
- Added AMap route normalization using v5 driving, walking, and bicycling endpoints, with GCJ-02 conversion isolated to the provider boundary and normalized route metadata.
- Added focused provider-selection coverage in `server/tests/unit/nest/routes.amap-fallback.test.ts`.

## Verification

- `git diff --check`: passed.
- Shared build: blocked because `tsdown` is not installed (`sh: tsdown: command not found`).
- Server lint: blocked because `eslint` is not installed (`sh: eslint: command not found`).
- Route tests and server typecheck were not runnable because workspace dependencies are missing.

## Concerns

The existing client route calculator has no geographic-context route API and the current hook does not yet pass route source metadata through to UI state. Controlled AMap-to-OSRM fallback and client route-source display remain unfinished and require dependency installation plus follow-up implementation.
