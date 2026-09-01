import type { LatLon } from '../data/types';
import { bearingBetween } from './geo';

function toVector({ lat, lon }: LatLon): [number, number, number] {
  const phi = (lat * Math.PI) / 180;
  const lambda = (lon * Math.PI) / 180;
  return [Math.cos(phi) * Math.cos(lambda), Math.cos(phi) * Math.sin(lambda), Math.sin(phi)];
}

function toLatLon([x, y, z]: [number, number, number]): LatLon {
  const lat = (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI;
  const lon = (Math.atan2(y, x) * 180) / Math.PI;
  return { lat, lon };
}

function clampDot(d: number): number {
  return Math.max(-1, Math.min(1, d));
}

/** Spherical linear interpolation (slerp) between origin and dest, t in [0,1]. */
export function greatCirclePointAt(origin: LatLon, dest: LatLon, t: number): LatLon {
  if (origin.lat === dest.lat && origin.lon === dest.lon) return origin;
  const a = toVector(origin);
  const b = toVector(dest);
  const dot = clampDot(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]);
  const theta = Math.acos(dot);
  if (theta === 0) return origin;
  const sinTheta = Math.sin(theta);
  const scaleA = Math.sin((1 - t) * theta) / sinTheta;
  const scaleB = Math.sin(t * theta) / sinTheta;
  const v: [number, number, number] = [
    a[0] * scaleA + b[0] * scaleB,
    a[1] * scaleA + b[1] * scaleB,
    a[2] * scaleA + b[2] * scaleB,
  ];
  return toLatLon(v);
}

/** Bearing of travel at point t along the great circle, via forward difference. */
export function greatCircleBearingAt(origin: LatLon, dest: LatLon, t: number): number {
  const eps = 0.0005;
  const t2 = Math.min(1, t + eps);
  const p1 = greatCirclePointAt(origin, dest, t);
  const p2 = greatCirclePointAt(origin, dest, t2);
  if (p1.lat === p2.lat && p1.lon === p2.lon) return bearingBetween(origin, dest);
  return bearingBetween(p1, p2);
}
