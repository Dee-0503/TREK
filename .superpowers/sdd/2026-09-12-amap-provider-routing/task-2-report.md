# Task 2 report

## Changes

- Added runtime-only AMap/provider configuration in `/Users/ceemac/my_product/TREK/.claude/worktrees/agent-a7d7a1ea7e95e7f10/server/src/app-config/env.schema.ts` and `derive.ts`, including separate `AMAP_API_KEY`, public endpoint validation, provider mode, timeout, cache TTL, and rate limit defaults. `PLACES_API_KEY` remains Google-only.
- Added the provider boundary interface at `server/src/nest/maps/providers/maps-provider.ts`.
- Added server-only deterministic provider routing at `server/src/nest/maps/providers/provider-router.ts`. Explicit `CN` selects enabled AMap; HK/MO/TW/unknown contexts do not infer Mainland China; overrides are accepted only when enabled; routes use AMap or OSRM.
- Added GCJ-02/WGS-84 boundary conversion at `server/src/nest/maps/providers/amap.coordinates.ts`, with no conversion outside the AMap helper.
- Wired `ProviderRouter` into `server/src/nest/maps/maps.module.ts`.
- Added focused router and coordinate tests under `server/tests/unit/nest/`.

## Verification

- `git diff --check`: pass.
- `npm run test --workspace=server -- maps.provider-router.test.ts maps.amap.test.ts`: blocked because this worktree has no installed dependencies (`vitest: command not found`).
- `npm run typecheck --workspace=server`: blocked by the same dependency/type environment (`@trek/shared`, Nest, Zod, Node declarations, and other packages unavailable); errors include pre-existing files as well as the changed config files.

## Environment limits

Dependencies are not installed in this isolated worktree. No AMap API calls were made.

## Known risks

The AMap HTTP adapter and provider-to-route/place operation wiring are intentionally not included; those belong to Task 3 and later integration work. Public endpoint validation rejects obvious private IPv4/hostname forms at schema time and the outbound adapter must still use SSRF-safe fetching for DNS/redirect validation.
