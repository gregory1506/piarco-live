import type { Flight, FlightStatus } from './types';
import { AIRPORTS } from './airports';
import { airlineName } from './airlines';
import { distanceNm } from '../lib/geo';
import { MINUTE } from '../lib/time';

/**
 * Illustrative traffic shown only when the live schedule feed is unreachable
 * (local dev without the API, outages). Times are relative to page load so the
 * board and map stay coherent at any hour. Clearly labelled DEMO in the UI.
 */
type DemoTiming =
  /** Airborne at `progress` along the route, cruising at `kt`. */
  | { air: number; kt: number }
  /** Pushes back from the gate in `out` minutes (negative = already taxiing). */
  | { out: number; kt: number }
  /** Touched down `landed` minutes ago. */
  | { landed: number; kt: number };

interface DemoRow {
  id: string;
  op: string;
  type: string;
  from: string;
  to: string;
  gate?: string;
  delay?: number;
  status?: FlightStatus;
  passenger?: boolean;
  at: DemoTiming;
}

const ROWS: DemoRow[] = [
  { id: 'BW523', op: 'BWA', type: 'B738', from: 'JFK', to: 'POS', gate: '7', at: { air: 0.94, kt: 470 } },
  { id: 'AA1325', op: 'AAL', type: 'B738', from: 'MIA', to: 'POS', gate: '5', at: { air: 0.82, kt: 480 } },
  { id: 'UA1458', op: 'UAL', type: 'B739', from: 'IAH', to: 'POS', gate: '6', at: { air: 0.68, kt: 490 } },
  { id: 'CM472', op: 'CMP', type: 'B738', from: 'PTY', to: 'POS', gate: '9', at: { air: 0.84, kt: 460 } },
  { id: 'KL771', op: 'KLM', type: 'A333', from: 'AMS', to: 'POS', gate: '12', delay: 24, at: { air: 0.89, kt: 490 } },
  { id: 'BA2157', op: 'BAW', type: 'B789', from: 'LGW', to: 'POS', gate: '2', at: { air: 0.88, kt: 490 } },
  { id: 'AC1838', op: 'ACA', type: 'B38M', from: 'YYZ', to: 'POS', gate: '4', at: { air: 0.72, kt: 470 } },
  { id: 'JY311', op: 'IWY', type: 'SF34', from: 'BGI', to: 'POS', gate: '3', delay: 22, at: { air: 0.74, kt: 230 } },
  { id: 'BW415', op: 'BWA', type: 'B738', from: 'POS', to: 'BGI', at: { air: 0.16, kt: 380 } },
  { id: 'BW600', op: 'BWA', type: 'B738', from: 'POS', to: 'YYZ', at: { air: 0.08, kt: 460 } },
  { id: 'BW602', op: 'BWA', type: 'B738', from: 'JFK', to: 'TAB', gate: '1', at: { air: 0.71, kt: 470 } },
  { id: 'BW1531', op: 'BWA', type: 'AT72', from: 'TAB', to: 'POS', gate: '1', at: { air: 0.45, kt: 230 } },
  { id: 'BY2154', op: 'TOM', type: 'B788', from: 'LGW', to: 'TAB', gate: '2', at: { air: 0.62, kt: 480 } },
  { id: 'M6827', op: 'AJT', type: 'B763', from: 'MIA', to: 'POS', passenger: false, at: { air: 0.55, kt: 470 } },
  { id: 'BW419', op: 'BWA', type: 'B738', from: 'POS', to: 'MIA', gate: '1', delay: 5, status: 'taxi', at: { out: -4, kt: 470 } },
  { id: 'BW1530', op: 'BWA', type: 'AT72', from: 'POS', to: 'TAB', gate: '2', at: { out: 25, kt: 230 } },
  { id: 'BW485', op: 'BWA', type: 'B738', from: 'POS', to: 'JFK', gate: '6', at: { out: 55, kt: 470 } },
  { id: 'BW1533', op: 'BWA', type: 'AT72', from: 'TAB', to: 'POS', gate: '1', at: { out: 40, kt: 230 } },
  { id: 'BW229', op: 'BWA', type: 'B738', from: 'POS', to: 'GEO', gate: '4', delay: 35, at: { out: 95, kt: 440 } },
  { id: 'BA2156', op: 'BAW', type: 'B789', from: 'POS', to: 'LGW', gate: '2', at: { out: 160, kt: 490 } },
  { id: 'UA1530', op: 'UAL', type: 'B38M', from: 'EWR', to: 'POS', gate: '8', at: { out: 30, kt: 480 } },
  { id: 'PY991', op: 'SLM', type: 'B737', from: 'PBM', to: 'POS', status: 'canceled', at: { out: 70, kt: 430 } },
  { id: 'BW1525', op: 'BWA', type: 'AT72', from: 'TAB', to: 'POS', gate: '1', at: { landed: 12, kt: 230 } },
  { id: 'AA1846', op: 'AAL', type: 'B738', from: 'MIA', to: 'POS', gate: '5', at: { landed: 35, kt: 480 } },
  { id: 'BW1528', op: 'BWA', type: 'AT72', from: 'POS', to: 'TAB', gate: '1', at: { landed: 20, kt: 230 } },
];

const TAXI_OUT = 15 * MINUTE;
const TAXI_IN = 8 * MINUTE;

function toFlight(r: DemoRow, now: number): Flight {
  const origin = AIRPORTS[r.from];
  const dest = AIRPORTS[r.to];
  const durationMs = (distanceNm(origin, dest) / r.at.kt) * 60 * MINUTE;
  const delayMs = (r.delay ?? 0) * MINUTE;

  let offAt: number;
  if ('air' in r.at) offAt = now - r.at.air * durationMs;
  else if ('out' in r.at) offAt = now + r.at.out * MINUTE + TAXI_OUT;
  else offAt = now - r.at.landed * MINUTE - durationMs;
  const onAt = offAt + durationMs;
  const estDep = offAt - TAXI_OUT;
  const estArr = onAt + TAXI_IN;

  let status: FlightStatus = r.status ?? 'scheduled';
  if (!r.status) {
    if (now >= estArr) status = 'arrived';
    else if (now >= onAt) status = 'landed';
    else if (now >= offAt) status = 'enroute';
  }
  const operator = airlineName(r.op, r.op);
  return {
    key: `demo:${r.id}`,
    kind: 'scheduled',
    id: r.id,
    callsign: r.op + r.id.replace(/^[A-Z0-9]{2}/, ''),
    airline: operator,
    type: r.type,
    origin: r.from,
    dest: r.to,
    originCity: origin.city,
    destCity: dest.city,
    status,
    schedDep: estDep - delayMs,
    estDep,
    schedArr: estArr - delayMs,
    estArr,
    offAt,
    onAt,
    gateDep: r.from === 'POS' || r.from === 'TAB' ? r.gate : undefined,
    gateArr: r.to === 'POS' || r.to === 'TAB' ? r.gate : undefined,
    passenger: r.passenger ?? true,
  };
}

export function buildDemoFlights(now: number): Flight[] {
  return ROWS.map((r) => toFlight(r, now));
}
