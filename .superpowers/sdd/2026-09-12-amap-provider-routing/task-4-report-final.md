# Task 4 final report

## Scope
Final directed repair for provider-aware saved-place identity and enrichment cache safety. No Task 5+ changes.

## Changes
- External-ID detail cache reads now require a provider from request details/source or a verifiable namespaced identity. Unknown/unqualified IDs do not become `provider:id`; coordinate-only cache remains available independently. Cache writes use only an explicit canonical provider namespace.
- Shared place identity contracts now normalize provider IDs for create/update, trim IDs, reject unknown providers and mismatched create pairs, and canonicalize `openstreetmap` to `osm`. Update provider-only patches are allowed and clear the prior ID; ID-only patches are rejected.
- PlacesService create/update use the shared identity normalizer. MCP provider fields accept the same normalized nullable shape and pass provider identity through create-and-assign/update paths.
- Added REST integration assertions for blank create IDs, provider-only update clearing, ID-only mismatch, unknown provider rejection, replacement and explicit clearing.
- Restored the missing `placeProviderIdentitySchema` export required by existing shared map/place contract tests.

## Verification
- `git diff --check`: passed.
- Shared typecheck attempted: blocked by dependency absence (`zod`, `vitest`, and related packages/types are not installed); the initial stale syntax error in `place-match.ts` was corrected and the remaining output is dependency/pre-existing repository type noise.
- Shared build attempted: blocked because `tsdown` is not installed.
- Focused Vitest/integration/e2e/MCP execution could not run because workspace dependencies are absent. No tests are claimed as passing.

## Compatibility and constraints
Append-only migration and legacy fields remain intact. AMap IDs are not copied into `google_place_id`; provider payload/hours remain outside base place; Google photo exclusion remains unchanged.

## Concerns
The dependency-free worktree prevents runtime verification of REST/MCP validation parity and the provider-isolated cache regression tests. The changed code is limited to Task 4 files and tests.
