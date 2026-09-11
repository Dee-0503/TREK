import type {
  MapsAutocompleteResult,
  MapsPlaceDetailsResult,
  MapsReverseResult,
  MapsSearchResult,
} from '@trek/shared';

/**
 * Provider boundary for place lookup operations. Implementations normalize their
 * own upstream payloads before returning them; callers never see provider wire
 * formats or coordinate systems.
 */
export interface MapsProvider {
  readonly id: 'google' | 'amap' | 'osm';
  search(query: string, options?: Record<string, unknown>): Promise<MapsSearchResult>;
  autocomplete(input: string, options?: Record<string, unknown>): Promise<MapsAutocompleteResult>;
  getDetails(providerPlaceId: string, options?: Record<string, unknown>): Promise<MapsPlaceDetailsResult>;
  reverseGeocode(coordinates: { lat: number; lng: number }, options?: Record<string, unknown>): Promise<MapsReverseResult>;
}
