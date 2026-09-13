# Task 7 fix round 1 report

## Status

Complete. Fixed only Task 7 documentation/configuration/locale scope. No runtime provider code, Docker runtime logic, or Task 1–6 business code changed. No push or PR.

## Fixes

- Removed duplicate `providerUnavailable`, `hoursUnavailable`, `source`, and `fetchedAt` definitions from `shared/src/i18n/sv/places.ts`, `tr/places.ts`, and `vi/places.ts`, retaining the existing real translations.
- Corrected `AMAP_RATE_LIMIT_PER_MINUTE` wording in the environment, app-config, Compose, and Unraid documentation: the current runtime reads/configures this value but does not enforce a server-side limiter, so it is explicitly documented as reserved rather than falsely described as an active limit.
- Clarified in README/app-config/wiki that provider mode and request overrides apply only when the selected provider is configured and enabled; otherwise existing fallback/default selection remains in effect.

## Verification

- `npm run i18n:parity --workspace=shared`: passed (file/key parity OK).
- `npm run i18n:parity:strict --workspace=shared`: passed (file/key parity OK).
- `git diff --check`: passed.
- `npm run build`: blocked before compilation because dependencies are not installed in this worktree (`tsdown: command not found`). No dependency installation/network access attempted.

## Concerns

The requested runtime limiter was not added because the existing Task 7 runtime implementation does not enforce the setting and this round is constrained to confirmed Task 7 findings. Documentation now accurately records the reserved status and avoids an operationally misleading claim.
