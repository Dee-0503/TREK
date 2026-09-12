# Task 5 final report

## Status

Implemented on branch `feat/amap-provider-routing-task5`, based on integration commit `90169340` (parent `fc4c7743`). No push or PR was performed.

## Completed

- Added server fallback coverage for AMap success, timeout/rate-limit/permission/unsupported/empty/malformed/server failures, one OSRM fallback, OSRM failure propagation, overseas OSRM, and keeping non-AMap route selection out of the AMap provider.
- Routed the client context through `mapsApi.route`, `RouteCalculator`, `useRouteCalculation`, desktop planner/sidebar callers, and mobile timeline callers. Country context is available on the shared Trip shape as optional `country_code`; provider override is forwarded where supplied.
- Preserved route geometry/leg handling and exposed the actual route source through the hook as `routeSource`.
- Added accessible route-source status text to both Leaflet and GL map renderers, including AMap/OSRM and fallback reason. The display is shared business behavior rather than separate desktop/mobile logic.
- Added client tests for RouteCalculator context/override forwarding and hook context/source metadata.
- Kept the existing server OSRM implementation unchanged in this scope; it remains the single server-side OSRM adapter for this route endpoint. Existing client OSRM behavior remains for overseas routes and unsupported/plugin profiles.
- Preserved existing timeout, capped-response, SSRF, redacted provider-error, AMap coordinate conversion, route-source contract, route optimization, accommodation bookends, transport anchors, locked-stop behavior, and leg-profile behavior.

## Verification

- `git diff --check`: passed.
- `npm run test --workspace=server -- routes.amap-fallback.test.ts`: blocked because dependencies are absent (`vitest: command not found`).
- `npm run test --workspace=client -- src/components/Map/RouteCalculator.test.ts`: blocked because dependencies are absent (`vitest: command not found`).
- `npm run typecheck --workspace=client`: blocked by the dependency-free worktree (`react`, `axios`, `zod`, `vitest`, map libraries, and other packages unavailable); output also includes pre-existing broad test/type errors. Changed-file filtering found no remaining route-calculator error after the local correction; the remaining changed-file output is dependency/pre-existing project noise.
- Server typecheck and runtime tests could not be honestly reported as passing for the same missing-dependency condition.

## Commit

Pending at report authoring time.

## Concerns

- Fresh test execution is unavailable until workspace dependencies are installed. No test pass is claimed.
- The current Trip API/schema does not appear to persist or populate `country_code` in all existing trip endpoints; the client path is therefore ready to consume it when present, but callers without that field correctly remain on OSRM. A future country-resolution/persistence task may be needed to make all Mainland-China trips automatically provide `CN`.
- Provider override is intentionally limited to the existing route contract (`amap`/`osm`) and only sent through the Mainland API path; plugin and unsupported profiles remain on their existing route path.
