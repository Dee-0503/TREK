# Task 2 review fixes — round 1

Baseline: `38a7ca14`

## Modified files

- `server/src/nest/maps/providers/amap.coordinates.ts` — replaced the broad Mainland rectangle exception with deterministic polygon exclusions for Hong Kong, Macau, and Taiwan; added focused boundary cases.
- `server/src/app-config/env.schema.ts` — strengthened `AMAP_API_BASE` validation for HTTP(S), credentials, private/special IPv4 ranges, IPv6 literals, IPv4-mapped IPv6, and non-standard numeric IPv4 forms. DNS resolution and redirect/final-hop checks remain adapter responsibilities.
- `server/src/nest/maps/providers/provider-router.ts` — retained normalization of the shared `openstreetmap` compatibility alias to `osm` for both provider mode and overrides.
- `server/src/nest/maps/providers/maps-provider.ts` — provider boundary interface included from the Task 2 baseline.
- `server/src/app-config/derive.ts`, `server/src/nest/maps/maps.module.ts`, `shared/src/maps/maps.schema.ts`, `shared/src/place/place.schema.ts` and their focused specs — Task 2 baseline contract/config wiring restored and preserved.
- `server/tests/unit/nest/maps.amap.test.ts` — HK/MO/TW and outside-envelope coordinate coverage.
- `server/tests/unit/nest/maps.provider-router.test.ts` — alias normalization coverage.
- `server/tests/unit/app-config/validate.test.ts` — SSRF endpoint rejection coverage.

## Verification

- `git diff --check`: passed.
- Focused tests: blocked by missing installed dependencies; `vitest: command not found`.
- Server typecheck: blocked by missing dependencies and generated workspace typings; reported errors include missing `zod`, `@trek/shared`, `@types/node`, Nest packages, and other repository dependencies.
- No AMap HTTP adapter, client changes, or real AMap API calls were introduced.

## Known risks

- The HK/MO/TW exclusions are intentionally conservative deterministic polygons at the provider boundary, not a general geopolitical GIS implementation; points outside the polygons but within the Mainland candidate envelope follow the existing conversion behavior.
- Literal public IPv4 endpoints remain accepted when they are canonical and outside the explicitly rejected special-use ranges; DNS hostname resolution and redirects still require final-hop validation in the later adapter.

Commit: `e3f0bc89 fix(maps): close provider routing review gaps`
