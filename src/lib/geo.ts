import type { LatLon } from '../data/types';

export function bearingBetween(a: LatLon, b: LatLon): number {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function distanceNm(a: LatLon, b: LatLon): number {
  const rNm = 3440.065;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * rNm * Math.asin(Math.sqrt(h));
}

/** Offsets a point by a bearing (degrees) and distance (meters). Flat-earth
 * approximation — accurate to a few centimeters over the sub-2km distances
 * this is used for (runway centerlines, apron offsets). */
export function offsetLatLon(origin: LatLon, bearingDeg: number, distanceM: number): LatLon {
  const bearing = (bearingDeg * Math.PI) / 180;
  const dLat = (distanceM * Math.cos(bearing)) / 111320;
  const dLon =
    (distanceM * Math.sin(bearing)) /
    (111320 * Math.cos((origin.lat * Math.PI) / 180));
  return { lat: origin.lat + dLat, lon: origin.lon + dLon };
}

/** Deterministic apron parking slot in a 4-wide grid, 60m apart by default,
 * so multiple grounded flights at the same airport don't render stacked. */
export function apronSlot(base: LatLon, index: number, spacingM = 60): LatLon {
  const row = Math.floor(index / 4);
  const col = index % 4;
  const east = offsetLatLon(base, 90, col * spacingM);
  return offsetLatLon(east, 180, row * spacingM);
}
