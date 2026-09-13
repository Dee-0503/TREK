# Task 5 fix round 4 report

## Status

Implemented and committed the confirmed Task 5 fixes on top of the integrated Task 5 HEAD (`6a87693e` and `ef392202`). No reset, push, or PR was performed.

## Changes

- Extended the shared route-source contract in `shared/src/maps/maps.schema.ts` to support `amap | osrm | plugin | mixed`, plus optional plugin identity/profile metadata.
- Updated client route types, route-source presentation, and `MapViewGL` prop typing to keep `fallbackReasons` and plugin/mixed source metadata consistent.
- Plugin routes now report `provider: 'plugin'` rather than hard-coded AMap.
- Chunk failures in `useRouteCalculation` now add a synthetic fallback source with the actual error message (or stable `provider_failure`) before source aggregation. AbortError behavior remains unchanged.
- Mixed provider aggregation reports `provider: 'mixed'` and preserves distinct fallback reasons.
- Added plugin-source and chunk-failure regression coverage, and shared schema coverage for plugin/mixed sources. Existing AMap/OSRM override/fallback, context, optimization, anchors, legs, and accessibility-related route tests remain in scope.

## Verification

- `npm run build --workspace=shared` passed.
- `npm run typecheck --workspace=client` passed.
- Focused client Vitest execution reached and passed the RouteCalculator suite, but the combined run was not clean: the hook worker exited unexpectedly under Node 20, and the environment reported Vitest worker instability. Earlier attempts also accurately exposed the missing built `@trek/shared` dependency before the shared build.

## Dependency/environment concerns

- Repository dependencies were initially absent (`vitest: command not found`); `npm install --ignore-scripts` was required.
- The package declares/transitively uses packages requiring Node 22+, while this environment is Node `v20.20.0`; npm emitted `EBADENGINE` warnings.
- `npm install` reported 27 existing audit findings (1 low, 10 moderate, 15 high, 1 critical); no audit remediation was attempted.
- No Task 6+ files or behavior were intentionally changed.
