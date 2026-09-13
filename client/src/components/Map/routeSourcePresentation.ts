export type RouteSourceDisplay = {
  provider: 'amap' | 'osrm' | 'plugin' | 'mixed'
  fallback: boolean
  fallbackReason?: string
  fallbackReasons?: string[]
  pluginId?: string
  profile?: string
}

export function formatRouteSourceLabel(source: RouteSourceDisplay | null | undefined): string | null {
  if (!source) return null
  const provider = source.provider === 'amap' ? 'AMap' : source.provider === 'plugin' ? `Plugin${source.pluginId ? ` (${source.pluginId})` : ''}` : source.provider === 'mixed' ? 'Mixed providers' : 'OSRM'
  return `${provider}${source.fallback ? ` fallback (${source.fallbackReasons?.join(', ') || source.fallbackReason || 'provider failure'})` : ''}`
}
