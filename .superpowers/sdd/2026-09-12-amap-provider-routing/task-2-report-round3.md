# Task 2 report — fix round 3

## Changes

- Hardened `AmapCoordinates` with conservative mainland-only exclusions covering Macau, Taiwan including outer/edge coordinates, and Hong Kong, while preserving nearby Shenzhen Mainland conversion.
- Restored endpoint safety checks for `AMAP_API_BASE`: HTTP(S) only, no credentials, no trailing/continuous dots, canonical lowercase host, IPv6 rejected, private/local host rejection, plus IANA special-use IPv4 ranges `192.0.0.0/24`, `192.0.2.0/24`, `198.18.0.0/15`, `198.51.100.0/24`, and `203.0.113.0/24`.
- Added and used `node:net` `isIP` import without unused imports.
- Added real boot validation regression coverage for the provider alias and special-use endpoints, plus coordinate regression coverage.
- No Task 3 implementation, client changes, or AMap calls.

## Verification

- `git diff --check`: pass.
- `npm run test --workspace=server -- maps.provider-router.test.ts maps.amap.test.ts app-config.test.ts`: blocked because this isolated worktree has no installed dependencies (`vitest: command not found`).

## Environment limitations

Dependencies and type declarations are unavailable in this isolated worktree. No AMap network calls were made.

## Known risks

The geographic boundary is intentionally conservative and approximate. Task 3 must continue to use SSRF-safe fetching and should validate the boundary against the verified Task 0 observations.
