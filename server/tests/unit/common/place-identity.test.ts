import { placeIdentityWrite } from '../../../src/nest/common/place-identity';

import { describe, expect, it } from 'vitest';

describe('placeIdentityWrite', () => {
  it('writes both AMap identity forms when saving a search result', () => {
    expect(placeIdentityWrite({ provider: 'amap', provider_place_id: 'amap:B123' })).toMatchObject({
      provider: 'amap',
      provider_place_id: 'B123',
      amap_poi_id: 'amap:B123',
      google_place_id: null,
    });
  });

  it('recognises the upstream AMap column without requiring a second identity', () => {
    expect(placeIdentityWrite({ amap_poi_id: 'amap:B123' })).toMatchObject({
      provider: 'amap',
      provider_place_id: 'B123',
      amap_poi_id: 'amap:B123',
    });
  });

  it('preserves an identity during a write that changes no provider fields', () => {
    const current = { provider: 'amap', provider_place_id: 'B123', amap_poi_id: 'amap:B123' };
    expect(placeIdentityWrite({}, current)).toMatchObject(current);
  });

  it('clears stale provider-specific ids when switching providers', () => {
    expect(
      placeIdentityWrite(
        { provider: 'osm', provider_place_id: 'node:42' },
        {
          provider: 'google',
          provider_place_id: 'ChIJ',
          google_place_id: 'ChIJ',
          google_ftid: '0x1:0x2',
        },
      ),
    ).toMatchObject({
      provider: 'osm',
      provider_place_id: 'node:42',
      osm_id: 'node:42',
      google_place_id: null,
      google_ftid: null,
      amap_poi_id: null,
    });
  });

  it('clears a previous id when a provider-only patch deliberately resets it', () => {
    expect(
      placeIdentityWrite(
        { provider: 'amap' },
        {
          provider: 'amap',
          provider_place_id: 'B123',
          amap_poi_id: 'amap:B123',
        },
      ),
    ).toMatchObject({ provider: 'amap', provider_place_id: null, amap_poi_id: null });
  });

  it('does not assign an identity to ambiguous legacy columns', () => {
    expect(placeIdentityWrite({ google_place_id: 'same', osm_id: 'same' })).toMatchObject({
      provider: null,
      provider_place_id: null,
      google_place_id: 'same',
      osm_id: 'same',
    });
  });

  it('rejects a provider id without a provider before writing', () => {
    expect(() => placeIdentityWrite({ provider_place_id: 'B123' })).toThrow();
  });

  it('switches from a Google place when an upstream AMap selection is supplied', () => {
    expect(
      placeIdentityWrite(
        { amap_poi_id: 'amap:B2' },
        {
          provider: 'google',
          provider_place_id: 'G1',
          google_place_id: 'G1',
          google_ftid: '0x1:0x2',
        },
      ),
    ).toMatchObject({
      provider: 'amap',
      provider_place_id: 'B2',
      amap_poi_id: 'amap:B2',
      google_place_id: null,
      google_ftid: null,
    });
  });

  it('prefixes a raw upstream AMap id for its details resolver', () => {
    expect(placeIdentityWrite({ amap_poi_id: 'B2' })).toMatchObject({
      provider: 'amap',
      provider_place_id: 'B2',
      amap_poi_id: 'amap:B2',
    });
  });

  it('keeps a legacy feature id when copying a stored row with null identity columns', () => {
    expect(placeIdentityWrite({ provider: null, provider_place_id: null, google_ftid: '0x1:0x2' })).toMatchObject({
      provider: 'google',
      provider_place_id: '0x1:0x2',
      google_ftid: '0x1:0x2',
    });
  });
});
