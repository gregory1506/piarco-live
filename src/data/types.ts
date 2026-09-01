export interface LatLon {
  lat: number;
  lon: number;
}

export interface Airport extends LatLon {
  icao?: string;
  iata?: string;
  name?: string;
  city?: string;
}

export interface Runway {
  heading: number;
  lengthM: number;
  centerline: [LatLon, LatLon];
}

export type FlightStatus =
  | 'scheduled'
  | 'boarding'
  | 'departing'
  | 'taxi'
  | 'enroute'
  | 'landed'
  | 'canceled';

export type FlightTrack = 'ground' | 'gate' | 'climbing' | 'cruise' | 'descending' | 'landed';

export interface Flight {
  id: string;
  airline: string;
  type: string;
  origin: string;
  dest: string;
  status: FlightStatus;
  eta: string;
  dep: string;
  gate: string;
  lat: number;
  lon: number;
  alt: number;
  spd: number;
  hdg: number;
  track: FlightTrack;
  dist: number;
  delay: number;
  routeProgress: number;
  sourceStatus?: string;
  _live?: boolean;
}

export interface GeoLabel {
  name: string;
  lat: number;
  lon: number;
  kind: 'country' | 'sea' | 'city' | string;
  size: number;
}

export interface IslandGroup {
  name: string;
  polygons: [number, number][][];
}

export interface NearbyIsle {
  name: string;
  lat: number;
  lon: number;
  r: number;
}

export interface FeedMeta {
  date?: string;
  source: string;
  label?: string;
  updated?: string;
  note?: string;
}
