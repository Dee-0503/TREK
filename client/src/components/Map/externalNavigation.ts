import { wgs84ToGcj02, type GeographicContext } from '@trek/shared'

export type ExternalNavigationContext = Pick<GeographicContext, 'countryCode'>
export type ExternalRouteProfile = 'driving' | 'walking' | 'cycling' | (string & {})

export interface ExternalWaypoint {
  lat?: number | null
  lng?: number | null
  name?: string | null
}

export interface AmapPlaceTargetInput extends ExternalWaypoint {
  provider?: string | null
  provider_place_id?: string | null
}

const AMAP_PLACE_URI = 'https://uri.amap.com/poidetail'
const AMAP_ROUTE_URI = 'https://uri.amap.com/navigation'

/**
 * AMap's URI boundary uses GCJ-02. TREK's persisted/rendered coordinates stay
 * WGS84; conversion is deliberately isolated to this provider-specific module.
 */
export function toAmapCoordinates(point: { lat: number; lng: number }): { lat: number; lng: number } {
  return wgs84ToGcj02(point.lat, point.lng)
}

export function isMainlandContext(context?: ExternalNavigationContext | null): boolean {
  return context?.countryCode?.trim().toUpperCase() === 'CN'
}

function isMobileUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

function shouldCallNative(callnative?: boolean): boolean {
  return callnative ?? isMobileUserAgent()
}

function validPoint(point: ExternalWaypoint): point is ExternalWaypoint & { lat: number; lng: number } {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng)
}

function encoded(value: string): string {
  return encodeURIComponent(value)
}

function amapPoint(point: ExternalWaypoint & { lat: number; lng: number }): string {
  const converted = toAmapCoordinates({ lat: point.lat, lng: point.lng })
  const position = `${converted.lng},${converted.lat}`
  const name = point.name?.trim()
  return name ? `${position},${encoded(name)}` : position
}

/** Build the documented AMap place-detail URI for a provider-qualified place. */
export function buildAmapPlaceUrl(
  place: AmapPlaceTargetInput,
  context?: ExternalNavigationContext | null,
  options: { callnative?: boolean } = {},
): string | null {
  if (!isMainlandContext(context) || place.provider !== 'amap') return null
  if (place.provider_place_id?.trim()) {
    // The documented POI-detail contract accepts only the provider POI ID
    // (plus optional native-handoff flags); do not add marker-only fields.
    const params = [`poiid=${encoded(place.provider_place_id.trim())}`]
    if (shouldCallNative(options.callnative)) params.push('callnative=1')
    return `${AMAP_PLACE_URI}?${params.join('&')}`
  }
  // A provider-qualified result without an ID can still use the documented
  // marker endpoint. Explicitly declare WGS84 so the URI host converts the
  // persisted coordinate; do not silently invent a POI identity.
  if (!place.name?.trim() || !validPoint(place)) return null
  const params = [
    `position=${encoded(`${place.lng},${place.lat}`)}`,
    `name=${encoded(place.name.trim())}`,
    'coordinate=wgs84',
  ]
  if (shouldCallNative(options.callnative)) params.push('callnative=1')
  return `https://uri.amap.com/marker?${params.join('&')}`
}

function amapMode(profile: ExternalRouteProfile): 'car' | 'walk' | 'ride' | null {
  if (profile === 'driving') return 'car'
  if (profile === 'walking') return 'walk'
  if (profile === 'cycling') return 'ride'
  return null
}

/**
 * Build an AMap route URI for an ordered route. AMap supports at most one via
 * point here; returning null is safer than silently dropping planned stops.
 */
export function buildAmapRouteUrl(
  places: ExternalWaypoint[],
  profile: ExternalRouteProfile = 'driving',
  context?: ExternalNavigationContext | null,
  options: { callnative?: boolean } = {},
): string | null {
  if (!isMainlandContext(context) || places.length < 2 || places.length > 3) return null
  const mode = amapMode(profile)
  if (!mode || !places.every(validPoint)) return null
  const from = places[0]
  const to = places[places.length - 1]
  const via = places.length === 3 ? places[1] : undefined
  const params = [`from=${encoded(amapPoint(from))}`, `to=${encoded(amapPoint(to))}`]
  if (via) params.push(`via=${encoded(amapPoint(via))}`)
  params.push(`mode=${mode}`)
  if (shouldCallNative(options.callnative)) params.push('callnative=1')
  return `${AMAP_ROUTE_URI}?${params.join('&')}`
}
