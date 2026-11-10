import { describe, expect, it } from 'vitest';
import { activeRunway, parseMetars } from './metar';

describe('activeRunway', () => {
  it('picks the runway end facing into the wind', () => {
    expect(activeRunway(100, 90, 12)).toBe('10');
    expect(activeRunway(100, 280, 12)).toBe('28');
    expect(activeRunway(110, 200, 8)).toBe('11');
    expect(activeRunway(110, 210, 8)).toBe('29');
  });

  it('keeps the prevailing (low) end in calm or variable wind', () => {
    expect(activeRunway(100, 280, 2)).toBe('10');
    expect(activeRunway(100, null, 6)).toBe('10');
  });
});

describe('parseMetars', () => {
  it('derives the ceiling from the lowest broken or overcast layer', () => {
    const [m] = parseMetars([
      {
        icaoId: 'TTPP',
        rawOb: 'METAR TTPP 091900Z 15005KT 9999 FEW012 BKN030 OVC080 32/22 Q1013',
        obsTime: 1794250800,
        wdir: 'VRB',
        wspd: 5,
        visib: '6+',
        altim: 1013.2,
        clouds: [
          { cover: 'FEW', base: 1200 },
          { cover: 'BKN', base: 3000 },
          { cover: 'OVC', base: 8000 },
        ],
        fltCat: 'VFR',
      },
    ]);
    expect(m).toMatchObject({ ceilingFt: 3000, clouds: 'FEW012 BKN030 OVC080', windDir: null, qnhHpa: 1013, obsAt: 1794250800000 });
  });
});
