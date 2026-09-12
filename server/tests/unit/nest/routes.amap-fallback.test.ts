import { describe, expect, it, vi, afterEach } from 'vitest';
import { MapsService } from '../../../src/nest/maps/maps.service';

type Route = Awaited<ReturnType<MapsService['route']>>;
const waypoints = [{ lat: 31.23, lng: 121.47 }, { lat: 31.24, lng: 121.48 }];
const route: Route = {
  coordinates: [[31.23, 121.47], [31.24, 121.48]],
  distance: 1200,
  duration: 180,
  routeSource: { provider: 'amap', fallback: false },
  legs: [{
    mid: [31.235, 121.475], from: [31.23, 121.47], to: [31.24, 121.48],
    distance: 1200, duration: 180, walkingText: '14 min', drivingText: '3 min', distanceText: '1.2 km',
  }],
};

function service(selected: 'amap' | 'osrm', amap: Partial<{ route: MapsService['route'] }> = {}) {
  const amapProvider = { route: vi.fn() };
  Object.assign(amapProvider, amap);
  const providerRouter = { resolveRouteProviderForProfile: vi.fn(() => selected) };
  const instance = new MapsService(undefined as never, undefined as never, providerRouter as never, amapProvider as never);
  return { instance, amapProvider, providerRouter };
}

function osrmResponse(overrides: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({
    code: 'Ok',
    routes: [{
      geometry: { coordinates: [[121.47, 31.23], [121.48, 31.24]] },
      distance: 1000,
      duration: 200,
      legs: [{ distance: 1000, duration: 200 }],
    }],
    ...overrides,
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

afterEach(() => vi.restoreAllMocks());

describe('MapsService AMap route fallback', () => {
  it('returns a successful AMap route without calling OSRM', async () => {
    const { instance, amapProvider } = service('amap');
    amapProvider.route.mockResolvedValue(route);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(instance.route('driving', waypoints, { countryCode: 'CN' })).resolves.toEqual(route);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each(['timeout', 'rate_limit', 'permission', 'unsupported', 'empty_route', 'invalid_response', 'server'])
    ('falls back exactly once for AMap %s', async (reason) => {
      const { instance, amapProvider } = service('amap');
      const error = Object.assign(new Error('provider failed'), { code: reason });
      amapProvider.route.mockRejectedValue(error);
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(osrmResponse());

      const result = await instance.route('driving', waypoints, { countryCode: 'CN' });
      expect(result.routeSource).toEqual({ provider: 'osrm', fallback: true, fallbackReason: `amap_${reason}` });
      expect(amapProvider.route).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

  it('preserves OSRM failure semantics after the AMap attempt fails', async () => {
    const { instance, amapProvider } = service('amap');
    amapProvider.route.mockRejectedValue(Object.assign(new Error('provider failed'), { code: 'timeout' }));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 503 }));

    await expect(instance.route('driving', waypoints, { countryCode: 'CN' })).rejects.toThrow('Route could not be calculated');
    expect(amapProvider.route).toHaveBeenCalledTimes(1);
  });

  it('keeps public transport out of the AMap path', async () => {
    const { instance, amapProvider, providerRouter } = service('osrm');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(osrmResponse());

    await instance.route('driving', waypoints, { countryCode: 'CN' });
    expect(providerRouter.resolveRouteProviderForProfile).toHaveBeenCalledWith('driving', { countryCode: 'CN' });
    expect(amapProvider.route).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('uses OSRM for overseas routes', async () => {
    const { instance, amapProvider } = service('osrm');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(osrmResponse());

    const result = await instance.route('cycling', waypoints, { countryCode: 'US' });
    expect(result.routeSource).toEqual({ provider: 'osrm', fallback: false });
    expect(amapProvider.route).not.toHaveBeenCalled();
  });
});
