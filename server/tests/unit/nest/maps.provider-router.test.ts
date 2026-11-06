import type { AppSettingsRepository } from '../../../src/db/repositories/AppSettings.repository';
import type { UsersRepository } from '../../../src/db/repositories/Users.repository';
import { PlacesProviderSelector, mainlandContext } from '../../../src/nest/maps/places-provider.selector';
import { noGoogleQuota } from '../../helpers/google-quota';

import { afterEach, describe, expect, it, vi } from 'vitest';

const selector = (choice: 'auto' | 'google' | 'amap' | 'openstreetmap' = 'auto') =>
  new PlacesProviderSelector(
    {
      getValue: async (key: string) => (key === 'places_provider' ? choice : null),
    } as unknown as AppSettingsRepository,
    { getApiKeyColumn: async () => null } as unknown as UsersRepository,
    noGoogleQuota,
  );

afterEach(() => vi.unstubAllEnvs());

describe('geographic provider selection', () => {
  it.each(['google', 'openstreetmap'] as const)(
    'keeps the administrator’s %s choice inside mainland China',
    async (choice) => {
      vi.stubEnv('AMAP_API_KEY', 'test-amap');
      vi.stubEnv('PLACES_API_KEY', 'test-google');
      const keyed = await selector(choice).keyedProvider(1, { countryCode: 'CN' });
      expect(keyed?.id ?? null).toBe(choice === 'google' ? 'google' : null);
    },
  );

  it.each(['US', 'HK', 'MO', 'TW', undefined])(
    'does not use an Amap key automatically for %s without a Google key',
    async (countryCode) => {
      vi.stubEnv('AMAP_API_KEY', 'test-amap');
      vi.stubEnv('PLACES_API_KEY', '');
      expect(await selector().keyedProvider(1, { countryCode })).toBeNull();
    },
  );

  it.each(['amap', 'openstreetmap'] as const)(
    'keeps fixed %s ahead of a one-off Google-only request',
    async (choice) => {
      vi.stubEnv('AMAP_API_KEY', 'test-amap');
      vi.stubEnv('PLACES_API_KEY', 'test-google');
      const keyed = await selector(choice).keyedProvider(1, { countryCode: 'CN' }, true);
      expect(keyed?.id ?? null).toBe(choice === 'amap' ? 'amap' : null);
    },
  );

  it('allows a one-off Google-only request while auto would choose mainland Amap', async () => {
    vi.stubEnv('AMAP_API_KEY', 'test-amap');
    vi.stubEnv('PLACES_API_KEY', 'test-google');
    expect((await selector().keyedProvider(1, { countryCode: 'CN' }, true))?.id).toBe('google');
  });

  it('honours an explicit configured Google override over a fixed Amap default', async () => {
    vi.stubEnv('AMAP_API_KEY', 'test-amap');
    vi.stubEnv('PLACES_API_KEY', 'test-google');
    expect((await selector('amap').keyedProvider(1, { countryCode: 'CN', providerOverride: 'google' }))?.id).toBe(
      'google',
    );
  });

  it('prefers configured Amap for mainland China even with a Google key', async () => {
    vi.stubEnv('AMAP_API_KEY', 'test-amap');
    vi.stubEnv('PLACES_API_KEY', 'test-google');
    expect((await selector().keyedProvider(1, { countryCode: 'CN' }))?.id).toBe('amap');
  });

  it.each(['US', 'HK', 'MO', 'TW'])('keeps %s on the overseas provider chain', async (countryCode) => {
    vi.stubEnv('AMAP_API_KEY', 'test-amap');
    vi.stubEnv('PLACES_API_KEY', 'test-google');
    expect((await selector().keyedProvider(1, { countryCode }))?.id).toBe('google');
    expect(await selector().routeProvider(1, { countryCode })).toBeNull();
  });

  it('honours an explicit keyless provider override', async () => {
    vi.stubEnv('AMAP_API_KEY', 'test-amap');
    expect(await selector().keyedProvider(1, { countryCode: 'CN', providerOverride: 'osm' })).toBeNull();
  });

  it('uses the configured default when geography is unknown', async () => {
    vi.stubEnv('AMAP_API_KEY', 'test-amap');
    vi.stubEnv('PLACES_PROVIDER_MODE', 'amap');
    expect((await selector().keyedProvider(1))?.id).toBe('amap');
  });

  it('falls through to Google when no Amap credential is configured', async () => {
    vi.stubEnv('AMAP_API_KEY', '');
    vi.stubEnv('PLACES_API_KEY', 'test-google');
    expect((await selector().keyedProvider(1, { countryCode: 'CN' }))?.id).toBe('google');
  });

  it('accepts an OSRM route override inside China', async () => {
    vi.stubEnv('AMAP_API_KEY', 'test-amap');
    expect(await selector().routeProvider(1, { countryCode: 'CN', override: 'osrm' })).toBeNull();
    expect((await selector().routeProvider(1, { override: 'amap' }))?.id).toBe('amap');
  });

  it('uses coordinate evidence only without an explicit country', () => {
    expect(mainlandContext({ latitude: 31.23, longitude: 121.47 })).toBe(true);
    expect(mainlandContext({ countryCode: 'TW', latitude: 31.23, longitude: 121.47 })).toBe(false);
  });
});
