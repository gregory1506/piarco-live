export interface LatLon {
  lat: number;
  lon: number;
}

export type Region = 'domestic' | 'caribbean' | 'americas' | 'europe';

export interface Airport extends LatLon {
  iata: string;
  icao: string;
  city: string;
  name?: string;
  region: Region;
}

export interface Runway {
  /** Magnetic-ish heading of the low-numbered end, degrees. */
  heading: number;
  lengthM: number;
  centerline: [LatLon, LatLon];
}

export type FlightStatus =
  | 'scheduled'
  | 'taxi'
  | 'enroute'
  | 'landed'
  | 'arrived'
  | 'canceled'
  | 'diverted';

/** A single ADS-B position report (OpenSky state vector). */
export interface LiveState {
  icao24: string;
  callsign: string;
  lat: number;
  lon: number;
  altFt: number;
  spdKt: number;
  hdg: number;
  vRateFpm: number;
  onGround: boolean;
  /** Epoch ms of the position fix. */
  fixAt: number;
}

export interface Flight {
  /** Unique per flight leg (FlightAware fa_flight_id, or a synthetic key). */
  key: string;
  /** `scheduled` legs appear on the board; `traffic` is ADS-B-only aircraft. */
  kind: 'scheduled' | 'traffic';
  /** Display ident, IATA where known (BW523). */
  id: string;
  /** ICAO callsign as broadcast over ADS-B (BWA523). */
  callsign: string;
  airline: string;
  /** ICAO aircraft type designator; empty when unknown. */
  type: string;
  registration?: string;
  /** IATA codes where known, ICAO otherwise; empty for ADS-B-only traffic. */
  origin: string;
  dest: string;
  originCity: string;
  destCity: string;
  status: FlightStatus;
  sourceStatus?: string;
  /** Gate-out / gate-in times, epoch ms. `est*` is actual when known, else estimated. */
  schedDep?: number;
  estDep?: number;
  schedArr?: number;
  estArr?: number;
  /** Wheels-off / wheels-on, epoch ms (actual or estimated). Drives route progress. */
  offAt?: number;
  onAt?: number;
  gateDep?: string;
  gateArr?: string;
  /** False for cargo, helicopter and other non-passenger operators. */
  passenger: boolean;
  live?: LiveState;
}

export type Phase = 'gate' | 'taxi' | 'climb' | 'cruise' | 'descent' | 'landed';

export interface Position extends LatLon {
  hdg: number;
  altFt: number;
  spdKt: number;
  phase: Phase;
  /** 0..1 along the great-circle route; 0 when the route is unknown. */
  progress: number;
  /** Great-circle distance to destination, nm; null when the route is unknown. */
  remainingNm: number | null;
  /** True for ADS-B fixes (dead-reckoned when scrubbing), false for schedule estimates. */
  live: boolean;
}

export interface PlacedFlight extends Flight {
  /** Null when the aircraft is not somewhere this map shows (e.g. not yet departed abroad). */
  pos: Position | null;
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
