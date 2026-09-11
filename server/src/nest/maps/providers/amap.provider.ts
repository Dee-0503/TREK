import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type {
  MapsAutocompleteResult,
  MapsPlaceDetailsResult,
  MapsReverseResult,
  MapsSearchResult,
  PlaceHours,
} from '@trek/shared';
import { readEnv } from '../../../app-config';
import { safeFetchFollow } from '../../../utils/ssrfGuard';
import { readCappedJson } from '../../../utils/cappedFetch';
import { toApiLang } from '../maps.helpers';
import { AmapCoordinates } from './amap.coordinates';
import type { MapsProvider } from './maps-provider';

type AmapError = Error & { status: number; code: string };

const amapResponseSchema = z.object({
  status: z.string().optional(),
  info: z.string().optional(),
  infocode: z.string().optional(),
  count: z.union([z.string(), z.number()]).optional(),
  pois: z.array(z.unknown()).optional(),
  tips: z.array(z.unknown()).optional(),
  regeocode: z.unknown().optional(),
  geocodes: z.array(z.unknown()).optional(),
});

const amapPoiSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  address: z.string().optional(),
  location: z.string().optional(),
  type: z.string().optional(),
  tel: z.string().optional(),
  website: z.string().optional(),
  business: z.object({
    opentime_today: z.string().optional(),
    opentime_week: z.union([z.string(), z.array(z.string())]).optional(),
  }).optional(),
}).passthrough();

const amapTipSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  address: z.string().optional(),
  location: z.string().optional(),
  district: z.string().optional(),
}).passthrough();

const amapGeocodeSchema = z.object({
  formatted_address: z.string().optional(),
  location: z.string().optional(),
  level: z.string().optional(),
}).passthrough();

const amapRegeocodeSchema = z.object({
  formatted_address: z.string().optional(),
  addressComponent: z.object({
    building: z.object({ name: z.string().optional() }).optional(),
    neighborhood: z.object({ name: z.string().optional() }).optional(),
    poi: z.object({ name: z.string().optional() }).optional(),
    streetNumber: z.object({ street: z.string().optional(), number: z.string().optional() }).optional(),
  }).optional(),
}).passthrough();

const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_CACHE_ENTRIES = 128;
const inflight = new Map<string, Promise<unknown>>();
const cache = new Map<string, { fetchedAt: number; value: unknown }>();

function error(status: number, code: string, message: string): AmapError {
  const err = new Error(message) as AmapError;
  err.status = status;
  err.code = code;
  return err;
}

function coordinate(value: string | undefined): { lat: number; lng: number } | null {
  if (!value) return null;
  const [lng, lat] = value.split(',').map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? AmapCoordinates.toInternal({ lat, lng }) : null;
}

function safeText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function namespacedId(id: string): string {
  return `amap:${id}`;
}

function parseHours(business: { opentime_today?: string; opentime_week?: string | string[] } | undefined): PlaceHours | undefined {
  if (!business) return undefined;
  const raw = business.opentime_week ?? business.opentime_today;
  const lines = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[;；]/).map((part) => part.trim()).filter(Boolean) : [];
  if (!lines.length) return undefined;
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const short = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const descriptions = days.map((day) => `${day}: ?`);
  const periods: PlaceHours['periods'] = [];
  for (const line of lines) {
    const match = /^(?:(周一|周二|周三|周四|周五|周六|周日|星期一|星期二|星期三|星期四|星期五|星期六|星期日|Mo|Tu|We|Th|Fr|Sa|Su)(?:\s*(?:至|-|~)\s*(周一|周二|周三|周四|周五|周六|周日|星期一|星期二|星期三|星期四|星期五|星期六|星期日|Mo|Tu|We|Th|Fr|Sa|Su))?\s*)?(.+)$/i.exec(line);
    if (!match) continue;
    const start = dayIndex(match[1]);
    const end = dayIndex(match[2] ?? match[1]);
    const text = match[3].trim();
    const selected = start == null ? [0, 1, 2, 3, 4, 5, 6] : dayRange(start, end ?? start);
    for (const day of selected) {
      descriptions[day] = `${days[day]}: ${text}`;
      for (const range of text.matchAll(/(\d{1,2}):(\d{2})\s*[-至~]\s*(\d{1,2}):(\d{2})/g)) {
        const oh = Number(range[1]); const om = Number(range[2]); const ch = Number(range[3]); const cm = Number(range[4]);
        if (oh > 23 || om > 59 || ch > 24 || cm > 59) continue;
        periods.push({ open: { day: (day + 1) % 7, hour: oh, minute: om }, close: { day: (day + 1) % 7, hour: ch === 24 ? 0 : ch, minute: cm } });
      }
    }
  }
  if (!descriptions.some((line) => !line.endsWith('?'))) return undefined;
  return { weekdayDescriptions: descriptions, periods: periods.length ? periods : null };
}

function dayIndex(value: string | undefined): number | null {
  if (!value) return null;
  const normalized = value.replace(/^星期/, '周');
  const cn = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'].indexOf(normalized);
  if (cn >= 0) return cn;
  return ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].indexOf(value);
}
function dayRange(start: number, end: number): number[] {
  const result: number[] = [];
  for (let day = start; ; day = (day + 1) % 7) { result.push(day); if (day === end) break; }
  return result;
}

@Injectable()
export class AmapProvider implements MapsProvider {
  readonly id = 'amap' as const;

  private get base(): string { return readEnv().maps.amapApiBase; }
  private get key(): string | undefined { return readEnv().maps.amapApiKey; }

  async search(query: string, options: Record<string, unknown> = {}): Promise<MapsSearchResult> {
    return this.cached('search', { query: query.trim(), options }, () => this.request('/v5/place/text', {
      keywords: query.trim(), show_fields: 'business', ...this.contextParams(options),
    }).then((data) => ({ places: (data.pois ?? []).flatMap((raw) => { const poi = amapPoiSchema.parse(raw); const pos = coordinate(poi.location); if (!poi.id || !pos) return []; return [{ provider: 'amap', provider_place_id: poi.id, amap_place_id: poi.id, name: poi.name ?? '', address: poi.address ?? '', lat: pos.lat, lng: pos.lng, website: safeText(poi.website), phone: safeText(poi.tel), types: poi.type ? [poi.type] : [], hours: parseHours(poi.business), source: 'amap' }]; }), source: 'amap' })));
  }

  async autocomplete(input: string, options: Record<string, unknown> = {}): Promise<MapsAutocompleteResult> {
    return this.cached('autocomplete', { input: input.trim(), options }, () => this.request('/v3/assistant/inputtips', {
      keywords: input.trim(), ...this.contextParams(options),
    }).then((data) => ({ suggestions: (data.tips ?? []).flatMap((raw) => { const tip = amapTipSchema.parse(raw); if (!tip.id || !tip.name) return []; return [{ placeId: namespacedId(tip.id), mainText: tip.name, secondaryText: [tip.address, tip.district].filter(Boolean).join(', ') }]; }), source: 'amap' })));
  }

  async getDetails(providerPlaceId: string, options: Record<string, unknown> = {}): Promise<MapsPlaceDetailsResult> {
    const id = providerPlaceId.startsWith('amap:') ? providerPlaceId.slice(5) : providerPlaceId;
    if (!id || /[^A-Za-z0-9_-]/.test(id)) throw error(400, 'invalid_id', 'Invalid AMap place identifier');
    return this.cached('details', { id, options }, () => this.request('/v5/place/detail', { id, show_fields: 'business', ...this.contextParams(options) }).then((data) => {
      const raw = data.pois?.[0]; if (!raw) return { place: null };
      const poi = amapPoiSchema.parse(raw); const pos = coordinate(poi.location); if (!pos) return { place: null };
      return { place: { provider: 'amap', provider_place_id: id, amap_place_id: id, name: poi.name ?? '', address: poi.address ?? '', lat: pos.lat, lng: pos.lng, website: safeText(poi.website), phone: safeText(poi.tel), types: poi.type ? [poi.type] : [], hours: parseHours(poi.business), source: 'amap', fetched_at: Date.now() } };
    }));
  }

  async reverseGeocode(coordinates: { lat: number; lng: number }, options: Record<string, unknown> = {}): Promise<MapsReverseResult> {
    const provider = AmapCoordinates.toProvider(coordinates);
    return this.cached('reverse', { provider, options }, () => this.request('/v3/geocode/regeo', { location: `${provider.lng},${provider.lat}`, ...this.contextParams(options) }).then((data) => {
      const raw = data.regeocode; if (!raw) return { name: null, address: null };
      const regeocode = amapRegeocodeSchema.parse(raw); const component = regeocode.addressComponent;
      return { name: component?.poi?.name || component?.building?.name || component?.neighborhood?.name || null, address: regeocode.formatted_address ?? null };
    }));
  }

  private contextParams(options: Record<string, unknown>): Record<string, string> {
    const params: Record<string, string> = { key: this.key ?? '', output: 'JSON' };
    if (typeof options.lang === 'string' && options.lang) params.language = toApiLang(options.lang);
    if (typeof options.city === 'string' && options.city) params.city = options.city;
    if (typeof options.location === 'string' && options.location) params.location = options.location;
    return params;
  }

  private async request(path: string, params: Record<string, string>): Promise<z.infer<typeof amapResponseSchema>> {
    if (!this.key) throw error(503, 'not_configured', 'AMap provider is not configured');
    const url = new URL(`${this.base}${path}`); for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    let response: Response;
    try { response = await safeFetchFollow(url.toString(), { signal: AbortSignal.timeout(readEnv().maps.amapTimeoutMs) }); }
    catch { throw error(504, 'timeout', 'AMap request timed out'); }
    const data = await readCappedJson<unknown>(response, MAX_RESPONSE_BYTES);
    const parsed = amapResponseSchema.safeParse(data);
    if (!parsed.success) throw error(502, 'invalid_response', 'AMap returned an invalid response');
    if (!response.ok) throw this.providerError(response.status, parsed.data.info);
    if (parsed.data.status !== '1') throw this.providerError(this.statusForInfo(parsed.data.info), parsed.data.info);
    return parsed.data;
  }

  private providerError(status: number, _info?: string): AmapError {
    if (status === 403) return error(403, 'permission', 'AMap provider permission denied');
    if (status === 429) return error(429, 'rate_limit', 'AMap provider rate limit reached');
    if (status >= 500) return error(502, 'server', 'AMap provider is unavailable');
    return error(status, 'provider', 'AMap provider request failed');
  }
  private statusForInfo(info?: string): number { const text = (info ?? '').toLowerCase(); return text.includes('key') || text.includes('permission') ? 403 : text.includes('limit') ? 429 : 502; }

  private cached<T>(operation: string, identity: unknown, fn: () => Promise<T>): Promise<T> {
    const key = `${this.id}:${operation}:${JSON.stringify(identity)}`;
    const ttl = readEnv().maps.amapCacheTtlSeconds * 1000; const hit = cache.get(key);
    if (hit && Date.now() - hit.fetchedAt < ttl) return Promise.resolve(hit.value as T);
    const running = inflight.get(key); if (running) return running as Promise<T>;
    const promise = fn().then((value) => { cache.delete(key); cache.set(key, { fetchedAt: Date.now(), value }); while (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string); return value; }).finally(() => inflight.delete(key));
    inflight.set(key, promise); return promise;
  }
}
