# Task 4 Final Capped Repair

- Synced the Task 4 implementation against the integrated `feat/amap-provider-routing-impl` source, then limited edits to Task 4 identity/schema flows.
- Removed duplicate canonical `collection_places.provider` / `provider_place_id` definitions from the fresh schema while retaining legacy identity columns.
- Made legacy Google fallback matching use raw legacy IDs rather than namespaced strategy IDs; preserved provider identity through collection copy-to-trip SQL, source reads, dedup rows, and inserts.
- Added deterministic migration fallback order: `google_place_id`, then `google_ftid`, then OSM; ambiguous Google+OSM rows remain nullable for both `places` and `collection_places`.
- `git diff --check`: passed.
- Verification was blocked by missing installed dependency: `npm run build --workspace=shared` failed with `sh: tsdown: command not found`; therefore server typecheck/focused tests could not run.
- No push or PR was performed.
