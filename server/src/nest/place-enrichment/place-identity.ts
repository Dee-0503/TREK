import { placeProviderIdentitySchema, type MapsPlaceEnrichmentRequest } from '@trek/shared';

export function enrichmentPlaceId(req: MapsPlaceEnrichmentRequest): string {
  const id = req.placeId?.trim();
  if (!id) return `coords:${req.lat}:${req.lng}`;
  if (id.startsWith('google:')) return id.slice('google:'.length);
  if (id.includes(':')) return id;
  const identity = placeProviderIdentitySchema.safeParse(req.details?.providerIdentity);
  const provider = identity.success ? identity.data.provider : (req.details?.provider ?? req.details?.source);
  if (provider === 'amap' || provider === 'osm' || provider === 'openstreetmap') {
    return `${provider === 'openstreetmap' ? 'osm' : provider}:${id}`;
  }
  return id;
}
