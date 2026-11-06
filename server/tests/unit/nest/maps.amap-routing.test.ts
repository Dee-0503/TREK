import { AmapPlacesProvider, AmapTipStash } from '../../../src/nest/maps/providers/amap.provider';
import { fromAmapLocation, toAmapLocation } from '@trek/shared';

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/utils/ssrfGuard', () => ({
  safeFetchFollow: (url: string, init?: RequestInit) => fetch(url, init),
}));

const provider = () => new AmapPlacesProvider({ key: 'test-key', source: 'instance', userId: 1 }, new AmapTipStash());
const waypoints = [
  { lat: 31.23, lng: 121.47 },
  { lat: 31.24, lng: 121.48 },
];
const polyline = waypoints.map((point) => toAmapLocation(point.lat, point.lng)).join(';');
const path = { distance: '1200', duration: '180', steps: [{ polyline }] };
const response = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('Amap route and polygon capabilities', () => {
  it.each([
    ['driving', '/v3/direction/driving'],
    ['walking', '/v3/direction/walking'],
    ['cycling', '/v4/direction/bicycling'],
  ] as const)('reads %s from its documented endpoint into WGS-84 route coordinates', async (profile, endpoint) => {
    const body =
      profile === 'cycling' ? { errcode: 0, data: { paths: [path] } } : { status: '1', route: { paths: [path] } };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response(body));
    vi.stubGlobal('fetch', fetchMock);
    const result = await provider().route(profile, waypoints);

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe(endpoint);
    expect(url.searchParams.get('origin')).toBe(toAmapLocation(waypoints[0].lat, waypoints[0].lng));
    expect(result.coordinates[0][0]).toBeCloseTo(waypoints[0].lat, 4);
    expect(result.coordinates[0][1]).toBeCloseTo(waypoints[0].lng, 4);
    expect(result).toMatchObject({ distance: 1200, duration: 180, routeSource: { provider: 'amap', fallback: false } });
    expect(result.legs).toHaveLength(1);
  });

  it('joins consecutive legs without doubling their shared endpoint', async () => {
    const points = [...waypoints, { lat: 31.25, lng: 121.49 }];
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ status: '1', route: { paths: [path] } }))
      .mockResolvedValueOnce(
        response({
          status: '1',
          route: {
            paths: [
              {
                ...path,
                steps: [
                  {
                    polyline: points
                      .slice(1)
                      .map((point) => toAmapLocation(point.lat, point.lng))
                      .join(';'),
                  },
                ],
              },
            ],
          },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const result = await provider().route('driving', points);
    expect(result.coordinates).toHaveLength(3);
    expect(result.legs).toHaveLength(2);
    expect(result.distance).toBe(2400);
  });

  it('refuses malformed route coordinates instead of drawing a partial line', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          response({ status: '1', route: { paths: [{ ...path, steps: [{ polyline: 'not-a-coordinate' }] }] } }),
        ),
    );
    await expect(provider().route('driving', waypoints)).rejects.toThrow('invalid route coordinates');
  });

  it('bounds category POIs and returns provider-qualified identities', async () => {
    const location = toAmapLocation(31.23, 121.47);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response({ status: '1', pois: [{ id: 'B1', name: '咖啡', location }] }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await provider().searchPois('cafe', { south: 30, west: 120, north: 32, east: 122 });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe('/v3/place/polygon');
    expect(url.searchParams.get('offset')).toBe('25');
    const corners = url.searchParams
      .get('polygon')!
      .split('|')
      .map((pair) => fromAmapLocation(pair)!);
    expect(Math.max(...corners.map((point) => point.lat)) - Math.min(...corners.map((point) => point.lat))).toBeCloseTo(
      0.5,
      3,
    );
    expect(result).toMatchObject({ clamped: true, source: 'amap', pois: [{ osm_id: 'amap:B1', name: '咖啡' }] });
  });

  it('leaves categories Amap cannot map to the existing OSM path', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
    expect(
      await provider().searchPois('ebike_charging', { south: 31, west: 121, north: 31.1, east: 121.1 }),
    ).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
