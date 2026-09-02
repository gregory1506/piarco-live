import { useMemo } from 'react';
import type { Flight } from '../data/types';
import { CITIES } from '../data/flights';

type TickerItem = [string, string, string, string];

const STATIC_ITEMS: TickerItem[] = [
  ['WX', 'TTPP 24°C · TTCP 26°C', 'VIS 10SM', ''],
  ['NOTAM', 'TTPP / TTCP', 'normal ops', ''],
];

function city(code: string): string {
  return CITIES[code] || code;
}

function buildFlightItems(flights: Flight[]): TickerItem[] {
  const items: TickerItem[] = [];

  const landed = flights
    .filter((f) => f.status === 'landed')
    .slice(0, 2);
  for (const f of landed) {
    items.push(['LANDED', `${f.id} ex ${city(f.origin)}`, `${f.airline} · on stand ${f.gate || '—'}`, 'up']);
  }

  const delayed = flights
    .filter((f) => f.delay > 0 && f.status !== 'landed')
    .sort((a, b) => b.delay - a.delay)
    .slice(0, 2);
  for (const f of delayed) {
    items.push(['DELAY', `${f.id} ex ${city(f.origin)} to ${city(f.dest)}`, `+${f.delay} min`, 'down']);
  }

  const enroute = flights
    .filter((f) => f.status === 'enroute' || f.track === 'cruise' || f.track === 'climbing' || f.track === 'descending')
    .slice(0, 2);
  for (const f of enroute) {
    const dir = f.origin === 'POS' || f.origin === 'TAB' ? `to ${city(f.dest)}` : `ex ${city(f.origin)}`;
    items.push(['AIRBORNE', `${f.id} ${dir}`, `${f.alt.toLocaleString()}ft · ${f.spd}kt`, 'up']);
  }

  const scheduled = flights
    .filter((f) => f.status === 'scheduled' && f.eta)
    .slice(0, 2);
  for (const f of scheduled) {
    items.push(['SCHED', `${f.id} ex ${city(f.origin)}`, `ETA ${f.eta}`, '']);
  }

  return items;
}

interface TickerProps {
  flights?: Flight[];
}

export default function Ticker({ flights = [] }: TickerProps) {
  const items = useMemo(() => {
    const flightItems = buildFlightItems(flights);
    const all = [...flightItems, ...STATIC_ITEMS];
    return [...all, ...all];
  }, [flights]);

  return (
    <div className="ticker">
      <div className="ticker-label">TT AIRPORTS · LIVE</div>
      <div className="ticker-track">
        {items.map((t, i) => (
          <span className="ticker-item" key={i}>
            <span className={t[3]}>{t[0]}</span> <b>{t[1]}</b> <span className="mute">·</span> {t[2]}
          </span>
        ))}
      </div>
    </div>
  );
}
