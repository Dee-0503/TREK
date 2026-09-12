import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchFollow = vi.fn();
const readJson = vi.fn();

vi.mock('../../../../src/utils/ssrfGuard', () => ({ safeFetchFollow: fetchFollow }));
vi.mock('../../../../src/utils/cappedFetch', () => ({ readCappedJson: readJson }));
vi.mock('../../../../src/app-config', () => ({
  readEnv: () => ({
    maps: {
      amapApiBase: 'https://restapi.amap.com',
      amapApiKey: 'secret-key',
      amapTimeoutMs: 1000,
      amapCacheTtlSeconds: 300,
    },
  }),
}));

import { AmapProvider } from '../../../../src/nest/maps/providers/amap.provider';

const poi = {
  id: 'B123', name: '上海中心', address: '浦东新区', location: '121.499,31.239', type: '商务住宅', tel: '021-123',
  business: { opentime_today: '周一至周五 09:00-18:00', opentime_week: '周一至周日 09:00-18:00' },
};

function response(status = 200): Response {
  return { ok: status >= 200 && status < 300, status } as Response;
}

beforeEach(() => {
  fetchFollow.mockReset().mockResolvedValue(response());
  readJson.mockReset();
});

afterEach(() => vi.clearAllMocks());

describe('AmapProvider mocked HTTP adapter', () => {
  it('requests business fields and projects a namespaced provider-neutral place', async () => {
    readJson.mockResolvedValue({ status: '1', pois: [poi] });
    const result = await new AmapProvider().search('上海中心', { lang: 'zh-CN', context: { countryCode: 'CN' } });
    const url = new URL(fetchFollow.mock.calls[0][0]);
    expect(url.pathname).toBe('/v5/place/text');
    expect(url.searchParams.get('show_fields')).toBe('business');
    expect(url.searchParams.get('keywords')).toBe('上海中心');
    expect(result.places[0]).toMatchObject({ id: 'amap:B123', source: 'amap', providerIdentity: { provider: 'amap', providerPlaceId: 'amap:B123' } });
    expect(result.places[0]).not.toHaveProperty('amap_place_id');
  });

  it('maps weekly and today hours without inventing hours when absent', async () => {
    readJson.mockResolvedValueOnce({ status: '1', pois: [poi] });
    const weekly = await new AmapProvider().search('hours-week');
    expect(weekly.places[0].opening_hours?.[0]).toContain('09:00-18:00');

    readJson.mockResolvedValueOnce({ status: '1', pois: [{ ...poi, id: 'B124', business: { opentime_today: '今日 10:00-20:00' } }] });
    const today = await new AmapProvider().search('hours-today');
    expect(today.places[0].opening_hours).toBeDefined();

    readJson.mockResolvedValueOnce({ status: '1', pois: [{ ...poi, id: 'B125', business: undefined }] });
    const missing = await new AmapProvider().search('hours-none');
    expect(missing.places[0]).not.toHaveProperty('opening_hours');
  });

  it('encodes Chinese query exactly once', async () => {
    readJson.mockResolvedValue({ status: '1', pois: [] });
    await new AmapProvider().search('北京 天安门');
    const raw = fetchFollow.mock.calls[0][0] as string;
    expect(raw).toContain('keywords=%E5%8C%97%E4%BA%AC+%E5%A4%A9%E5%AE%89%E9%97%A8');
    expect(decodeURIComponent(raw)).toContain('北京+天安门');
  });

  it('uses strict schemas for autocomplete, details and reverse', async () => {
    readJson.mockResolvedValueOnce({ status: '1', tips: [{ id: 'T1', name: '天安门', address: '北京' }] });
    expect((await new AmapProvider().autocomplete('天安')).suggestions[0].placeId).toBe('amap:T1');
    readJson.mockResolvedValueOnce({ status: '1', pois: [poi] });
    expect((await new AmapProvider().getDetails('amap:B123')).place?.id).toBe('amap:B123');
    readJson.mockResolvedValueOnce({ status: '1', regeocode: { formatted_address: '北京', addressComponent: { poi: { name: '天安门' } } } });
    expect(await new AmapProvider().reverseGeocode({ lat: 39.9, lng: 116.4 })).toEqual({ name: '天安门', address: '北京' });
  });

  it('rejects unnamespaced or malformed details IDs before HTTP', async () => {
    await expect(new AmapProvider().getDetails('B123')).rejects.toMatchObject({ status: 400, code: 'invalid_id' });
    await expect(new AmapProvider().getDetails('amap:B/123')).rejects.toMatchObject({ status: 400, code: 'invalid_id' });
    expect(fetchFollow).not.toHaveBeenCalled();
  });

  it.each([
    ['timeout', Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }), 504],
    ['ssrf', Object.assign(new Error('blocked'), { name: 'SsrfBlockedError' }), 403],
    ['dns/connectivity', new Error('ENOTFOUND restapi.amap.com'), 503],
  ])('classifies %s without exposing upstream details', async (_label, thrown, status) => {
    fetchFollow.mockRejectedValue(thrown);
    await expect(new AmapProvider().search(`error-${status}`)).rejects.toMatchObject({ status, message: expect.not.stringContaining('restapi') });
  });

  it.each([
    [429, 'rate_limit'], [403, 'permission'], [500, 'server'],
  ])('classifies HTTP %s errors', async (status, code) => {
    fetchFollow.mockResolvedValue(response(status));
    readJson.mockResolvedValue({ status: '1', pois: [] });
    await expect(new AmapProvider().search(`http-${status}`)).rejects.toMatchObject({ code });
  });

  it('classifies malformed upstream payloads as invalid_response', async () => {
    readJson.mockResolvedValue({ status: '1', pois: [{ id: 1 }] });
    await expect(new AmapProvider().search('malformed')).rejects.toMatchObject({ status: 502, code: 'invalid_response' });
  });

  it('deduplicates identical in-flight requests and caches provider/fetchedAt metadata', async () => {
    let resolve!: (value: unknown) => void;
    readJson.mockReturnValue(new Promise((r) => { resolve = r; }));
    const provider = new AmapProvider();
    const first = provider.search('dedupe');
    const second = provider.search('dedupe');
    expect(fetchFollow).toHaveBeenCalledTimes(1);
    resolve({ status: '1', pois: [] });
    await Promise.all([first, second]);
    await provider.search('dedupe');
    expect(fetchFollow).toHaveBeenCalledTimes(1);
  });

  it('deduplicates identities whose property insertion order differs', async () => {
    readJson.mockResolvedValue({ status: '1', pois: [] });
    const provider = new AmapProvider();
    await provider.search('ordered', { lang: 'en', context: { countryCode: 'CN', latitude: 1, longitude: 2 } });
    await provider.search('ordered', { context: { longitude: 2, latitude: 1, countryCode: 'CN' }, lang: 'en' });
    expect(fetchFollow).toHaveBeenCalledTimes(1);
  });

  it('normalizes each AMap route response into accurate legs for three waypoints', async () => {
    readJson
      .mockResolvedValueOnce({ status: '1', route: { paths: [{ distance: '1000', duration: '60', steps: [{ polyline: '121,31;121.01,31.01' }] }] } })
      .mockResolvedValueOnce({ status: '1', route: { paths: [{ distance: '2500', duration: '180', steps: [{ polyline: '121.01,31.01;121.02,31.02' }] }] } });
    const waypoints = [{ lat: 31, lng: 121 }, { lat: 31.01, lng: 121.01 }, { lat: 31.02, lng: 121.02 }];
    const result = await new AmapProvider().route('driving', waypoints);
    expect(fetchFollow).toHaveBeenCalledTimes(2);
    expect(result.distance).toBe(3500);
    expect(result.duration).toBe(240);
    expect(result.legs.map((leg) => [leg.distance, leg.duration])).toEqual([[1000, 60], [2500, 180]]);
    expect(result.coordinates).toHaveLength(3);
  });

  it.each([
    [{ status: '1', route: { paths: [] } }, 'empty_route'],
    [{ status: '1', route: { paths: [{ distance: '1', duration: '1', steps: [{ polyline: 'bad' }] }] } }, 'invalid_response'],
  ])('classifies malformed route payloads as %s', async (payload, code) => {
    readJson.mockResolvedValue(payload);
    await expect(new AmapProvider().route('driving', [{ lat: 31, lng: 121 }, { lat: 31.01, lng: 121.01 }])).rejects.toMatchObject({ status: 502, code });
  });

    readJson.mockResolvedValueOnce({ status: '1', pois: [{ ...poi, name: undefined }] });
    await expect(new AmapProvider().search('missing-name')).rejects.toMatchObject({ code: 'invalid_response', status: 502 });
    readJson.mockResolvedValueOnce({ status: '1', pois: [{ ...poi, id: 'B126', location: 'bad' }] });
    await expect(new AmapProvider().getDetails('amap:B126')).rejects.toMatchObject({ code: 'invalid_response', status: 502 });
  });

  it('falls back to today when weekly hours are unparseable', async () => {
    readJson.mockResolvedValue({ status: '1', pois: [{ ...poi, id: 'B127', business: { opentime_week: 'not hours', opentime_today: '今日 10:00-20:00' } }] });
    const result = await new AmapProvider().search('hours-fallback');
    expect(result.places[0].opening_hours?.[0]).toContain('10:00-20:00');
  });

});
