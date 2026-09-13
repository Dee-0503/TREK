# TREK Design Source

## Scope

This document is the design source for functional map-provider work on TREK. It preserves the existing desktop and mobile components, layout, semantic theme tokens, and interaction patterns. It does not introduce a visual redesign.

## Map provider behavior

- Existing map, place, and route screens remain the entry points.
- Provider selection is automatic by geographic context, with an explicit manual override available in the existing search/details flow.
- Mainland China uses AMap by default for place search, address geocoding, place details, opening hours, and driving/walking/cycling routes.
- Overseas locations retain the existing Google Places/Nominatim and OSRM behavior.
- If an AMap route request fails, the existing route flow retries with OSRM and visibly identifies the actual route provider.
- Provider-specific API keys and network details are never shown in the client.

## Place search and import interaction

- `PlaceFormModal`, `AddressInput`, and `LocationSelect` remain the primary entry points.
- Autocomplete and submitted search share the same geographic context and provider decision.
- Search results continue to use the existing result-list and select-to-fill interaction.
- Selecting a result fills the existing place fields: name, address, coordinates, website, phone, and available details.
- A provider override uses the existing settings/control language and does not create a separate AMap-only form.
- Provider identity may be shown as compact source metadata where the current details/result layout already shows source information.
- No embedded Xiaohongshu, Douyin, or Meituan workflow is added. External discovery remains compatible with manually entering or pasting an address into TREK.

## Place details and opening hours

- `PlaceDetailsColumn` and `PlaceInspector` continue to render the shared place-details contract.
- AMap opening hours map to the existing `PlaceHours` representation when available.
- Missing, incomplete, or unstructured hours remain a normal empty/partial state; the UI must not invent a schedule.
- Opening-hours source and fetched time may be displayed using existing metadata patterns, without adding a new details panel.
- AMap photos and AMap URL import are out of scope for the initial implementation.

## Route interaction

- Existing route calculation controls, profiles, stop ordering, and route-line presentation remain unchanged.
- The route result includes a provider/source label using the existing route result presentation pattern.
- Automatic fallback from AMap to OSRM is silent at the interaction level only when it succeeds; the resulting source and fallback status remain visible or inspectable.
- Public transport remains on the existing Transitous/MOTIS path and is not routed through AMap in the initial implementation.

## Data and coordinate boundaries

- Server-side provider adapters normalize external results before they reach client contracts.
- TREK's internal place and route coordinates remain WGS84-compatible.
- AMap coordinate handling and any conversion occur only at the AMap provider boundary; coordinates from different systems are never mixed directly.
- Saved places retain provider identity using provider-neutral fields or namespaced IDs while preserving compatibility with existing Google/OSM fields.
- Details caching follows the existing cache and offline patterns. It must not become a bulk AMap POI mirror.

## Deployment and configuration

- The standard single-container Docker and Docker Compose deployment remains the deployment path.
- AMap credentials are injected at server runtime through environment configuration and are never compiled into the client.
- The client requires no AMap-specific build step or separate container.
- Configuration documentation must describe the key, provider mode/override behavior, timeout, rate limiting, cache policy, and fallback behavior.
- The implementation must support a cost-conscious default: request deduplication and bounded server-side caching, with cache duration and persistence behavior configurable and subject to provider terms.

## Accessibility and responsive behavior

- Reuse existing labels, focus behavior, keyboard navigation, loading states, error states, and responsive desktop/mobile shells.
- New provider/source information must be available as text, not color alone.
- No new color literals, arbitrary theme bypasses, numeric inline font sizes, or layout-specific mobile duplication.

## Verification

- Verify the existing place-search golden path: type address, select result, save place, open details, inspect hours.
- Verify mainland-China AMap, overseas existing-provider, manual override, missing-hours, provider-error, and route-fallback states.
- Verify desktop and mobile interaction behavior through the existing component tests and the project's browser verification workflow.
