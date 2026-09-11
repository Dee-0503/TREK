import { describe, expect, it } from 'vitest';
import { AmapCoordinates } from '../../../../src/nest/maps/providers/amap.coordinates';

describe('AmapCoordinates', () => {
  it('round-trips a mainland point within one metre', () => {
    const internal = { lat: 31.2304, lng: 121.4737 };
    const provider = AmapCoordinates.toProvider(internal);
    const roundTrip = AmapCoordinates.toInternal(provider);
    expect(Math.abs(roundTrip.lat - internal.lat)).toBeLessThan(0.00001);
    expect(Math.abs(roundTrip.lng - internal.lng)).toBeLessThan(0.00001);
  });

  it.each([
    ['HK', { lat: 22.3193, lng: 114.1694 }],
    ['MO', { lat: 22.1987, lng: 113.5439 }],
    ['TW', { lat: 25.033, lng: 121.5654 }],
  ])('does not transform %s coordinates', (_region, point) => {
    expect(AmapCoordinates.toProvider(point)).toEqual(point);
    expect(AmapCoordinates.toInternal(point)).toEqual(point);
  });

  it('does not transform a point just outside the mainland envelope', () => {
    const point = { lat: 31.2304, lng: 138.0 };
    expect(AmapCoordinates.toProvider(point)).toEqual(point);
    expect(AmapCoordinates.toInternal(point)).toEqual(point);
  });
});
