import type { Flight, LiveState } from './types';
import { normalizeCallsign } from './airlines';

const HOUR = 3600_000;

/** Parses an OpenSky `/states/all` payload into position reports. */
export function parseOpenSky(payload: unknown): LiveState[] {
  const states = ((payload as { states?: unknown[][] } | null)?.states ?? []) as unknown[][];
  const out: LiveState[] = [];
  for (const sv of states) {
    const icao24 = sv[0] as string;
    const callsign = ((sv[1] as string | null) ?? '').trim();
    const lon = sv[5] as number | null;
    const lat = sv[6] as number | null;
    if (lat == null || lon == null) continue;
    const altM = (sv[7] as number | null) ?? (sv[13] as number | null) ?? 0;
    const fix = (sv[3] as number | null) ?? (sv[4] as number);
    out.push({
      icao24,
      callsign: callsign || icao24.toUpperCase(),
      lat,
      lon,
      altFt: Math.max(0, Math.round(altM * 3.28084)),
      spdKt: Math.round(((sv[9] as number | null) ?? 0) * 1.94384),
      hdg: (sv[10] as number | null) ?? 0,
      vRateFpm: Math.round(((sv[11] as number | null) ?? 0) * 196.85),
      onGround: Boolean(sv[8]),
      fixAt: fix * 1000,
    });
  }
  return out;
}

/**
 * Attaches ADS-B reports to scheduled flights by callsign. Reports that match
 * no schedule become `traffic` entries so they still appear on the map.
 */
export function mergeLive(flights: Flight[], states: LiveState[]): Flight[] {
  const byCallsign = new Map(states.map((s) => [normalizeCallsign(s.callsign), s]));
  const used = new Set<LiveState>();
  const merged = flights.map((f) => {
    const live = byCallsign.get(normalizeCallsign(f.callsign));
    // Only a leg whose flight window covers the fix: yesterday's or tomorrow's
    // leg with the same callsign must not grab today's position.
    if (!live || used.has(live) || f.status === 'arrived' || f.status === 'canceled') return f;
    if (f.offAt != null && f.offAt - live.fixAt > 2 * HOUR) return f;
    if (f.onAt != null && live.fixAt - f.onAt > HOUR) return f;
    used.add(live);
    return { ...f, live };
  });
  for (const s of states) {
    if (used.has(s)) continue;
    merged.push({
      key: `adsb:${s.icao24}`,
      kind: 'traffic',
      id: s.callsign,
      callsign: s.callsign,
      airline: '',
      type: '',
      origin: '',
      dest: '',
      originCity: '',
      destCity: '',
      status: s.onGround ? 'taxi' : 'enroute',
      passenger: true,
      live: s,
    });
  }
  return merged;
}
