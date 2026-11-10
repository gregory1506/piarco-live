import { useMemo, useState } from 'react';
import type { Flight, LiveState } from '../data/types';
import { mapAeroApiFlights } from '../data/scheduleFeed';
import { mergeLive, parseOpenSky } from '../data/openSky';
import { parseMetars, type Metar } from '../data/metar';
import { buildDemoFlights } from '../data/demoFlights';
import { fetchJson, usePolling, type FeedStatus } from './usePolling';

const OPENSKY_URL = 'https://opensky.gregstack.xyz/api/opensky';
/** 90 s ≈ 960 calls/day × 2 credits, well under OpenSky's 4,000/day authenticated cap. */
const OPENSKY_INTERVAL = 90_000;
/** Schedules change slowly; the Pages Function caches AeroAPI for the same period. */
const SCHEDULE_INTERVAL = 5 * 60_000;
const METAR_INTERVAL = 10 * 60_000;

export type ScheduleSource = 'loading' | 'live' | 'demo';

export interface FlightData {
  flights: Flight[];
  source: ScheduleSource;
  scheduleUpdatedAt: number | undefined;
  adsb: { status: FeedStatus; count: number; updatedAt: number | undefined };
  metars: Metar[];
  metarStatus: FeedStatus;
}

async function loadSchedule(signal: AbortSignal): Promise<Flight[]> {
  const responses = await Promise.all([
    fetchJson('/api/schedule?airport=POS', signal),
    fetchJson('/api/schedule?airport=TAB', signal),
  ]);
  return mapAeroApiFlights(responses);
}

async function loadAdsb(signal: AbortSignal): Promise<LiveState[]> {
  return parseOpenSky(await fetchJson(OPENSKY_URL, signal));
}

async function loadMetars(signal: AbortSignal): Promise<Metar[]> {
  return parseMetars(await fetchJson('/api/metar', signal));
}

export function useFlightData(): FlightData {
  const schedule = usePolling(loadSchedule, SCHEDULE_INTERVAL);
  const adsb = usePolling(loadAdsb, OPENSKY_INTERVAL);
  const metar = usePolling(loadMetars, METAR_INTERVAL);
  // Demo timings are anchored once so they advance with the clock like real flights.
  const [demoEpoch] = useState(() => Date.now());

  const source: ScheduleSource =
    schedule.data && schedule.data.length > 0 ? 'live' : schedule.status === 'loading' ? 'loading' : 'demo';

  const flights = useMemo(() => {
    const base = source === 'live' ? (schedule.data ?? []) : source === 'demo' ? buildDemoFlights(demoEpoch) : [];
    return mergeLive(base, adsb.data ?? []);
  }, [source, schedule.data, adsb.data, demoEpoch]);

  return {
    flights,
    source,
    scheduleUpdatedAt: schedule.updatedAt,
    adsb: { status: adsb.status, count: adsb.data?.length ?? 0, updatedAt: adsb.updatedAt },
    metars: metar.data ?? [],
    metarStatus: metar.status,
  };
}
