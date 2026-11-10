import type { Flight, FlightStatus } from './types';
import { findAirport } from './airports';
import { airlineName, isPassengerOperator } from './airlines';

interface AeroApiAirport {
  code?: string | null;
  code_icao?: string | null;
  code_iata?: string | null;
  city?: string | null;
}

interface AeroApiFlight {
  ident: string;
  ident_icao?: string | null;
  ident_iata?: string | null;
  fa_flight_id?: string;
  atc_ident?: string | null;
  operator?: string | null;
  operator_icao?: string | null;
  operator_iata?: string | null;
  registration?: string | null;
  aircraft_type?: string | null;
  type?: string;
  cancelled?: boolean;
  diverted?: boolean;
  origin?: AeroApiAirport | null;
  destination?: AeroApiAirport | null;
  scheduled_out?: string | null;
  estimated_out?: string | null;
  actual_out?: string | null;
  scheduled_off?: string | null;
  estimated_off?: string | null;
  actual_off?: string | null;
  scheduled_on?: string | null;
  estimated_on?: string | null;
  actual_on?: string | null;
  scheduled_in?: string | null;
  estimated_in?: string | null;
  actual_in?: string | null;
  gate_origin?: string | null;
  gate_destination?: string | null;
  status?: string;
}

interface AeroApiResponse {
  arrivals?: AeroApiFlight[];
  departures?: AeroApiFlight[];
  scheduled_arrivals?: AeroApiFlight[];
  scheduled_departures?: AeroApiFlight[];
}

function ms(...isos: (string | null | undefined)[]): number | undefined {
  for (const iso of isos) {
    if (iso) {
      const t = Date.parse(iso);
      if (!Number.isNaN(t)) return t;
    }
  }
  return undefined;
}

function toStatus(f: AeroApiFlight): FlightStatus {
  if (f.cancelled) return 'canceled';
  if (f.diverted) return 'diverted';
  const s = (f.status ?? '').toLowerCase();
  if (s.startsWith('arrived')) return 'arrived';
  if (s.includes('landed')) return 'landed';
  if (s.includes('en route') || s.includes('departed')) return 'enroute';
  if (s.includes('taxi')) return 'taxi';
  return 'scheduled';
}

function endpoint(a: AeroApiAirport | null | undefined): { code: string; city: string } | null {
  if (!a) return null;
  const known = findAirport(a.code_iata) ?? findAirport(a.code_icao) ?? findAirport(a.code);
  const code = known?.iata ?? a.code_iata ?? a.code_icao ?? a.code;
  if (!code) return null;
  return { code, city: known?.city ?? a.city ?? code };
}

function mapOne(f: AeroApiFlight): Flight | null {
  const origin = endpoint(f.origin);
  const dest = endpoint(f.destination);
  if (!origin || !dest) return null;
  const operator = f.operator_icao ?? f.operator ?? null;

  return {
    key: f.fa_flight_id ?? `${f.ident}-${f.scheduled_out ?? ''}`,
    kind: 'scheduled',
    id: (f.ident_iata ?? f.ident).replace(/\s+/g, ''),
    callsign: (f.atc_ident ?? f.ident_icao ?? f.ident).replace(/\s+/g, ''),
    airline: airlineName(operator, f.operator_iata ?? operator ?? f.ident.slice(0, 3)),
    type: f.aircraft_type ?? '',
    registration: f.registration ?? undefined,
    origin: origin.code,
    dest: dest.code,
    originCity: origin.city,
    destCity: dest.city,
    status: toStatus(f),
    sourceStatus: f.status,
    schedDep: ms(f.scheduled_out, f.scheduled_off),
    estDep: ms(f.actual_out, f.estimated_out, f.scheduled_out),
    schedArr: ms(f.scheduled_in, f.scheduled_on),
    estArr: ms(f.actual_in, f.estimated_in, f.actual_on, f.estimated_on, f.scheduled_in),
    offAt: ms(f.actual_off, f.estimated_off, f.scheduled_off),
    onAt: ms(f.actual_on, f.estimated_on, f.scheduled_on),
    gateDep: f.gate_origin ?? undefined,
    gateArr: f.gate_destination ?? undefined,
    passenger: (f.type ?? 'Airline') === 'Airline' && isPassengerOperator(operator),
  };
}

/**
 * Maps AeroAPI `/airports/{id}/flights` responses to flights. A POS↔TAB leg
 * appears in both airports' responses; legs are de-duplicated by fa_flight_id.
 */
export function mapAeroApiFlights(responses: unknown[]): Flight[] {
  const out = new Map<string, Flight>();
  for (const raw of responses) {
    const data = (raw ?? {}) as AeroApiResponse;
    const all = [
      ...(data.arrivals ?? []),
      ...(data.departures ?? []),
      ...(data.scheduled_arrivals ?? []),
      ...(data.scheduled_departures ?? []),
    ];
    for (const f of all) {
      const mapped = mapOne(f);
      if (mapped && !out.has(mapped.key)) out.set(mapped.key, mapped);
    }
  }
  return [...out.values()];
}
