import { placeProviderIdentitySchema } from '../place/place.schema';
import { z } from 'zod';

/** Provider-neutral map/place provider identifiers shared by request and response contracts. */
export const mapProviderSchema = placeProviderIdentitySchema.shape.provider;
export type MapProvider = z.infer<typeof mapProviderSchema>;

export const providerOverrideSchema = mapProviderSchema;
export type ProviderOverride = z.infer<typeof providerOverrideSchema>;

export const geographicContextSchema = z.object({
  countryCode: z.string().regex(/^[A-Z]{2}$/).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
export type GeographicContext = z.infer<typeof geographicContextSchema>;

const requestContext = {
  countryCode: geographicContextSchema.shape.countryCode,
  latitude: geographicContextSchema.shape.latitude,
  longitude: geographicContextSchema.shape.longitude,
  providerOverride: providerOverrideSchema.optional(),
};

/**
 * Maps / geo API contract — single source of truth for the /api/maps endpoints.
 *
 * server/src/nest/maps/maps.service.ts talks to Nominatim/Overpass (and
 * optionally Google Places when a key is configured) and applies the SSRF guard
 * on every outbound URL. The place objects these return are provider-shaped and
 * vary by source, so the response schemas keep them as open records — the
 * contract pins down the request shapes and the stable envelope fields, not the
 * provider blobs.
 *
 * Since the maps body-contract ratchet, the request schemas below are enforced
 * on the server via createZodDto wrappers (maps.dto.ts) and the global
 * ZodValidationPipe — invalid bodies get the pipe's uniform
 * { error: 'field: message; …' } envelope. The per-endpoint kill-switch
 * responses and the non-body validation (query params, URL params) keep their
 * bespoke bodies in the controller.
 */

/** Route source metadata returned by the real route consumer. */
export const routeSourceSchema = z.object({
  provider: z.enum(['amap', 'osrm']),
  fallback: z.boolean(),
  fallbackReason: z.string().optional(),
});
export type RouteSource = z.infer<typeof routeSourceSchema>;

export const routeLegSchema = z.object({
  mid: z.tuple([z.number(), z.number()]),
  from: z.tuple([z.number(), z.number()]),
  to: z.tuple([z.number(), z.number()]),
  distance: z.number().nonnegative(),
  duration: z.number().nonnegative(),
  walkingText: z.string(),
  drivingText: z.string(),
  distanceText: z.string(),
  durationText: z.string().optional(),
  noteText: z.string().optional(),
  mode: z.string().optional(),
});
export type RouteLeg = {
  mid: [number, number];
  from: [number, number];
  to: [number, number];
  distance: number;
  duration: number;
  walkingText: string;
  drivingText: string;
  distanceText: string;
  durationText?: string;
  noteText?: string;
  mode?: string;
};

/** The complete RouteCalculator result, including its display strings. */
export const routeWithLegsSchema = z.object({
  coordinates: z.array(z.tuple([z.number(), z.number()])),
  distance: z.number().nonnegative(),
  duration: z.number().nonnegative(),
  routeSource: routeSourceSchema,
  legs: z.array(routeLegSchema),
  vias: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
    label: z.string().optional(),
    tone: z.enum(['default', 'success', 'warn', 'danger']),
    dwellSeconds: z.number().nonnegative().optional(),
  })).optional(),
});
export type RouteWithLegs = {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  routeSource: RouteSource;
  legs: z.infer<typeof routeLegSchema>[];
  vias?: { lat: number; lng: number; label?: string; tone: 'default' | 'success' | 'warn' | 'danger'; dwellSeconds?: number }[];
};

export const routeResultSchema = z.object({
  coordinates: z.array(z.tuple([z.number(), z.number()])),
  distance: z.number().nonnegative(),
  duration: z.number().nonnegative(),
  distanceText: z.string(),
  durationText: z.string(),
  walkingText: z.string(),
  drivingText: z.string(),
  routeSource: routeSourceSchema,
});
export type RouteResult = z.infer<typeof routeResultSchema>;

const latLng = z.object({ lat: z.number(), lng: z.number() });

export const mapsSearchRequestSchema = z.object({
  query: z.string().min(1),
  ...requestContext,
  // Optional bias toward a coordinate (lat/lng[/radius]); improves
  // foreign-region queries. z.number() is finite-only (zod v4), matching the
  // legacy Number.isFinite() check; radius was never validated beyond "number".
  locationBias: latLng.extend({ radius: z.number().optional() }).optional(),
});
export type MapsSearchRequest = z.infer<typeof mapsSearchRequestSchema>;

export const mapsAutocompleteRequestSchema = z.object({
  input: z.string().min(1).max(200),
  ...requestContext,
  lang: z.string().optional(),
  locationBias: z.object({ low: latLng, high: latLng }).optional(),
  /**
   * Ties the keystrokes of one search, and the details call that ends it, into a
   * single Google billing session. Google caps it at 36 URL-safe ASCII
   * characters; anything else is dropped rather than forwarded, so a bad token
   * degrades to per-request billing instead of failing the search.
   */
  sessionToken: z.string().regex(/^[A-Za-z0-9_-]{1,36}$/).optional(),
});
export type MapsAutocompleteRequest = z.infer<typeof mapsAutocompleteRequestSchema>;

export const mapsReverseQuerySchema = z.object({
  lat: z.string().min(1),
  lng: z.string().min(1),
  lang: z.string().optional(),
});
export type MapsReverseQuery = z.infer<typeof mapsReverseQuerySchema>;

export const mapsResolveUrlRequestSchema = z.object({
  url: z.string().min(1),
});
export type MapsResolveUrlRequest = z.infer<typeof mapsResolveUrlRequestSchema>;

/** Provider-neutral place projection shared by search and detail responses. */
export const mapPlaceProjectionSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  google_place_id: z.string().nullable().optional(),
  google_ftid: z.string().nullable().optional(),
  osm_id: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
  rating_count: z.number().nullable().optional(),
  website: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  types: z.array(z.string()).optional(),
  opening_hours: z.array(z.string()).nullable().optional(),
  open_now: z.boolean().nullable().optional(),
  opening_periods: z.array(z.object({
    open: z.object({ day: z.number(), hour: z.number(), minute: z.number() }),
    close: z.object({ day: z.number(), hour: z.number(), minute: z.number() }).nullable().optional(),
  })).nullable().optional(),
  opening_special_days: z.array(z.string()).nullable().optional(),
  google_maps_url: z.string().nullable().optional(),
  osm_url: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  reviews: z.array(z.object({
    author: z.string().nullable().optional(),
    rating: z.number().nullable().optional(),
    text: z.string().nullable().optional(),
    time: z.string().nullable().optional(),
    photo: z.string().nullable().optional(),
  })).optional(),
  source: z.string().optional(),
  providerIdentity: placeProviderIdentitySchema.optional(),
});
export type MapPlaceProjection = z.infer<typeof mapPlaceProjectionSchema>;

export const mapsSearchResultSchema = z.object({
  places: z.array(mapPlaceProjectionSchema),
  source: z.string(),
  routeSource: routeSourceSchema.optional(),
});
export type MapsSearchResult = z.infer<typeof mapsSearchResultSchema>;

export const mapsAutocompleteSuggestionSchema = z.object({
  placeId: z.string(),
  mainText: z.string(),
  secondaryText: z.string(),
});
export const mapsAutocompleteResultSchema = z.object({
  suggestions: z.array(mapsAutocompleteSuggestionSchema),
  source: z.string(),
});
export type MapsAutocompleteResult = z.infer<typeof mapsAutocompleteResultSchema>;

export const mapsPlaceDetailsResultSchema = z.object({
  place: mapPlaceProjectionSchema.nullable(),
  disabled: z.boolean().optional(),
});
export type MapsPlaceDetailsResult = z.infer<typeof mapsPlaceDetailsResultSchema>;

export const mapsPlacePhotoResultSchema = z.object({
  photoUrl: z.string().nullable(),
  attribution: z.string().nullable().optional(),
});
export type MapsPlacePhotoResult = z.infer<typeof mapsPlacePhotoResultSchema>;

export const mapsReverseResultSchema = z.object({
  name: z.string().nullable(),
  address: z.string().nullable(),
});
export type MapsReverseResult = z.infer<typeof mapsReverseResultSchema>;

export const mapsResolveUrlResultSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  name: z.string().nullable(),
  address: z.string().nullable(),
  google_ftid: z.string().nullable().optional(),
});
export type MapsResolveUrlResult = z.infer<typeof mapsResolveUrlResultSchema>;

/**
 * Place enrichment — the photo candidates and description shown next to the
 * search field while adding a place.
 *
 * Unlike the endpoints above this one is not provider-shaped: the whole point
 * is that a Commons image and a Google photo arrive in the same shape, so the
 * column renders one strip regardless of which sources the instance has.
 * Everything nullable is genuinely optional per source — Commons gives us a
 * licence and an author, Google gives us neither in a form we may reproduce.
 */
export const placePhotoSourceSchema = z.enum(['google', 'wikimedia', 'wikipedia', 'cached']);
export type PlacePhotoSource = z.infer<typeof placePhotoSourceSchema>;

export const placePhotoCandidateSchema = z.object({
  /** Cache key, also the React key. Candidates use `<placeId>~p<n>`. */
  key: z.string(),
  /** Proxy URL (/api/maps/place-photo/<key>/bytes) — never a provider URL. */
  url: z.string(),
  /** Author/creator as the provider names them, not the provider itself. */
  attribution: z.string().nullable(),
  /** Short licence name, e.g. "CC BY-SA 4.0". */
  license: z.string().nullable(),
  licenseUrl: z.string().nullable(),
  /** The file description page, where the full terms live. */
  sourceUrl: z.string().nullable(),
  source: placePhotoSourceSchema,
});
export type PlacePhotoCandidate = z.infer<typeof placePhotoCandidateSchema>;

export const placeDescriptionSourceSchema = z.enum(['google', 'osm', 'wikivoyage', 'wikipedia']);
export type PlaceDescriptionSource = z.infer<typeof placeDescriptionSourceSchema>;

export const placeDescriptionSchema = z.object({
  text: z.string(),
  source: placeDescriptionSourceSchema,
  sourceUrl: z.string().nullable(),
  license: z.string().nullable(),
  /**
   * True when the text describes the CHAIN this place belongs to, not the place
   * itself — an article about L'Osteria the company, reached through the OSM
   * `brand:wikidata` tag, shown for a branch that nothing else describes.
   *
   * A flag rather than a source of its own: it is still a Wikipedia article
   * under the same licence, and the distinction the reader needs is "this is
   * about the brand", which the client says in the heading. Optional so a
   * payload written before this landed still parses.
   */
  aboutBrand: z.boolean().optional(),
});
export type PlaceDescription = z.infer<typeof placeDescriptionSchema>;

/**
 * A practical fact about a place, taken from its OpenStreetMap tags.
 *
 * This is what makes the column worth opening for a restaurant: places like
 * that have no encyclopaedia article and no photograph of their own, but they
 * very often carry a cuisine, opening hours and a link to their menu. The tags
 * arrive with the details lookup the dialog already makes, so none of this
 * costs an extra request.
 *
 * `kind` is translated client-side; `value` is provider data and stays as-is.
 */
export const placeFactKindSchema = z.enum([
  'rating',
  'cuisine',
  'openingHours',
  'menu',
  'outdoorSeating',
  'takeaway',
  'delivery',
  'wheelchair',
  'vegetarian',
  'vegan',
  'internetAccess',
]);
export type PlaceFactKind = z.infer<typeof placeFactKindSchema>;

export const placeFactSchema = z.object({
  kind: placeFactKindSchema,
  /** Free-text detail ("regional", "Mo-Sa 17:30+"); null for a plain yes. */
  value: z.string().nullable(),
  url: z.string().nullable(),
});
export type PlaceFact = z.infer<typeof placeFactSchema>;

/**
 * Opening hours as data rather than as a sentence.
 *
 * `PlaceHours`, not `PlaceOpeningHours`: the client already has an interface by
 * that name in `placeOpenState.ts` with a different shape, and two types with
 * one name in the same import graph is a trap for whoever reads it next.
 *
 * Both halves are needed and neither replaces the other. The weekday lines are
 * display text the provider localised for us and cannot be computed from;
 * `periods` is machine-readable and is the only thing that can answer "open
 * now" in the place's own timezone rather than the server's. Issue #1680 was
 * exactly this distinction.
 */
export const placeHoursTimePointSchema = z.object({
  /** Sunday is 0, the way Google numbers days. */
  day: z.number().int().min(0).max(6),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
});
export type PlaceHoursTimePoint = z.infer<typeof placeHoursTimePointSchema>;

export const placeHoursPeriodSchema = z.object({
  open: placeHoursTimePointSchema,
  /** Absent or null means the place never closes (a 24/7 tag, an all-night bar). */
  close: placeHoursTimePointSchema.nullable().optional(),
});
export type PlaceHoursPeriod = z.infer<typeof placeHoursPeriodSchema>;

export const placeHoursSchema = z.object({
  /** Monday first, localised by the provider. Deliberately not fixed at seven entries. */
  weekdayDescriptions: z.array(z.string()),
  periods: z.array(placeHoursPeriodSchema).nullable().optional(),
  /** YYYY-MM-DD dates the weekly pattern does not describe (holidays and the like). */
  specialDays: z.array(z.string()).nullable().optional(),
});
export type PlaceHours = z.infer<typeof placeHoursSchema>;

export const placeRatingSchema = z.object({
  value: z.number(),
  /** Google's search results carry a rating but no count, so this is often null. */
  count: z.number().int().nullable(),
});
export type PlaceRating = z.infer<typeof placeRatingSchema>;

export const mapsPlaceEnrichmentRequestSchema = z.object({
  /** Google place id or `osm:<type>/<id>`; empty for a coordinate-only lookup. */
  placeId: z.string().max(300).optional(),
  lat: z.number(),
  lng: z.number(),
  /** Used to resolve a Wikipedia article when the place carries no wiki tag. */
  name: z.string().min(1).max(300),
  lang: z.string().max(35).optional(),
  /**
   * The place record the client already holds from picking the search result.
   *
   * Enrichment needs the same OSM tags that lookup returned, and fetching them
   * again is not cheap: an Overpass lookup for a large relation was measured at
   * 12.8 seconds. Passing them along turns a second slow round trip into none.
   * Only the tags are read, and the wiki tag is re-validated before use, so a
   * doctored payload can at worst mislead the user who sent it.
   */
  details: z.record(z.string(), z.unknown()).optional(),
});
export type MapsPlaceEnrichmentRequest = z.infer<typeof mapsPlaceEnrichmentRequestSchema>;

export const mapsPlaceEnrichmentResultSchema = z.object({
  photos: z.array(placePhotoCandidateSchema),
  description: placeDescriptionSchema.nullable(),
  facts: z.array(placeFactSchema),
  /**
   * Additive, and the `openingHours` / `rating` fact kinds stay in the enum
   * above even though nothing emits them any more: a cached payload written
   * before this landed is still valid, and so is an older server talking to a
   * newer client.
   */
  hours: placeHoursSchema.nullable().optional(),
  rating: placeRatingSchema.nullable().optional(),
  /** True when the admin switched enrichment off; the column then stays quiet. */
  disabled: z.boolean().optional(),
});
export type MapsPlaceEnrichmentResult = z.infer<typeof mapsPlaceEnrichmentResultSchema>;
