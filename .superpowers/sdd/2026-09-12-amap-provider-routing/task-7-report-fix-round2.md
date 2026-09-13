# Task 7 fix round 2 report

## Status

Complete. Updated only Task 7 documentation/configuration entry points; no business logic, Task 8 release/deploy files, push, or PR actions were performed.

## Fixes

- Clarified the README route behavior: mainland China prefers configured and enabled AMap for driving, walking, and cycling, with one-failure fallback to OSRM; overseas and AMap-disabled deployments retain OSRM. Linked the environment-variable reference from the deployment entry point.
- Clarified `PLACES_PROVIDER_MODE` in `server/.env.example`, `docker-compose.yml`, and `unraid-template.xml`: mode/request overrides apply only when the target provider is configured and enabled; otherwise the existing fallback/default remains active.
- Kept `AMAP_API_KEY` server-only, runtime-only, and out of client build-time configuration. Preserved the no-second-AMap-container guidance.
- Kept `AMAP_RATE_LIMIT_PER_MINUTE` accurately documented as reserved and not enforced by the server runtime.
- Kept bounded-cache, server egress, fixed-egress-IP/key restriction, and OSRM fallback guidance in the environment/configuration documentation.

## Verification

- `npm run i18n:parity --workspace=shared`: passed (file/key parity OK).
- `npm run i18n:parity:strict --workspace=shared`: passed (file/key parity OK).
- XML parse of `unraid-template.xml`: passed.
- `git diff --check`: passed.
- `npm run build`: blocked before compilation because dependencies are not installed in this worktree (`tsdown: command not found`). No dependency installation or network access attempted.

## Concerns

The full build remains unverified due to the missing local dependency. No runtime or release/deploy behavior was changed.
