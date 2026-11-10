interface Airline {
  name: string;
  iata?: string;
}

/** Operators seen at POS/TAB, keyed by ICAO designator. */
const AIRLINES: Record<string, Airline> = {
  BWA: { name: 'Caribbean Airlines', iata: 'BW' },
  AAL: { name: 'American', iata: 'AA' },
  UAL: { name: 'United', iata: 'UA' },
  DAL: { name: 'Delta', iata: 'DL' },
  JBU: { name: 'JetBlue', iata: 'B6' },
  NKS: { name: 'Spirit', iata: 'NK' },
  ACA: { name: 'Air Canada', iata: 'AC' },
  ROU: { name: 'Air Canada Rouge', iata: 'RV' },
  WJA: { name: 'WestJet', iata: 'WS' },
  SWG: { name: 'Sunwing', iata: 'WG' },
  CMP: { name: 'Copa', iata: 'CM' },
  AVA: { name: 'Avianca', iata: 'AV' },
  BAW: { name: 'British Airways', iata: 'BA' },
  VIR: { name: 'Virgin Atlantic', iata: 'VS' },
  KLM: { name: 'KLM', iata: 'KL' },
  TOM: { name: 'TUI Airways', iata: 'BY' },
  CFG: { name: 'Condor', iata: 'DE' },
  IBE: { name: 'Iberia', iata: 'IB' },
  DLH: { name: 'Lufthansa', iata: 'LH' },
  SLM: { name: 'Surinam Airways', iata: 'PY' },
  IWY: { name: 'interCaribbean', iata: 'JY' },
  SVG: { name: 'SVG Air', iata: 'SV' },
  LIA: { name: 'LIAT', iata: 'LI' },
  AXL: { name: 'Anguilla Air Services', iata: 'Q3' },
  WIA: { name: 'Winair', iata: 'WM' },
  AJT: { name: 'Amerijet', iata: 'M6' },
  DAE: { name: 'DHL Aero Expreso', iata: 'D5' },
  MTN: { name: 'Mountain Air Cargo' },
  CJT: { name: 'Cargojet', iata: 'W8' },
  FDX: { name: 'FedEx', iata: 'FX' },
  UPS: { name: 'UPS', iata: '5X' },
  BHL: { name: 'Bristow Helicopters' },
};

/** Cargo, helicopter-support and other operators that carry no scheduled passengers. */
const NON_PASSENGER = new Set(['AJT', 'DAE', 'MTN', 'CJT', 'FDX', 'UPS', 'BHL', 'ABX', 'ATN', 'GTI', 'CKS']);

export function airlineName(icao: string | null | undefined, fallback: string): string {
  return (icao && AIRLINES[icao]?.name) || fallback;
}

export function isPassengerOperator(icao: string | null | undefined): boolean {
  return !icao || !NON_PASSENGER.has(icao);
}

/**
 * Normalizes a callsign for matching ADS-B reports against schedules:
 * trims padding and drops leading zeros from the flight number
 * (ADS-B `IBE0137  ` and FlightAware `IBE137` are the same flight).
 */
export function normalizeCallsign(raw: string): string {
  return raw.trim().toUpperCase().replace(/^([A-Z]+)0+(?=\d)/, '$1');
}
