export type RouteSourceDisplay = {
  provider: 'amap' | 'osrm'
  fallback: boolean
  fallbackReason?: string
}

export function formatRouteSourceLabel(source: RouteSourceDisplay | null | undefined): string | null {
  if (!source) return null
  const provider = source.provider === 'amap' ? 'AMap' : 'OSRM'
  return `${provider}${source.fallback ? ` fallback (${source.fallbackReason ?? 'provider failure'})` : ''}`
}
