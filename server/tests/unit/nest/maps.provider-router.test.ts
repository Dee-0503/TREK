import { describe, expect, it, vi, afterEach } from 'vitest';
import { ProviderRouter } from '../../../src/nest/maps/providers/provider-router';

afterEach(() => vi.unstubAllEnvs());

describe('ProviderRouter', () => {
  it('selects AMap for explicit mainland China when enabled', () => {
    vi.stubEnv('AMAP_API_KEY', 'test-key');
    vi.stubEnv('PLACES_API_KEY', 'google-key');
    expect(new ProviderRouter().resolvePlaceProvider({ countryCode: 'CN' })).toBe('amap');
  });

  it('selects Google outside mainland China when enabled', () => {
    vi.stubEnv('AMAP_API_KEY', 'test-key');
    vi.stubEnv('PLACES_API_KEY', 'google-key');
    expect(new ProviderRouter().resolvePlaceProvider({ countryCode: 'US' })).toBe('google');
  });

  it('honours only enabled overrides', () => {
    vi.stubEnv('AMAP_API_KEY', 'test-key');
    expect(new ProviderRouter().resolvePlaceProvider({ override: 'osm', countryCode: 'CN' })).toBe('osm');
  });

  it.each(['HK', 'MO', 'TW'])('does not classify %s as mainland China', (countryCode) => {
    vi.stubEnv('AMAP_API_KEY', 'test-key');
    vi.stubEnv('PLACES_API_KEY', 'google-key');
    expect(new ProviderRouter().resolvePlaceProvider({ countryCode })).toBe('google');
  });

  it('normalizes the shared openstreetmap alias', () => {
    vi.stubEnv('PLACES_PROVIDER_MODE', 'openstreetmap');
    expect(new ProviderRouter().resolvePlaceProvider({})).toBe('osm');
  });

  it('uses the configured default for unknown context', () => {
    vi.stubEnv('AMAP_API_KEY', 'test-key');
    vi.stubEnv('PLACES_PROVIDER_MODE', 'amap');
    expect(new ProviderRouter().resolvePlaceProvider({})).toBe('amap');
  });

  it('selects AMap for mainland routes and OSRM otherwise', () => {
    vi.stubEnv('AMAP_API_KEY', 'test-key');
    expect(new ProviderRouter().resolveRouteProvider({ countryCode: 'CN' })).toBe('amap');
    expect(new ProviderRouter().resolveRouteProvider({ countryCode: 'US' })).toBe('osrm');
  });

  it('accepts only route-provider overrides and never maps google to AMap', () => {
    vi.stubEnv('AMAP_API_KEY', 'test-key');
    expect(new ProviderRouter().resolveRouteProvider({ override: 'amap' })).toBe('amap');
    expect(new ProviderRouter().resolveRouteProvider({ override: 'osrm', countryCode: 'CN' })).toBe('osrm');
    expect(new ProviderRouter().resolveRouteProvider({ override: 'google' as never, countryCode: 'CN' })).toBe('amap');
  });
});
