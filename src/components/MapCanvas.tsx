import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { Flight, LatLon } from '../data/types';
import { AIRPORT_DETAILS, AIRPORTS, HOME_AIRPORTS, PIARCO, RUNWAYS } from '../data/airports';
import {
  GEO_LABELS,
  GRENADA_OUTLINES,
  NEARBY_ISLES,
  REGIONAL_ISLAND_OUTLINES,
  TOBAGO_OUTLINE,
  TRINIDAD_OUTLINE,
  VENEZUELA_OUTLINE,
  WORLD_CONTEXT_OUTLINES,
} from '../data/geography';
import { MAX_ZOOM, MIN_ZOOM, makeProjection } from '../lib/projection';
import { greatCirclePointAt } from '../lib/greatCircle';
import { clamp } from '../lib/geo';

export interface MapCanvasHandle {
  recenter: () => void;
  showAtlantic: () => void;
  centerOn: (point: LatLon) => void;
}

interface MapCanvasProps {
  flights: Flight[];
  selectedId: string;
  onSelect: (id: string) => void;
  showTrails: boolean;
  mapStyle: 'radar' | 'chart';
  hoveredId: string | null;
  onHoverFlight: (id: string | null) => void;
}

const RUNWAY_VISIBLE_ZOOM = 2;

function isHomeAirport(code: string): boolean {
  return HOME_AIRPORTS.includes(code);
}

const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvas(
  { flights, selectedId, onSelect, showTrails, hoveredId, onHoverFlight },
  ref
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [center, setCenter] = useState<LatLon>({ lat: 10.86, lon: -61.08 });
  const [zoom, setZoom] = useState(1);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const proj = useMemo(() => makeProjection(center, zoom, size.w, size.h), [center, zoom, size]);

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, cx: center.lon, cy: center.lat };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setCenter({ lat: dragRef.current.cy + dy * proj.scale, lon: dragRef.current.cx - dx * proj.scale });
  };
  const onMouseUp = () => {
    dragRef.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor)));
  };

  const recenter = () => {
    setCenter({ lat: 10.86, lon: -61.08 });
    setZoom(0.85);
  };
  const showAtlantic = () => {
    setCenter({ lat: 28, lon: -48 });
    setZoom(0.05);
  };
  const centerOn = (point: LatLon) => setCenter(point);

  useImperativeHandle(ref, () => ({ recenter, showAtlantic, centerOn }));

  const toPoints = (poly: [number, number][]) =>
    (poly || []).map(([la, lo]) => proj.project(la, lo)).map((p) => p.join(',')).join(' ');

  const trini = useMemo(() => toPoints(TRINIDAD_OUTLINE), [proj]);
  const tobago = useMemo(() => toPoints(TOBAGO_OUTLINE), [proj]);
  const venezuela = useMemo(() => toPoints(VENEZUELA_OUTLINE), [proj]);
  const grenada = useMemo(() => GRENADA_OUTLINES.map(toPoints), [proj]);
  const regionalIslands = useMemo(
    () => REGIONAL_ISLAND_OUTLINES.map((island) => ({ ...island, points: island.polygons.map(toPoints) })),
    [proj]
  );
  const worldContext = useMemo(
    () => WORLD_CONTEXT_OUTLINES.map((country) => ({ ...country, points: country.polygons.map(toPoints) })),
    [proj]
  );

  const homeAirportMarkers = HOME_AIRPORTS.map((code) => ({ code, ...(AIRPORT_DETAILS[code] || AIRPORTS[code]) })).filter(
    (a) => typeof a.lat === 'number' && typeof a.lon === 'number'
  );
  const [px, py] = proj.project(PIARCO.lat, PIARCO.lon);

  const ringRadii = [50, 100, 200, 300];
  const nmToPx = (nm: number) => nm / 60 / proj.scale;

  const gridLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = [];
    const [maxLat, minLon] = proj.unproject(0, 0);
    const [minLat, maxLon] = proj.unproject(size.w, size.h);
    const step = zoom < 0.08 ? 10 : zoom < 0.18 ? 5 : zoom < 0.7 ? 1 : 0.5;
    const startLa = Math.floor(minLat / step) * step;
    const endLa = Math.ceil(maxLat / step) * step;
    for (let la = startLa; la <= endLa; la += step) {
      const [x1, y1] = proj.project(la, minLon);
      const [x2, y2] = proj.project(la, maxLon);
      lines.push({ x1, y1, x2, y2, major: la % 1 === 0 });
    }
    const startLo = Math.floor(minLon / step) * step;
    const endLo = Math.ceil(maxLon / step) * step;
    for (let lo = startLo; lo <= endLo; lo += step) {
      const [x1, y1] = proj.project(minLat, lo);
      const [x2, y2] = proj.project(maxLat, lo);
      lines.push({ x1, y1, x2, y2, major: lo % 1 === 0 });
    }
    return lines;
  }, [proj, size, zoom]);

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, z * 1.4));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, z / 1.4));

  const stats = useMemo(() => {
    const airborne = flights.filter((f) => f.alt > 500).length;
    const ground = flights.length - airborne;
    const inbound = flights.filter((f) => isHomeAirport(f.dest)).length;
    const outbound = flights.filter((f) => isHomeAirport(f.origin)).length;
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
        <rect width={size.w} height={size.h} fill="#0B0F12" />

        <g opacity="0.35">
          {gridLines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.major ? '#1E2630' : '#141A20'} strokeWidth={l.major ? 0.5 : 0.3} />
          ))}
        </g>

        <g opacity="0.6">
          {homeAirportMarkers.map((airport) => {
            const [ax, ay] = proj.project(airport.lat, airport.lon);
            return ringRadii.map((r) => (
              <circle key={`${airport.code}-${r}`} cx={ax} cy={ay} r={nmToPx(r)} fill="none" stroke="#1E2630" strokeWidth="0.6" strokeDasharray="3 4" />
            ));
          })}
          {ringRadii.map((r) => (
            <text key={'t' + r} x={px + nmToPx(r)} y={py - 3} fontFamily="JetBrains Mono, monospace" fontSize="8.5" fill="#566470" textAnchor="start">
              POS {r} nm
            </text>
          ))}
        </g>

        <g opacity="0.35">
          <line x1={0} y1={py} x2={size.w} y2={py} stroke="#283241" strokeDasharray="1 4" strokeWidth="0.5" />
          <line x1={px} y1={0} x2={px} y2={size.h} stroke="#283241" strokeDasharray="1 4" strokeWidth="0.5" />
        </g>

        <g>
          {worldContext.map((country) =>
            country.points.map((points, i) => (
              <polygon key={`${country.name}-${i}`} points={points} fill="#0E141A" stroke="#1F2A35" strokeWidth="0.55" opacity="0.7" />
            ))
          )}
          <polygon points={venezuela} fill="#10161C" stroke="#23303C" strokeWidth="0.7" />
          {grenada.map((points, i) => (
            <polygon key={`grenada-${i}`} points={points} fill="#141A20" stroke="#2A3644" strokeWidth="0.7" />
          ))}
          {regionalIslands.map((island) =>
            island.points.map((points, i) => (
              <polygon key={`${island.name}-${i}`} points={points} fill="#10161C" stroke="#26323F" strokeWidth="0.6" />
            ))
          )}
          <polygon points={trini} fill="#171F27" stroke="#38485A" strokeWidth="0.9" />
          <polygon points={trini} fill="none" stroke="oklch(0.60 0.09 190 / 0.55)" strokeWidth="0.5" />
          <polygon points={tobago} fill="#171F27" stroke="#38485A" strokeWidth="0.9" />
          <polygon points={tobago} fill="none" stroke="oklch(0.60 0.09 190 / 0.55)" strokeWidth="0.5" />

          {RUNWAYS && zoom > RUNWAY_VISIBLE_ZOOM &&
            Object.entries(RUNWAYS).map(([code, rwy]) => {
              const [x1, y1] = proj.project(rwy.centerline[0].lat, rwy.centerline[0].lon);
              const [x2, y2] = proj.project(rwy.centerline[1].lat, rwy.centerline[1].lon);
              return <line key={`rwy-${code}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4A5866" strokeWidth={2.5} strokeLinecap="round" />;
            })}

          {NEARBY_ISLES.map((isle) => {
            const [cx, cy] = proj.project(isle.lat, isle.lon);
            const rpx = Math.max(1.5, isle.r / proj.scale);
            return (
              <g key={isle.name}>
                <circle cx={cx} cy={cy} r={rpx} fill="#141A20" stroke="#2A3644" strokeWidth="0.6" />
                <text x={cx + rpx + 3} y={cy + 3} fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#566470">
                  {isle.name}
                </text>
              </g>
            );
          })}

          {GEO_LABELS.map((l) => {
            const [lx, ly] = proj.project(l.lat, l.lon);
            const color = l.kind === 'country' ? '#8A97A3' : l.kind === 'sea' ? '#4A5866' : l.kind === 'city' ? '#6B7988' : '#5A6876';
            const weight = l.kind === 'country' ? 600 : 400;
            const ls = l.kind === 'sea' ? '0.24em' : l.kind === 'country' ? '0.2em' : '0.1em';
            const style = l.kind === 'sea' ? { fontStyle: 'italic' as const } : {};
            return (
              <text
                key={l.name}
                x={lx}
                y={ly}
                fontFamily={l.kind === 'city' ? 'JetBrains Mono, monospace' : 'Inter, sans-serif'}
                fontSize={l.size}
                fill={color}
                fontWeight={weight}
                letterSpacing={ls}
                textAnchor="middle"
                style={style}
              >
                {l.name}
              </text>
            );
          })}
        </g>

        <g>
          {homeAirportMarkers.map((airport, index) => {
            const [ax, ay] = proj.project(airport.lat, airport.lon);
            const labelX = index === 0 ? ax + 10 : ax - 10;
            const align = index === 0 ? 'start' : 'end';
            return (
              <g key={airport.code}>
                <circle cx={ax} cy={ay} r="4" fill="oklch(0.75 0.12 190)" />
                <circle cx={ax} cy={ay} r="9" fill="none" stroke="oklch(0.75 0.12 190)" strokeWidth="0.8" opacity="0.6" />
                <text x={labelX} y={ay - 6} fontFamily="JetBrains Mono, monospace" fontSize="10" fill="oklch(0.75 0.12 190)" fontWeight="600" textAnchor={align}>
                  {airport.icao}
                </text>
                <text x={labelX} y={ay + 5} fontFamily="JetBrains Mono, monospace" fontSize="8.5" fill="#8A97A3" textAnchor={align}>
                  {(airport.name || airport.code).toUpperCase()}
                </text>
              </g>
            );
          })}
        </g>

        <g>
          {flights
            .filter((f) => f.alt > 300)
            .map((f) => {
              const target = AIRPORTS[f.dest];
              const origin = AIRPORTS[f.origin];
              if (!origin || !target) return null;
              const progress = clamp(f.routeProgress ?? 0.5, 0, 1);
              const flownPoints: string[] = [];
              const steps = Math.max(6, Math.ceil(progress * 28));
              for (let i = 0; i <= steps; i++) {
                const t = progress * (i / steps);
                const pt = greatCirclePointAt(origin, target, t);
                flownPoints.push(proj.project(pt.lat, pt.lon).join(','));
              }
              const fullRoutePoints: string[] = [];
              const fullSteps = 40;
              for (let i = 0; i <= fullSteps; i++) {
                const pt = greatCirclePointAt(origin, target, i / fullSteps);
                fullRoutePoints.push(proj.project(pt.lat, pt.lon).join(','));
              }
              const isOutb = isHomeAirport(f.origin);
              const isHighlighted = f.id === hoveredId || f.id === selectedId;
              const stroke = isOutb ? 'oklch(0.60 0.11 75)' : 'oklch(0.56 0.10 190)';
              return showTrails ? (
                <g key={'tr-' + f.id}>
                  <polyline points={fullRoutePoints.join(' ')} fill="none" stroke={stroke} strokeWidth="0.9" strokeDasharray="3 6" opacity={isHighlighted ? 0.75 : 0.45} />
                  <polyline points={flownPoints.join(' ')} fill="none" stroke={stroke} strokeWidth={isHighlighted ? 1.8 : 1.25} opacity={isHighlighted ? 0.95 : 0.72} />
                </g>
              ) : null;
            })}
          {flights.map((f) => {
            const [fx, fy] = proj.project(f.lat, f.lon);
            const isOutb = isHomeAirport(f.origin);
            const isGround = f.alt < 500;
            const isDelay = f.delay >= 15;
            const isSelected = f.id === selectedId;
            const isHovered = f.id === hoveredId;
            const cls = ['ac'];
            if (isDelay) cls.push('delay');
            else if (isOutb) cls.push('outb');
            if (isGround) cls.push('ground');
            if (isSelected) cls.push('selected');
            const markerSize = isSelected || isHovered ? 8 : 6.5;
            return (
              <g
                key={f.id}
                className={cls.join(' ')}
                transform={`translate(${fx},${fy}) rotate(${f.hdg})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(f.id);
                }}
                onMouseEnter={(e) => {
                  onHoverFlight(f.id);
                  setHoverPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseMoveCapture={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => {
                  onHoverFlight(null);
                  setHoverPos(null);
                }}
              >
                {isGround ? (
                  <circle r="3" className="ac-tri" />
                ) : (
                  <polygon className="ac-tri" points={`0,${-markerSize} ${markerSize * 0.7},${markerSize * 0.7} 0,${markerSize * 0.35} ${-markerSize * 0.7},${markerSize * 0.7}`} />
                )}
                <circle r="12" className="ac-hit" />
                {(!isGround || isSelected) && (
                  <text className="ac-label" x={10} y={3} transform={`rotate(${-f.hdg})`}>
                    {f.id}
                  </text>
                )}
                {isSelected && <circle r={14} fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />}
              </g>
            );
          })}
        </g>
      </svg>

      {hoveredId && hoverPos && (
        <div
          className="map-tooltip"
          style={{ position: 'fixed', left: hoverPos.x + 14, top: hoverPos.y + 14 }}
        >
          {(() => {
            const f = flights.find((x) => x.id === hoveredId);
            if (!f) return null;
            return (
              <>
                <div className="mono">{f.id} · {f.airline}</div>
                <div className="mute">{f.status.toUpperCase()} · {f.alt.toLocaleString()}ft · {f.spd}kt</div>
              </>
            );
          })()}
        </div>
      )}

      <div className="map-chrome">
        <button className="map-btn" onClick={zoomIn} title="Zoom in">+</button>
        <button className="map-btn" onClick={zoomOut} title="Zoom out">−</button>
        <button className="map-btn" onClick={recenter} title="Recenter on Trinidad and Tobago" style={{ fontSize: 11 }}>⦿</button>
        <button className="map-btn" onClick={showAtlantic} title="Atlantic routes" style={{ fontSize: 10 }}>ATL</button>
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
        <div className="legend-row mute" style={{ marginTop: 4, fontSize: 9.5 }}>Drag to pan · scroll to zoom</div>
      </div>

      <div className="compass" title="Heading up: North">
        <div style={{ fontSize: 8.5, color: 'var(--text-mute)' }}>{PIARCO.lat.toFixed(2)}°N</div>
      </div>
    </div>
  );
});

export default MapCanvas;
