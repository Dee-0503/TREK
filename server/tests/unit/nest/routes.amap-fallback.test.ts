import { MapsModule } from '../../../src/nest/maps/maps.module';
import { MapsService } from '../../../src/nest/maps/maps.service';
import { PlacesProviderSelector } from '../../../src/nest/maps/places-provider.selector';
import type { AmapPlacesProvider } from '../../../src/nest/maps/providers/amap.provider';
import { createSnapshotTestDb } from '../../helpers/db-mock';
import { createTestModule, type TestModule } from '../../helpers/test-module';

import { describe, expect, it, vi, afterEach, beforeAll, afterAll } from 'vitest';

const db = createSnapshotTestDb();
const selector = { routeProvider: vi.fn<PlacesProviderSelector['routeProvider']>() };
let testModule: TestModule;
let instance: MapsService;

beforeAll(async () => {
  testModule = await createTestModule({
    db,
    imports: [MapsModule],
    overrides: [{ provide: PlacesProviderSelector, useValue: selector }],
  });
  instance = testModule.get(MapsService);
});

afterAll(async () => {
  await testModule.close();
  db.close();
});

type Route = Awaited<ReturnType<MapsService['route']>>;
const waypoints = [
  { lat: 31.23, lng: 121.47 },
  { lat: 31.24, lng: 121.48 },
];
const route: Route = {
  coordinates: [
    [31.23, 121.47],
    [31.24, 121.48],
  ],
  distance: 1200,
  duration: 180,
  routeSource: { provider: 'amap', fallback: false },
  legs: [
    {
      mid: [31.235, 121.475],
      from: [31.23, 121.47],
      to: [31.24, 121.48],
      distance: 1200,
      duration: 180,
      walkingText: '14 min',
      drivingText: '3 min',
      distanceText: '1.2 km',
    },
  ],
};

function service(selected: 'amap' | 'osrm') {
  const amapProvider = { route: vi.fn<AmapPlacesProvider['route']>() };
  selector.routeProvider
    .mockClear()
    .mockResolvedValue(selected === 'amap' ? (amapProvider as unknown as AmapPlacesProvider) : null);
  return { instance, amapProvider, selector };
}

function osrmResponse(overrides: Record<string, unknown> = {}): Response {
  return new Response(
    JSON.stringify({
      code: 'Ok',
      routes: [
        {
          geometry: {
            coordinates: [
              [121.47, 31.23],
              [121.48, 31.24],
            ],
          },
          distance: 1000,
          duration: 200,
          legs: [{ distance: 1000, duration: 200 }],
        },
      ],
      ...overrides,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

afterEach(() => vi.restoreAllMocks());

describe('MapsService AMap route fallback', () => {
  it('keeps every waypoint and leg when a long day exceeds the Amap request budget', async () => {
    const points = Array.from({ length: 30 }, (_, index) => ({ lat: 31.2 + index / 1000, lng: 121.4 + index / 1000 }));
    const { instance, amapProvider } = service('amap');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'Ok',
          routes: [
            {
              geometry: { coordinates: points.map((point) => [point.lng, point.lat]) },
              legs: points.slice(1).map(() => ({ distance: 100, duration: 60 })),
            },
          ],
        }),
      ),
    );
    const result = await instance.route('driving', points, { countryCode: 'CN' });
    expect(amapProvider.route).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.coordinates).toHaveLength(30);
    expect(result.legs).toHaveLength(29);
    expect(result.coordinates.at(-1)).toEqual([points[29].lat, points[29].lng]);
    expect(result.routeSource).toEqual({ provider: 'osrm', fallback: true, fallbackReason: 'too_many_waypoints' });
  });

  it('returns a successful AMap route without calling OSRM', async () => {
    const { instance, amapProvider } = service('amap');
    amapProvider.route.mockResolvedValue(route);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(instance.route('driving', waypoints, { countryCode: 'CN' })).resolves.toEqual(route);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each(['timeout', 'rate_limit', 'permission', 'unsupported', 'empty_route', 'invalid_response', 'server'])(
    'falls back exactly once for AMap %s',
    async (reason) => {
      const { instance, amapProvider } = service('amap');
      const error = Object.assign(new Error('provider failed'), { code: reason });
      amapProvider.route.mockRejectedValue(error);
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(osrmResponse());

      const result = await instance.route('driving', waypoints, { countryCode: 'CN' });
      expect(result.routeSource).toEqual({ provider: 'osrm', fallback: true, fallbackReason: `amap_${reason}` });
      expect(amapProvider.route).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    },
  );

  it('preserves OSRM failure semantics after the AMap attempt fails', async () => {
    const { instance, amapProvider } = service('amap');
    amapProvider.route.mockRejectedValue(Object.assign(new Error('provider failed'), { code: 'timeout' }));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 503 }));

    await expect(instance.route('driving', waypoints, { countryCode: 'CN' })).rejects.toThrow(
      'Route could not be calculated',
    );
    expect(amapProvider.route).toHaveBeenCalledTimes(1);
  });

  it('keeps public transport out of the AMap path', async () => {
    const { instance, amapProvider, selector } = service('osrm');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(osrmResponse());

    await expect(instance.route('transit' as never, waypoints, { countryCode: 'CN' })).rejects.toThrow(
      'Invalid route request',
    );
    expect(selector.routeProvider).not.toHaveBeenCalled();
    expect(amapProvider.route).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('uses OSRM for overseas routes', async () => {
    const { instance, amapProvider } = service('osrm');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(osrmResponse());

    const result = await instance.route('cycling', waypoints, { countryCode: 'US' });
    expect(result.routeSource).toEqual({ provider: 'osrm', fallback: false });
    expect(amapProvider.route).not.toHaveBeenCalled();
  });
});
