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
    { name: 'Hong Kong', lat: 22.3193, lng: 114.1694 },
    { name: 'Hong Kong island edge', lat: 22.18, lng: 114.3 },
    { name: 'Macau', lat: 22.1987, lng: 113.5439 },
    { name: 'Taiwan', lat: 25.033, lng: 121.5654 },
    { name: 'Taiwan island edge', lat: 21.95, lng: 120.8 },
  ])('does not transform $name', ({ lat, lng }) => {
    const point = { lat, lng };
    expect(AmapCoordinates.toProvider(point)).toEqual(point);
    expect(AmapCoordinates.toInternal(point)).toEqual(point);
  });

  it('still transforms nearby mainland Shenzhen', () => {
    const point = { lat: 22.5431, lng: 114.0579 };
    expect(AmapCoordinates.toProvider(point)).not.toEqual(point);
  });
});
