import type { Flight, PlacedFlight } from '../data/types';
import { AIRPORTS, isHomeAirport, type HomeAirport } from '../data/airports';
import { MINUTE } from './time';

export type BoardMode = 'arrivals' | 'departures';
export type AirportFilter = HomeAirport | 'ALL';
export type Tone = 'teal' | 'amber' | 'rose' | 'muted';

/** True when the flight belongs on `mode`'s board for the selected airport(s). */
export function onBoard(f: Flight, mode: BoardMode, airport: AirportFilter): boolean {
  if (f.kind !== 'scheduled') return false;
  const home = mode === 'arrivals' ? f.dest : f.origin;
  return airport === 'ALL' ? isHomeAirport(home) : home === airport;
}

/** The home-airport end of the leg for the given board. */
export function homeEnd(f: Flight, mode: BoardMode): string {
  return mode === 'arrivals' ? f.dest : f.origin;
}

/** The far end of the leg for the given board. */
export function otherEnd(f: Flight, mode: BoardMode): { code: string; city: string } {
  return mode === 'arrivals' ? { code: f.origin, city: f.originCity } : { code: f.dest, city: f.destCity };
}

export function boardTimes(f: Flight, mode: BoardMode): { sched?: number; est?: number } {
  return mode === 'arrivals' ? { sched: f.schedArr, est: f.estArr } : { sched: f.schedDep, est: f.estDep };
}

/** Minutes late (positive) or early (negative) for the board's end of the leg. */
export function delayMinutes(f: Flight, mode: BoardMode): number {
  const { sched, est } = boardTimes(f, mode);
  return sched != null && est != null ? Math.round((est - sched) / MINUTE) : 0;
}

export function isAirborne(f: PlacedFlight): boolean {
  return f.pos != null && f.pos.phase !== 'gate' && f.pos.phase !== 'taxi' && f.pos.phase !== 'landed';
}

export type RouteClass = 'domestic' | 'regional' | 'longhaul';

export function routeClass(f: Flight): RouteClass {
  const regions = [AIRPORTS[f.origin]?.region, AIRPORTS[f.dest]?.region];
  if (regions.every((r) => r === 'domestic')) return 'domestic';
  if (regions.every((r) => r === 'domestic' || r === 'caribbean')) return 'regional';
  return 'longhaul';
}

export const DELAY_THRESHOLD_MIN = 15;

export function statusLabel(f: Flight, mode: BoardMode): { text: string; tone: Tone } {
  const delay = delayMinutes(f, mode);
  switch (f.status) {
    case 'canceled':
      return { text: 'Canceled', tone: 'rose' };
    case 'diverted':
      return { text: 'Diverted', tone: 'rose' };
    case 'arrived':
      return { text: 'Arrived', tone: 'teal' };
    case 'landed':
      return { text: 'Landed', tone: 'teal' };
    case 'enroute':
      if (mode === 'departures') return { text: 'Departed', tone: 'amber' };
      return delay >= DELAY_THRESHOLD_MIN ? { text: `En route +${delay}m`, tone: 'rose' } : { text: 'En route', tone: 'teal' };
    case 'taxi':
      return { text: 'Taxiing', tone: 'amber' };
    case 'scheduled':
      if (delay >= DELAY_THRESHOLD_MIN) return { text: `Delayed ${delay}m`, tone: 'rose' };
      return { text: 'Scheduled', tone: 'muted' };
  }
}

/** Map colour role: delay beats direction; ADS-B-only traffic is neutral. */
export function markerTone(f: Flight): 'inbound' | 'outbound' | 'delay' | 'traffic' {
  if (f.kind === 'traffic') return 'traffic';
  const mode: BoardMode = isHomeAirport(f.dest) ? 'arrivals' : 'departures';
  if (delayMinutes(f, mode) >= DELAY_THRESHOLD_MIN) return 'delay';
  return mode === 'arrivals' ? 'inbound' : 'outbound';
}
