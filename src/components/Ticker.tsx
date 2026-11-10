import { useMemo } from 'react';
import type { PlacedFlight } from '../data/types';
import type { Metar } from '../data/metar';
import { isHomeAirport } from '../data/airports';
import { DELAY_THRESHOLD_MIN, delayMinutes, type BoardMode } from '../lib/flights';
import { formatHM } from '../lib/time';

interface TickerItem {
  tag: string;
  tone: 'up' | 'down' | '';
  title: string;
  detail: string;
}

function buildItems(flights: PlacedFlight[], metars: Metar[]): TickerItem[] {
  const items: TickerItem[] = [];
  const scheduled = flights.filter((f) => f.kind === 'scheduled');
  const mode = (f: PlacedFlight): BoardMode => (isHomeAirport(f.dest) ? 'arrivals' : 'departures');

  for (const f of scheduled.filter((f) => f.status === 'landed' || f.status === 'arrived').slice(0, 3)) {
    items.push({ tag: 'LANDED', tone: 'up', title: `${f.id} from ${f.originCity}`, detail: `${f.airline}${f.gateArr ? ` · gate ${f.gateArr}` : ''}` });
  }
  const delayed = scheduled
    .filter((f) => f.status !== 'landed' && f.status !== 'arrived' && delayMinutes(f, mode(f)) >= DELAY_THRESHOLD_MIN)
    .sort((a, b) => delayMinutes(b, mode(b)) - delayMinutes(a, mode(a)))
    .slice(0, 3);
  for (const f of delayed) {
    items.push({ tag: 'DELAY', tone: 'down', title: `${f.id} ${f.originCity} → ${f.destCity}`, detail: `+${delayMinutes(f, mode(f))} min` });
  }
  for (const f of scheduled.filter((f) => f.status === 'canceled').slice(0, 2)) {
    items.push({ tag: 'CANCELED', tone: 'down', title: `${f.id} ${f.originCity} → ${f.destCity}`, detail: f.airline });
  }
  for (const f of scheduled.filter((f) => f.status === 'enroute' && f.pos && isHomeAirport(f.dest)).slice(0, 3)) {
    items.push({
      tag: 'INBOUND',
      tone: 'up',
      title: `${f.id} from ${f.originCity}`,
      detail: `ETA ${formatHM(f.estArr)}${f.pos?.live ? ` · ${f.pos.altFt.toLocaleString()}ft` : ''}`,
    });
  }
  for (const m of metars) {
    items.push({ tag: 'WX', tone: '', title: m.station, detail: m.raw.replace(/^METAR\s+\S+\s+/, '') });
  }
  return items;
}

export default function Ticker({ flights, metars }: { flights: PlacedFlight[]; metars: Metar[] }) {
  const items = useMemo(() => buildItems(flights, metars), [flights, metars]);
  if (items.length === 0) return <div className="ticker" aria-hidden="true" />;
  // Rendered twice back-to-back so the CSS marquee loops seamlessly.
  const loop = [...items, ...items];
  return (
    <div className="ticker" role="marquee" aria-label="Airport activity">
      <div className="ticker-label">LIVE</div>
      <div className="ticker-viewport">
        <div className="ticker-track" style={{ animationDuration: `${Math.max(40, items.length * 7)}s` }}>
          {loop.map((t, i) => (
            <span className="ticker-item" key={i} aria-hidden={i >= items.length}>
              <span className={t.tone}>{t.tag}</span> <b>{t.title}</b> <span className="mute">·</span> {t.detail}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
