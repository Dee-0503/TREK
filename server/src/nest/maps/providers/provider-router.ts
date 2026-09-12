import { Injectable } from '@nestjs/common';
import type { GeographicContext, MapProvider, ProviderOverride, RouteProviderOverride } from '@trek/shared';
import { readEnv } from '../../../app-config';

export type ProviderContext = GeographicContext & { override?: ProviderOverride };
export type RouteProviderContext = GeographicContext & { override?: RouteProviderOverride };

/** Deterministic server-side selection of the configured maps provider. */
@Injectable()
export class ProviderRouter {
  resolvePlaceProvider(context: ProviderContext = {}): MapProvider {
    return this.resolve(context, this.enabledPlaceProviders());
  }

  resolveRouteProvider(context: RouteProviderContext = {}): 'amap' | 'osrm' {
    if (context.override === 'amap' && this.isEnabled('amap')) return 'amap';
    if (context.override === 'osrm') return 'osrm';
    if (this.isMainlandChina(context) && this.isEnabled('amap')) return 'amap';
    return 'osrm';
  }

  /** Route selection is deliberately narrower than place selection: transit and plugins never enter AMap. */
  resolveRouteProviderForProfile(profile: string, context: RouteProviderContext = {}): 'amap' | 'osrm' {
    if (profile !== 'driving' && profile !== 'walking' && profile !== 'cycling') return 'osrm';
    return this.resolveRouteProvider(context);
  }

  private resolve(context: ProviderContext, enabled: MapProvider[]): MapProvider {
    if (context.override) {
      const override = context.override === 'openstreetmap' ? 'osm' : context.override;
      if (enabled.includes(override)) return override;
    }
    const mode = readEnv().maps.placesProviderMode;
    if (mode !== 'auto' && enabled.includes(mode)) return mode;
    if (this.isMainlandChina(context) && enabled.includes('amap')) return 'amap';
    return enabled.includes('google') ? 'google' : (enabled[0] ?? 'osm');
  }

  private enabledPlaceProviders(): MapProvider[] {
    const configured = readEnv().maps;
    return [
      configured.amapApiKey ? 'amap' : null,
      configured.placesApiKey ? 'google' : null,
      'osm',
    ].filter((provider): provider is MapProvider => provider !== null);
  }

  private isEnabled(provider: MapProvider): boolean {
    return this.enabledPlaceProviders().includes(provider);
  }

  private isMainlandChina(context: ProviderContext): boolean {
    return context.countryCode?.toUpperCase() === 'CN';
  }
}
