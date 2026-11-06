import { normalizePlaceIdentity } from '@trek/shared';

interface PlaceIdentityInput {
  provider?: unknown;
  provider_place_id?: string | null;
  google_place_id?: string | null;
  google_ftid?: string | null;
  osm_id?: string | null;
  amap_poi_id?: string | null;
}

/** Keep the shared identity and upstream's provider-specific columns in one write. */
export function placeIdentityWrite(input: PlaceIdentityInput, current?: PlaceIdentityInput) {
  const keys = ['google_place_id', 'google_ftid', 'osm_id', 'amap_poi_id'] as const;
  const legacy = {
    google_place_id: input.google_place_id !== undefined ? input.google_place_id : (current?.google_place_id ?? null),
    google_ftid: input.google_ftid !== undefined ? input.google_ftid : (current?.google_ftid ?? null),
    osm_id: input.osm_id !== undefined ? input.osm_id : (current?.osm_id ?? null),
    amap_poi_id: input.amap_poi_id !== undefined ? input.amap_poi_id : (current?.amap_poi_id ?? null),
  };
  const explicit =
    input.provider != null ||
    input.provider_place_id != null ||
    (current !== undefined && (input.provider !== undefined || input.provider_place_id !== undefined));
  const supplied = keys.some((key) => input[key]?.trim()) ? input : legacy;
  const candidates = [
    { provider: 'google', provider_place_id: supplied.google_place_id || supplied.google_ftid },
    { provider: 'osm', provider_place_id: supplied.osm_id },
    { provider: 'amap', provider_place_id: supplied.amap_poi_id },
  ].filter((candidate) => candidate.provider_place_id?.trim());
  const identity = explicit
    ? normalizePlaceIdentity(input, current ? 'update' : 'create')
    : current && !keys.some((key) => input[key] !== undefined)
      ? normalizePlaceIdentity(current, 'create')
      : normalizePlaceIdentity(candidates.length === 1 ? candidates[0] : {}, 'create');

  if (
    explicit ||
    (identity.provider !== null &&
      keys.some((key) => input[key] !== undefined) &&
      identity.provider !== current?.provider)
  ) {
    const same = identity.provider === current?.provider && identity.provider_place_id === current?.provider_place_id;
    legacy.google_place_id =
      identity.provider === 'google' ? (explicit ? identity.provider_place_id : legacy.google_place_id) : null;
    legacy.google_ftid =
      identity.provider === 'google' && identity.provider_place_id
        ? input.google_ftid !== undefined
          ? input.google_ftid
          : same
            ? (current?.google_ftid ?? null)
            : null
        : null;
    legacy.osm_id = identity.provider === 'osm' ? identity.provider_place_id : null;
    legacy.amap_poi_id =
      identity.provider === 'amap' && identity.provider_place_id ? `amap:${identity.provider_place_id}` : null;
  }
  if (identity.provider === 'amap' && legacy.amap_poi_id) {
    legacy.amap_poi_id = `amap:${legacy.amap_poi_id.replace(/^amap:/i, '')}`;
  }
  return { ...legacy, ...identity };
}
