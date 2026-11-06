import type { MapsRouteResult, RouteSource } from '@trek/shared';

export interface RouteSegment {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}

export function assembleRoute(segments: RouteSegment[], routeSource: RouteSource): MapsRouteResult {
  return {
    coordinates: segments.flatMap((segment, index) =>
      index === 0 ? segment.coordinates : segment.coordinates.slice(1),
    ),
    distance: segments.reduce((total, segment) => total + segment.distance, 0),
    duration: segments.reduce((total, segment) => total + segment.duration, 0),
    routeSource,
    legs: segments.map(({ from, to, distance, duration }) => ({
      mid: [(from.lat + to.lat) / 2, (from.lng + to.lng) / 2],
      from: [from.lat, from.lng],
      to: [to.lat, to.lng],
      distance,
      duration,
      walkingText: `${Math.floor((distance / 5000) * 60)} min`,
      drivingText: `${Math.floor(duration / 60)} min`,
      distanceText: `${Math.round(distance)} m`,
      durationText: `${Math.floor(duration / 60)} min`,
    })),
  };
}
