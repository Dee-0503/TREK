import { Injectable } from '@nestjs/common';
import type { GeographicContext, MapProvider, ProviderOverride } from '@trek/shared';
import { readEnv } from '../../../app-config';

export type ProviderContext = GeographicContext & { override?: ProviderOverride };

/** Deterministic server-side selection of the configured maps provider. */
@Injectable()
export class ProviderRouter {
  resolvePlaceProvider(context: ProviderContext = {}): MapProvider {
    return this.resolve(context, this.enabledPlaceProviders());
  }

  resolveRouteProvider(context: ProviderContext = {}): 'amap' | 'osrm' {
    if (context.override === 'amap' && this.isEnabled('amap')) return 'amap';
    if ((context.override === 'osm' || context.override === 'openstreetmap') && this.isEnabled('osm')) return 'osrm';
    if (this.isMainlandChina(context) && this.isEnabled('amap')) return 'amap';
    return 'osrm';
  }

  private resolve(context: ProviderContext, enabled: MapProvider[]): MapProvider {
    if (context.override) {
      const override = context.override === 'openstreetmap' ? 'osm' : context.override;
      if (enabled.includes(override)) return override;
    }
    const mode = readEnv().maps.placesProviderMode;
    const selectedMode = mode === 'openstreetmap' ? 'osm' : mode;
    if (selectedMode !== 'auto' && enabled.includes(selectedMode)) return selectedMode;
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
