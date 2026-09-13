# Task 4 Dedup Fix Report

## Scope

Task 4 only. No Task 5+ files changed. No push or PR performed.

## Change

- Updated `/Users/ceemac/my_product/TREK/.claude/worktrees/agent-a59051ee25dd0b0a3/server/src/nest/places/places.service.ts` so `buildDedupSet` selects and types `provider` and `provider_place_id` alongside the legacy Google/OSM identity fields. The existing `externalIdsOf(row)` call now receives the complete provider-aware row while preserving legacy fields and the existing SQL parameter.
- Added a real SQLite regression test in `/Users/ceemac/my_product/TREK/.claude/worktrees/agent-a59051ee25dd0b0a3/server/tests/unit/nest/places.service.test.ts`. It stores an AMap-qualified identity, invokes the private `buildDedupSet`, and proves a renamed candidate with the same AMap identity is detected by the import duplicate matcher.

## Verification

- `git diff --check`: passed.
- Targeted test attempted: `npm run test --workspace=server -- --run tests/unit/nest/places.service.test.ts`.
- Test execution was blocked by missing local dependency: `sh: vitest: command not found` (npm exit 127). Dependencies were not installed or modified.

## Delivery

- Conventional Commit: pending report generation and commit.
- Push/PR: not performed.

## Concerns

The targeted regression could not execute in this worktree because Vitest is unavailable. The change is limited to the requested SELECT/type mapping and test.
