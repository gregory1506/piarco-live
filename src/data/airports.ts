import type { Airport, LatLon, Runway } from './types';
import { offsetLatLon } from '../lib/geo';

export const PIARCO: Airport = { lat: 10.5954, lon: -61.3372, icao: 'TTPP', iata: 'POS' };

export const HOME_AIRPORTS = ['POS', 'TAB'];

export const AIRPORT_DETAILS: Record<string, Airport> = {
  POS: { lat: 10.5954, lon: -61.3372, icao: 'TTPP', iata: 'POS', name: 'Piarco Intl', city: 'Port of Spain' },
  TAB: { lat: 11.1497, lon: -60.8322, icao: 'TTCP', iata: 'TAB', name: 'A.N.R. Robinson Intl', city: 'Tobago' },
};

export const AIRPORTS: Record<string, LatLon> = {
  POS: { lat: 10.5954, lon: -61.3372 },
  TAB: { lat: 11.1497, lon: -60.8322 },
  JFK: { lat: 40.6413, lon: -73.7781 },
  MIA: { lat: 25.7959, lon: -80.2871 },
  IAH: { lat: 29.9902, lon: -95.3368 },
  ATL: { lat: 33.6407, lon: -84.4277 },
  YYZ: { lat: 43.6777, lon: -79.6248 },
  LGW: { lat: 51.1537, lon: -0.1821 },
  LHR: { lat: 51.4700, lon: -0.4543 },
  AMS: { lat: 52.3105, lon: 4.7683 },
  FRA: { lat: 50.0379, lon: 8.5622 },
  PTY: { lat: 9.0714, lon: -79.3835 },
  BGI: { lat: 13.0746, lon: -59.4925 },
  ANU: { lat: 17.1367, lon: -61.7927 },
  UVF: { lat: 13.7332, lon: -60.9526 },
  SVD: { lat: 13.1567, lon: -61.1499 },
  BOG: { lat: 4.7016, lon: -74.1469 },
  GEO: { lat: 6.4986, lon: -58.2541 },
};

// Runway centerlines are derived from published headings and lengths for
// TTPP (10/28) and TTCP (11/29), offset from each airport's reference point.
// Not survey-accurate — sufficient for a prototype map at close zoom.
export const RUNWAYS: Record<string, Runway> = {
  POS: {
    heading: 100,
    lengthM: 3200,
    centerline: [
      offsetLatLon(AIRPORTS.POS, 280, 1600),
      offsetLatLon(AIRPORTS.POS, 100, 1600),
    ],
  },
  TAB: {
    heading: 110,
    lengthM: 2750,
    centerline: [
      offsetLatLon(AIRPORTS.TAB, 290, 1375),
      offsetLatLon(AIRPORTS.TAB, 110, 1375),
    ],
  },
};

// Fixed per-airport apron reference point, offset from the runway/airport
// coordinate so grounded aircraft don't render stacked on the airport marker.
export const APRON_OFFSETS: Record<string, LatLon> = {
  POS: offsetLatLon(AIRPORTS.POS, 190, 350),
  TAB: offsetLatLon(AIRPORTS.TAB, 200, 300),
};
