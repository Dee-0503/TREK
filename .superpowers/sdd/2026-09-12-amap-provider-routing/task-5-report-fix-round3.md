# Task 5 fix round 3 report

## Status

Completed on integration baseline `525c3414`. Changes are limited to Task 5. No push or PR performed.

## Changes

- `RouteCalculator` now sends every built-in route through `/maps/route` whenever `providerOverride` is explicitly present, including non-CN and missing-country contexts. The no-context/no-override path remains direct OSRM. Cache keys now include routing context to prevent provider-result collisions.
- Extended the shared `routeSource` contract with optional `fallbackReasons`, preserving all distinct fallback causes when route chunks are aggregated.
- Updated `useRouteCalculation` aggregation and route-source presentation so mixed/chunked results retain real reasons such as `amap_timeout` and `amap_rate_limit`, while keeping the stable `mixed_provider` primary reason and existing UI/API shape.
- Added client regressions for explicit AMap override without country context and fallback-reason preservation.

## Verification

- `git diff --check`: passed.
- Automated client tests/typecheck/lint: not runnable in this worktree because dependencies are absent (`node_modules` and `vitest` are missing).
- Server and shared test suites were not run for the same dependency reason.

## Concerns

- The existing repository test fixture for mixed-provider aggregation predates this round and was already structurally incomplete; the new assertions cover reason retention, but full focused execution remains required after dependencies are installed.
- No external provider calls were made.
