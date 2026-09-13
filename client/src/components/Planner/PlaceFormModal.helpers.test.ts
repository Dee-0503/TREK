import { describe, it, expect } from 'vitest'
import { isGoogleMapsUrl, mergeResult, DEFAULT_FORM } from './PlaceFormModal.helpers'

describe('mergeResult provider identity', () => {
  it('clears the previous provider identity when the next result has none', () => {
    const owned = new Set(['provider', 'provider_place_id'] as const)
    const prev = { ...DEFAULT_FORM, provider: 'amap' as const, provider_place_id: 'amap-1' }

    const next = mergeResult(prev, { name: 'OSM place' }, owned)

    expect(next.provider).toBe('')
    expect(next.provider_place_id).toBe('')
    expect(owned.has('provider')).toBe(false)
    expect(owned.has('provider_place_id')).toBe(false)
  })
})

describe('isGoogleMapsUrl', () => {
  it('accepts the short share hosts', () => {
    expect(isGoogleMapsUrl('https://maps.app.goo.gl/abc123')).toBe(true)
    expect(isGoogleMapsUrl('https://goo.gl/maps/xyz')).toBe(true)
  })

  it('rejects goo.gl links that are not /maps', () => {
    expect(isGoogleMapsUrl('https://goo.gl/something')).toBe(false)
  })

  it('accepts maps.google.<tld> and maps.google.<sld>.<tld>', () => {
    expect(isGoogleMapsUrl('https://maps.google.com/?q=eiffel')).toBe(true)
    expect(isGoogleMapsUrl('https://maps.google.co.uk/?q=eiffel')).toBe(true)
  })

  it('accepts google.<tld>/maps with optional www', () => {
    expect(isGoogleMapsUrl('https://google.com/maps/place/Eiffel')).toBe(true)
    expect(isGoogleMapsUrl('https://www.google.co.uk/maps')).toBe(true)
  })

  it('rejects google.<tld> without a /maps path', () => {
    expect(isGoogleMapsUrl('https://google.com/search?q=eiffel')).toBe(false)
  })

  it('rejects spoofed hosts like maps.google.evil.com', () => {
    expect(isGoogleMapsUrl('https://maps.google.evil.com/maps')).toBe(false)
  })

  it('returns false for non-URL input', () => {
    expect(isGoogleMapsUrl('not a url')).toBe(false)
    expect(isGoogleMapsUrl('')).toBe(false)
    expect(isGoogleMapsUrl('Eiffel Tower')).toBe(false)
  })

  it('trims surrounding whitespace before parsing', () => {
    expect(isGoogleMapsUrl('  https://maps.app.goo.gl/abc123  ')).toBe(true)
  })
})
