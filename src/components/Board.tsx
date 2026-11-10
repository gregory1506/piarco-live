import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import type { PlacedFlight } from '../data/types';
import type { ScheduleSource } from '../hooks/useFlightData';
import {
  DELAY_THRESHOLD_MIN,
  boardTimes,
  delayMinutes,
  homeEnd,
  isAirborne,
  onBoard,
  otherEnd,
  routeClass,
  statusLabel,
  type AirportFilter,
  type BoardMode,
} from '../lib/flights';
import { dayOffset, formatHM } from '../lib/time';

type Chip = 'all' | 'air' | 'delayed' | 'domestic' | 'regional' | 'longhaul';

const CHIPS: { k: Chip; l: string }[] = [
  { k: 'all', l: 'All' },
  { k: 'air', l: 'In air' },
  { k: 'delayed', l: 'Delayed' },
  { k: 'domestic', l: 'Domestic' },
  { k: 'regional', l: 'Caribbean' },
  { k: 'longhaul', l: 'Long-haul' },
];

interface BoardProps {
  flights: PlacedFlight[];
  source: ScheduleSource;
  now: number;
  mode: BoardMode;
  setMode: (m: BoardMode) => void;
  airport: AirportFilter;
  setAirport: (a: AirportFilter) => void;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  hoveredKey: string | null;
  onHover: (key: string | null) => void;
  watchlist: string[];
  toggleWatch: (id: string) => void;
  query: string;
  setQuery: (q: string) => void;
  watchOnly: boolean;
  setWatchOnly: (v: boolean) => void;
  searchRef: RefObject<HTMLInputElement | null>;
}

function TimeCell({ sched, est, now }: { sched?: number; est?: number; now: number }) {
  const shown = sched ?? est;
  const day = shown != null ? dayOffset(shown, now) : 0;
  const late = sched != null && est != null && Math.round((est - sched) / 60_000);
  return (
    <span className="time mono">
      <span className="sched">
        {formatHM(shown)}
        {day !== 0 && <sup className="day" title={day > 0 ? 'Tomorrow' : 'Yesterday'}>{day > 0 ? `+${day}d` : `${day}d`}</sup>}
      </span>
      {late && Math.abs(late) >= 5 ? (
        <span className={`est ${late >= DELAY_THRESHOLD_MIN ? 'late' : late < 0 ? 'early' : ''}`}>{formatHM(est)}</span>
      ) : null}
    </span>
  );
}

export default function Board(props: BoardProps) {
  const { flights, source, now, mode, setMode, airport, setAirport, selectedKey, onSelect, hoveredKey, onHover } = props;
  const { watchlist, toggleWatch, query, setQuery, watchOnly, setWatchOnly, searchRef } = props;
  const [chip, setChip] = useState<Chip>('all');
  const listRef = useRef<HTMLDivElement>(null);
  const nowRowRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(
    () => ({
      arrivals: flights.filter((f) => onBoard(f, 'arrivals', airport)).length,
      departures: flights.filter((f) => onBoard(f, 'departures', airport)).length,
    }),
    [flights, airport],
  );

  const rows = useMemo(() => {
    const watched = new Set(watchlist);
    const q = query.trim().toLowerCase();
    return flights
      .filter((f) => onBoard(f, mode, airport))
      .filter((f) => {
        if (chip === 'air') return isAirborne(f);
        if (chip === 'delayed') return delayMinutes(f, mode) >= DELAY_THRESHOLD_MIN || f.status === 'canceled';
        if (chip === 'domestic' || chip === 'regional' || chip === 'longhaul') return routeClass(f) === chip;
        return true;
      })
      .filter((f) => !watchOnly || watched.has(f.id))
      .filter((f) => {
        if (!q) return true;
        const other = otherEnd(f, mode);
        return [f.id, f.callsign, f.airline, other.code, other.city, f.registration ?? '', f.type].some((s) =>
          s.toLowerCase().includes(q),
        );
      })
      .sort((a, b) => (boardTimes(a, mode).sched ?? 0) - (boardTimes(b, mode).sched ?? 0));
  }, [flights, mode, airport, chip, watchOnly, watchlist, query]);

  // Index of the first flight still to come; the NOW divider goes before it.
  const nowIndex = rows.findIndex((f) => {
    const { sched, est } = boardTimes(f, mode);
    return (est ?? sched ?? 0) >= now;
  });

  // Bring "now" into view whenever the board context changes.
  const scrollKey = `${mode}|${airport}|${source}|${chip}`;
  const lastScrollKey = useRef('');
  useEffect(() => {
    if (lastScrollKey.current === scrollKey || rows.length === 0) return;
    lastScrollKey.current = scrollKey;
    const list = listRef.current;
    const marker = nowRowRef.current;
    if (list && marker) list.scrollTop = Math.max(0, marker.offsetTop - list.clientHeight * 0.25);
  }, [scrollKey, rows.length]);

  const onListKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('.row-main') ?? [])];
    if (buttons.length === 0) return;
    e.preventDefault();
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      current === -1 ? 0 : Math.max(0, Math.min(buttons.length - 1, current + (e.key === 'ArrowDown' ? 1 : -1)));
    buttons[next].focus();
    buttons[next].click();
  };

  const isArrival = mode === 'arrivals';

  return (
    <section className="panel" aria-label="Flight board">
      <div className="panel-tabs" role="tablist" aria-label="Board">
        {(['arrivals', 'departures'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            className={`tab ${mode === m ? 'active' : ''}`}
            onClick={() => setMode(m)}
          >
            {m === 'arrivals' ? 'Arrivals' : 'Departures'} <span className="count">{counts[m]}</span>
          </button>
        ))}
        <div className="seg airport-seg" role="radiogroup" aria-label="Airport">
          {(['POS', 'TAB', 'ALL'] as const).map((a) => (
            <button key={a} role="radio" aria-checked={airport === a} className={airport === a ? 'on' : ''} onClick={() => setAirport(a)}>
              {a === 'ALL' ? 'Both' : a}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-row">
        <label className="search">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
          <input
            ref={searchRef}
            type="search"
            aria-label="Search flights"
            placeholder={isArrival ? 'Flight, airline or origin' : 'Flight, airline or destination'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setQuery('');
                e.currentTarget.blur();
              }
            }}
          />
          <kbd aria-hidden="true">/</kbd>
        </label>
        <div className="chips" role="group" aria-label="Filter">
          {CHIPS.map((c) => (
            <button key={c.k} className={`chip ${chip === c.k ? 'on' : ''}`} aria-pressed={chip === c.k} onClick={() => setChip(c.k)}>
              {c.l}
            </button>
          ))}
          <button
            className={`chip chip-star ${watchOnly ? 'on' : ''}`}
            aria-pressed={watchOnly}
            onClick={() => setWatchOnly(!watchOnly)}
            title="Only flights you are watching"
          >
            ★ Watching{watchlist.length ? ` ${watchlist.length}` : ''}
          </button>
        </div>
      </div>

      {source === 'demo' && (
        <div className="banner" role="status">
          Live schedule unavailable — showing illustrative demo flights.
        </div>
      )}

      <div className="board-head" aria-hidden="true">
        <span />
        <span>Flight</span>
        <span>{isArrival ? 'From' : 'To'}</span>
        <span>{isArrival ? 'Arr' : 'Dep'}</span>
        <span>Gate</span>
        <span>Status</span>
      </div>
      <div className="board" ref={listRef} onKeyDown={onListKeyDown}>
        {source === 'loading' && rows.length === 0 && <div className="empty">Loading flights…</div>}
        {source !== 'loading' && rows.length === 0 && (
          <div className="empty">
            {watchOnly ? 'No watched flights here. Star a flight to follow it.' : 'No flights match.'}
            {(query || chip !== 'all' || watchOnly) && (
              <button
                className="link-btn"
                onClick={() => {
                  setQuery('');
                  setChip('all');
                  setWatchOnly(false);
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
        {rows.map((f, i) => {
          const status = statusLabel(f, mode);
          const other = otherEnd(f, mode);
          const times = boardTimes(f, mode);
          const starred = watchlist.includes(f.id);
          const gate = isArrival ? f.gateArr : f.gateDep;
          const showProgress = isArrival && f.pos && isAirborne(f);
          return (
            <div key={f.key} className="row-wrap">
              {i === nowIndex && (
                <div className="now-divider" ref={nowRowRef}>
                  <span>Now · {formatHM(now)}</span>
                </div>
              )}
              <div
                className={`row ${f.key === selectedKey ? 'selected' : ''} ${f.key === hoveredKey ? 'hovered' : ''} ${
                  f.status === 'canceled' ? 'canceled' : ''
                }`}
                onMouseEnter={() => onHover(f.key)}
                onMouseLeave={() => onHover(null)}
              >
                <button
                  className={`star ${starred ? 'on' : ''}`}
                  aria-pressed={starred}
                  aria-label={`${starred ? 'Stop watching' : 'Watch'} ${f.id}`}
                  onClick={() => toggleWatch(f.id)}
                >
                  ★
                </button>
                <button className="row-main" aria-current={f.key === selectedKey} onClick={() => onSelect(f.key)}>
                  <span className="flt">
                    <span className="mono">{f.id}</span>
                    <span className="sub">{f.airline}</span>
                  </span>
                  <span className="place">
                    <span className="city">{other.city}</span>
                    <span className="sub mono">
                      {isArrival ? `${other.code} → ${homeEnd(f, mode)}` : `${homeEnd(f, mode)} → ${other.code}`}
                      {f.type && ` · ${f.type}`}
                    </span>
                  </span>
                  <TimeCell sched={times.sched} est={times.est} now={now} />
                  <span className="gate mono">{gate ?? '—'}</span>
                  <span>
                    <span className={`status tone-${status.tone}`}>{status.text}</span>
                    {f.pos?.live && <span className="live-tag" title="Live ADS-B position">ADS-B</span>}
                  </span>
                  {showProgress && (
                    <span className="progress" aria-hidden="true">
                      <span className="fill" style={{ width: `${Math.round((f.pos?.progress ?? 0) * 100)}%` }} />
                    </span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
        {nowIndex === -1 && rows.length > 0 && (
          <div className="now-divider" ref={nowRowRef}>
            <span>Now · {formatHM(now)}</span>
          </div>
        )}
      </div>
    </section>
  );
}
