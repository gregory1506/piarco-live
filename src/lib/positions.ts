import type { Flight, LatLon, LiveState, Phase, PlacedFlight, Position } from '../data/types';
import { APRON_OFFSETS, RUNWAYS, findAirport, isHomeAirport, type HomeAirport } from '../data/airports';
import { apronSlot, clamp, destinationPoint, distanceNm } from './geo';
import { greatCircleBearingAt, greatCirclePointAt } from './greatCircle';
import { MINUTE } from './time';

const HOUR = 60 * MINUTE;
/** Typical gate-out → wheels-off and wheels-on → gate-in times. */
const TAXI_OUT = 15 * MINUTE;
const TAXI_IN = 8 * MINUTE;
/** Departures appear on the apron this long before wheels-off. */
const SHOW_BEFORE_DEPARTURE = 2 * HOUR;
/** Arrivals stay on the apron this long after touchdown. */
const SHOW_AFTER_ARRIVAL = 45 * MINUTE;
/** Beyond this distance from the ADS-B fix in time, prefer the schedule estimate. */
const LIVE_HORIZON = 20 * MINUTE;

type Estimate = Position | { apron: HomeAirport; phase: Phase; progress: number };

function cruiseAltitude(routeNm: number): number {
  if (routeNm < 120) return 10_000;
  if (routeNm < 400) return 22_000;
  return 37_000;
}

function fromLive(f: Flight, live: LiveState, t: number): Position {
  const origin = findAirport(f.origin);
  const dest = findAirport(f.dest);
  const remainingAtFix = dest ? distanceNm(live, dest) : null;
  let point: LatLon = live;
  let hdg = live.hdg;

  if (!live.onGround) {
    const travel = (live.spdKt * clamp(t - live.fixAt, -2 * HOUR, 2 * HOUR)) / HOUR;
    if (dest && remainingAtFix && travel > 0) {
      const frac = Math.min(1, travel / remainingAtFix);
      point = greatCirclePointAt(live, dest, frac);
      if (frac < 1) hdg = greatCircleBearingAt(live, dest, frac);
    } else if (origin && travel < 0) {
      const back = distanceNm(live, origin);
      const frac = back > 0 ? Math.min(1, -travel / back) : 0;
      point = greatCirclePointAt(live, origin, frac);
      if (frac < 1) hdg = (greatCircleBearingAt(live, origin, frac) + 180) % 360;
    } else if (travel !== 0) {
      point = destinationPoint(live, travel > 0 ? hdg : hdg + 180, Math.abs(travel));
    }
  }

  const remainingNm = dest ? distanceNm(point, dest) : null;
  const totalNm = origin && dest ? distanceNm(origin, dest) : 0;
  const phase: Phase = live.onGround ? 'taxi' : live.vRateFpm > 500 ? 'climb' : live.vRateFpm < -500 ? 'descent' : 'cruise';
  return {
    lat: point.lat,
    lon: point.lon,
    hdg,
    altFt: live.onGround ? 0 : live.altFt,
    spdKt: live.spdKt,
    phase,
    progress: totalNm > 0 && remainingNm != null ? clamp(1 - remainingNm / totalNm, 0, 1) : 0,
    remainingNm,
    live: true,
  };
}

function fromSchedule(f: Flight, t: number): Estimate | null {
  if (f.status === 'canceled' || f.status === 'diverted') return null;
  const origin = findAirport(f.origin);
  const dest = findAirport(f.dest);
  const off = f.offAt ?? (f.estDep != null ? f.estDep + TAXI_OUT : undefined);
  const on = f.onAt ?? (f.estArr != null ? f.estArr - TAXI_IN : undefined);

  if (off == null || t < off) {
    if (!isHomeAirport(f.origin) || off == null || off - t > SHOW_BEFORE_DEPARTURE) return null;
    const taxiing = f.status === 'taxi' || off - t <= TAXI_OUT;
    return { apron: f.origin, phase: taxiing ? 'taxi' : 'gate', progress: 0 };
  }
  if (on == null || t >= on) {
    if (!isHomeAirport(f.dest) || on == null || t - on > SHOW_AFTER_ARRIVAL) return null;
    return { apron: f.dest, phase: 'landed', progress: 1 };
  }
  if (!origin || !dest) return null;

  const p = clamp((t - off) / (on - off), 0, 1);
  const totalNm = distanceNm(origin, dest);
  const flownNm = totalNm * p;
  const remainingNm = totalNm - flownNm;
  const climbNm = Math.min(totalNm * 0.3, 120);
  const descentNm = Math.min(totalNm * 0.35, 130);
  const altFt = Math.round((cruiseAltitude(totalNm) * Math.min(1, flownNm / climbNm, remainingNm / descentNm)) / 100) * 100;
  const point = greatCirclePointAt(origin, dest, p);
  return {
    lat: point.lat,
    lon: point.lon,
    hdg: greatCircleBearingAt(origin, dest, p),
    altFt,
    spdKt: Math.round(totalNm / ((on - off) / HOUR)),
    phase: flownNm < climbNm ? 'climb' : remainingNm < descentNm ? 'descent' : 'cruise',
    progress: p,
    remainingNm,
    live: false,
  };
}

function hasSchedule(f: Flight): boolean {
  return f.offAt != null || f.estDep != null;
}

/** Positions every flight at instant `t`; grounded aircraft get distinct apron slots. */
export function placeFlights(flights: Flight[], t: number): PlacedFlight[] {
  const slots: Partial<Record<HomeAirport, number>> = {};
  return flights.map((f) => {
    const useLive = f.live && (!hasSchedule(f) || Math.abs(t - f.live.fixAt) <= LIVE_HORIZON);
    const est = useLive && f.live ? fromLive(f, f.live, t) : fromSchedule(f, t);
    if (!est || !('apron' in est)) return { ...f, pos: est };

    const idx = slots[est.apron] ?? 0;
    slots[est.apron] = idx + 1;
    const point = apronSlot(APRON_OFFSETS[est.apron], idx);
    const dest = findAirport(f.dest);
    return {
      ...f,
      pos: {
        ...point,
        hdg: RUNWAYS[est.apron].heading,
        altFt: 0,
        spdKt: 0,
        phase: est.phase,
        progress: est.progress,
        remainingNm: dest ? distanceNm(point, dest) : null,
        live: false,
      },
    };
  });
}
