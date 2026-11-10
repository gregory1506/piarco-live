export type FlightCategory = 'VFR' | 'MVFR' | 'IFR' | 'LIFR';

export interface Metar {
  station: string;
  raw: string;
  /** Epoch ms of the observation. */
  obsAt: number;
  tempC: number | null;
  dewC: number | null;
  /** Degrees true, or null when variable/unknown. */
  windDir: number | null;
  windKt: number;
  gustKt: number | null;
  /** Visibility as reported, statute miles ("6+" = 6 SM or more). */
  visibility: string;
  qnhHpa: number | null;
  /** Lowest broken/overcast layer, ft AGL; null when none. */
  ceilingFt: number | null;
  /** Layers in METAR shorthand, e.g. "FEW028 SCT040". */
  clouds: string;
  category: FlightCategory | null;
}

interface AwcCloud {
  cover: string;
  base: number | null;
}

interface AwcMetar {
  icaoId: string;
  rawOb: string;
  obsTime: number;
  temp?: number | null;
  dewp?: number | null;
  wdir?: number | string | null;
  wspd?: number | null;
  wgst?: number | null;
  visib?: number | string | null;
  altim?: number | null;
  cover?: string | null;
  clouds?: AwcCloud[];
  fltCat?: string | null;
}

const CATEGORIES = new Set<string>(['VFR', 'MVFR', 'IFR', 'LIFR']);

/** Parses aviationweather.gov `/api/data/metar?format=json` output. */
export function parseMetars(payload: unknown): Metar[] {
  if (!Array.isArray(payload)) return [];
  return (payload as AwcMetar[]).map((m) => {
    const layers = m.clouds ?? [];
    const ceiling = layers
      .filter((c) => (c.cover === 'BKN' || c.cover === 'OVC' || c.cover === 'OVX') && c.base != null)
      .map((c) => c.base as number);
    return {
      station: m.icaoId,
      raw: m.rawOb,
      obsAt: m.obsTime * 1000,
      tempC: m.temp ?? null,
      dewC: m.dewp ?? null,
      windDir: typeof m.wdir === 'number' ? m.wdir : null,
      windKt: m.wspd ?? 0,
      gustKt: m.wgst ?? null,
      visibility: m.visib == null ? '—' : String(m.visib),
      qnhHpa: m.altim == null ? null : Math.round(m.altim),
      ceilingFt: ceiling.length ? Math.min(...ceiling) : null,
      clouds: layers.length
        ? layers.map((c) => c.cover + (c.base != null ? String(Math.round(c.base / 100)).padStart(3, '0') : '')).join(' ')
        : (m.cover ?? '—'),
      category: m.fltCat && CATEGORIES.has(m.fltCat) ? (m.fltCat as FlightCategory) : null,
    };
  });
}

/**
 * Runway end most aligned into the wind for a runway whose low end points
 * along `lowEndHeading`. Calm (<3 kt) or variable wind keeps the low end,
 * which matches the prevailing easterlies at both T&T airports.
 */
export function activeRunway(lowEndHeading: number, windDir: number | null, windKt: number): string {
  const low = Math.round(lowEndHeading / 10);
  const high = low + 18;
  if (windDir == null || windKt < 3) return String(low).padStart(2, '0');
  const diff = Math.abs(((windDir - lowEndHeading + 540) % 360) - 180);
  return String(diff <= 90 ? low : high).padStart(2, '0');
}
