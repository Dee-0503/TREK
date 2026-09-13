# Task 4 round 4 report

## Changes
- Extended `PlacesService.applyUpdate` and the REST/MCP update paths to accept provider identity, normalize `openstreetmap` to `osm`, trim IDs, and support identity replacement and explicit clearing without writing AMap IDs to `google_place_id`.
- Made legacy `google_place_id`/`google_ftid`/`osm_id` matching provider-qualified (`google:`/`osm:`), retaining all legacy identities so equal bare IDs cannot collide across providers.
- Updated `create_place` MCP metadata and inputs to prefer `provider`/`provider_place_id`, while documenting legacy Google fields as compatibility inputs; update MCP accepts the same provider identity.
- Added executable REST integration coverage for provider replacement/clearing and AMap safety, shared matching regression coverage, and real HTTP e2e coverage for AMap create/update.
- Kept the existing append-only migration, enrichment cache namespace, details/hours routing, collection/trip join, and provider payload boundaries unchanged.

## Verification
- `git diff --check` passed.
- Focused shared test command was attempted but could not run: `vitest: command not found` (dependencies are absent).
- Server typecheck was attempted. It initially exposed a pre-existing malformed comment in `server/src/nest/place-enrichment/place-enrichment.service.ts`; the comment delimiter was repaired. The subsequent typecheck is blocked by missing dependencies/types (`@trek/shared`, Nest, Zod, Node typings, and others), not by a reported Task 4 semantic error.
- No push or PR performed.

## Concerns
- The requested full integration/e2e/MCP execution remains unavailable until workspace dependencies are installed. The MCP description/validation changes are executable code, but no runtime MCP harness result can be claimed in this dependency-free worktree.
- Existing e2e fixtures are intentionally minimal and use their own SQLite schema; AMap assertions were added to the real REST route fixture, while migration/backfill and provider-isolated cache coverage remains dependent on the existing Task 4 cumulative tests and harness.
