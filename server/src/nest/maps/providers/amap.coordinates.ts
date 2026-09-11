/**
 * Coordinate conversion at the AMap boundary only.
 *
 * AMap uses GCJ-02 while TREK stores and renders WGS-84. The conversion is
 * intentionally kept here so provider-specific coordinates never leak into
 * persistence, React, or shared route rendering.
 */
export class AmapCoordinates {
  private static readonly PI = Math.PI;
  private static readonly AXIS = 6378245.0;
  private static readonly EE = 0.00669342162296594323;

  /** GCJ-02 provider coordinates to TREK's WGS-84 coordinates. */
  static toInternal(coordinates: { lat: number; lng: number }): { lat: number; lng: number } {
    if (!this.inMainlandChina(coordinates)) return { ...coordinates };
    const delta = this.delta(coordinates.lat, coordinates.lng);
    return { lat: coordinates.lat - delta.lat, lng: coordinates.lng - delta.lng };
  }

  /** TREK's WGS-84 coordinates to GCJ-02 provider coordinates. */
  static toProvider(coordinates: { lat: number; lng: number }): { lat: number; lng: number } {
    if (!this.inMainlandChina(coordinates)) return { ...coordinates };
    const delta = this.delta(coordinates.lat, coordinates.lng);
    return { lat: coordinates.lat + delta.lat, lng: coordinates.lng + delta.lng };
  }

  private static inMainlandChina({ lat, lng }: { lat: number; lng: number }): boolean {
    // Conservative mainland-only box. The western/southern edge excludes the
    // Hong Kong, Macau and Taiwan islands while retaining nearby mainland points.
    // AMap conversion must not be applied to special administrative regions.
    if (lat < 18.16 || lat > 53.56 || lng < 73.5 || lng > 135.1) return false;
    // Keep one conservative mainland envelope and explicitly remove the
    // non-mainland islands/territories. The exclusions stay narrow at the
    // Shenzhen border so nearby Mainland coordinates still use GCJ-02.
    if (lat < 22.35 && lng > 113.8) return false; // Hong Kong
    if (lat >= 22.1 && lat <= 22.3 && lng >= 113.45 && lng <= 113.7) return false; // Macau
    if (lat >= 21.5 && lat <= 26.5 && lng >= 118.0 && lng <= 122.5) return false; // Taiwan and outlying islands
    return true;
  }

  private static delta(lat: number, lng: number): { lat: number; lng: number } {
    const dLat = this.transformLat(lng - 105, lat - 35);
    const dLng = this.transformLng(lng - 105, lat - 35);
    const radLat = (lat / 180) * this.PI;
    let magic = Math.sin(radLat);
    magic = 1 - this.EE * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    return {
      lat: (dLat * 180) / (((this.AXIS * (1 - this.EE)) / (magic * sqrtMagic)) * this.PI),
      lng: (dLng * 180) / ((this.AXIS / sqrtMagic) * Math.cos(radLat) * this.PI),
    };
  }

  private static transformLat(x: number, y: number): number {
    let ret = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += ((20 * Math.sin(6 * x * this.PI) + 20 * Math.sin(2 * x * this.PI)) * 2) / 3;
    ret += ((20 * Math.sin(y * this.PI) + 40 * Math.sin((y / 3) * this.PI)) * 2) / 3;
    ret += ((160 * Math.sin((y / 12) * this.PI) + 320 * Math.sin((y * this.PI) / 30)) * 2) / 3;
    return ret;
  }

  private static transformLng(x: number, y: number): number {
    let ret = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += ((20 * Math.sin(6 * x * this.PI) + 20 * Math.sin(2 * x * this.PI)) * 2) / 3;
    ret += ((20 * Math.sin(x * this.PI) + 40 * Math.sin((x / 3) * this.PI)) * 2) / 3;
    ret += ((150 * Math.sin((x / 12) * this.PI) + 300 * Math.sin((x / 30) * this.PI)) * 2) / 3;
    return ret;
  }
}
