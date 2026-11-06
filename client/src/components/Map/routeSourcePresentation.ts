export type RouteSourceDisplay = import('@trek/shared').RouteSource

export function formatRouteSourceLabel(source: RouteSourceDisplay | null | undefined): string | null {
  if (!source) return null
  const provider = source.provider === 'amap' ? 'AMap' : source.provider === 'valhalla' ? 'Valhalla' : source.provider === 'plugin' ? `Plugin${source.pluginId ? ` (${source.pluginId})` : ''}` : source.provider === 'mixed' ? 'Mixed providers' : 'OSRM'
  return `${provider}${source.fallback ? ` fallback (${source.fallbackReasons?.join(', ') || source.fallbackReason || 'provider failure'})` : ''}`
}
