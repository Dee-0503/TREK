import { describe, expect, it } from 'vitest'
import { buildAmapPlaceUrl, buildAmapRouteUrl, isMainlandContext } from './externalNavigation'

describe('AMap external navigation builders', () => {
  it('only enables AMap for explicit Mainland context', () => {
    expect(isMainlandContext({ countryCode: 'cn' })).toBe(true)
    expect(isMainlandContext({ countryCode: 'HK' })).toBe(false)
    expect(buildAmapPlaceUrl({ provider: 'amap', provider_place_id: 'B1', name: '外滩', lat: 31.23, lng: 121.49 }, { countryCode: 'US' })).toBeNull()
  })

  it('uses the documented WGS84 marker URL when an AMap result lacks an ID', () => {
    const url = buildAmapPlaceUrl({ provider: 'amap', provider_place_id: null, name: '外滩', lat: 31.23, lng: 121.49 }, { countryCode: 'CN' }, { callnative: false })
    expect(url).toContain('https://uri.amap.com/marker?')
    expect(url).toContain('coordinate=wgs84')
    expect(url).toContain('position=121.49%2C31.23')
  })

  it('builds encoded provider-qualified place detail URL', () => {
    const url = buildAmapPlaceUrl(
      { provider: 'amap', provider_place_id: 'B1', name: '外滩 & 广场', lat: 31.23, lng: 121.49 },
      { countryCode: 'CN' },
      { callnative: true },
    )
    expect(url).toContain('https://uri.amap.com/poidetail?')
    expect(url).toContain('poiid=B1')
    expect(url).toContain('callnative=1')
    expect(url).not.toContain('name=')
    expect(url).not.toContain('location=')
  })

  it('supports the documented one-via route and refuses unsupported waypoint counts', () => {
    const points = [
      { lat: 31.2, lng: 121.4, name: '起点' },
      { lat: 31.3, lng: 121.5, name: '途经' },
      { lat: 31.4, lng: 121.6, name: '终点' },
    ]
    expect(buildAmapRouteUrl(points, 'driving', { countryCode: 'CN' })).toContain('mode=car')
    expect(buildAmapRouteUrl(points, 'walking', { countryCode: 'CN' })).toContain('mode=walk')
    expect(buildAmapRouteUrl(points, 'cycling', { countryCode: 'CN' })).toContain('mode=ride')
    expect(buildAmapRouteUrl([...points, { lat: 31.5, lng: 121.7 }], 'driving', { countryCode: 'CN' })).toBeNull()
  })

  it('keeps both endpoints in a two-stop route without inventing a via', () => {
    const url = buildAmapRouteUrl([
      { lat: 31.2, lng: 121.4, name: '起点' },
      { lat: 31.4, lng: 121.6, name: '终点' },
    ], 'driving', { countryCode: 'CN' }, { callnative: false })
    const params = new URL(url!).searchParams
    expect(params.get('from')).toContain(encodeURIComponent('起点'))
    expect(params.get('to')).toContain(encodeURIComponent('终点'))
    expect(params.has('via')).toBe(false)
  })
})
