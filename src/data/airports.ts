import type { Airport, LatLon, Runway } from './types';
import { offsetLatLon } from '../lib/geo';

export const HOME_AIRPORTS = ['POS', 'TAB'] as const;
export type HomeAirport = (typeof HOME_AIRPORTS)[number];

export function isHomeAirport(code: string): code is HomeAirport {
  return code === 'POS' || code === 'TAB';
}

const AIRPORT_LIST: Airport[] = [
  { iata: 'POS', icao: 'TTPP', city: 'Port of Spain', name: 'Piarco Intl', lat: 10.5954, lon: -61.3372, region: 'domestic' },
  { iata: 'TAB', icao: 'TTCP', city: 'Tobago', name: 'A.N.R. Robinson Intl', lat: 11.1497, lon: -60.8322, region: 'domestic' },
  { iata: 'BGI', icao: 'TBPB', city: 'Bridgetown', name: 'Grantley Adams Intl', lat: 13.0746, lon: -59.4925, region: 'caribbean' },
  { iata: 'GND', icao: 'TGPY', city: 'Grenada', name: 'Maurice Bishop Intl', lat: 12.0042, lon: -61.7862, region: 'caribbean' },
  { iata: 'SVD', icao: 'TVSA', city: 'St. Vincent', name: 'Argyle Intl', lat: 13.1567, lon: -61.1499, region: 'caribbean' },
  { iata: 'UVF', icao: 'TLPL', city: 'St. Lucia', name: 'Hewanorra Intl', lat: 13.7332, lon: -60.9526, region: 'caribbean' },
  { iata: 'SLU', icao: 'TLPC', city: 'Castries', name: 'George F. L. Charles', lat: 14.0202, lon: -60.9929, region: 'caribbean' },
  { iata: 'FDF', icao: 'TFFF', city: 'Martinique', name: 'Aimé Césaire Intl', lat: 14.591, lon: -61.0032, region: 'caribbean' },
  { iata: 'DOM', icao: 'TDPD', city: 'Dominica', name: 'Douglas-Charles', lat: 15.547, lon: -61.3, region: 'caribbean' },
  { iata: 'PTP', icao: 'TFFR', city: 'Guadeloupe', name: 'Pointe-à-Pitre Intl', lat: 16.2653, lon: -61.5318, region: 'caribbean' },
  { iata: 'ANU', icao: 'TAPA', city: 'Antigua', name: 'V. C. Bird Intl', lat: 17.1367, lon: -61.7927, region: 'caribbean' },
  { iata: 'SKB', icao: 'TKPK', city: 'St. Kitts', name: 'R. L. Bradshaw Intl', lat: 17.3112, lon: -62.7187, region: 'caribbean' },
  { iata: 'AXA', icao: 'TQPF', city: 'Anguilla', name: 'Clayton J. Lloyd Intl', lat: 18.2048, lon: -63.0551, region: 'caribbean' },
  { iata: 'SXM', icao: 'TNCM', city: 'St. Maarten', name: 'Princess Juliana Intl', lat: 18.041, lon: -63.1089, region: 'caribbean' },
  { iata: 'STT', icao: 'TIST', city: 'St. Thomas', name: 'Cyril E. King', lat: 18.3373, lon: -64.9734, region: 'caribbean' },
  { iata: 'SJU', icao: 'TJSJ', city: 'San Juan', name: 'Luis Muñoz Marín Intl', lat: 18.4394, lon: -66.0018, region: 'caribbean' },
  { iata: 'BQN', icao: 'TJBQ', city: 'Aguadilla', name: 'Rafael Hernández', lat: 18.4949, lon: -67.1294, region: 'caribbean' },
  { iata: 'SDQ', icao: 'MDSD', city: 'Santo Domingo', name: 'Las Américas Intl', lat: 18.4297, lon: -69.6689, region: 'caribbean' },
  { iata: 'CUR', icao: 'TNCC', city: 'Curaçao', name: 'Hato Intl', lat: 12.1889, lon: -68.9598, region: 'caribbean' },
  { iata: 'AUA', icao: 'TNCA', city: 'Aruba', name: 'Queen Beatrix Intl', lat: 12.5014, lon: -70.0152, region: 'caribbean' },
  { iata: 'KIN', icao: 'MKJP', city: 'Kingston', name: 'Norman Manley Intl', lat: 17.9357, lon: -76.7875, region: 'caribbean' },
  { iata: 'MBJ', icao: 'MKJS', city: 'Montego Bay', name: 'Sangster Intl', lat: 18.5037, lon: -77.9134, region: 'caribbean' },
  { iata: 'HAV', icao: 'MUHA', city: 'Havana', name: 'José Martí Intl', lat: 22.9892, lon: -82.4091, region: 'caribbean' },
  { iata: 'GEO', icao: 'SYCJ', city: 'Georgetown', name: 'Cheddi Jagan Intl', lat: 6.4986, lon: -58.2541, region: 'caribbean' },
  { iata: 'PBM', icao: 'SMJP', city: 'Paramaribo', name: 'Johan Adolf Pengel Intl', lat: 5.4528, lon: -55.1878, region: 'caribbean' },
  { iata: 'CAY', icao: 'SOCA', city: 'Cayenne', name: 'Félix Eboué', lat: 4.8198, lon: -52.3604, region: 'caribbean' },
  { iata: 'CCS', icao: 'SVMI', city: 'Caracas', name: 'Simón Bolívar Intl', lat: 10.6031, lon: -66.9906, region: 'americas' },
  { iata: 'BOG', icao: 'SKBO', city: 'Bogotá', name: 'El Dorado Intl', lat: 4.7016, lon: -74.1469, region: 'americas' },
  { iata: 'PTY', icao: 'MPTO', city: 'Panama City', name: 'Tocumen Intl', lat: 9.0714, lon: -79.3835, region: 'americas' },
  { iata: 'MIA', icao: 'KMIA', city: 'Miami', name: 'Miami Intl', lat: 25.7959, lon: -80.2871, region: 'americas' },
  { iata: 'FLL', icao: 'KFLL', city: 'Fort Lauderdale', name: 'Fort Lauderdale-Hollywood Intl', lat: 26.0742, lon: -80.1506, region: 'americas' },
  { iata: 'MCO', icao: 'KMCO', city: 'Orlando', name: 'Orlando Intl', lat: 28.4312, lon: -81.3081, region: 'americas' },
  { iata: 'ATL', icao: 'KATL', city: 'Atlanta', name: 'Hartsfield-Jackson Intl', lat: 33.6407, lon: -84.4277, region: 'americas' },
  { iata: 'CLT', icao: 'KCLT', city: 'Charlotte', name: 'Charlotte Douglas Intl', lat: 35.214, lon: -80.9431, region: 'americas' },
  { iata: 'IAH', icao: 'KIAH', city: 'Houston', name: 'George Bush Intercontinental', lat: 29.9902, lon: -95.3368, region: 'americas' },
  { iata: 'DFW', icao: 'KDFW', city: 'Dallas', name: 'Dallas/Fort Worth Intl', lat: 32.8998, lon: -97.0403, region: 'americas' },
  { iata: 'JFK', icao: 'KJFK', city: 'New York', name: 'John F. Kennedy Intl', lat: 40.6413, lon: -73.7781, region: 'americas' },
  { iata: 'EWR', icao: 'KEWR', city: 'Newark', name: 'Newark Liberty Intl', lat: 40.6895, lon: -74.1745, region: 'americas' },
  { iata: 'YYZ', icao: 'CYYZ', city: 'Toronto', name: 'Toronto Pearson Intl', lat: 43.6777, lon: -79.6248, region: 'americas' },
  { iata: 'YUL', icao: 'CYUL', city: 'Montréal', name: 'Montréal-Trudeau Intl', lat: 45.4706, lon: -73.7408, region: 'americas' },
  { iata: 'LGW', icao: 'EGKK', city: 'London Gatwick', name: 'Gatwick', lat: 51.1537, lon: -0.1821, region: 'europe' },
  { iata: 'LHR', icao: 'EGLL', city: 'London Heathrow', name: 'Heathrow', lat: 51.47, lon: -0.4543, region: 'europe' },
  { iata: 'MAN', icao: 'EGCC', city: 'Manchester', name: 'Manchester', lat: 53.3537, lon: -2.275, region: 'europe' },
  { iata: 'AMS', icao: 'EHAM', city: 'Amsterdam', name: 'Schiphol', lat: 52.3105, lon: 4.7683, region: 'europe' },
  { iata: 'FRA', icao: 'EDDF', city: 'Frankfurt', name: 'Frankfurt', lat: 50.0379, lon: 8.5622, region: 'europe' },
  { iata: 'MAD', icao: 'LEMD', city: 'Madrid', name: 'Barajas', lat: 40.4983, lon: -3.5676, region: 'europe' },
];

/** Airports keyed by IATA code. */
export const AIRPORTS: Record<string, Airport> = Object.fromEntries(AIRPORT_LIST.map((a) => [a.iata, a]));

const BY_ICAO: Record<string, Airport> = Object.fromEntries(AIRPORT_LIST.map((a) => [a.icao, a]));

/** Resolves an IATA or ICAO code to a known airport. */
export function findAirport(code: string | null | undefined): Airport | undefined {
  if (!code) return undefined;
  return AIRPORTS[code] ?? BY_ICAO[code];
}

export const PIARCO = AIRPORTS.POS;

// Runway centerlines are derived from published headings and lengths for
// TTPP (10/28) and TTCP (11/29), offset from each airport's reference point.
// Not survey-accurate — sufficient for a prototype map at close zoom.
export const RUNWAYS: Record<HomeAirport, Runway> = {
  POS: {
    heading: 100,
    lengthM: 3200,
    centerline: [offsetLatLon(AIRPORTS.POS, 280, 1600), offsetLatLon(AIRPORTS.POS, 100, 1600)],
  },
  TAB: {
    heading: 110,
    lengthM: 2750,
    centerline: [offsetLatLon(AIRPORTS.TAB, 290, 1375), offsetLatLon(AIRPORTS.TAB, 110, 1375)],
  },
};

// Fixed per-airport apron reference point, offset from the runway/airport
// coordinate so grounded aircraft don't render stacked on the airport marker.
export const APRON_OFFSETS: Record<HomeAirport, LatLon> = {
  POS: offsetLatLon(AIRPORTS.POS, 190, 350),
  TAB: offsetLatLon(AIRPORTS.TAB, 200, 300),
};
