import { useMemo, useState } from 'react';
import type { Flight } from '../data/types';
import { HOME_AIRPORTS } from '../data/airports';
import { CITIES, FEED_META } from '../data/flights';

interface BoardProps {
  flights: Flight[];
  mode: 'arrivals' | 'departures';
  setMode: (m: 'arrivals' | 'departures') => void;
  selectedId: string;
  onSelect: (id: string) => void;
  watchlist: Set<string>;
  toggleWatch: (id: string) => void;
  query: string;
  setQuery: (q: string) => void;
  showWatchOnly: boolean;
  setShowWatchOnly: (v: boolean) => void;
  hoveredId: string | null;
  onHoverFlight: (id: string | null) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
}

function isHomeAirport(code: string): boolean {
  return HOME_AIRPORTS.includes(code);
}

export function addMinutes(hhmm: string, delta: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = (h * 60 + m + delta) % (24 * 60);
  const H = Math.floor(total / 60);
  const M = total % 60;
  return `${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}`;
}

const FILTERS: { k: string; l: string }[] = [
  { k: 'all', l: 'ALL' },
  { k: 'onair', l: 'IN AIR' },
  { k: 'ground', l: 'GROUND' },
  { k: 'delayed', l: 'DELAYED' },
  { k: 'intl', l: 'INTL' },
  { k: 'regional', l: 'REGIONAL' },
];

const REGIONAL_CODES = ['POS', 'TAB', 'BGI', 'ANU', 'UVF', 'SVD', 'GEO'];

export default function Board({
  flights,
  mode,
  setMode,
  selectedId,
  onSelect,
  watchlist,
  toggleWatch,
  query,
  setQuery,
  showWatchOnly,
  setShowWatchOnly,
  hoveredId,
  onHoverFlight,
  searchInputRef,
}: BoardProps) {
  const [filter, setFilter] = useState('all');

  const isArrival = mode === 'arrivals';
  const scoped = useMemo(() => {
    let list = flights.filter((f) => (isArrival ? isHomeAirport(f.dest) : isHomeAirport(f.origin)));
    if (filter !== 'all') {
      if (filter === 'delayed') list = list.filter((f) => f.delay >= 10);
      else if (filter === 'onair') list = list.filter((f) => f.alt > 500);
      else if (filter === 'ground') list = list.filter((f) => f.alt < 500);
      else if (filter === 'intl')
        list = list.filter((f) => !isHomeAirport(isArrival ? f.origin : f.dest) && !REGIONAL_CODES.includes(isArrival ? f.origin : f.dest));
      else if (filter === 'regional') list = list.filter((f) => REGIONAL_CODES.includes(isArrival ? f.origin : f.dest));
    }
    if (showWatchOnly) list = list.filter((f) => watchlist.has(f.id));
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (f) =>
          f.id.toLowerCase().includes(q) ||
          f.airline.toLowerCase().includes(q) ||
          (CITIES[isArrival ? f.origin : f.dest] || '').toLowerCase().includes(q) ||
          (isArrival ? f.origin : f.dest).toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => (isArrival ? a.eta : a.dep).localeCompare(isArrival ? b.eta : b.dep));
  }, [flights, isArrival, filter, showWatchOnly, watchlist, query]);

  const arrivalsCount = flights.filter((f) => isHomeAirport(f.dest)).length;
  const departuresCount = flights.filter((f) => isHomeAirport(f.origin)).length;

  const statusLabel = (f: Flight) => {
    if (f.delay >= 15) return { text: 'DELAY ' + f.delay + "'", cls: 'st-delay' };
    if (f.status === 'landed') return { text: 'LANDED', cls: 'st-landed' };
    if (f.status === 'canceled') return { text: 'CANCELED', cls: 'st-delay' };
    if (f.status === 'enroute') return { text: 'EN ROUTE', cls: 'st-enroute' };
    if (f.status === 'departing') return { text: 'DEPARTED', cls: 'st-departing' };
    if (f.status === 'boarding') return { text: 'BOARDING', cls: 'st-boarding' };
    if (f.status === 'taxi') return { text: 'TAXI', cls: 'st-taxi' };
    if (f.status === 'scheduled') return { text: 'SCHED', cls: 'st-scheduled' };
    return { text: (f.status as string).toUpperCase(), cls: 'st-scheduled' };
  };

  const progress = (f: Flight) => {
    if (isHomeAirport(f.origin)) return null;
    const total = 600;
    return Math.max(0.02, Math.min(0.99, 1 - f.dist / total));
  };

  return (
    <div className="panel">
      <div className="panel-tabs">
        <button className={`tab ${mode === 'arrivals' ? 'active' : ''}`} onClick={() => setMode('arrivals')}>
          Arrivals <span className="count">{arrivalsCount}</span>
        </button>
        <button className={`tab ${mode === 'departures' ? 'active' : ''}`} onClick={() => setMode('departures')}>
          Departures <span className="count">{departuresCount}</span>
        </button>
        <div className="tab-actions">
          <button className={`icon-btn ${showWatchOnly ? 'active' : ''}`} title="Watchlist only" onClick={() => setShowWatchOnly(!showWatchOnly)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={showWatchOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9" />
            </svg>
          </button>
        </div>
      </div>

      <div className="filter-row">
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--line)', borderRadius: 2, padding: '0 8px', gap: 6, flex: '0 0 auto', background: 'var(--bg)' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-mute)' }}>
            <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
          <input
            ref={searchInputRef}
            placeholder={isArrival ? 'Flight, origin, or airport…' : 'Flight, destination, or airport…'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ background: 'transparent', border: 0, outline: 'none', color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '5px 0', width: 150 }}
          />
        </div>
        {FILTERS.map((c) => (
          <button key={c.k} className={`chip ${filter === c.k ? 'on' : ''}`} onClick={() => setFilter(c.k)}>
            {c.l}
          </button>
        ))}
      </div>

      {FEED_META?.TAB && (
        <div className="feed-note">
          <span className="mono">TAB FEED</span>
          <span>{FEED_META.TAB.date}</span>
          <span>{FEED_META.TAB.source}</span>
        </div>
      )}

      <div className="board">
        <div className="board-header">
          <div></div>
          <div>Flight</div>
          <div>{isArrival ? 'Origin' : 'Destination'}</div>
          <div>{isArrival ? 'ETA' : 'Dep'}</div>
          <div>Gate</div>
          <div>Status</div>
          <div></div>
        </div>
        {scoped.length === 0 && <div className="empty">No flights match.</div>}
        {scoped.map((f) => {
          const s = statusLabel(f);
          const airport = isArrival ? f.origin : f.dest;
          const time = isArrival ? f.eta : f.dep;
          const prog = progress(f);
          const isSel = f.id === selectedId;
          const isHovered = f.id === hoveredId;
          const starred = watchlist.has(f.id);
          return (
            <div
              key={f.id}
              className={`row ${isSel ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
              onClick={() => onSelect(f.id)}
              onMouseEnter={() => onHoverFlight(f.id)}
              onMouseLeave={() => onHoverFlight(null)}
            >
              <button className={`star ${starred ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); toggleWatch(f.id); }}>★</button>
              <div className="flt mono">
                <span>{f.id}</span>
                <div className="al mono" style={{ fontSize: 9.5, letterSpacing: '0.08em', marginTop: 2 }}>{f.type} · {f.airline}</div>
              </div>
              <div>
                <div className="city">{CITIES[airport] || airport}</div>
                <div className="city-sub">{airport} · {f.airline}</div>
              </div>
              <div className="time mono">
                {f.delay >= 10 ? (
                  <>
                    <span>{addMinutes(time, f.delay)}</span>
                    <span className="sched">{time}</span>
                  </>
                ) : (
                  time
                )}
              </div>
              <div className="gate">{f.gate}</div>
              <div><span className={`status ${s.cls}`}>{s.text}</span></div>
              <div className="mute mono" style={{ textAlign: 'right', fontSize: 10 }}>
                {isArrival && f.alt > 500 ? Math.round(f.dist) + 'nm' : ''}
              </div>
              {isArrival && prog !== null && (
                <div className="progress"><div className="fill" style={{ width: prog * 100 + '%' }} /></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
