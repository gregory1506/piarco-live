// App.jsx - root. Wires together map, board, detail, scrubber, tweaks.
const { useEffect: useEffectA, useState: useStateA, useMemo: useMemoA, useRef: useRefA } = React;

const TICKER = [
  ['ARRIVED', 'BW523 ex JFK', 'On stand G7', 'up'],
  ['DEP', 'BW800 to YYZ', '14:10 on time', 'up'],
  ['DELAY', 'KL771 ex AMS', '+14 min', 'down'],
  ['WX', 'TTPP 24°C · 09kt', 'VIS 10SM', ''],
  ['NOTAM', 'RWY 10/28', 'normal ops', ''],
  ['ARR', 'CM472 ex PTY', 'ETA 14:18', 'up'],
  ['DEP', 'BW415 to BGI', 'airborne', 'up'],
  ['DELAY', 'JY311 ex UVF', '+22 min', 'down'],
];

function bearingBetween(a, b) {
  if (!a || !b) return 0;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distanceNm(a, b) {
  if (!a || !b) return 0;
  const rNm = 3440.065;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const dLat = lat2 - lat1;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * rNm * Math.asin(Math.sqrt(h));
}

function routeControlPoint(origin, dest) {
  const mid = { lat: (origin.lat + dest.lat) / 2, lon: (origin.lon + dest.lon) / 2 };
  const dLat = dest.lat - origin.lat;
  const dLon = dest.lon - origin.lon;
  const span = Math.hypot(dLat, dLon);
  if (!span) return mid;
  const longHaul = span > 20;
  const lift = clamp(span * (longHaul ? 0.10 : 0.16), 0.18, longHaul ? 6 : 1.2);
  const northBias = longHaul ? lift * 0.75 : lift * 0.35;
  return {
    lat: mid.lat + (-dLon / span) * lift + northBias,
    lon: mid.lon + (dLat / span) * lift * 0.55
  };
}

function routePointAt(origin, control, dest, t) {
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  return {
    lat: a * origin.lat + b * control.lat + c * dest.lat,
    lon: a * origin.lon + b * control.lon + c * dest.lon
  };
}

function routeTangentAt(origin, control, dest, t) {
  return {
    lat: 2 * (1 - t) * (control.lat - origin.lat) + 2 * t * (dest.lat - control.lat),
    lon: 2 * (1 - t) * (control.lon - origin.lon) + 2 * t * (dest.lon - control.lon)
  };
}

function routeTargetFor(f) {
  const dest = AIRPORTS[f.dest];
  const origin = AIRPORTS[f.origin];
  if (f.dest === 'POS') return dest;
  return dest || origin || AIRPORTS.POS;
}

function routeHeadingFor(f, point = f) {
  const origin = AIRPORTS[f.origin];
  const target = routeTargetFor(f);
  if (f.alt < 500 && origin && target) return bearingBetween(origin, target);
  return bearingBetween(point, target) || f.hdg || 0;
}

function flightOnRoute(f, tick, scrub) {
  const origin = AIRPORTS[f.origin];
  const dest = routeTargetFor(f);
  if (!origin || !dest) return f;
  const baseProgress = f.routeProgress ?? (f.alt < 500 ? (f.origin === 'POS' ? 0 : 1) : 0.75);
  const routeNm = distanceNm(origin, dest);
  const minutes = scrub + (tick % 30) * 0.2;
  const progressRate = routeNm > 0 && f.spd > 0 ? f.spd / 60 / routeNm : 0;
  const progress = clamp(baseProgress + minutes * progressRate, 0, 1);
  const control = routeControlPoint(origin, dest);
  const point = f.alt < 500 ? (f.origin === 'POS' ? origin : dest) : routePointAt(origin, control, dest, progress);
  const tangent = routeTangentAt(origin, control, dest, progress);
  const hdg = f.alt < 500 ? routeHeadingFor(f, point) : bearingBetween(point, {
    lat: point.lat + tangent.lat,
    lon: point.lon + tangent.lon
  });
  return { ...f, lat: point.lat, lon: point.lon, hdg, routeProgress: progress };
}

function Ticker() {
  const items = [...TICKER, ...TICKER];
  return (
    <div className="ticker">
      <div className="ticker-label">TTPP · LIVE</div>
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

function Header({ clock }) {
  return (
    <div className="header">
      <div className="brand">
        <div className="brand-mark">PO</div>
        <div>
          <div className="brand-title">Piarco Live</div>
          <div className="brand-sub">TTPP · Port of Spain</div>
        </div>
      </div>
      <div className="header-center">
        <div className="metar-strip">
          <span className="tag mono">METAR TTPP</span>
          <span className="metar-item"><span className="k">Temp</span><span className="v mono">24°C</span></span>
          <span className="metar-item"><span className="k">Wind</span><span className="v mono">090° / 09kt</span></span>
          <span className="metar-item"><span className="k">Vis</span><span className="v mono">10SM</span></span>
          <span className="metar-item"><span className="k">Clouds</span><span className="v mono">SCT024</span></span>
          <span className="metar-item"><span className="k">QNH</span><span className="v mono">1014</span></span>
          <span className="metar-item"><span className="k">Dew</span><span className="v mono">21°C</span></span>
          <span className="metar-item"><span className="k">Rwy</span><span className="v mono">10 active</span></span>
        </div>
      </div>
      <div className="header-right">
        <div className="live-dot"></div>
        <span>LIVE</span>
        <span className="mute">·</span>
        <span className="clock mono">{clock}</span>
        <span className="mute">AST</span>
      </div>
    </div>
  );
}

function Scrubber({ value, setValue, clock }) {
  // -120 .. +120 min from now
  const label = (v) => {
    if (v === 0) return 'NOW';
    const sign = v > 0 ? '+' : '−';
    const abs = Math.abs(v);
    const h = Math.floor(abs/60), m = abs%60;
    return sign + (h? h+'h ':'') + m + 'm';
  };
  const ticks = [-120,-60,0,60,120];
  return (
    <div className="footer">
      <div className="footer-left">
        <b>Timeline</b>
        <span className="mono">{clock}</span>
      </div>
      <div className="scrub">
        <div className="scrub-track">
          <div className="scrub-now" style={{left:'50%'}}></div>
          <div className="scrub-handle" style={{left: ((value+120)/240*100)+'%'}}></div>
          <input className="scrub-input" type="range" min="-120" max="120" step="5" value={value}
            onChange={(e) => setValue(parseInt(e.target.value))} />
          <div className="scrub-ticks">
            {ticks.map(t => <span key={t}>{t===0?'NOW':(t>0?'+'+t+'m':t+'m')}</span>)}
          </div>
        </div>
      </div>
      <div className="scrub-label mono">{label(value)}</div>
    </div>
  );
}

function TweaksPanel({ open, state, setState }) {
  const set = (k, v) => setState(s => ({...s, [k]: v}));
  return (
    <div className={`tweaks ${open?'open':''}`}>
      <h4>Display</h4>
      <div className="row-t">
        <span>Map style</span>
        <div className="seg">
          <button className={state.mapStyle==='radar'?'on':''} onClick={()=>set('mapStyle','radar')}>Radar</button>
          <button className={state.mapStyle==='chart'?'on':''} onClick={()=>set('mapStyle','chart')}>Chart</button>
        </div>
      </div>
      <div className="row-t">
        <span>Flight trails</span>
        <button className={`toggle ${state.trails?'on':''}`} onClick={()=>set('trails', !state.trails)} />
      </div>
      <div className="row-t">
        <span>Show labels</span>
        <button className={`toggle ${state.labels?'on':''}`} onClick={()=>set('labels', !state.labels)} />
      </div>
      <div className="row-t">
        <span>Density</span>
        <div className="seg">
          <button className={state.density==='comfy'?'on':''} onClick={()=>set('density','comfy')}>Comfy</button>
          <button className={state.density==='dense'?'on':''} onClick={()=>set('density','dense')}>Dense</button>
        </div>
      </div>
      <h4 style={{marginTop:10}}>Data</h4>
      <div className="row-t">
        <span>Include cargo</span>
        <button className={`toggle ${state.cargo?'on':''}`} onClick={()=>set('cargo', !state.cargo)} />
      </div>
      <div className="row-t">
        <span>Include charter</span>
        <button className={`toggle ${state.charter?'on':''}`} onClick={()=>set('charter', !state.charter)} />
      </div>
    </div>
  );
}

function App() {
  const [selectedId, setSelectedId] = useStateA('BW523');
  const [mode, setMode] = useStateA('arrivals');
  const [watchlist, setWatchlist] = useStateA(() => new Set(['BW523']));
  const [query, setQuery] = useStateA('');
  const [showWatchOnly, setShowWatchOnly] = useStateA(false);
  const [scrub, setScrub] = useStateA(0);
  const [tweaksOpen, setTweaksOpen] = useStateA(false);
  const [tweakState, setTweakState] = useStateA({
    mapStyle: 'radar', trails: true, labels: true, density: 'comfy', cargo: false, charter: true
  });
  const [clock, setClock] = useStateA(() => nowClock());
  const [detailOpen, setDetailOpen] = useStateA(true);

  useEffectA(() => {
    const t = setInterval(() => setClock(nowClock()), 1000);
    return () => clearInterval(t);
  }, []);

  // Subtle position drift for airborne aircraft — makes it feel live.
  const [tick, setTick] = useStateA(0);
  useEffectA(() => {
    const i = setInterval(() => setTick(t => t + 1), 1200);
    return () => clearInterval(i);
  }, []);

  const liveFlights = useMemoA(() => {
    return FLIGHTS.map(f => {
      return flightOnRoute(f, tick, scrub);
    }).filter(f => tweakState.charter || f.airline !== 'Piarco Charter');
  }, [tick, scrub, tweakState.charter]);

  const toggleWatch = (id) => {
    setWatchlist(w => {
      const n = new Set(w);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const onSelect = (id) => {
    setSelectedId(id);
    setDetailOpen(true);
    // auto-switch board tab to match
    const f = liveFlights.find(x => x.id === id);
    if (f) setMode(f.dest === 'POS' ? 'arrivals' : 'departures');
  };

  const selected = liveFlights.find(f => f.id === selectedId);

  // Edit mode / Tweaks integration
  useEffectA(() => {
    const onMsg = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({type:'__edit_mode_available'}, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  return (
    <div className="app">
      <Ticker />
      <Header clock={clock} />
      <div className="main">
        <MapCanvas
          flights={liveFlights}
          selectedId={selectedId}
          onSelect={onSelect}
          showTrails={tweakState.trails}
          mapStyle={tweakState.mapStyle}
        />
        <div className={`right-col ${detailOpen && selected ? 'detail-open' : ''}`}>
          <Board
            flights={liveFlights}
            mode={mode} setMode={setMode}
            selectedId={selectedId} onSelect={onSelect}
            watchlist={watchlist} toggleWatch={toggleWatch}
            query={query} setQuery={setQuery}
            showWatchOnly={showWatchOnly} setShowWatchOnly={setShowWatchOnly}
          />
          {detailOpen && selected && <DetailDrawer flight={selected} onClose={() => setDetailOpen(false)} />}
        </div>
      </div>
      <Scrubber value={scrub} setValue={setScrub} clock={clock} />
      <TweaksPanel open={tweaksOpen} state={tweakState} setState={setTweakState} />
    </div>
  );
}

function nowClock() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

window.App = App;
