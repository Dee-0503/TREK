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
    // Keep this adapter boundary deliberately conservative. The envelope is
    // only an inexpensive mainland candidate check; the explicit exclusions
    // prevent the special administrative regions and Taiwan from inheriting
    // GCJ-02 conversion merely because they sit inside China's longitude span.
    if (lat < 0.8293 || lat > 55.8271 || lng < 72.004 || lng > 137.8347) return false;
    return !this.inExcludedRegion(lat, lng);
  }

  private static inExcludedRegion(lat: number, lng: number): boolean {
    // Coarse, deterministic outlines for the three non-mainland contexts. These
    // are polygons rather than a containing rectangle, so nearby mainland
    // coordinates are not accidentally classified as outside the adapter's
    // mainland scope.
    const regions: readonly (readonly [number, number])[][] = [
      [
        [22.16, 113.83], [22.28, 113.89], [22.53, 114.15], [22.55, 114.38],
        [22.28, 114.43], [22.12, 114.18], [22.13, 113.93],
      ], // Hong Kong
      [
        [22.10, 113.51], [22.12, 113.55], [22.24, 113.59], [22.23, 113.63],
        [22.07, 113.59], [22.05, 113.53],
      ], // Macau
      [
        [21.90, 120.00], [22.55, 120.00], [24.00, 120.00], [25.30, 121.35],
        [25.30, 121.95], [24.45, 122.05], [23.00, 121.55], [21.90, 121.00],
      ], // Taiwan
    ];
    return regions.some((polygon) => this.inPolygon(lat, lng, polygon));
  }

  private static inPolygon(lat: number, lng: number, polygon: readonly (readonly [number, number])[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [yi, xi] = polygon[i];
      const [yj, xj] = polygon[j];
      const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (intersects) inside = !inside;
    }
    return inside;
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
