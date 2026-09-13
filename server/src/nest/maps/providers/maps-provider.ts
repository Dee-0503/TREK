import type {
  MapsAutocompleteResult,
  MapsPlaceDetailsResult,
  MapsReverseResult,
  MapsSearchResult,
  RouteWithLegs,
} from '@trek/shared';

export type RouteProfile = 'driving' | 'walking' | 'cycling';
export type RouteWaypoint = { lat: number; lng: number };

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

export interface RouteProvider {
  readonly id: 'amap' | 'osrm';
  route(profile: RouteProfile, waypoints: RouteWaypoint[], options?: { signal?: AbortSignal }): Promise<RouteWithLegs>;
}
