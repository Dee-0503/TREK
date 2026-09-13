## Task 4: Make saved places and enrichment provider-aware

**Files:**
- Modify: `server/src/db/schema.ts`
- Modify: `server/src/db/migrations.ts`
- Modify: `shared/src/place/place.schema.ts`
- Modify: `server/src/nest/places/places.service.ts`
- Modify: `server/src/nest/places/places.helpers.ts`
- Modify: `server/src/nest/place-enrichment/place-enrichment.service.ts`
- Modify: `server/src/nest/places/places.mcp.ts`
- Test: `server/tests/integration/places.test.ts`
- Test: `server/tests/e2e/places.e2e.test.ts`
- Test: `server/tests/e2e/place-enrichment.e2e.test.ts`

**Interfaces:**
- Consumes: normalized provider results and namespaced IDs from Tasks 1–3.
- Produces: saved places with compatible `provider`/`provider_place_id`, provider-neutral matching, details refresh, and enrichment that accepts AMap without treating it as Google.

- [ ] **Step 1: Add migration and compatibility tests first**

Assert that:

- Existing rows with `google_place_id`, `google_ftid`, or `osm_id` still read correctly.
- New AMap rows preserve provider identity.
- Duplicate matching includes provider identity and coordinates.
- Existing collection and trip-place joins remain valid.
- Details cache keys cannot collide between Google, AMap, and OSM IDs.

- [ ] **Step 2: Add the append-only migration**

Prefer `provider` and `provider_place_id` columns while retaining old fields for compatibility. Backfill only deterministic Google/OSM identities where the existing row makes the mapping unambiguous. Do not copy provider payloads or opening hours into the base place table.

- [ ] **Step 3: Update row mapping and CRUD writes**

Use provider-neutral fields on new writes. Keep legacy fields readable and populate them only where current API compatibility requires it. Never put an AMap ID into `google_place_id`.

- [ ] **Step 4: Make matching and enrichment provider-aware**

Update `externalIdsOf`, `pickEnrichmentMatch`, `enrichOne`, and detail/photo dispatch so AMap results match on AMap identity and coordinate distance, use AMap details for hours, and do not enter Google photo logic. Keep AMap photos out of the initial implementation.

- [ ] **Step 5: Update MCP input validation and descriptions**

Make `search_place`, `get_place_details`, and place mutation descriptions provider-neutral. Accept explicit provider identity where needed; keep REST and MCP error semantics aligned.

- [ ] **Step 6: Run migration, integration, and MCP tests**

Run:

```bash
npm run test --workspace=server -- places.test.ts place-enrichment.e2e.test.ts
npm run test --workspace=server -- tools-places.test.ts tools-tags-maps-weather.test.ts
npm run typecheck --workspace=server
```

Expected: existing saved Google/OSM places and new AMap places both work.

**Acceptance:** A selected AMap result can be saved, reopened, matched, and refreshed without Google-specific misclassification; opening hours remain in the existing detail-cache/enrichment path.

---

