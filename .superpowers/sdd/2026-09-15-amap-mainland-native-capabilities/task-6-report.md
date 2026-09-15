# Task 6 Report — AMap share URL import decision

AMap share/import is explicitly blocked. The verified official URI documentation covers outbound POI detail and navigation opening, but no stable, documented, authorized share-URL-to-place resolver was verified. TREK therefore does not scrape `amap.com`, follow arbitrary redirects, or fabricate coordinates from page HTML.

The existing `resolve_maps_url` capability remains provider-specific to its documented Google flow. AMap URLs must be surfaced as unsupported rather than imported as guessed places. This is the safe outcome explicitly permitted by the plan when no stable official interface exists.

Commit: `docs(maps): record AMap share import boundary`.
