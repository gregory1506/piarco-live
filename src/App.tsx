import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isHomeAirport } from './data/airports';
import { useFlightData } from './hooks/useFlightData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useNow } from './hooks/useNow';
import { placeFlights } from './lib/positions';
import { DEFAULT_SETTINGS, type Settings } from './lib/settings';
import { MINUTE } from './lib/time';
import type { AirportFilter, BoardMode } from './lib/flights';
import Ticker from './components/Ticker';
import Header from './components/Header';
import Scrubber from './components/Scrubber';
import SettingsPanel from './components/SettingsPanel';
import MapCanvas, { type MapCanvasHandle } from './components/MapCanvas';
import Board from './components/Board';
import Detail from './components/Detail';

/** How often aircraft positions are recomputed. */
const POSITION_TICK_MS = 5_000;
const BASE_TITLE = 'T&T Flight Board · Live Tracker';

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

export default function App() {
  const data = useFlightData();
  const now = useNow(POSITION_TICK_MS);
  const isMobile = useMediaQuery('(max-width: 800px)');

  const [settings, setSettings] = useLocalStorage<Settings>('piarco.settings', DEFAULT_SETTINGS);
  const [watchlist, setWatchlist] = useLocalStorage<string[]>('piarco.watchlist', []);
  const [airport, setAirport] = useLocalStorage<AirportFilter>('piarco.airport', 'ALL');
  const [mode, setMode] = useState<BoardMode>('arrivals');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [watchOnly, setWatchOnly] = useState(false);
  const [scrub, setScrub] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [follow, setFollow] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const mapRef = useRef<MapCanvasHandle>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const resolved = { ...DEFAULT_SETTINGS, ...settings };

  const placed = useMemo(() => {
    const visible = data.flights.filter(
      (f) => (resolved.nonPassenger || f.passenger) && (resolved.traffic || f.kind === 'scheduled' || f.key === selectedKey),
    );
    return placeFlights(visible, now + scrub * MINUTE);
  }, [data.flights, resolved.nonPassenger, resolved.traffic, selectedKey, now, scrub]);

  const selected = selectedKey ? placed.find((f) => f.key === selectedKey) : undefined;

  const select = useCallback(
    (key: string | null) => {
      setSelectedKey(key);
      if (!key) {
        setFollow(false);
        return;
      }
      const f = placed.find((x) => x.key === key);
      if (f?.kind === 'scheduled') setMode(isHomeAirport(f.dest) ? 'arrivals' : 'departures');
    },
    [placed],
  );

  const selectFromBoard = (key: string) => {
    select(key);
    const f = placed.find((x) => x.key === key);
    if (f?.pos) mapRef.current?.centerOn(f.pos);
  };

  const toggleWatch = useCallback(
    (id: string) => setWatchlist((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id])),
    [setWatchlist],
  );

  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  useEffect(() => {
    if (follow && selected?.pos) mapRef.current?.centerOn(selected.pos);
  }, [follow, selected?.pos]);

  useEffect(() => {
    document.title = selected ? `${selected.id} · ${selected.originCity || ''} → ${selected.destCity || ''} — T&T Flight Board` : BASE_TITLE;
  }, [selected]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') {
        if (settingsOpen) setSettingsOpen(false);
        else if (selectedKey) select(null);
        else if (sheetExpanded) setSheetExpanded(false);
        return;
      }
      if (isTypingTarget(e.target)) return;
      switch (e.key) {
        case '/':
          e.preventDefault();
          if (isMobile) setSheetExpanded(true);
          searchRef.current?.focus();
          break;
        case 'a':
          setMode('arrivals');
          break;
        case 'd':
          setMode('departures');
          break;
        case 'r':
          mapRef.current?.recenter();
          break;
        case 'w':
          mapRef.current?.showAtlantic();
          break;
        case 'f':
          if (selected?.pos) setFollow((v) => !v);
          break;
        case 'n':
          setScrub(0);
          break;
        case '?':
          setSettingsOpen((v) => !v);
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [settingsOpen, selectedKey, selected?.pos, sheetExpanded, isMobile, select]);

  const detail = selected && (
    <Detail
      flight={selected}
      now={now}
      watched={watchlist.includes(selected.id)}
      toggleWatch={toggleWatch}
      onClose={() => select(null)}
      onCenter={() => selected.pos && mapRef.current?.centerOn(selected.pos)}
      follow={follow}
      setFollow={setFollow}
    />
  );

  return (
    <div className={`app density-${resolved.density}`}>
      <Ticker flights={placed} metars={data.metars} />
      <Header
        metars={data.metars}
        metarStatus={data.metarStatus}
        source={data.source}
        scheduleUpdatedAt={data.scheduleUpdatedAt}
        adsb={data.adsb}
        onOpenSettings={() => setSettingsOpen((v) => !v)}
        settingsOpen={settingsOpen}
      />
      <main className="main">
        <MapCanvas
          ref={mapRef}
          flights={placed}
          selectedKey={selectedKey}
          hoveredKey={hoveredKey}
          onSelect={select}
          onHover={setHoveredKey}
          settings={resolved}
        />
        <div className={`side ${sheetExpanded ? 'expanded' : ''} ${selected ? 'has-detail' : ''}`}>
          {isMobile && (
            <button
              className="sheet-handle"
              aria-label={sheetExpanded ? 'Collapse flight board' : 'Expand flight board'}
              aria-expanded={sheetExpanded}
              onClick={() => setSheetExpanded((v) => !v)}
            >
              <span />
            </button>
          )}
          <Board
            flights={placed}
            source={data.source}
            now={now}
            mode={mode}
            setMode={(m) => {
              setMode(m);
              if (isMobile) setSheetExpanded(true);
            }}
            airport={airport}
            setAirport={setAirport}
            selectedKey={selectedKey}
            onSelect={(key) => {
              selectFromBoard(key);
              if (isMobile) setSheetExpanded(false);
            }}
            hoveredKey={hoveredKey}
            onHover={setHoveredKey}
            watchlist={watchlist}
            toggleWatch={toggleWatch}
            query={query}
            setQuery={setQuery}
            watchOnly={watchOnly}
            setWatchOnly={setWatchOnly}
            searchRef={searchRef}
          />
          {!isMobile && detail}
        </div>
        {isMobile && detail && <div className="detail-sheet">{detail}</div>}
      </main>
      <Scrubber value={scrub} setValue={setScrub} now={now} />
      <SettingsPanel open={settingsOpen} onClose={closeSettings} settings={resolved} setSettings={setSettings} />
    </div>
  );
}
