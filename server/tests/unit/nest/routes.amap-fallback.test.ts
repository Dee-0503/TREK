import { describe, expect, it } from 'vitest';
import { ProviderRouter } from '../../../src/nest/maps/providers/provider-router';

describe('route provider selection', () => {
  it('selects AMap only for supported mainland profiles', () => {
    const router = new ProviderRouter();
    expect(router.resolveRouteProviderForProfile('driving', { countryCode: 'CN' })).toBe('amap');
    expect(router.resolveRouteProviderForProfile('walking', { countryCode: 'CN' })).toBe('amap');
    expect(router.resolveRouteProviderForProfile('cycling', { countryCode: 'CN' })).toBe('amap');
    expect(router.resolveRouteProviderForProfile('transit', { countryCode: 'CN' })).toBe('osrm');
  });

  it('keeps overseas routes on OSRM', () => {
    const router = new ProviderRouter();
    expect(router.resolveRouteProviderForProfile('driving', { countryCode: 'US' })).toBe('osrm');
    expect(router.resolveRouteProviderForProfile('driving', { countryCode: 'HK' })).toBe('osrm');
  });
});
