import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/aeroapi-sample-ttpp.json';
import { mapAeroApiFlights } from './scheduleFeed';

describe('mapAeroApiFlights', () => {
  const flights = mapAeroApiFlights([fixture]);

  it('de-duplicates legs that appear in both airports\' responses', () => {
    const twice = mapAeroApiFlights([fixture, fixture]);
    expect(twice).toHaveLength(flights.length);
    expect(new Set(twice.map((f) => f.key)).size).toBe(twice.length);
  });

  it('keeps ICAO callsigns for ADS-B matching and IATA idents for display', () => {
    const bw = flights.find((f) => f.key === 'BWA1515-1788067857-airline-491p')!;
    expect(bw).toMatchObject({ id: 'BW1515', callsign: 'BWA1515', origin: 'TAB', dest: 'POS', airline: 'Caribbean Airlines' });
  });

  it('uses actual times over estimates and maps FlightAware statuses', () => {
    const bw = flights.find((f) => f.key === 'BWA1515-1788067857-airline-491p')!;
    expect(bw.status).toBe('landed');
    expect(bw.schedDep).toBe(Date.parse('2026-09-01T16:25:00Z'));
    expect(bw.estDep).toBe(Date.parse('2026-09-01T16:48:00Z'));
    expect(bw.onAt).toBe(Date.parse('2026-09-01T17:12:18Z'));
  });

  it('flags cargo operators as non-passenger', () => {
    const cargo = flights.filter((f) => !f.passenger).map((f) => f.callsign.slice(0, 3));
    expect(cargo).toEqual(expect.arrayContaining(['AJT', 'DAE']));
    expect(flights.find((f) => f.callsign.startsWith('BWA'))?.passenger).toBe(true);
  });

  it('drops flights without both endpoints', () => {
    expect(flights.every((f) => f.origin && f.dest)).toBe(true);
  });
});
