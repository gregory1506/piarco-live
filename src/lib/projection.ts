import type { LatLon } from '../data/types';

export interface Projection {
  project(lat: number, lon: number): [number, number];
  unproject(x: number, y: number): [number, number];
  scale: number;
}

export const MIN_ZOOM = 0.04;
export const MAX_ZOOM = 8;

/** Simple equirectangular projection centered on a given point. */
export function makeProjection(center: LatLon, zoom: number, w: number, h: number): Projection {
  const basePx = 0.0055;
  const scale = basePx / zoom;
  return {
    project(lat, lon) {
      const x = (lon - center.lon) / scale + w / 2;
      const y = -(lat - center.lat) / scale + h / 2;
      return [x, y];
    },
    unproject(x, y) {
      const lon = (x - w / 2) * scale + center.lon;
      const lat = -(y - h / 2) * scale + center.lat;
      return [lat, lon];
    },
    scale,
  };
}
