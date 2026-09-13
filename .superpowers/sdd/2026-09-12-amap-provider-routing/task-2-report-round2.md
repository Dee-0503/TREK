# Task 2 report — fix round 2

## Changes

- Fixed and retained the isolated `vi.stubEnv`/`afterEach` test structure in `maps.provider-router.test.ts`.
- `PLACES_PROVIDER_MODE` now accepts the shared `openstreetmap` alias during `envSchema` validation and normalizes it to `osm` in `deriveMaps`; added `validateEnvAtBoot` coverage.
- Hardened `AMAP_API_BASE` public endpoint validation to reject private/local targets and requested IANA special-use IPv4 ranges: `192.0.0.0/24`, `192.0.2.0/24`, `198.18.0.0/15`, `198.51.100.0/24`, and `203.0.113.0/24`.
- Tightened AMap coordinate conversion to a conservative mainland-only boundary with exclusions for HK/MO/TW outer and island points while retaining nearby mainland Shenzhen coverage.
- No Task 3 adapter, client changes, or AMap calls.

## Verification

- `git diff --check`: pass.
- `npm run test --workspace=server -- maps.provider-router.test.ts maps.amap.test.ts`: blocked because dependencies are unavailable in this isolated worktree (`vitest: command not found`).
- Typecheck was not rerun in this fix round because the same missing dependency/type environment remains; the prior round recorded the resulting missing package and declaration errors.

## Environment limits

The isolated worktree has no installed npm dependencies, so focused tests and typecheck cannot execute here. No network calls to AMap were made.

## Known risks

The conservative coordinate boundary is intentionally approximate and should be reviewed against the Task 0 verified points and the eventual Task 3 adapter behavior. Outbound AMap requests still need SSRF-safe fetch and response validation in Task 3.
