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
    return lat >= 0.8293 && lat <= 55.8271 && lng >= 72.004 && lng <= 137.8347;
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
