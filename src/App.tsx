import { useEffect, useMemo, useRef, useState } from 'react';
import type { Flight, LatLon } from './data/types';
import { AIRPORTS, APRON_OFFSETS, HOME_AIRPORTS } from './data/airports';
import { FLIGHTS } from './data/flights';
import { mapAeroApiToFlights } from './data/scheduleFeed';
import { bearingBetween, apronSlot, clamp, distanceNm } from './lib/geo';
import { greatCircleBearingAt, greatCirclePointAt } from './lib/greatCircle';
import Ticker from './components/Ticker';
import Header from './components/Header';
import Scrubber from './components/Scrubber';
import TweaksPanel, { type TweakState } from './components/TweaksPanel';
import MapCanvas, { type MapCanvasHandle } from './components/MapCanvas';
import Board from './components/Board';
import DetailDrawer from './components/Detail';

function isHomeAirport(code: string): boolean {
  return HOME_AIRPORTS.includes(code);
}

function routeHeadingFor(f: Flight, point: LatLon = f): number {
  const origin = AIRPORTS[f.origin];
  const dest = AIRPORTS[f.dest];
  const target = isHomeAirport(f.dest) ? dest : dest || origin || AIRPORTS.POS;
  if (f.alt < 500 && origin && target) return bearingBetween(origin, target);
  return bearingBetween(point, target) || f.hdg || 0;
}

function metersToFeet(m: number | null): number {
  return m != null ? Math.round(m * 3.28084) : 0;
}
function msToKnots(ms: number | null): number {
  return ms != null ? Math.round(ms * 1.94384) : 0;
}

function openSkyToFlight(sv: unknown[]): Flight | null {
  const callsign = ((sv[1] as string) || '').trim();
  const lon = sv[5] as number;
  const lat = sv[6] as number;
  const altM = sv[7] as number | null;
  const onGround = sv[8] as boolean;
  const velMs = sv[9] as number | null;
  const hdg = (sv[10] as number) != null ? (sv[10] as number) : 0;
  const vRateMs = (sv[11] as number) || 0;
  if (!lat || !lon || !callsign) return null;
  const altFt = metersToFeet(altM);
  const spd = msToKnots(velMs);
  let track: Flight['track'] = 'cruise';
  if (onGround) track = 'ground';
  else if (vRateMs < -2) track = 'descending';
  else if (vRateMs > 2) track = 'climbing';
  const staticMatch = FLIGHTS.find((f) => f.id.trim() === callsign);
  return {
    id: callsign,
    airline: staticMatch ? staticMatch.airline : callsign.slice(0, 2) || '??',
    type: staticMatch ? staticMatch.type : '???',
    origin: staticMatch ? staticMatch.origin : '???',
    dest: staticMatch ? staticMatch.dest : '???',
    status: onGround ? 'taxi' : 'enroute',
    eta: staticMatch ? staticMatch.eta : '--:--',
    dep: staticMatch ? staticMatch.dep : '--:--',
    gate: staticMatch ? staticMatch.gate : '—',
    lat,
    lon,
    alt: altFt,
    spd,
    hdg,
    track,
    dist: staticMatch ? staticMatch.dist : 0,
    delay: staticMatch ? staticMatch.delay : 0,
    routeProgress: staticMatch ? staticMatch.routeProgress : onGround ? 0 : 0.5,
    _live: true,
  };
}

function buildGroundIndex(flights: Flight[]): Map<string, number> {
  const counters: Record<string, number> = {};
  const map = new Map<string, number>();
  flights.forEach((f) => {
    if (f.alt < 500) {
      const homeCode = isHomeAirport(f.origin) ? f.origin : f.dest;
      const idx = counters[homeCode] ?? 0;
      map.set(f.id, idx);
      counters[homeCode] = idx + 1;
    }
  });
  return map;
}

function isAirborne(f: Flight): boolean {
  if (f.alt >= 500) return true;
  if (f.track === 'climbing' || f.track === 'cruise' || f.track === 'descending') return true;
  if (f.status === 'enroute') return true;
  return false;
}

function flightOnRoute(f: Flight, tick: number, scrub: number, groundIndex: Map<string, number>): Flight {
  const origin = AIRPORTS[f.origin];
  const dest = AIRPORTS[f.dest];
  if (!origin || !dest) return f;

  const airborne = isAirborne(f);
  const baseProgress = f.routeProgress ?? (airborne ? 0.75 : (isHomeAirport(f.origin) ? 0 : 1));
  const routeNm = distanceNm(origin, dest);
  const minutes = scrub + (tick % 30) * 0.2;
  const progressRate = routeNm > 0 && f.spd > 0 ? f.spd / 60 / routeNm : 0;
  const progress = clamp(baseProgress + minutes * progressRate, 0, 1);

  if (!airborne) {
    const homeCode = isHomeAirport(f.origin) ? f.origin : f.dest;
    const apronBase = APRON_OFFSETS[homeCode] ?? AIRPORTS[homeCode];
    const idx = groundIndex.get(f.id) ?? 0;
    const point = apronSlot(apronBase, idx);
    const hdg = routeHeadingFor(f, point);
    return { ...f, lat: point.lat, lon: point.lon, hdg, routeProgress: progress };
  }

  const point = greatCirclePointAt(origin, dest, progress);
  const hdg = greatCircleBearingAt(origin, dest, progress);
  return { ...f, lat: point.lat, lon: point.lon, hdg, routeProgress: progress };
}

function nowClock(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export default function App() {
  const [selectedId, setSelectedId] = useState('BW523');
  const [mode, setMode] = useState<'arrivals' | 'departures'>('arrivals');
  const [watchlist, setWatchlist] = useState<Set<string>>(() => new Set(['BW523']));
  const [query, setQuery] = useState('');
  const [showWatchOnly, setShowWatchOnly] = useState(false);
  const [scrub, setScrub] = useState(0);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tweakState, setTweakState] = useState<TweakState>({
    mapStyle: 'radar',
    trails: true,
    labels: true,
    density: 'comfy',
    charter: true,
    followSelected: false,
  });
  const [clock, setClock] = useState(() => nowClock());
  const [detailOpen, setDetailOpen] = useState(true);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [sheetOffset, setSheetOffset] = useState(0);
  const touchStartY = useRef(0);
  const touchStartExpanded = useRef(false);
  const isDragging = useRef(false);
  const [openSkyFlights, setOpenSkyFlights] = useState<Flight[]>([]);
  const [openSkyStatus, setOpenSkyStatus] = useState('idle');
  const openSkyConnected = useRef(false);
  const [tick, setTick] = useState(0);

  const mapRef = useRef<MapCanvasHandle>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setClock(nowClock()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const URL = 'https://opensky.gregstack.xyz/api/opensky';
    const fetchFlights = () => {
      if (!openSkyConnected.current) setOpenSkyStatus('loading');
      fetch(URL)
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.json();
        })
        .then((data) => {
          const flights = ((data.states || []) as unknown[][]).map(openSkyToFlight).filter((f): f is Flight => f !== null);
          setOpenSkyFlights(flights);
          openSkyConnected.current = true;
          setOpenSkyStatus('ok');
        })
        .catch((err) => {
          console.warn('OpenSky fetch failed:', err);
          if (!openSkyConnected.current) setOpenSkyStatus('error');
        });
    };
    fetchFlights();
    const i = setInterval(fetchFlights, 90000); // 90s: 960 calls/day * 2 credits = 1,920, well under the 4,000/day authenticated cap
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1200);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (selectedId) {
      document.title = `${selectedId} — Piarco Live`;
    } else {
      document.title = 'T&T Flight Board · Live Tracker';
    }
  }, [selectedId]);

  const [scheduleFlights, setScheduleFlights] = useState<Flight[]>([]);
  const [scheduleStatus, setScheduleStatus] = useState('idle');

  useEffect(() => {
    const fetchSchedule = () => {
      setScheduleStatus('loading');
      Promise.all([
        fetch('/api/schedule?airport=POS').then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
        fetch('/api/schedule?airport=TAB').then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
      ])
        .then(([pos, tab]) => {
          setScheduleFlights([...mapAeroApiToFlights(pos, 'POS'), ...mapAeroApiToFlights(tab, 'TAB')]);
          setScheduleStatus('ok');
        })
        .catch((err) => {
          console.warn('Schedule fetch failed:', err);
          setScheduleStatus('error');
        });
    };
    fetchSchedule();
    const i = setInterval(fetchSchedule, 5 * 60 * 1000); // 5 min — schedule data changes slowly, AeroAPI $5/mo credit covers this easily
    return () => clearInterval(i);
  }, []);

  const liveFlights = useMemo(() => {
    const baseFlights = scheduleStatus === 'ok' && scheduleFlights.length > 0 ? scheduleFlights : FLIGHTS;
    const liveMap = new Map(openSkyFlights.map((f) => [f.id, f]));
    const staticIds = new Set(baseFlights.map((f) => f.id));
    const groundIndex = buildGroundIndex(baseFlights);
    const merged = baseFlights.map((f) => {
      const live = liveMap.get(f.id);
      if (live && f.status !== 'scheduled' && f.status !== 'landed') {
        return flightOnRoute({ ...f, lat: live.lat, lon: live.lon, alt: live.alt, spd: live.spd, hdg: live.hdg, track: live.track }, tick, scrub, groundIndex);
      }
      return flightOnRoute(f, tick, scrub, groundIndex);
    });
    openSkyFlights.forEach((f) => {
      if (!staticIds.has(f.id)) merged.push(flightOnRoute(f, tick, scrub, groundIndex));
    });
    return merged.filter((f) => tweakState.charter || f.airline !== 'Island Charter');
  }, [tick, scrub, tweakState.charter, openSkyFlights, scheduleFlights, scheduleStatus]);

  const toggleWatch = (id: string) => {
    setWatchlist((w) => {
      const n = new Set(w);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const onSelect = (id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
    const f = liveFlights.find((x) => x.id === id);
    if (f) setMode(isHomeAirport(f.dest) ? 'arrivals' : 'departures');
  };

  const onBoardSelect = (id: string) => {
    onSelect(id);
    const f = liveFlights.find((x) => x.id === id);
    if (f) mapRef.current?.centerOn({ lat: f.lat, lon: f.lon });
  };

  const selected = liveFlights.find((f) => f.id === selectedId);

  useEffect(() => {
    if (!tweakState.followSelected || !selected) return;
    mapRef.current?.centerOn({ lat: selected.lat, lon: selected.lon });
  }, [tweakState.followSelected, selected]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (isTyping) return;
      if (e.key === 'a') setMode('arrivals');
      else if (e.key === 'd') setMode('departures');
      else if (e.key === 'r') mapRef.current?.recenter();
      else if (e.key === 't') mapRef.current?.showAtlantic();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 800;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    touchStartY.current = e.touches[0].clientY;
    touchStartExpanded.current = sheetExpanded;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isDragging.current) return;
    const dy = touchStartY.current - e.touches[0].clientY;
    const clamped = Math.max(-200, Math.min(600, dy));
    setSheetOffset(clamped);
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    const threshold = 60;
    if (touchStartExpanded.current) {
      setSheetExpanded(sheetOffset < -threshold);
    } else {
      setSheetExpanded(sheetOffset > threshold);
    }
    isDragging.current = false;
    setSheetOffset(0);
  };

  return (
    <div className="app">
      <Ticker flights={liveFlights} />
      <Header clock={clock} openSkyStatus={openSkyStatus} />
      <div className="main">
        <MapCanvas
          ref={mapRef}
          flights={liveFlights}
          selectedId={selectedId}
          onSelect={onSelect}
          showTrails={tweakState.trails}
          mapStyle={tweakState.mapStyle}
          hoveredId={hoveredId}
          onHoverFlight={setHoveredId}
        />
        <div
          className={`right-col ${detailOpen && selected ? 'detail-open' : ''} ${sheetExpanded ? 'sheet-expanded' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={isDragging.current ? { transition: 'none', transform: `translateY(${-sheetOffset}px)` } : undefined}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('.panel-tabs') && window.innerWidth <= 800) {
              setSheetExpanded((v) => !v);
            }
          }}
        >
          <Board
            flights={liveFlights}
            mode={mode}
            setMode={setMode}
            selectedId={selectedId}
            onSelect={onBoardSelect}
            watchlist={watchlist}
            toggleWatch={toggleWatch}
            query={query}
            setQuery={setQuery}
            showWatchOnly={showWatchOnly}
            setShowWatchOnly={setShowWatchOnly}
            hoveredId={hoveredId}
            onHoverFlight={setHoveredId}
            searchInputRef={searchInputRef}
          />
          {detailOpen && selected && <DetailDrawer flight={selected} onClose={() => setDetailOpen(false)} />}
        </div>
      </div>
      <Scrubber value={scrub} setValue={setScrub} clock={clock} />
      <TweaksPanel open={tweaksOpen} state={tweakState} setState={setTweakState} />
    </div>
  );
}
