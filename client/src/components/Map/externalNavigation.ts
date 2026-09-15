import type { GeographicContext } from '@trek/shared'

export type ExternalNavigationContext = Pick<GeographicContext, 'countryCode'>
export type ExternalRouteProfile = 'driving' | 'walking' | 'cycling' | (string & {})

export interface ExternalWaypoint {
  lat: number | null | undefined
  lng: number | null | undefined
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
  if (!isMainlandContext({ countryCode: 'CN' })) return { ...point }
  const delta = deltaFor(point.lat, point.lng)
  return { lat: point.lat + delta.lat, lng: point.lng + delta.lng }
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
  const [from, via, to] = places
  const params = [`from=${encoded(amapPoint(from))}`, `to=${encoded(amapPoint(to))}`]
  if (via) params.push(`via=${encoded(amapPoint(via))}`)
  params.push(`mode=${mode}`)
  if (shouldCallNative(options.callnative)) params.push('callnative=1')
  return `${AMAP_ROUTE_URI}?${params.join('&')}`
}

function deltaFor(lat: number, lng: number): { lat: number; lng: number } {
  const pi = Math.PI
  const axis = 6378245.0
  const ee = 0.006693421622965943
  const dLat = transformLat(lng - 105, lat - 35)
  const dLng = transformLng(lng - 105, lat - 35)
  const radLat = (lat / 180) * pi
  let magic = Math.sin(radLat)
  magic = 1 - ee * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  return {
    lat: (dLat * 180) / (((axis * (1 - ee)) / (magic * sqrtMagic)) * pi),
    lng: (dLng * 180) / ((axis / sqrtMagic) * Math.cos(radLat) * pi),
  }
}

function transformLat(x: number, y: number): number {
  let ret = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3
  ret += ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) / 3
  ret += ((160 * Math.sin((y / 12) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30)) * 2) / 3
  return ret
}

function transformLng(x: number, y: number): number {
  let ret = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3
  ret += ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) / 3
  ret += ((150 * Math.sin((x / 12) * Math.PI) + 300 * Math.sin((x / 30) * Math.PI)) * 2) / 3
  return ret
}
