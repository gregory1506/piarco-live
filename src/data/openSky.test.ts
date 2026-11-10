import { describe, expect, it } from 'vitest';
import type { Flight } from './types';
import { mergeLive, parseOpenSky } from './openSky';

const T0 = 1794253178;
const payload = {
  time: T0,
  states: [
    ['34659a', 'IBE0137 ', 'Spain', T0, T0, -60.71, 12.79, 12192, false, 247.47, 230.65, 0, null, 12915.9, null, false, 0],
    ['0bc201', 'J8GND   ', 'Saint Vincent', T0, T0, -60.97, 13.13, 655.32, false, 91.06, 269.68, -1.95, null, 685.8, null, false, 0],
  ],
};

const scheduled: Flight = {
  key: 'IBE137-1',
  kind: 'scheduled',
  id: 'IB137',
  callsign: 'IBE137',
  airline: 'Iberia',
  type: 'A332',
  origin: 'MAD',
  dest: 'POS',
  originCity: 'Madrid',
  destCity: 'Port of Spain',
  status: 'enroute',
  offAt: T0 * 1000 - 8 * 3600_000,
  onAt: T0 * 1000 + 3600_000,
  passenger: true,
};

describe('mergeLive', () => {
  const states = parseOpenSky(payload);

  it('matches ADS-B callsigns with zero-padded flight numbers to schedules', () => {
    const merged = mergeLive([scheduled], states);
    expect(merged[0].live?.icao24).toBe('34659a');
    expect(merged[0].live?.altFt).toBe(40000);
  });

  it('turns unmatched reports into map-only traffic', () => {
    const traffic = mergeLive([scheduled], states).filter((f) => f.kind === 'traffic');
    expect(traffic.map((f) => f.callsign)).toEqual(['J8GND']);
  });

  it('does not attach a fix to a leg that lands long before it', () => {
    const yesterday = { ...scheduled, onAt: T0 * 1000 - 20 * 3600_000 };
    expect(mergeLive([yesterday], states)[0].live).toBeUndefined();
  });
});
