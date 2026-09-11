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

  it('does not transform a point outside mainland China', () => {
    const point = { lat: 22.3193, lng: 114.1694 };
    expect(AmapCoordinates.toProvider(point)).toEqual(point);
    expect(AmapCoordinates.toInternal(point)).toEqual(point);
  });
});
