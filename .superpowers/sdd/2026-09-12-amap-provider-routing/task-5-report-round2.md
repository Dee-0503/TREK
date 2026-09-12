# Task 5 report round 2

- Baseline reset verified: `fc4c7743948a4bdd1ac8b0f7f6d1bff4194605b9`.
- Added shared route result alias and DTO contract for `/api/maps/route`.
- Added server route orchestration: provider selection, AMap attempt, one OSRM fallback with `fallbackReason`, and OSRM error propagation.
- Added client maps route API and mainland-China route dispatch in `RouteCalculator`.
- `git diff --check` passes.

Verification limitations:
- Server tests could not run because dependencies are absent (`vitest: command not found`).
- Shared build could not run because dependencies are absent (`tsdown: command not found`).
- No route fallback test was added in this round.

Concerns:
- Hook callers do not yet supply country context, and route-source presentation was not completed.
- The server OSRM adapter is duplicated from the client and should receive focused tests before integration.
