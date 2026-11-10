import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { LatLon, PlacedFlight } from '../data/types';
import { AIRPORTS, HOME_AIRPORTS, PIARCO, RUNWAYS, findAirport, isHomeAirport } from '../data/airports';
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
import { isAirborne, markerTone } from '../lib/flights';
import type { Settings } from '../lib/settings';

export interface MapCanvasHandle {
  recenter: () => void;
  showAtlantic: () => void;
  centerOn: (point: LatLon) => void;
}

interface MapCanvasProps {
  flights: PlacedFlight[];
  selectedKey: string | null;
  hoveredKey: string | null;
  onSelect: (key: string) => void;
  onHover: (key: string | null) => void;
  settings: Pick<Settings, 'trails' | 'labels' | 'rings'>;
}

interface View {
  center: LatLon;
  zoom: number;
}

const HOME_VIEW: View = { center: { lat: 10.86, lon: -61.08 }, zoom: 0.85 };
const ATLANTIC_VIEW: View = { center: { lat: 28, lon: -48 }, zoom: 0.05 };
const RUNWAY_VISIBLE_ZOOM = 2;
const RING_RADII_NM = [50, 100, 200, 300];
const DRAG_THRESHOLD_PX = 4;

interface Gesture {
  /** Pointer positions at gesture start (client px). */
  start: Map<number, { x: number; y: number }>;
  view: View;
  moved: boolean;
}

function midpoint(points: { x: number; y: number }[]) {
  const n = points.length;
  return { x: points.reduce((s, p) => s + p.x, 0) / n, y: points.reduce((s, p) => s + p.y, 0) / n };
}

function spread(points: { x: number; y: number }[]) {
  if (points.length < 2) return 0;
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}

const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvas(
  { flights, selectedKey, hoveredKey, onSelect, onHover, settings },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState<View>(HOME_VIEW);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);

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

  const proj = useMemo(() => makeProjection(view.center, view.zoom, size.w, size.h), [view, size]);

  /** View that keeps the geographic point under local pixel (x, y) fixed while zooming to `zoom`. */
  const zoomAround = (base: View, x: number, y: number, zoom: number): View => {
    const z = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    const before = makeProjection(base.center, base.zoom, size.w, size.h);
    const [lat, lon] = before.unproject(x, y);
    const after = makeProjection(base.center, z, size.w, size.h);
    return {
      zoom: z,
      center: { lat: lat + (y - size.h / 2) * after.scale, lon: lon - (x - size.w / 2) * after.scale },
    };
  };
  const zoomAroundRef = useRef(zoomAround);
  useEffect(() => {
    zoomAroundRef.current = zoomAround;
  });

  // Wheel must be a non-passive native listener so preventDefault() stops page zoom/scroll.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const factor = Math.exp(-delta * 0.0018);
      setView((v) => zoomAroundRef.current(v, e.clientX - rect.left, e.clientY - rect.top, v.zoom * factor));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  const local = (p: { x: number; y: number }) => {
    const rect = svgRef.current?.getBoundingClientRect();
    return rect ? { x: p.x - rect.left, y: p.y - rect.top } : p;
  };

  const beginGesture = () => {
    gesture.current = { start: new Map(pointers.current), view, moved: gesture.current?.moved ?? false };
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) suppressClick.current = false;
    beginGesture();
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const startPts = [...g.start.values()];
    const nowPts = [...g.start.keys()].map((id) => pointers.current.get(id) ?? g.start.get(id)!);
    const m0 = midpoint(startPts);
    const m1 = midpoint(nowPts);
    if (!g.moved && Math.hypot(m1.x - m0.x, m1.y - m0.y) < DRAG_THRESHOLD_PX && startPts.length < 2) return;
    if (!g.moved) {
      g.moved = true;
      suppressClick.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const s0 = spread(startPts);
    const zoom = s0 > 0 ? g.view.zoom * (spread(nowPts) / s0) : g.view.zoom;
    const a = local(m0);
    const b = local(m1);
    // Zoom about the starting midpoint, then translate by how far the midpoint moved.
    const zoomed = zoomAround(g.view, a.x, a.y, zoom);
    const scale = makeProjection(zoomed.center, zoomed.zoom, size.w, size.h).scale;
    setView({
      zoom: zoomed.zoom,
      center: { lat: zoomed.center.lat + (b.y - a.y) * scale, lon: zoomed.center.lon - (b.x - a.x) * scale },
    });
  };

  const onPointerEnd = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
    else beginGesture();
  };

  const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const p = local({ x: e.clientX, y: e.clientY });
    setView((v) => zoomAround(v, p.x, p.y, v.zoom * 1.8));
  };

  const zoomBy = (factor: number) => setView((v) => zoomAround(v, size.w / 2, size.h / 2, v.zoom * factor));
  const panBy = (dx: number, dy: number) =>
    setView((v) => {
      const s = makeProjection(v.center, v.zoom, size.w, size.h).scale;
      return { ...v, center: { lat: v.center.lat - dy * s, lon: v.center.lon + dx * s } };
    });

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = 60;
    if (e.key === '+' || e.key === '=') zoomBy(1.4);
    else if (e.key === '-' || e.key === '_') zoomBy(1 / 1.4);
    else if (e.key === 'ArrowLeft') panBy(-step, 0);
    else if (e.key === 'ArrowRight') panBy(step, 0);
    else if (e.key === 'ArrowUp') panBy(0, -step);
    else if (e.key === 'ArrowDown') panBy(0, step);
    else return;
    e.preventDefault();
  };

  useImperativeHandle(ref, () => ({
    recenter: () => setView(HOME_VIEW),
    showAtlantic: () => setView(ATLANTIC_VIEW),
    centerOn: (point: LatLon) => setView((v) => ({ ...v, center: { lat: point.lat, lon: point.lon } })),
  }));

  const geometry = useMemo(() => {
    const pts = (poly: [number, number][]) => poly.map(([la, lo]) => proj.project(la, lo).join(',')).join(' ');
    return {
      trinidad: pts(TRINIDAD_OUTLINE),
      tobago: pts(TOBAGO_OUTLINE),
      venezuela: pts(VENEZUELA_OUTLINE),
      grenada: GRENADA_OUTLINES.map(pts),
      regional: REGIONAL_ISLAND_OUTLINES.map((g) => ({ name: g.name, points: g.polygons.map(pts) })),
      world: WORLD_CONTEXT_OUTLINES.map((g) => ({ name: g.name, points: g.polygons.map(pts) })),
    };
  }, [proj]);

  const gridLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = [];
    const [maxLat, minLon] = proj.unproject(0, 0);
    const [minLat, maxLon] = proj.unproject(size.w, size.h);
    const step = view.zoom < 0.08 ? 10 : view.zoom < 0.18 ? 5 : view.zoom < 0.7 ? 1 : 0.5;
    for (let la = Math.floor(minLat / step) * step; la <= Math.ceil(maxLat / step) * step; la += step) {
      const [x1, y1] = proj.project(la, minLon);
      const [x2, y2] = proj.project(la, maxLon);
      lines.push({ x1, y1, x2, y2, major: la % 1 === 0 });
    }
    for (let lo = Math.floor(minLon / step) * step; lo <= Math.ceil(maxLon / step) * step; lo += step) {
      const [x1, y1] = proj.project(minLat, lo);
      const [x2, y2] = proj.project(maxLat, lo);
      lines.push({ x1, y1, x2, y2, major: lo % 1 === 0 });
    }
    return lines;
  }, [proj, size, view.zoom]);

  const routes = useMemo(() => {
    return flights
      .filter((f) => f.pos && (isAirborne(f) || f.key === selectedKey))
      .filter((f) => settings.trails || f.key === selectedKey || f.key === hoveredKey)
      .flatMap((f) => {
        const origin = findAirport(f.origin);
        const dest = findAirport(f.dest);
        if (!origin || !dest || !f.pos) return [];
        // Arcs pass through the aircraft so ADS-B positions off the ideal great circle stay attached.
        const progress = clamp(f.pos.progress, 0, 1);
        const arc = (a: LatLon, b: LatLon, steps: number) => {
          const pts: string[] = [];
          for (let i = 0; i <= steps; i++) {
            const p = greatCirclePointAt(a, b, i / steps);
            pts.push(proj.project(p.lat, p.lon).join(','));
          }
          return pts.join(' ');
        };
        return [
          {
            key: f.key,
            tone: markerTone(f),
            ahead: arc(f.pos, dest, Math.max(4, Math.ceil((1 - progress) * 48))),
            flown: arc(origin, f.pos, Math.max(4, Math.ceil(progress * 48))),
            hot: f.key === selectedKey || f.key === hoveredKey,
          },
        ];
      });
  }, [flights, proj, settings.trails, selectedKey, hoveredKey]);

  const stats = useMemo(() => {
    let inbound = 0;
    let outbound = 0;
    let ground = 0;
    let live = 0;
    for (const f of flights) {
      if (!f.pos) continue;
      if (f.pos.live) live++;
      if (f.kind !== 'scheduled') continue;
      if (!isAirborne(f)) ground++;
      else if (isHomeAirport(f.dest)) inbound++;
      else outbound++;
    }
    return { inbound, outbound, ground, live };
  }, [flights]);

  const [px, py] = proj.project(PIARCO.lat, PIARCO.lon);
  const nmToPx = (nm: number) => nm / 60 / proj.scale;
  const hovered = hoveredKey ? flights.find((f) => f.key === hoveredKey && f.pos) : undefined;
  // Draw selected/hovered last so they sit on top.
  const ordered = [...flights.filter((f) => f.pos)].sort(
    (a, b) => Number(a.key === selectedKey || a.key === hoveredKey) - Number(b.key === selectedKey || b.key === hoveredKey),
  );

  return (
    <div ref={wrapRef} className="map-wrap">
      <svg
        ref={svgRef}
        className="map-svg"
        viewBox={`0 0 ${size.w} ${size.h}`}
        role="application"
        aria-label="Flight map. Drag or use arrow keys to pan, scroll or plus and minus to zoom."
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
      >
        <rect width={size.w} height={size.h} className="m-sea" />

        <g opacity="0.35">
          {gridLines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} className={l.major ? 'm-grid major' : 'm-grid'} />
          ))}
        </g>

        {settings.rings && (
          <g opacity="0.6">
            {HOME_AIRPORTS.map((code) => {
              const [ax, ay] = proj.project(AIRPORTS[code].lat, AIRPORTS[code].lon);
              return RING_RADII_NM.map((r) => <circle key={`${code}-${r}`} cx={ax} cy={ay} r={nmToPx(r)} className="m-ring" />);
            })}
            {RING_RADII_NM.map((r) => (
              <text key={r} x={px + nmToPx(r) + 3} y={py - 3} className="m-ring-label">
                {r} nm
              </text>
            ))}
          </g>
        )}

        <g>
          {geometry.world.map((c) =>
            c.points.map((points, i) => <polygon key={`${c.name}-${i}`} points={points} className="m-land world" />),
          )}
          <polygon points={geometry.venezuela} className="m-land near" />
          {geometry.grenada.map((points, i) => (
            <polygon key={`grenada-${i}`} points={points} className="m-land island" />
          ))}
          {geometry.regional.map((g) =>
            g.points.map((points, i) => <polygon key={`${g.name}-${i}`} points={points} className="m-land near" />),
          )}
          <polygon points={geometry.trinidad} className="m-land home" />
          <polygon points={geometry.tobago} className="m-land home" />

          {view.zoom > RUNWAY_VISIBLE_ZOOM &&
            Object.entries(RUNWAYS).map(([code, rwy]) => {
              const [x1, y1] = proj.project(rwy.centerline[0].lat, rwy.centerline[0].lon);
              const [x2, y2] = proj.project(rwy.centerline[1].lat, rwy.centerline[1].lon);
              return <line key={code} x1={x1} y1={y1} x2={x2} y2={y2} className="m-runway" />;
            })}

          {NEARBY_ISLES.map((isle) => {
            const [cx, cy] = proj.project(isle.lat, isle.lon);
            const r = Math.max(1.5, isle.r / proj.scale);
            return (
              <g key={isle.name}>
                <circle cx={cx} cy={cy} r={r} className="m-land island" />
                <text x={cx + r + 3} y={cy + 3} className="m-label isle">
                  {isle.name}
                </text>
              </g>
            );
          })}

          {GEO_LABELS.map((l) => {
            const [lx, ly] = proj.project(l.lat, l.lon);
            return (
              <text key={l.name} x={lx} y={ly} fontSize={l.size} textAnchor="middle" className={`m-label ${l.kind}`}>
                {l.name}
              </text>
            );
          })}
        </g>

        <g>
          {HOME_AIRPORTS.map((code, i) => {
            const a = AIRPORTS[code];
            const [ax, ay] = proj.project(a.lat, a.lon);
            const x = i === 0 ? ax + 11 : ax - 11;
            const anchor = i === 0 ? 'start' : 'end';
            return (
              <g key={code}>
                <circle cx={ax} cy={ay} r="4" className="m-apt-dot" />
                <circle cx={ax} cy={ay} r="9" className="m-apt-ring" />
                <text x={x} y={ay - 5} textAnchor={anchor} className="m-apt-code">
                  {a.icao} · {a.iata}
                </text>
                <text x={x} y={ay + 7} textAnchor={anchor} className="m-apt-name">
                  {(a.name ?? '').toUpperCase()}
                </text>
              </g>
            );
          })}
        </g>

        <g>
          {routes.map((r) => (
            <g key={`route-${r.key}`} className={`route tone-${r.tone} ${r.hot ? 'hot' : ''}`}>
              <polyline points={r.ahead} className="route-full" />
              <polyline points={r.flown} className="route-flown" />
            </g>
          ))}
        </g>

        <g>
          {ordered.map((f) => {
            const pos = f.pos!;
            const [fx, fy] = proj.project(pos.lat, pos.lon);
            const ground = pos.phase === 'gate' || pos.phase === 'taxi' || pos.phase === 'landed';
            const selected = f.key === selectedKey;
            const hot = selected || f.key === hoveredKey;
            const size = hot ? 8 : f.kind === 'traffic' ? 5 : 6.5;
            const cls = ['ac', `tone-${markerTone(f)}`, pos.live ? 'live' : 'est', ground ? 'ground' : '', selected ? 'selected' : '', hot ? 'hot' : '']
              .filter(Boolean)
              .join(' ');
            const showLabel = hot || (!ground && settings.labels && (f.kind === 'scheduled' || view.zoom > 1.5));
            return (
              <g
                key={f.key}
                className={cls}
                transform={`translate(${fx},${fy})`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!suppressClick.current) onSelect(f.key);
                }}
                onPointerEnter={(e) => {
                  if (e.pointerType !== 'mouse') return;
                  onHover(f.key);
                  setHoverPos(local({ x: e.clientX, y: e.clientY }));
                }}
                onPointerLeave={() => {
                  onHover(null);
                  setHoverPos(null);
                }}
              >
                <circle r="13" className="ac-hit" />
                {ground ? (
                  <circle r={hot ? 4.5 : 3} className="ac-shape" />
                ) : (
                  <polygon
                    className="ac-shape"
                    transform={`rotate(${pos.hdg})`}
                    points={`0,${-size} ${size * 0.7},${size * 0.7} 0,${size * 0.35} ${-size * 0.7},${size * 0.7}`}
                  />
                )}
                {selected && <circle r={15} className="ac-halo" />}
                {showLabel && (
                  <text className="ac-label" x={10} y={3}>
                    {f.id}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {hovered && hoverPos && hovered.pos && (
        <div className="map-tooltip" style={{ left: hoverPos.x + 14, top: hoverPos.y + 14 }}>
          <div className="mono">
            <b>{hovered.id}</b> {hovered.airline && <span className="mute">· {hovered.airline}</span>}
          </div>
          {hovered.kind === 'scheduled' && (
            <div>
              {hovered.originCity} → {hovered.destCity}
            </div>
          )}
          <div className="mute mono">
            {hovered.pos.altFt > 0 ? `${hovered.pos.altFt.toLocaleString()} ft · ${hovered.pos.spdKt} kt · ` : ''}
            {hovered.pos.live ? 'ADS-B' : 'estimated'}
          </div>
        </div>
      )}

      <div className="map-chrome" role="toolbar" aria-label="Map controls">
        <button className="map-btn" onClick={() => zoomBy(1.4)} aria-label="Zoom in" title="Zoom in (+)">+</button>
        <button className="map-btn" onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom out" title="Zoom out (−)">−</button>
        <button className="map-btn" onClick={() => setView(HOME_VIEW)} aria-label="Recenter on Trinidad and Tobago" title="Recenter (R)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="7" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <line x1="12" y1="1" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="23" />
            <line x1="1" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="23" y2="12" />
          </svg>
        </button>
        <button className="map-btn" onClick={() => setView(ATLANTIC_VIEW)} aria-label="Wide Atlantic view" title="Atlantic routes (W)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
          </svg>
        </button>
      </div>

      <div className="map-stat" aria-label="Traffic summary">
        <div><span className="k">Inbound</span><span className="v teal">{stats.inbound}</span></div>
        <div><span className="k">Outbound</span><span className="v amber">{stats.outbound}</span></div>
        <div><span className="k">On ground</span><span className="v">{stats.ground}</span></div>
        <div><span className="k">ADS-B</span><span className="v">{stats.live}</span></div>
      </div>

      <div className="map-legend">
        <div className="legend-row"><span className="sw tone-inbound" />Inbound</div>
        <div className="legend-row"><span className="sw tone-outbound" />Outbound</div>
        <div className="legend-row"><span className="sw tone-delay" />Delayed ≥ 15m</div>
        <div className="legend-row"><span className="sw tone-traffic" />Other traffic</div>
        <div className="legend-row"><span className="sw sw-est" />Estimated position</div>
      </div>
    </div>
  );
});

export default MapCanvas;
