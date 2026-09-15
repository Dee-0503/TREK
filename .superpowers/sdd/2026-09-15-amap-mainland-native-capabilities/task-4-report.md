# Task 4 Report — AMap details and reverse projection

The existing `AmapProvider` projection was independently verified against the conservative shared contract: namespaced provider identity, normalized WGS84 coordinates, name/address/phone/website/types, optional opening hours, and reverse-geocode empty/partial behavior. No raw provider payload is exposed.

Verification: `npm run test --workspace=server -- --run tests/unit/nest/maps.amap.test.ts tests/unit/nest/maps.identity.test.ts tests/unit/nest/maps.service.test.ts` passed as part of the 4-file run (279 tests total); `npm run typecheck --workspace=server` passed.

Commit: `test(maps): verify AMap details projection`.
