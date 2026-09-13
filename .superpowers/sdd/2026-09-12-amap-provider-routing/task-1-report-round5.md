# Task 1 report — fix round 5

## Scope

Hardened the MapsService public response wrappers against unknown provider-owned top-level fields, based on implementation baseline `888ef2e3`.

## Changes

- `server/src/nest/maps/maps.service.ts`
  - Search wrapper now explicitly returns `places` and `source`, adding `routeSource` only when present.
  - Details and expanded-details wrappers now explicitly return `place`, adding `disabled` only when present.
  - Existing `mapPlaceProjectionSchema` place-level allowlist remains unchanged.
- `server/tests/unit/nest/maps.service.test.ts`
  - Added direct wrapper assertions that unknown top-level envelope fields are absent for search, details, and detailsExpanded.

## Verification

- Focused maps service tests: **BLOCKED** — `vitest: command not found` (dependencies are not installed in this worktree).
- Shared build: **BLOCKED** — `tsdown: command not found` (dependencies are not installed in this worktree). No shared files were changed.
- Server typecheck: **BLOCKED** — dependency/type environment is unavailable; reports missing `@trek/shared`, `zod`, Node built-ins/types, Nest/Express packages, and related declarations.
- `git diff --check`: **PASS**.

The implementation and tests are committed separately after this report is written.
