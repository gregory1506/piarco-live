// MapCanvas.jsx - SVG map with Trinidad outline, radar rings, aircraft sprites
const { useEffect, useMemo, useRef, useState } = React;

// Simple equirectangular projection centered on Piarco
function makeProjection(center, zoom, w, h) {
  // deg per pixel — baseline ~ 0.004 deg/px at zoom 1
  const basePx = 0.0055;
  const scale = basePx / zoom;
  return {
    project(lat, lon) {
      const x = (lon - center.lon) / scale + w / 2;
      const y = -(lat - center.lat) / scale + h / 2;
      return [x, y];
    },
    unproject(x, y) {
      const lon = (x - w/2) * scale + center.lon;
      const lat = -(y - h/2) * scale + center.lat;
      return [lat, lon];
    },
    scale
  };
}

const MIN_ZOOM = 0.04;
const MAX_ZOOM = 8;

function clampMapValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mapRouteControlPoint(origin, dest) {
  const mid = { lat: (origin.lat + dest.lat) / 2, lon: (origin.lon + dest.lon) / 2 };
  const dLat = dest.lat - origin.lat;
  const dLon = dest.lon - origin.lon;
  const span = Math.hypot(dLat, dLon);
  if (!span) return mid;
  const longHaul = span > 20;
  const lift = clampMapValue(span * (longHaul ? 0.10 : 0.16), 0.18, longHaul ? 6 : 1.2);
  const northBias = longHaul ? lift * 0.75 : lift * 0.35;
  return {
    lat: mid.lat + (-dLon / span) * lift + northBias,
    lon: mid.lon + (dLat / span) * lift * 0.55
  };
}

function mapRoutePointAt(origin, control, dest, t) {
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  return {
    lat: a * origin.lat + b * control.lat + c * dest.lat,
    lon: a * origin.lon + b * control.lon + c * dest.lon
  };
}

function bearingScreen(a, b) {
  return (Math.atan2(b[0] - a[0], a[1] - b[1]) * 180 / Math.PI + 360) % 360;
}

function samplePolyline(points, t) {
  if (!points.length) return null;
  if (points.length === 1) return points[0];
  const segments = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segments.push({ a, b, len });
    total += len;
  }
  let remaining = clampMapValue(t, 0, 1) * total;
  for (const seg of segments) {
    if (remaining <= seg.len || seg === segments[segments.length - 1]) {
      const local = seg.len ? remaining / seg.len : 0;
      return {
        point: [
          seg.a[0] + (seg.b[0] - seg.a[0]) * local,
          seg.a[1] + (seg.b[1] - seg.a[1]) * local
        ],
        heading: bearingScreen(seg.a, seg.b)
      };
    }
    remaining -= seg.len;
  }
  return null;
}

function MapCanvas({ flights, selectedId, onSelect, showTrails, mapStyle }) {
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [center, setCenter] = useState({ lat: PIARCO.lat + 0.4, lon: PIARCO.lon });
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef(null);

  useEffect(() => {
    const el = wrapRef.current;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const proj = useMemo(() => makeProjection(center, zoom, size.w, size.h), [center, zoom, size]);

  // Pan
  const onMouseDown = (e) => { dragRef.current = { x: e.clientX, y: e.clientY, cx: center.lon, cy: center.lat }; };
  const onMouseMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setCenter({ lat: dragRef.current.cy + dy * proj.scale, lon: dragRef.current.cx - dx * proj.scale });
  };
  const onMouseUp = () => { dragRef.current = null; };

  // Wheel zoom
  const onWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1/1.12;
    setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor)));
  };

  // Landmass polygons (lat,lon → svg points)
  const toPoints = (poly) => (poly || [])
    .map(([la, lo]) => proj.project(la, lo))
    .map(p => p.join(','))
    .join(' ');
  const trini     = useMemo(() => toPoints(window.TRINIDAD_OUTLINE),  [proj]);
  const tobago    = useMemo(() => toPoints(window.TOBAGO_OUTLINE),    [proj]);
  const venezuela = useMemo(() => toPoints(window.VENEZUELA_OUTLINE), [proj]);
  const grenada   = useMemo(() => (window.GRENADA_OUTLINES || []).map(toPoints), [proj]);
  const regionalIslands = useMemo(() => (window.REGIONAL_ISLAND_OUTLINES || []).map(island => ({
    ...island,
    points: island.polygons.map(toPoints)
  })), [proj]);
  const worldContext = useMemo(() => (window.WORLD_CONTEXT_OUTLINES || []).map(country => ({
    ...country,
    points: country.polygons.map(toPoints)
  })), [proj]);
  const seaLanes = useMemo(() => (window.SEA_LANES || []).map(lane => ({
    ...lane,
    screenPoints: lane.points.map(([la, lo]) => proj.project(la, lo))
  })), [proj]);

  const [px, py] = proj.project(PIARCO.lat, PIARCO.lon);

  // Radar rings (at 50, 100, 200 nm from Piarco, ~1 nm ≈ 1/60 deg lat)
  const ringRadii = [50, 100, 200, 300]; // nm
  const nmToPx = (nm) => (nm / 60) / proj.scale;

  // Grid lines (half-degree)
  const gridLines = useMemo(() => {
    const lines = [];
    const [maxLat, minLon] = proj.unproject(0, 0);
    const [minLat, maxLon] = proj.unproject(size.w, size.h);
    const step = zoom < 0.08 ? 10 : zoom < 0.18 ? 5 : zoom < 0.7 ? 1 : 0.5;
    const startLa = Math.floor(minLat / step) * step;
    const endLa = Math.ceil(maxLat / step) * step;
    for (let la = startLa; la <= endLa; la += step) {
      const [x1, y1] = proj.project(la, minLon);
      const [x2, y2] = proj.project(la, maxLon);
      lines.push({ x1, y1, x2, y2, major: la % 1 === 0, label: la.toFixed(1) });
    }
    const startLo = Math.floor(minLon / step) * step;
    const endLo = Math.ceil(maxLon / step) * step;
    for (let lo = startLo; lo <= endLo; lo += step) {
      const [x1, y1] = proj.project(minLat, lo);
      const [x2, y2] = proj.project(maxLat, lo);
      lines.push({ x1, y1, x2, y2, major: lo % 1 === 0, label: lo.toFixed(1) });
    }
    return lines;
  }, [proj, size, zoom]);

  const zoomIn = () => setZoom(z => Math.min(MAX_ZOOM, z * 1.4));
  const zoomOut = () => setZoom(z => Math.max(MIN_ZOOM, z / 1.4));
  const recenter = () => { setCenter({ lat: PIARCO.lat + 0.4, lon: PIARCO.lon }); setZoom(1); };
  const showAtlantic = () => { setCenter({ lat: 28, lon: -48 }); setZoom(0.05); };

  // Stats
  const stats = useMemo(() => {
    const airborne = flights.filter(f => f.alt > 500).length;
    const ground = flights.length - airborne;
    const inbound = flights.filter(f => f.dest === 'POS').length;
    const outbound = flights.filter(f => f.origin === 'POS').length;
    return { airborne, ground, inbound, outbound };
  }, [flights]);

  return (
    <div ref={wrapRef} className="map-wrap">
      <svg
        id="map-svg"
        viewBox={`0 0 ${size.w} ${size.h}`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        <defs>
          <marker id="route-arrow-in" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L8,4 L0,8 L2.1,4 Z" fill="oklch(0.62 0.10 190)" opacity="0.8" />
          </marker>
          <marker id="route-arrow-out" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L8,4 L0,8 L2.1,4 Z" fill="oklch(0.70 0.12 75)" opacity="0.8" />
          </marker>
        </defs>
        {/* background ocean */}
        <rect width={size.w} height={size.h} fill="#0B0F12" />

        {/* grid */}
        <g opacity="0.35">
          {gridLines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                  stroke={l.major ? '#1E2630' : '#141A20'}
                  strokeWidth={l.major ? 0.5 : 0.3} />
          ))}
        </g>

        {/* radar rings */}
        <g opacity="0.6">
          {ringRadii.map(r => (
            <circle key={r} cx={px} cy={py} r={nmToPx(r)}
                    fill="none" stroke="#1E2630" strokeWidth="0.6"
                    strokeDasharray="3 4" />
          ))}
          {ringRadii.map(r => (
            <text key={'t'+r} x={px + nmToPx(r)} y={py - 3}
                  fontFamily="JetBrains Mono, monospace" fontSize="8.5"
                  fill="#566470" textAnchor="start">{r} nm</text>
          ))}
        </g>

        {/* crosshair */}
        <g opacity="0.35">
          <line x1={0} y1={py} x2={size.w} y2={py} stroke="#283241" strokeDasharray="1 4" strokeWidth="0.5" />
          <line x1={px} y1={0} x2={px} y2={size.h} stroke="#283241" strokeDasharray="1 4" strokeWidth="0.5" />
        </g>

        {/* Landmasses: Venezuela (context) rendered dimmer; Trinidad/Tobago/Grenada featured */}
        <g>
          {/* Wider Atlantic / Americas context for long-haul routes */}
          {worldContext.map(country => country.points.map((points, i) => (
            <polygon key={`${country.name}-${i}`} points={points} fill="#0E141A" stroke="#1F2A35" strokeWidth="0.55" opacity="0.7" />
          )))}
          {/* Venezuela + Orinoco delta */}
          <polygon points={venezuela} fill="#10161C" stroke="#23303C" strokeWidth="0.7" />
          {/* Grenada (north) */}
          {grenada.map((points, i) => (
            <polygon key={`grenada-${i}`} points={points} fill="#141A20" stroke="#2A3644" strokeWidth="0.7" />
          ))}
          {/* Regional islands in the wider flight area */}
          {regionalIslands.map(island => island.points.map((points, i) => (
            <polygon key={`${island.name}-${i}`} points={points} fill="#10161C" stroke="#26323F" strokeWidth="0.6" />
          )))}
          {/* Trinidad — primary focus */}
          <polygon points={trini} fill="#171F27" stroke="#38485A" strokeWidth="0.9" />
          <polygon points={trini} fill="none" stroke="oklch(0.60 0.09 190 / 0.55)" strokeWidth="0.5" />
          {/* Tobago */}
          <polygon points={tobago} fill="#171F27" stroke="#38485A" strokeWidth="0.9" />
          <polygon points={tobago} fill="none" stroke="oklch(0.60 0.09 190 / 0.55)" strokeWidth="0.5" />

          {/* Tiny isle dots */}
          {window.NEARBY_ISLES.map(isle => {
            const [cx, cy] = proj.project(isle.lat, isle.lon);
            const rpx = Math.max(1.5, isle.r / proj.scale);
            return (
              <g key={isle.name}>
                <circle cx={cx} cy={cy} r={rpx} fill="#141A20" stroke="#2A3644" strokeWidth="0.6" />
                <text x={cx + rpx + 3} y={cy + 3}
                  fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#566470">
                  {isle.name}
                </text>
              </g>
            );
          })}

          {/* Geographic labels */}
          {window.GEO_LABELS.map(l => {
            const [lx, ly] = proj.project(l.lat, l.lon);
            const color = l.kind === 'country' ? '#8A97A3'
                        : l.kind === 'sea'     ? '#4A5866'
                        : l.kind === 'city'    ? '#6B7988'
                        : '#5A6876';
            const weight = l.kind === 'country' ? 600 : 400;
            const ls = l.kind === 'sea' ? '0.24em' : l.kind === 'country' ? '0.2em' : '0.1em';
            const style = l.kind === 'sea' ? { fontStyle: 'italic' } : {};
            return (
              <text key={l.name} x={lx} y={ly}
                fontFamily={l.kind === 'city' ? 'JetBrains Mono, monospace' : 'Inter, sans-serif'}
                fontSize={l.size}
                fill={color}
                fontWeight={weight}
                letterSpacing={ls}
                textAnchor="middle"
                style={style}>
                {l.name}
              </text>
            );
          })}
        </g>

        {/* Piarco marker */}
        <g>
          <circle cx={px} cy={py} r="4" fill="oklch(0.75 0.12 190)" />
          <circle cx={px} cy={py} r="9" fill="none" stroke="oklch(0.75 0.12 190)" strokeWidth="0.8" opacity="0.6" />
          <text x={px + 10} y={py - 6} fontFamily="JetBrains Mono, monospace" fontSize="10" fill="oklch(0.75 0.12 190)" fontWeight="600">TTPP</text>
          <text x={px + 10} y={py + 5} fontFamily="JetBrains Mono, monospace" fontSize="8.5" fill="#8A97A3">PIARCO INTL</text>
        </g>

        {/* Maritime layer: Trinidad/Tobago ports, lanes, and vessels */}
        <g>
          {seaLanes.map(lane => (
            <polyline
              key={lane.id}
              points={lane.screenPoints.map(p => p.join(',')).join(' ')}
              fill="none"
              stroke="oklch(0.68 0.08 215)"
              strokeWidth="0.8"
              strokeDasharray="6 7"
              opacity="0.45"
            />
          ))}
          {(window.PORTS || []).map(port => {
            const [portX, portY] = proj.project(port.lat, port.lon);
            return (
              <g key={port.id}>
                <rect x={portX - 4} y={portY - 4} width="8" height="8"
                  fill="#0B0F12" stroke="oklch(0.72 0.09 215)" strokeWidth="1"
                  transform={`rotate(45 ${portX} ${portY})`} />
                <text x={portX + 8} y={portY - 6}
                  fontFamily="JetBrains Mono, monospace" fontSize="7.5"
                  fill="#5F7080" letterSpacing="0.08em">
                  {port.name.toUpperCase()}
                </text>
              </g>
            );
          })}
          {(window.SHIPS || []).map(ship => {
            const lane = seaLanes.find(l => l.id === ship.lane);
            if (!lane) return null;
            const drift = ((Date.now() / 1000) * 0.00008 * ship.speed) % 1;
            const sampled = samplePolyline(lane.screenPoints, (ship.progress + drift) % 1);
            if (!sampled) return null;
            const [sx, sy] = sampled.point;
            const color = ship.status === 'arrival' || ship.status === 'inbound'
              ? 'oklch(0.72 0.09 215)'
              : ship.type === 'ferry'
                ? 'oklch(0.78 0.10 150)'
                : 'oklch(0.70 0.12 75)';
            return (
              <g key={ship.id} transform={`translate(${sx},${sy}) rotate(${sampled.heading})`}>
                <path d="M0,-7 L5,4 L0,7 L-5,4 Z" fill={color} opacity="0.92" />
                <path d="M0,-7 L0,7" stroke="#071014" strokeWidth="0.8" opacity="0.7" />
                <circle r="11" fill="transparent" />
                <text x={10} y={3} transform={`rotate(${-sampled.heading})`}
                  fontFamily="JetBrains Mono, monospace" fontSize="8"
                  fill="#7F8D98">
                  {ship.id}
                </text>
              </g>
            );
          })}
        </g>

        {/* Flight trails + aircraft */}
        <g>
          {flights.filter(f => f.alt > 300).map(f => {
            const target = AIRPORTS[f.dest] || (f.dest === 'POS' ? PIARCO : null);
            const origin = AIRPORTS[f.origin];
            if (!origin || !target) return null;
            const control = mapRouteControlPoint(origin, target);
            const routeStart = proj.project(origin.lat, origin.lon);
            const routeControl = proj.project(control.lat, control.lon);
            const routeEnd = proj.project(target.lat, target.lon);
            const progress = clampMapValue(f.routeProgress ?? 0.5, 0, 1);
            const flownPoints = [];
            const steps = Math.max(6, Math.ceil(progress * 28));
            for (let i = 0; i <= steps; i++) {
              const t = progress * (i / steps);
              const pt = mapRoutePointAt(origin, control, target, t);
              flownPoints.push(proj.project(pt.lat, pt.lon).join(','));
            }
            const isOutb = f.origin === 'POS';
            const stroke = isOutb ? 'oklch(0.60 0.11 75)' : 'oklch(0.56 0.10 190)';
            return showTrails ? (
              <g key={'tr-'+f.id}>
                <path
                  d={`M ${routeStart[0]} ${routeStart[1]} Q ${routeControl[0]} ${routeControl[1]} ${routeEnd[0]} ${routeEnd[1]}`}
                  fill="none"
                  stroke={stroke}
                  strokeWidth="0.9"
                  strokeDasharray="3 6"
                  opacity="0.45"
                />
                <polyline
                  points={flownPoints.join(' ')}
                  fill="none"
                  stroke={stroke}
                  strokeWidth="1.25"
                  opacity="0.72"
                />
              </g>
            ) : null;
          })}
          {flights.map(f => {
            const [fx, fy] = proj.project(f.lat, f.lon);
            const isOutb = f.origin === 'POS';
            const isGround = f.alt < 500;
            const isDelay = f.delay >= 15;
            const isSelected = f.id === selectedId;
            const cls = ['ac'];
            if (isDelay) cls.push('delay');
            else if (isOutb) cls.push('outb');
            if (isGround) cls.push('ground');
            if (isSelected) cls.push('selected');
            const size = isSelected ? 8 : 6.5;
            return (
              <g key={f.id} className={cls.join(' ')}
                 transform={`translate(${fx},${fy}) rotate(${f.hdg})`}
                 onClick={(e) => { e.stopPropagation(); onSelect(f.id); }}>
                {isGround ? (
                  <circle r="3" className="ac-tri" />
                ) : (
                  <polygon
                    className="ac-tri"
                    points={`0,${-size} ${size*0.7},${size*0.7} 0,${size*0.35} ${-size*0.7},${size*0.7}`}
                  />
                )}
                <circle r="12" className="ac-hit" />
                <text className="ac-label" x={10} y={3} transform={`rotate(${-f.hdg})`}>{f.id}</text>
                {isSelected && (
                  <circle r={14} fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Chrome overlays */}
      <div className="map-chrome">
        <button className="map-btn" onClick={zoomIn} title="Zoom in">+</button>
        <button className="map-btn" onClick={zoomOut} title="Zoom out">−</button>
        <button className="map-btn" onClick={recenter} title="Recenter on Piarco" style={{fontSize:11}}>⦿</button>
        <button className="map-btn" onClick={showAtlantic} title="Atlantic routes" style={{fontSize:10}}>ATL</button>
      </div>

      <div className="map-stat">
        <div><div className="k">AIRBORNE</div><div className="v teal">{stats.airborne}</div></div>
        <div><div className="k">GROUND</div><div className="v">{stats.ground}</div></div>
        <div><div className="k">INBOUND</div><div className="v teal">{stats.inbound}</div></div>
        <div><div className="k">OUTBOUND</div><div className="v amber">{stats.outbound}</div></div>
      </div>

      <div className="map-legend">
        <div className="legend-row"><span className="sw sw-inb"></span>Inbound</div>
        <div className="legend-row"><span className="sw sw-outb"></span>Outbound</div>
        <div className="legend-row"><span className="sw sw-delay"></span>Delayed ≥ 15m</div>
        <div className="legend-row"><span className="sw sw-gnd"></span>Ground / gate</div>
        <div className="legend-row"><span className="sw sw-ship"></span>Ship to/from Trinidad</div>
        <div className="legend-row"><span className="sw sw-port"></span>Port</div>
        <div className="legend-row mute" style={{marginTop:4, fontSize:9.5}}>Drag to pan · scroll to zoom</div>
      </div>

      <div className="compass" title="Heading up: North">
        <div style={{fontSize:8.5, color:'var(--text-mute)'}}>{PIARCO.lat.toFixed(2)}°N</div>
      </div>
    </div>
  );
}

window.MapCanvas = MapCanvas;
