# SDD ledger — plan: docs/superpowers/plans/2026-09-15-amap-mainland-native-capabilities.md

Ruling: Official AMap protocol verification is a gate for provider-specific requests and navigation URLs; Task 1 may proceed without new AMap parameters because it only repairs existing geographic-context propagation. The script task-brief helper failed with a Python SyntaxError, so equivalent task briefs are maintained in this ledger/dispatch rather than abandoning execution.

Preflight conflict scan:
| Task | Shared interface/files | Finding | Ruling |
|---|---|---|---|
| 1 → 2 | GeographicContext consumed by navigation target selection | Task 2 must consume Task 1 context and must not infer Mainland from UI language | Task 1 owns context shape; Task 2 only uses it |
| 1 → 3 | GeographicContext and ProviderRouter | POI routing must use the same context and explicit override semantics | Task 1 is prerequisite; no duplicate context |
| 1 → 4 | Reverse context and structured address | Reverse projection consumes Task 1 provider selection | Task 4 must not bypass ProviderRouter |
| 1 → 5 | Route context and provider selection | Route enhancements preserve existing routeSource/fallback | Task 5 extends, not replaces, route selection |
| 1 → 6 | Shared URL/provider identity contracts | URL import must use provider-neutral identity and same context | Task 6 cannot scrape or invent AMap URL support |
| 1 | Its own schema/controller/client/MCP tests | Consistent with plan; legacy calls must remain compatible | Proceed |
| 2 | Its own shared navigation builder/tests | Depends on official URL verification not yet available | Gate until evidence is recorded |
| 3 | Its own POI adapter/router/tests | Depends on official POI operation verification | Gate until evidence is recorded |
| 4 | Its own projection/tests | Depends on verified response fields | Gate field additions conservatively |
| 5 | Its own route projection/tests | Depends on verified route fields/limits | Gate candidate routes until evidence is recorded |
| 6 | Its own URL/rate-limit/i18n tests | Share import is explicitly conditional; rate-limit can be separate | Split/park unsupported URL branch if needed |

Task 1: fix round 1/5 started — task review found mobile fallback/context dependency/search language wire mismatch and insufficient context parity tests.
Task 1: fix round 1/5 completed after fresh implementer takeover; original findings addressed; server tests/typecheck and scoped re-review PASS.
Task 1: complete (uncommitted working tree, review clean; no commit created by authorization).
Official-doc gate: verified via official AMap docs (2026-09-15): URI navigation endpoint https://uri.amap.com/navigation with from/to, one via, mode car/bus/walk/ride, policy, and mobile callnative=1; POI detail endpoint https://uri.amap.com/poidetail with callnative=1; official docs state mobile invocation behavior. No private Android/iOS scheme will be invented. AMap web-service endpoint details remain to be verified before Tasks 3–5.

Ruling: Implement Task 2 using documented URI Web URLs and callnative=1 only for Mainland mobile-capable contexts; preserve web behavior and do not claim private native scheme support. Task 2 route links are bounded to the documented one-via limit; more waypoints must not emit an unsupported AMap URI.
Task 2: started

Task 2: independently verified PASS. Client typecheck passed; focused navigation/day-route tests passed (26 tests), and final URI-focused tests passed (17 tests). Corrected the initial optional-coordinate type error and removed undocumented `name`/`location` parameters from the POI detail URL after official documentation review. Task 2 commit: b1083118.

Task 3: implemented and independently verified. Server/client typechecks pass; REST/MCP maps controller suites pass (88 tests). Commit: 3ee26b40. Client POI hook context sourcing remains a follow-up limitation; Task 4–6 pending.
