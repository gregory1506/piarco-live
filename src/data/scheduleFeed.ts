import type { Flight, FlightStatus } from './types';
import { AIRPORTS, APRON_OFFSETS } from './airports';

const ICAO_TO_IATA: Record<string, string> = {
  TTPP: 'POS', TTCP: 'TAB',
  KJFK: 'JFK', KMIA: 'MIA', KIAH: 'IAH', KATL: 'ATL', KDFW: 'DFW', KLAX: 'LAX',
  CYYZ: 'YYZ', CYUL: 'YUL',
  EGLL: 'LHR', EGKK: 'LGW', EHAM: 'AMS', EDDF: 'FRA', LFPG: 'CDG',
  MPTO: 'PTY', MUIH: 'MDE',
  TBPB: 'BGI', TAPA: 'ANU', TLPC: 'UVF', TQPF: 'SVD', TJNA: 'SJU',
  TISX: 'STX', TNCM: 'SXM', TBPJ: 'FDF',
  SYCJ: 'GEO', SOCA: 'CAY',
  MUHA: 'HAV', MDSD: 'SDQ', MJSJ: 'SJU',
  TVSA: 'SLU',
  UUEE: 'SVO', OMDB: 'DXB', WIII: 'CGK',
};

interface AeroApiFlight {
  ident: string;
  ident_iata?: string;
  operator_iata?: string;
  origin?: { code: string; code_iata?: string };
  destination?: { code: string; code_iata?: string };
  aircraft_type?: string;
  scheduled_out?: string;
  scheduled_in?: string;
  estimated_out?: string;
  estimated_in?: string;
  actual_out?: string;
  actual_in?: string;
  gate_destination?: string;
  status?: string;
}

interface AeroApiResponse {
  arrivals?: AeroApiFlight[];
  departures?: AeroApiFlight[];
  scheduled_arrivals?: AeroApiFlight[];
  scheduled_departures?: AeroApiFlight[];
}

function resolveIata(code: string | undefined, fallback: string): string {
  if (!code) return fallback;
  if (AIRPORTS[code]) return code;
  return ICAO_TO_IATA[code] ?? fallback;
}

function toHHMM(iso: string | undefined): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function toStatus(raw: string | undefined): FlightStatus {
  const s = (raw || '').toLowerCase();
  if (s.includes('land')) return 'landed';
  if (s.includes('cancel')) return 'canceled';
  if (s.includes('taxi')) return 'taxi';
  if (s.includes('arrived') || s.includes('gate arrival')) return 'landed';
  if (s.includes('en route') || s.includes('depart') || s.includes('air')) return 'enroute';
  if (s.includes('estimated') || s.includes('delayed')) return 'scheduled';
  return 'scheduled';
}

function calcProgress(f: AeroApiFlight): number {
  const rawStatus = (f.status || '').toLowerCase();
  if (rawStatus.includes('land')) return 1;

  const now = Date.now();
  const depart = f.actual_out || f.estimated_out || f.scheduled_out;
  const arrive = f.estimated_in || f.scheduled_in;
  if (!depart || !arrive) return 0;

  const departMs = new Date(depart).getTime();
  const arriveMs = new Date(arrive).getTime();
  if (arriveMs <= departMs) return 0;

  const elapsed = now - departMs;
  const total = arriveMs - departMs;
  return Math.max(0, Math.min(1, elapsed / total));
}

function mapOne(f: AeroApiFlight, homeCode: 'POS' | 'TAB', direction: 'departure' | 'arrival'): Flight | null {
  const isDeparture = direction === 'departure';
  const otherCode = isDeparture
    ? resolveIata(f.destination?.code_iata ?? f.destination?.code, '???')
    : resolveIata(f.origin?.code_iata ?? f.origin?.code, '???');
  if (otherCode === '???') return null;

  const origin = isDeparture ? homeCode : otherCode;
  const dest = isDeparture ? otherCode : homeCode;
  const apron = APRON_OFFSETS[homeCode] ?? AIRPORTS[homeCode];
  const status = toStatus(f.status);
  const progress = calcProgress(f);
  const airborne = status === 'enroute' && progress > 0;

  return {
    id: (f.ident_iata ?? f.ident).replace(/\s+/g, ''),
    airline: f.operator_iata ?? f.ident.slice(0, 2),
    type: f.aircraft_type ?? '???',
    origin,
    dest,
    status,
    eta: toHHMM(f.estimated_in ?? f.scheduled_in),
    dep: toHHMM(f.scheduled_out),
    gate: f.gate_destination ?? '\u2014',
    lat: apron.lat,
    lon: apron.lon,
    alt: airborne ? 35000 : 0,
    spd: airborne ? 450 : 0,
    hdg: 0,
    track: airborne ? 'cruise' : 'gate',
    dist: 0,
    delay: 0,
    routeProgress: airborne ? progress : 0,
    sourceStatus: f.status,
  };
}

export function mapAeroApiToFlights(raw: unknown, homeCode: 'POS' | 'TAB'): Flight[] {
  const data = raw as AeroApiResponse;
  const all = [
    ...(data.arrivals ?? []),
    ...(data.departures ?? []),
    ...(data.scheduled_arrivals ?? []),
    ...(data.scheduled_departures ?? []),
  ];
  const seen = new Set<string>();
  const out: Flight[] = [];

  for (const f of all) {
    if (seen.has(f.ident)) continue;
    seen.add(f.ident);

    const isDeparture = f.origin?.code === 'TTPP' || f.origin?.code === 'TTCP';
    const direction = isDeparture ? 'departure' : 'arrival';
    const mapped = mapOne(f, homeCode, direction);
    if (mapped) out.push(mapped);
  }
  return out;
}
