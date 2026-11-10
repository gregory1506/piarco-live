import { describe, expect, it } from 'vitest';
import type { Flight } from '../data/types';
import { AIRPORTS, APRON_OFFSETS } from '../data/airports';
import { distanceNm } from './geo';
import { placeFlights } from './positions';
import { MINUTE } from './time';

const T0 = Date.parse('2026-11-09T18:00:00Z');

function flight(over: Partial<Flight>): Flight {
  return {
    key: 'k',
    kind: 'scheduled',
    id: 'BW523',
    callsign: 'BWA523',
    airline: 'Caribbean Airlines',
    type: 'B738',
    origin: 'JFK',
    dest: 'POS',
    originCity: 'New York',
    destCity: 'Port of Spain',
    status: 'enroute',
    offAt: T0,
    onAt: T0 + 300 * MINUTE,
    passenger: true,
    ...over,
  };
}

describe('placeFlights', () => {
  it('places an airborne flight along the route by elapsed time', () => {
    const [f] = placeFlights([flight({})], T0 + 150 * MINUTE);
    expect(f.pos?.progress).toBeCloseTo(0.5, 5);
    const total = distanceNm(AIRPORTS.JFK, AIRPORTS.POS);
    expect(f.pos?.remainingNm).toBeCloseTo(total / 2, 0);
    expect(f.pos?.live).toBe(false);
  });

  it('hides arrivals that have not left a foreign origin', () => {
    const [f] = placeFlights([flight({ status: 'scheduled' })], T0 - 30 * MINUTE);
    expect(f.pos).toBeNull();
  });

  it('parks home departures on the apron shortly before wheels-off, in distinct slots', () => {
    const dep = (key: string) => flight({ key, origin: 'POS', dest: 'MIA', status: 'scheduled' });
    const [a, b] = placeFlights([dep('a'), dep('b')], T0 - 10 * MINUTE);
    expect(a.pos?.phase).toBe('taxi');
    expect(a.pos?.altFt).toBe(0);
    expect(a.pos!.lat).toBeCloseTo(APRON_OFFSETS.POS.lat, 3);
    expect([a.pos!.lat, a.pos!.lon]).not.toEqual([b.pos!.lat, b.pos!.lon]);
  });

  it('drops arrivals from the map some time after landing', () => {
    expect(placeFlights([flight({})], T0 + 310 * MINUTE)[0].pos?.phase).toBe('landed');
    expect(placeFlights([flight({})], T0 + 400 * MINUTE)[0].pos).toBeNull();
  });

  it('prefers a recent ADS-B fix and dead-reckons it toward the destination', () => {
    const live = { icao24: 'abc', callsign: 'BWA523', lat: 15, lon: -65, altFt: 35000, spdKt: 480, hdg: 150, vRateFpm: 0, onGround: false, fixAt: T0 };
    const atFix = placeFlights([flight({ live })], T0)[0].pos!;
    expect(atFix).toMatchObject({ lat: 15, lon: -65, live: true, altFt: 35000 });
    const later = placeFlights([flight({ live })], T0 + 10 * MINUTE)[0].pos!;
    expect(distanceNm(live, AIRPORTS.POS) - later.remainingNm!).toBeCloseTo(80, 0);
  });

  it('falls back to the schedule estimate far from the ADS-B fix', () => {
    const live = { icao24: 'abc', callsign: 'BWA523', lat: 15, lon: -65, altFt: 35000, spdKt: 480, hdg: 150, vRateFpm: 0, onGround: false, fixAt: T0 };
    expect(placeFlights([flight({ live })], T0 + 60 * MINUTE)[0].pos?.live).toBe(false);
  });

  it('never places canceled flights', () => {
    expect(placeFlights([flight({ status: 'canceled' })], T0 + 60 * MINUTE)[0].pos).toBeNull();
  });
});
