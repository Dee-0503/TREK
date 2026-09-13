# Task 4 cache isolation repair report

## Status
Implemented and committed the final cache-isolation repair.

## Changes
- Unknown or bare external `placeId` values now skip the first result-cache read entirely instead of falling back to the coordinate cache.
- Unknown or bare external IDs do not write a result-cache row.
- Explicit `google:`, `amap:`, and `osm:` identities remain provider-namespaced for reads and writes; `openstreetmap` is normalized to `osm`.
- Coordinate-only requests continue to use an independent `coords:<lat>:<lng>` cache key.
- Added focused regression assertions for the read isolation, no bare write, namespaced external read/write, and coordinate-only read/write behavior.

## Verification
- `git diff --check`: passed.
- Focused server test command could not run because this worktree has no installed `vitest` binary (`sh: vitest: command not found`).

## Concerns
- Tests should be rerun after dependencies are installed.
