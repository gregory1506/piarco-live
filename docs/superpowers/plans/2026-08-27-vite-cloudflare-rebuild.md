# Piarco Live Vite/TypeScript Rebuild + Cloudflare Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Piarco Live prototype from CDN/Babel-loaded JSX into a Vite + React + TypeScript build, add great-circle routing, runway/apron detail, interaction polish, and a mobile layout, then deploy to Cloudflare Pages.

**Architecture:** Extract all `window.*` global data and duplicated route-geometry math into typed ES modules (`src/data/`, `src/lib/`), port the four JSX components to typed `.tsx` components with new props for hover/centering/follow behavior, wire it all together in `src/App.tsx`, then build and deploy the static output with `wrangler pages deploy`.

**Tech Stack:** Vite, React 18, TypeScript (strict), plain CSS (no framework change), Cloudflare Pages via `wrangler`.

**Spec:** `docs/superpowers/specs/2026-08-27-vite-cloudflare-rebuild-design.md`

## Global Constraints

- No automated test suite is added (spec non-goal) — verification is `tsc --noEmit`, `npm run build`, and manual browser checks via `npm run dev`.
- No custom domain — deploy to the default Cloudflare `*.pages.dev` subdomain only.
- No CI/CD — deploys are manual `wrangler pages deploy` invocations.
- Preserve the existing dark operational visual theme; CSS changes are additive (mobile breakpoint), not a redesign.
- The OpenSky Network fetch and `postMessage` edit-mode integration in `App.jsx` must survive unchanged in behavior.
- TypeScript `strict: true`.

---

### Task 1: Scaffold the Vite + TypeScript project

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Modify: `index.html` (replace CDN script tags with Vite module entry)
- Create: `src/main.tsx`
- Create: `src/App.tsx` (placeholder, replaced fully in Task 9)
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a working `npm run dev` / `npm run build` toolchain that later tasks build on. `src/App.tsx` exports a default `App` component that later tasks will overwrite.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "piarco-live",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.3",
    "vite": "^5.4.11"
  }
}
```

- [ ] **Step 2: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Write `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Rewrite `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>T&T Flight Board · Live Tracker</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
</head>
<body>
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 6: Write `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 7: Write placeholder `src/App.tsx`**

```tsx
export default function App() {
  return <div style={{ padding: 24, color: '#eee' }}>Piarco Live — scaffold OK</div>;
}
```

- [ ] **Step 8: Copy `styles.css` into `src/`**

```bash
cd piarco-live
cp styles.css src/styles.css
```

- [ ] **Step 9: Update `.gitignore`**

```bash
cd piarco-live
cat >> .gitignore <<'EOF'
node_modules/
dist/
EOF
```

- [ ] **Step 10: Install dependencies**

```bash
cd piarco-live
npm install
```

Expected: installs with no errors, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 11: Verify the dev server boots and serves the placeholder**

```bash
cd piarco-live
npm run dev -- --port 5173 &
sleep 2
curl -s http://localhost:5173/ | grep -q "root" && echo "OK: index.html served"
curl -s http://localhost:5173/src/main.tsx | grep -q "createRoot" && echo "OK: main.tsx served"
kill %1
```

Expected: both `OK:` lines print.

- [ ] **Step 12: Verify the production build compiles**

```bash
cd piarco-live
npm run build
```

Expected: completes with no TypeScript errors, produces `dist/index.html` and `dist/assets/*.js`.

- [ ] **Step 13: Commit**

```bash
cd piarco-live
git add package.json package-lock.json vite.config.ts tsconfig.json tsconfig.node.json index.html src/main.tsx src/App.tsx src/styles.css .gitignore
git commit -m "Scaffold Vite + TypeScript project"
```

---

### Task 2: Pure geometry helpers (`src/lib/geo.ts`, `greatCircle.ts`, `projection.ts`)

**Files:**
- Create: `src/data/types.ts`
- Create: `src/lib/geo.ts`
- Create: `src/lib/greatCircle.ts`
- Create: `src/lib/projection.ts`

**Interfaces:**
- Consumes: nothing new (only `LatLon` type defined here)
- Produces:
  - `LatLon`, `Airport`, `Runway`, `Flight`, `FlightStatus`, `FlightTrack`, `GeoLabel`, `IslandGroup`, `NearbyIsle`, `FeedMeta` (from `data/types.ts`)
  - `bearingBetween(a: LatLon, b: LatLon): number`
  - `clamp(value: number, min: number, max: number): number`
  - `distanceNm(a: LatLon, b: LatLon): number`
  - `offsetLatLon(origin: LatLon, bearingDeg: number, distanceM: number): LatLon`
  - `apronSlot(base: LatLon, index: number, spacingM?: number): LatLon`
  - `greatCirclePointAt(origin: LatLon, dest: LatLon, t: number): LatLon`
  - `greatCircleBearingAt(origin: LatLon, dest: LatLon, t: number): number`
  - `makeProjection(center: LatLon, zoom: number, w: number, h: number): Projection`, `MIN_ZOOM`, `MAX_ZOOM`

- [ ] **Step 1: Write `src/data/types.ts`**

```ts
export interface LatLon {
  lat: number;
  lon: number;
}

export interface Airport extends LatLon {
  icao?: string;
  iata?: string;
  name?: string;
  city?: string;
}

export interface Runway {
  heading: number;
  lengthM: number;
  centerline: [LatLon, LatLon];
}

export type FlightStatus =
  | 'scheduled'
  | 'boarding'
  | 'departing'
  | 'taxi'
  | 'enroute'
  | 'landed'
  | 'canceled';

export type FlightTrack = 'ground' | 'climbing' | 'cruise' | 'descending';

export interface Flight {
  id: string;
  airline: string;
  type: string;
  origin: string;
  dest: string;
  status: FlightStatus;
  eta: string;
  dep: string;
  gate: string;
  lat: number;
  lon: number;
  alt: number;
  spd: number;
  hdg: number;
  track: FlightTrack;
  dist: number;
  delay: number;
  routeProgress: number;
  sourceStatus?: string;
  _live?: boolean;
}

export interface GeoLabel {
  name: string;
  lat: number;
  lon: number;
  kind: 'country' | 'sea' | 'city' | string;
  size: number;
}

export interface IslandGroup {
  name: string;
  polygons: [number, number][][];
}

export interface NearbyIsle {
  name: string;
  lat: number;
  lon: number;
  r: number;
}

export interface FeedMeta {
  date: string;
  source: string;
}
```

- [ ] **Step 2: Write `src/lib/geo.ts`**

```ts
import type { LatLon } from '../data/types';

export function bearingBetween(a: LatLon, b: LatLon): number {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function distanceNm(a: LatLon, b: LatLon): number {
  const rNm = 3440.065;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * rNm * Math.asin(Math.sqrt(h));
}

/** Offsets a point by a bearing (degrees) and distance (meters). Flat-earth
 * approximation — accurate to a few centimeters over the sub-2km distances
 * this is used for (runway centerlines, apron offsets). */
export function offsetLatLon(origin: LatLon, bearingDeg: number, distanceM: number): LatLon {
  const bearing = (bearingDeg * Math.PI) / 180;
  const dLat = (distanceM * Math.cos(bearing)) / 111320;
  const dLon =
    (distanceM * Math.sin(bearing)) /
    (111320 * Math.cos((origin.lat * Math.PI) / 180));
  return { lat: origin.lat + dLat, lon: origin.lon + dLon };
}

/** Deterministic apron parking slot in a 4-wide grid, 60m apart by default,
 * so multiple grounded flights at the same airport don't render stacked. */
export function apronSlot(base: LatLon, index: number, spacingM = 60): LatLon {
  const row = Math.floor(index / 4);
  const col = index % 4;
  const east = offsetLatLon(base, 90, col * spacingM);
  return offsetLatLon(east, 180, row * spacingM);
}
```

- [ ] **Step 3: Write `src/lib/greatCircle.ts`**

```ts
import type { LatLon } from '../data/types';
import { bearingBetween } from './geo';

function toVector({ lat, lon }: LatLon): [number, number, number] {
  const phi = (lat * Math.PI) / 180;
  const lambda = (lon * Math.PI) / 180;
  return [Math.cos(phi) * Math.cos(lambda), Math.cos(phi) * Math.sin(lambda), Math.sin(phi)];
}

function toLatLon([x, y, z]: [number, number, number]): LatLon {
  const lat = (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI;
  const lon = (Math.atan2(y, x) * 180) / Math.PI;
  return { lat, lon };
}

function clampDot(d: number): number {
  return Math.max(-1, Math.min(1, d));
}

/** Spherical linear interpolation (slerp) between origin and dest, t in [0,1]. */
export function greatCirclePointAt(origin: LatLon, dest: LatLon, t: number): LatLon {
  if (origin.lat === dest.lat && origin.lon === dest.lon) return origin;
  const a = toVector(origin);
  const b = toVector(dest);
  const dot = clampDot(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]);
  const theta = Math.acos(dot);
  if (theta === 0) return origin;
  const sinTheta = Math.sin(theta);
  const scaleA = Math.sin((1 - t) * theta) / sinTheta;
  const scaleB = Math.sin(t * theta) / sinTheta;
  const v: [number, number, number] = [
    a[0] * scaleA + b[0] * scaleB,
    a[1] * scaleA + b[1] * scaleB,
    a[2] * scaleA + b[2] * scaleB,
  ];
  return toLatLon(v);
}

/** Bearing of travel at point t along the great circle, via forward difference. */
export function greatCircleBearingAt(origin: LatLon, dest: LatLon, t: number): number {
  const eps = 0.0005;
  const t2 = Math.min(1, t + eps);
  const p1 = greatCirclePointAt(origin, dest, t);
  const p2 = greatCirclePointAt(origin, dest, t2);
  if (p1.lat === p2.lat && p1.lon === p2.lon) return bearingBetween(origin, dest);
  return bearingBetween(p1, p2);
}
```

- [ ] **Step 4: Write `src/lib/projection.ts`**

```ts
import type { LatLon } from '../data/types';

export interface Projection {
  project(lat: number, lon: number): [number, number];
  unproject(x: number, y: number): [number, number];
  scale: number;
}

export const MIN_ZOOM = 0.04;
export const MAX_ZOOM = 8;

/** Simple equirectangular projection centered on a given point. */
export function makeProjection(center: LatLon, zoom: number, w: number, h: number): Projection {
  const basePx = 0.0055;
  const scale = basePx / zoom;
  return {
    project(lat, lon) {
      const x = (lon - center.lon) / scale + w / 2;
      const y = -(lat - center.lat) / scale + h / 2;
      return [x, y];
    },
    unproject(x, y) {
      const lon = (x - w / 2) * scale + center.lon;
      const lat = -(y - h / 2) * scale + center.lat;
      return [lat, lon];
    },
    scale,
  };
}
```

- [ ] **Step 5: Type-check**

```bash
cd piarco-live
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Runtime smoke-check the math via the dev server**

Temporarily add to the top of `src/App.tsx`'s render body (inside the placeholder component, before the `return`):

```tsx
console.assert(Math.round(clamp(150, 0, 100)) === 100, 'clamp failed');
console.assert(Math.abs(distanceNm({ lat: 10.5954, lon: -61.3372 }, { lat: 40.6413, lon: -73.7781 }) - 1751) < 20, 'distanceNm failed: expected ~1751nm POS-JFK');
const gcMid = greatCirclePointAt({ lat: 10.5954, lon: -61.3372 }, { lat: 40.6413, lon: -73.7781 }, 0.5);
console.assert(gcMid.lat > 10.5954 && gcMid.lat < 40.6413, 'greatCirclePointAt midpoint out of range');
```

Add the needed imports (`clamp`, `distanceNm` from `../lib/geo`, `greatCirclePointAt` from `../lib/greatCircle`) at the top of the file.

```bash
cd piarco-live
npm run dev -- --port 5173 &
sleep 2
echo "Open http://localhost:5173 in a browser, open devtools console, confirm no 'console.assert' failures are logged."
```

Expected: no assertion failure messages in the browser console. Manually stop the dev server (`kill %1`) once confirmed.

- [ ] **Step 7: Remove the temporary smoke-check code from `src/App.tsx`**, restoring it to the Task 1 placeholder.

- [ ] **Step 8: Commit**

```bash
cd piarco-live
git add src/data/types.ts src/lib/geo.ts src/lib/greatCircle.ts src/lib/projection.ts
git commit -m "Add typed geometry helpers: geo, great-circle, projection"
```

---

### Task 3: Airport data with runway and apron geometry (`src/data/airports.ts`)

**Files:**
- Create: `src/data/airports.ts`

**Interfaces:**
- Consumes: `LatLon`, `Airport`, `Runway` (from `../data/types`), `offsetLatLon` (from `../lib/geo`)
- Produces: `PIARCO: Airport`, `HOME_AIRPORTS: string[]`, `AIRPORT_DETAILS: Record<string, Airport>`, `AIRPORTS: Record<string, LatLon>`, `RUNWAYS: Record<string, Runway>`, `APRON_OFFSETS: Record<string, LatLon>`

- [ ] **Step 1: Write `src/data/airports.ts`**

```ts
import type { Airport, LatLon, Runway } from './types';
import { offsetLatLon } from '../lib/geo';

export const PIARCO: Airport = { lat: 10.5954, lon: -61.3372, icao: 'TTPP', iata: 'POS' };

export const HOME_AIRPORTS = ['POS', 'TAB'];

export const AIRPORT_DETAILS: Record<string, Airport> = {
  POS: { lat: 10.5954, lon: -61.3372, icao: 'TTPP', iata: 'POS', name: 'Piarco Intl', city: 'Port of Spain' },
  TAB: { lat: 11.1497, lon: -60.8322, icao: 'TTCP', iata: 'TAB', name: 'A.N.R. Robinson Intl', city: 'Tobago' },
};

export const AIRPORTS: Record<string, LatLon> = {
  POS: { lat: 10.5954, lon: -61.3372 },
  TAB: { lat: 11.1497, lon: -60.8322 },
  JFK: { lat: 40.6413, lon: -73.7781 },
  MIA: { lat: 25.7959, lon: -80.2871 },
  IAH: { lat: 29.9902, lon: -95.3368 },
  ATL: { lat: 33.6407, lon: -84.4277 },
  YYZ: { lat: 43.6777, lon: -79.6248 },
  LGW: { lat: 51.1537, lon: -0.1821 },
  LHR: { lat: 51.4700, lon: -0.4543 },
  AMS: { lat: 52.3105, lon: 4.7683 },
  FRA: { lat: 50.0379, lon: 8.5622 },
  PTY: { lat: 9.0714, lon: -79.3835 },
  BGI: { lat: 13.0746, lon: -59.4925 },
  ANU: { lat: 17.1367, lon: -61.7927 },
  UVF: { lat: 13.7332, lon: -60.9526 },
  SVD: { lat: 13.1567, lon: -61.1499 },
  BOG: { lat: 4.7016, lon: -74.1469 },
  GEO: { lat: 6.4986, lon: -58.2541 },
};

// Runway centerlines are derived from published headings and lengths for
// TTPP (10/28) and TTCP (11/29), offset from each airport's reference point.
// Not survey-accurate — sufficient for a prototype map at close zoom.
export const RUNWAYS: Record<string, Runway> = {
  POS: {
    heading: 100,
    lengthM: 3200,
    centerline: [
      offsetLatLon(AIRPORTS.POS, 280, 1600),
      offsetLatLon(AIRPORTS.POS, 100, 1600),
    ],
  },
  TAB: {
    heading: 110,
    lengthM: 2750,
    centerline: [
      offsetLatLon(AIRPORTS.TAB, 290, 1375),
      offsetLatLon(AIRPORTS.TAB, 110, 1375),
    ],
  },
};

// Fixed per-airport apron reference point, offset from the runway/airport
// coordinate so grounded aircraft don't render stacked on the airport marker.
export const APRON_OFFSETS: Record<string, LatLon> = {
  POS: offsetLatLon(AIRPORTS.POS, 190, 350),
  TAB: offsetLatLon(AIRPORTS.TAB, 200, 300),
};
```

- [ ] **Step 2: Type-check**

```bash
cd piarco-live
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd piarco-live
git add src/data/airports.ts
git commit -m "Add typed airport, runway, and apron data"
```

---

### Task 4: Extract geography and flight data (`src/data/geography.ts`, `src/data/flights.ts`)

**Files:**
- Create: `src/data/geography.ts`
- Create: `src/data/flights.ts`
- Reference (read-only, not modified): `data.js`

**Interfaces:**
- Consumes: `GeoLabel`, `IslandGroup`, `NearbyIsle`, `Flight`, `FeedMeta` (from `./types`)
- Produces: `TRINIDAD_OUTLINE`, `TOBAGO_OUTLINE`, `VENEZUELA_OUTLINE`, `GRENADA_OUTLINES`, `REGIONAL_ISLAND_OUTLINES`, `WORLD_CONTEXT_OUTLINES`, `NEARBY_ISLES`, `GEO_LABELS` (from `geography.ts`); `FLIGHTS: Flight[]`, `CITIES: Record<string,string>`, `FEED_META: Record<string, FeedMeta>`, `TAB_LIVE_FEED`, `AIRLINE_CODES` (from `flights.ts`)

`data.js` (1069 lines) holds these top-level `window.X = ...` assignments, confirmed via `grep -n "^window\." data.js`:

| Lines | Name | Destination |
|---|---|---|
| 36–136 | `TRINIDAD_OUTLINE` | geography.ts |
| 137–174 | `TOBAGO_OUTLINE` | geography.ts |
| 175–807 | `VENEZUELA_OUTLINE` | geography.ts |
| 808–858 | `GRENADA_OUTLINES` | geography.ts |
| 859–956 | `REGIONAL_ISLAND_OUTLINES` | geography.ts |
| 957–958 | `WORLD_CONTEXT_OUTLINES` | geography.ts |
| 959–963 | `NEARBY_ISLES` | geography.ts |
| 964–988 | `GEO_LABELS` | geography.ts |
| 989–998 | `FEED_META` | flights.ts |
| 999–1034 | `TAB_LIVE_FEED` | flights.ts |
| 1035–1057 | `FLIGHTS` | flights.ts |
| 1058–1064 | `CITIES` | flights.ts |
| 1065–1069 | `AIRLINE_CODES` | flights.ts |

(Lines 5–35, `PIARCO`/`HOME_AIRPORTS`/`AIRPORT_DETAILS`/`AIRPORTS`, were already ported by hand in Task 3 with added typing — do not re-extract those.)

- [ ] **Step 1: Mechanically extract the geography block (lines 36–988) into `src/data/geography.ts`**

```bash
cd piarco-live
{
  echo "import type { GeoLabel, IslandGroup, NearbyIsle } from './types';"
  echo ""
  sed -n '36,988p' data.js | sed -E 's/^window\.([A-Z_]+) = /export const \1: any = /'
} > src/data/geography.ts
```

- [ ] **Step 2: Mechanically extract the flight/city block (lines 989–1069) into `src/data/flights.ts`**

```bash
cd piarco-live
{
  echo "import type { Flight, FeedMeta } from './types';"
  echo ""
  sed -n '989,1069p' data.js | sed -E 's/^window\.([A-Z_]+) = /export const \1: any = /'
} > src/data/flights.ts
```

- [ ] **Step 3: Replace the `any` placeholders with real types**

In `src/data/geography.ts`, change the export declarations (leave the array/object literals themselves untouched) to:

```ts
export const TRINIDAD_OUTLINE: [number, number][] = [ /* ...unchanged... */ ];
export const TOBAGO_OUTLINE: [number, number][] = [ /* ...unchanged... */ ];
export const VENEZUELA_OUTLINE: [number, number][] = [ /* ...unchanged... */ ];
export const GRENADA_OUTLINES: [number, number][][] = [ /* ...unchanged... */ ];
export const REGIONAL_ISLAND_OUTLINES: IslandGroup[] = [ /* ...unchanged... */ ];
export const WORLD_CONTEXT_OUTLINES: IslandGroup[] = [ /* ...unchanged... */ ];
export const NEARBY_ISLES: NearbyIsle[] = [ /* ...unchanged... */ ];
export const GEO_LABELS: GeoLabel[] = [ /* ...unchanged... */ ];
```

In `src/data/flights.ts`:

```ts
export const FEED_META: Record<string, FeedMeta> = { /* ...unchanged... */ };
export const TAB_LIVE_FEED: unknown[] = [ /* ...unchanged... */ ];
export const FLIGHTS: Flight[] = [ /* ...unchanged... */ ];
export const CITIES: Record<string, string> = { /* ...unchanged... */ };
export const AIRLINE_CODES: Record<string, string> = { /* ...unchanged... */ };
```

Only the `export const NAME: Type =` line for each block changes — the literal data after each `=` is untouched.

- [ ] **Step 4: Type-check and fix any literal/type mismatches**

```bash
cd piarco-live
npx tsc --noEmit
```

If `FLIGHTS` entries are missing a field required by the `Flight` interface (e.g. a mock entry omitting `routeProgress`), add the missing field with a sensible default (`routeProgress: 0` for scheduled flights not yet airborne) directly in the data literal rather than loosening the type.

Expected: no errors once data literals satisfy the interfaces.

- [ ] **Step 5: Commit**

```bash
cd piarco-live
git add src/data/geography.ts src/data/flights.ts
git commit -m "Extract geography and flight mock data into typed modules"
```

---

### Task 5: Port small display components (Ticker, Header, Scrubber, TweaksPanel)

**Files:**
- Create: `src/components/Ticker.tsx`
- Create: `src/components/Header.tsx`
- Create: `src/components/Scrubber.tsx`
- Create: `src/components/TweaksPanel.tsx`

**Interfaces:**
- Consumes: nothing from other new modules (pure presentational components)
- Produces:
  - `TweakState` interface (adds `followSelected: boolean` to the original tweak fields) — exported from `TweaksPanel.tsx`
  - `<Ticker />`, `<Header clock={string} openSkyStatus={string} />`, `<Scrubber value={number} setValue={(v:number)=>void} clock={string} />`, `<TweaksPanel open={boolean} state={TweakState} setState={(updater:(s:TweakState)=>TweakState)=>void} />`

- [ ] **Step 1: Write `src/components/Ticker.tsx`**

```tsx
const TICKER: [string, string, string, string][] = [
  ['ARRIVED', 'BW523 ex JFK', 'On stand G7', 'up'],
  ['TAB', 'BW1500 ex POS', '06:10 scheduled', 'up'],
  ['TAB', 'BW1543 to POS', 'landed 00:38', 'up'],
  ['WX', 'TTPP 24°C · TTCP 26°C', 'VIS 10SM', ''],
  ['NOTAM', 'TTPP / TTCP', 'normal ops', ''],
  ['ARR', 'CM472 ex PTY', 'ETA 14:18', 'up'],
  ['TAB', 'BW1520 ex POS', 'ETA 14:15', 'up'],
  ['DELAY', 'JY311 ex UVF to POS', '+22 min', 'down'],
];

export default function Ticker() {
  const items = [...TICKER, ...TICKER];
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
```

- [ ] **Step 2: Write `src/components/Header.tsx`**

```tsx
interface HeaderProps {
  clock: string;
  openSkyStatus: string;
}

export default function Header({ clock, openSkyStatus }: HeaderProps) {
  return (
    <div className="header">
      <div className="brand">
        <div className="brand-mark">TT</div>
        <div>
          <div className="brand-title">T&T Flight Board</div>
          <div className="brand-sub">POS/TTPP · TAB/TTCP</div>
        </div>
      </div>
      <div className="header-center">
        <div className="metar-strip">
          <span className="tag mono">METAR TTPP / TTCP</span>
          <span className="metar-item"><span className="k">POS Temp</span><span className="v mono">24°C</span></span>
          <span className="metar-item"><span className="k">TAB Temp</span><span className="v mono">26°C</span></span>
          <span className="metar-item"><span className="k">Wind</span><span className="v mono">090° / 09kt</span></span>
          <span className="metar-item"><span className="k">Vis</span><span className="v mono">10SM</span></span>
          <span className="metar-item"><span className="k">Clouds</span><span className="v mono">SCT024</span></span>
          <span className="metar-item"><span className="k">QNH</span><span className="v mono">1014</span></span>
          <span className="metar-item"><span className="k">Dew</span><span className="v mono">21°C</span></span>
          <span className="metar-item"><span className="k">Rwy</span><span className="v mono">POS 10 · TAB 11</span></span>
        </div>
      </div>
      <div className="header-right">
        <div className="live-dot" title={`ADS-B: ${openSkyStatus}`}></div>
        <span title={`ADS-B: ${openSkyStatus}`}>{openSkyStatus === 'ok' ? 'ADS-B LIVE' : 'LIVE'}</span>
        <span className="mute">·</span>
        <span className="clock mono">{clock}</span>
        <span className="mute">AST</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/Scrubber.tsx`**

```tsx
interface ScrubberProps {
  value: number;
  setValue: (v: number) => void;
  clock: string;
}

export default function Scrubber({ value, setValue, clock }: ScrubberProps) {
  const label = (v: number) => {
    if (v === 0) return 'NOW';
    const sign = v > 0 ? '+' : '−';
    const abs = Math.abs(v);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return sign + (h ? h + 'h ' : '') + m + 'm';
  };
  const ticks = [-120, -60, 0, 60, 120];
  return (
    <div className="footer">
      <div className="footer-left">
        <b>Timeline</b>
        <span className="mono">{clock}</span>
      </div>
      <div className="scrub">
        <div className="scrub-track">
          <div className="scrub-now" style={{ left: '50%' }}></div>
          <div className="scrub-handle" style={{ left: ((value + 120) / 240) * 100 + '%' }}></div>
          <input
            className="scrub-input"
            type="range"
            min="-120"
            max="120"
            step="5"
            value={value}
            onChange={(e) => setValue(parseInt(e.target.value, 10))}
          />
          <div className="scrub-ticks">
            {ticks.map((t) => (
              <span key={t}>{t === 0 ? 'NOW' : t > 0 ? '+' + t + 'm' : t + 'm'}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="scrub-label mono">{label(value)}</div>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/components/TweaksPanel.tsx`** (adds the new `followSelected` toggle for Feature 3)

```tsx
export interface TweakState {
  mapStyle: 'radar' | 'chart';
  trails: boolean;
  labels: boolean;
  density: 'comfy' | 'dense';
  charter: boolean;
  followSelected: boolean;
}

interface TweaksPanelProps {
  open: boolean;
  state: TweakState;
  setState: (updater: (s: TweakState) => TweakState) => void;
}

export default function TweaksPanel({ open, state, setState }: TweaksPanelProps) {
  const set = <K extends keyof TweakState>(k: K, v: TweakState[K]) =>
    setState((s) => ({ ...s, [k]: v }));
  return (
    <div className={`tweaks ${open ? 'open' : ''}`}>
      <h4>Display</h4>
      <div className="row-t">
        <span>Map style</span>
        <div className="seg">
          <button className={state.mapStyle === 'radar' ? 'on' : ''} onClick={() => set('mapStyle', 'radar')}>Radar</button>
          <button className={state.mapStyle === 'chart' ? 'on' : ''} onClick={() => set('mapStyle', 'chart')}>Chart</button>
        </div>
      </div>
      <div className="row-t">
        <span>Flight trails</span>
        <button className={`toggle ${state.trails ? 'on' : ''}`} onClick={() => set('trails', !state.trails)} />
      </div>
      <div className="row-t">
        <span>Show labels</span>
        <button className={`toggle ${state.labels ? 'on' : ''}`} onClick={() => set('labels', !state.labels)} />
      </div>
      <div className="row-t">
        <span>Follow selected</span>
        <button className={`toggle ${state.followSelected ? 'on' : ''}`} onClick={() => set('followSelected', !state.followSelected)} />
      </div>
      <div className="row-t">
        <span>Density</span>
        <div className="seg">
          <button className={state.density === 'comfy' ? 'on' : ''} onClick={() => set('density', 'comfy')}>Comfy</button>
          <button className={state.density === 'dense' ? 'on' : ''} onClick={() => set('density', 'dense')}>Dense</button>
        </div>
      </div>
      <h4 style={{ marginTop: 10 }}>Data</h4>
      <div className="row-t">
        <span>Include charter</span>
        <button className={`toggle ${state.charter ? 'on' : ''}`} onClick={() => set('charter', !state.charter)} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Type-check**

```bash
cd piarco-live
npx tsc --noEmit
```

Expected: no errors (these components aren't wired into `App.tsx` yet, so `tsc` only checks them in isolation for now — that's fine).

- [ ] **Step 6: Commit**

```bash
cd piarco-live
git add src/components/Ticker.tsx src/components/Header.tsx src/components/Scrubber.tsx src/components/TweaksPanel.tsx
git commit -m "Port Ticker, Header, Scrubber, TweaksPanel to typed components"
```

---

### Task 6: Port the map (`src/components/MapCanvas.tsx`)

**Files:**
- Create: `src/components/MapCanvas.tsx`

**Interfaces:**
- Consumes: `Flight`, `LatLon` (from `../data/types`); `AIRPORTS`, `AIRPORT_DETAILS`, `HOME_AIRPORTS`, `PIARCO`, `RUNWAYS` (from `../data/airports`); `TRINIDAD_OUTLINE`, `TOBAGO_OUTLINE`, `VENEZUELA_OUTLINE`, `GRENADA_OUTLINES`, `REGIONAL_ISLAND_OUTLINES`, `WORLD_CONTEXT_OUTLINES`, `NEARBY_ISLES`, `GEO_LABELS` (from `../data/geography`); `makeProjection`, `MIN_ZOOM`, `MAX_ZOOM` (from `../lib/projection`); `greatCirclePointAt` (from `../lib/greatCircle`); `clamp` (from `../lib/geo`)
- Produces: `MapCanvasHandle` interface (`recenter(): void`, `showAtlantic(): void`, `centerOn(point: LatLon): void`) and the default-exported `MapCanvas` component, used via `ref` and the following props: `flights: Flight[]`, `selectedId: string`, `onSelect: (id: string) => void`, `showTrails: boolean`, `mapStyle: 'radar' | 'chart'`, `hoveredId: string | null`, `onHoverFlight: (id: string | null) => void`

- [ ] **Step 1: Write `src/components/MapCanvas.tsx`**

```tsx
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
```

- [ ] **Step 2: Add the `.map-tooltip` style to `src/styles.css`**

```css
.map-tooltip {
  pointer-events: none;
  background: #0E141A;
  border: 1px solid var(--line, #2A3644);
  border-radius: 3px;
  padding: 6px 8px;
  font-size: 11px;
  color: #C7D0D8;
  z-index: 20;
  white-space: nowrap;
}
```

- [ ] **Step 3: Type-check**

```bash
cd piarco-live
npx tsc --noEmit
```

Expected: no errors (an unused `mapStyle` prop warning would fail `noUnusedParameters` — the prop is destructured out of the signature above precisely to avoid this; if `tsc` flags it, remove `mapStyle` from the destructured props entirely since the ported JSX never actually read `mapStyle` inside the component body).

- [ ] **Step 4: Commit**

```bash
cd piarco-live
git add src/components/MapCanvas.tsx src/styles.css
git commit -m "Port MapCanvas with great-circle trails, runway lines, and hover tooltip"
```

---

### Task 7: Port the board (`src/components/Board.tsx`)

**Files:**
- Create: `src/components/Board.tsx`

**Interfaces:**
- Consumes: `Flight` (from `../data/types`); `HOME_AIRPORTS` (from `../data/airports`); `CITIES` (from `../data/flights`)
- Produces: default-exported `Board` component with props `flights: Flight[]`, `mode: 'arrivals' | 'departures'`, `setMode: (m: 'arrivals'|'departures') => void`, `selectedId: string`, `onSelect: (id: string) => void`, `watchlist: Set<string>`, `toggleWatch: (id: string) => void`, `query: string`, `setQuery: (q: string) => void`, `showWatchOnly: boolean`, `setShowWatchOnly: (v: boolean) => void`, `hoveredId: string | null`, `onHoverFlight: (id: string | null) => void`, `searchInputRef: React.RefObject<HTMLInputElement>`; also exports `addMinutes(hhmm: string, delta: number): string`

- [ ] **Step 1: Write `src/components/Board.tsx`**

```tsx
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
```

- [ ] **Step 2: Add a `.row.hovered` style to `src/styles.css`** near the existing `.row.selected` rule (reuse the same highlight treatment at lower opacity):

```css
.row.hovered {
  background: var(--panel-hover, rgba(255,255,255,0.03));
}
```

- [ ] **Step 3: Type-check**

```bash
cd piarco-live
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd piarco-live
git add src/components/Board.tsx src/styles.css
git commit -m "Port Board with hover-highlight and search input ref"
```

---

### Task 8: Port the detail drawer (`src/components/Detail.tsx`)

**Files:**
- Create: `src/components/Detail.tsx`

**Interfaces:**
- Consumes: `Flight` (from `../data/types`); `HOME_AIRPORTS` (from `../data/airports`); `CITIES` (from `../data/flights`)
- Produces: default-exported `DetailDrawer` component with props `flight: Flight | null`, `onClose: () => void`

- [ ] **Step 1: Write `src/components/Detail.tsx`**

```tsx
import type { Flight } from '../data/types';
import { HOME_AIRPORTS } from '../data/airports';
import { CITIES } from '../data/flights';

interface DetailDrawerProps {
  flight: Flight | null;
  onClose: () => void;
}

export default function DetailDrawer({ flight, onClose }: DetailDrawerProps) {
  if (!flight) return <div className="detail closed"></div>;
  const isArrival = HOME_AIRPORTS.includes(flight.dest);
  const origin = flight.origin;
  const dest = flight.dest;

  const est = 1 - Math.min(1, flight.dist / 700);
  const pct = flight.alt < 500 ? 0 : Math.max(0.02, Math.min(0.98, est));

  const facts: [string, string][] = [
    ['Aircraft', flight.type + ' · ' + flight.airline],
    ['Registration', 'N' + flight.id.replace(/\D/g, '').padStart(4, '0')],
    ['Track', flight.track.toUpperCase()],
    ['Delay', flight.delay > 0 ? flight.delay + ' min' : 'On time'],
    ['Source status', flight.sourceStatus || flight.status.toUpperCase()],
    ['Filed route', `${origin} → ${dest}`],
    ['Flight ID', flight.id],
  ];

  return (
    <div className="detail">
      <div className="detail-head">
        <div>
          <div className="detail-title">{flight.id} <span className="mute" style={{ fontSize: 12, letterSpacing: 0.04 }}>· {flight.airline}</span></div>
          <div className="detail-sub">{CITIES[origin] || origin} ({origin}) → {CITIES[dest] || dest} ({dest}) · {flight.type}</div>
        </div>
        <button className="detail-close" onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className="route-viz">
        <div className="rv-airport">
          <div className="code">{origin}</div>
          <div className="name">{CITIES[origin] || ''}</div>
          <div className="tm mono">{flight.dep} LCL</div>
        </div>
        <div className="rv-line">
          <span className="rv-dot left"></span>
          <span className="rv-dot right"></span>
          <span className="rv-plane" style={{ left: pct * 100 + '%' }}>
            <svg width="16" height="16" viewBox="-8 -8 16 16" style={{ transform: 'rotate(90deg)' }}>
              <polygon points="0,-6 4,4 0,2 -4,4" fill="currentColor" />
            </svg>
          </span>
        </div>
        <div className="rv-airport" style={{ textAlign: 'right' }}>
          <div className="code">{dest}</div>
          <div className="name">{CITIES[dest] || ''}</div>
          <div className="tm mono">{flight.eta} LCL</div>
        </div>
      </div>

      <div className="metrics">
        <div className="metric"><div className="k">Altitude</div><div className="v">{flight.alt.toLocaleString()}<small>ft</small></div></div>
        <div className="metric"><div className="k">Ground spd</div><div className="v">{flight.spd}<small>kt</small></div></div>
        <div className="metric"><div className="k">Heading</div><div className="v">{String(flight.hdg).padStart(3, '0')}<small>°</small></div></div>
        <div className="metric"><div className="k">{isArrival ? 'Distance' : 'Gate'}</div><div className="v">{isArrival ? flight.dist + 'nm' : flight.gate}</div></div>
      </div>

      <div className="detail-facts">
        {facts.map(([k, v]) => (
          <div className="fact" key={k}>
            <span className="k">{k}</span>
            <span className="v">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd piarco-live
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd piarco-live
git add src/components/Detail.tsx
git commit -m "Port DetailDrawer to typed component"
```

---

### Task 9: Wire up `src/App.tsx`

**Files:**
- Modify: `src/App.tsx` (replace the Task 1 placeholder entirely)

**Interfaces:**
- Consumes: everything produced by Tasks 2–8: `Flight`, `LatLon` types; `AIRPORTS`, `HOME_AIRPORTS` from `../data/airports`; `FLIGHTS` from `../data/flights`; `greatCirclePointAt`, `greatCircleBearingAt` from `../lib/greatCircle`; `bearingBetween`, `clamp`, `distanceNm`, `apronSlot` from `../lib/geo`; `APRON_OFFSETS` from `../data/airports`; `Ticker`, `Header`, `Scrubber`, `TweaksPanel`/`TweakState`, `MapCanvas`/`MapCanvasHandle`, `Board`, `DetailDrawer` from `../components/*`
- Produces: default-exported `App` component (consumed by `src/main.tsx`, already wired in Task 1)

- [ ] **Step 1: Replace `src/App.tsx` in full**

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Flight, LatLon } from './data/types';
import { AIRPORTS, APRON_OFFSETS, HOME_AIRPORTS } from './data/airports';
import { FLIGHTS } from './data/flights';
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

function flightOnRoute(f: Flight, tick: number, scrub: number, groundIndex: Map<string, number>): Flight {
  const origin = AIRPORTS[f.origin];
  const dest = AIRPORTS[f.dest];
  if (!origin || !dest) return f;

  const baseProgress = f.routeProgress ?? (f.alt < 500 ? (isHomeAirport(f.origin) ? 0 : 1) : 0.75);
  const routeNm = distanceNm(origin, dest);
  const minutes = scrub + (tick % 30) * 0.2;
  const progressRate = routeNm > 0 && f.spd > 0 ? f.spd / 60 / routeNm : 0;
  const progress = clamp(baseProgress + minutes * progressRate, 0, 1);

  if (f.alt < 500) {
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
  const [openSkyFlights, setOpenSkyFlights] = useState<Flight[]>([]);
  const [openSkyStatus, setOpenSkyStatus] = useState('idle');
  const [tick, setTick] = useState(0);

  const mapRef = useRef<MapCanvasHandle>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setClock(nowClock()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const BBOX = 'lamin=8.0&lomin=-70&lamax=14.5&lomax=-57';
    const URL = 'https://opensky-network.org/api/states/all?' + BBOX;
    const fetchFlights = () => {
      setOpenSkyStatus('loading');
      fetch(URL)
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.json();
        })
        .then((data) => {
          const flights = ((data.states || []) as unknown[][]).map(openSkyToFlight).filter((f): f is Flight => f !== null);
          setOpenSkyFlights(flights);
          setOpenSkyStatus('ok');
        })
        .catch((err) => {
          console.warn('OpenSky fetch failed:', err);
          setOpenSkyStatus('error');
        });
    };
    fetchFlights();
    const i = setInterval(fetchFlights, 60000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1200);
    return () => clearInterval(i);
  }, []);

  const liveFlights = useMemo(() => {
    const liveMap = new Map(openSkyFlights.map((f) => [f.id, f]));
    const staticIds = new Set(FLIGHTS.map((f) => f.id));
    const groundIndex = buildGroundIndex(FLIGHTS);
    const merged = FLIGHTS.map((f) => {
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
  }, [tick, scrub, tweakState.charter, openSkyFlights]);

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

  return (
    <div className="app">
      <Ticker />
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
        <div className={`right-col ${detailOpen && selected ? 'detail-open' : ''}`}>
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
```

- [ ] **Step 2: Type-check**

```bash
cd piarco-live
npx tsc --noEmit
```

Expected: no errors. Fix any remaining signature mismatches between this file and Tasks 5–8 (e.g., if a component's exported prop name differs from what's used here, align them — this file is the source of truth for how components are actually consumed).

- [ ] **Step 3: Manual verification via the dev server**

```bash
cd piarco-live
npm run dev -- --port 5173 &
sleep 2
echo "Open http://localhost:5173 and verify:"
echo "1. Map renders coastlines, aircraft markers, and the arrivals/departures board."
echo "2. Zoom in past ~2x on POS or TAB — a runway line segment should appear near the airport marker."
echo "3. Click a board row — the map recenters on that flight and the detail drawer opens."
echo "4. Hover a board row — that flight's route brightens on the map."
echo "5. Hover an aircraft on the map — a tooltip with flight id/status/alt/speed appears near the cursor."
echo "6. Press 'a' and 'd' — arrivals/departures tabs switch. Press 'r' — map recenters. Press 't' — Atlantic view. Press '/' — search input focuses."
echo "7. Open the tweaks panel (via postMessage or by temporarily setting tweaksOpen default to true) and toggle 'Follow selected' — the map should track the selected flight's position on subsequent ticks."
kill %1
```

Expected: all seven checks pass with no console errors.

- [ ] **Step 4: Commit**

```bash
cd piarco-live
git add src/App.tsx
git commit -m "Wire App: great-circle routing, follow-selected, keyboard shortcuts, click-to-center"
```

---

### Task 10: Mobile layout pass

**Files:**
- Modify: `src/styles.css` (append a `max-width: 800px` media query block)

**Interfaces:**
- Consumes: existing class names already present in `styles.css` and the components (`.app`, `.main`, `.map-wrap`, `.right-col`, `.panel`, `.detail`, `.footer`, `.metar-strip`) — no component code changes in this task, only CSS. If any of these class names don't exist verbatim in the current `styles.css`, use the closest matching existing selector for that region instead of inventing a new one.
- Produces: a `max-width: 800px` responsive layout

- [ ] **Step 1: Read the current `src/styles.css` rules for `.main`, `.map-wrap`, `.right-col`, `.panel`, `.detail`, `.footer`, and `.metar-strip`** to confirm exact property names before overriding them (`grep -n -A5 "^\.main\b\|^\.map-wrap\b\|^\.right-col\b\|^\.detail\b\|^\.footer\b\|^\.metar-strip\b" src/styles.css`).

- [ ] **Step 2: Append the mobile breakpoint block to `src/styles.css`**

```css
/* Mobile layout: map full-bleed, board as a bottom sheet, collapsed METAR strip */
@media (max-width: 800px) {
  .main {
    position: relative;
    display: block;
    height: calc(100vh - var(--header-height, 96px) - var(--footer-height, 56px));
    overflow: hidden;
  }

  .map-wrap {
    position: absolute;
    inset: 0;
    z-index: 0;
  }

  .right-col {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
    max-height: 85%;
    transform: translateY(calc(100% - 44px));
    transition: transform 0.2s ease-out;
    background: var(--bg, #0B0F12);
    border-top: 1px solid var(--line, #2A3644);
  }

  .right-col.sheet-expanded {
    transform: translateY(0);
  }

  .panel-tabs {
    cursor: pointer;
  }

  .metar-strip {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .detail {
    position: fixed;
    inset: 0;
    z-index: 30;
    overflow-y: auto;
  }

  .scrub-ticks span {
    display: none;
  }
  .scrub-ticks span:first-child,
  .scrub-ticks span:nth-child(3),
  .scrub-ticks span:last-child {
    display: inline;
  }
}
```

- [ ] **Step 3: Add the bottom-sheet expand/collapse state in `src/App.tsx`**

In the `App` component from Task 9, add:

```tsx
const [sheetExpanded, setSheetExpanded] = useState(false);
```

And change the `right-col` div's className:

```tsx
<div className={`right-col ${detailOpen && selected ? 'detail-open' : ''} ${sheetExpanded ? 'sheet-expanded' : ''}`}>
```

Wrap the `<Board>` element's containing tab bar interaction: since `Board`'s `.panel-tabs` already renders as the first child, add an `onClick` on the `right-col` wrapper div that toggles the sheet only when the tap target is the tab bar itself:

```tsx
<div
  className={`right-col ${detailOpen && selected ? 'detail-open' : ''} ${sheetExpanded ? 'sheet-expanded' : ''}`}
  onClick={(e) => {
    if ((e.target as HTMLElement).closest('.panel-tabs') && window.innerWidth <= 800) {
      setSheetExpanded((v) => !v);
    }
  }}
>
```

- [ ] **Step 4: Type-check**

```bash
cd piarco-live
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual verification at a mobile viewport**

```bash
cd piarco-live
npm run dev -- --port 5173 &
sleep 2
echo "Open http://localhost:5173, open browser devtools, set responsive viewport to 375x812."
echo "Verify: map fills the screen behind the board, the board sits collapsed at the bottom showing only the tab bar, tapping the tab bar expands it to show flight rows, the METAR strip scrolls horizontally instead of wrapping, and selecting a flight opens the detail drawer full-screen."
kill %1
```

Expected: all behaviors confirmed, no layout overflow (no horizontal scrollbar on `body`).

- [ ] **Step 6: Commit**

```bash
cd piarco-live
git add src/styles.css src/App.tsx
git commit -m "Add mobile layout: full-bleed map, bottom-sheet board, collapsed METAR strip"
```

---

### Task 11: Cloudflare Pages deployment

**Files:**
- Create: `wrangler.toml`
- Delete: `Piarco Live.html`, `App.jsx`, `Board.jsx`, `Detail.jsx`, `MapCanvas.jsx`, `data.js`, `styles.css` (repo root — superseded by `src/`)

**Interfaces:**
- Consumes: `dist/` build output from `npm run build` (Task 1's build script)
- Produces: a live Cloudflare Pages deployment URL

- [ ] **Step 1: Write `wrangler.toml`**

```toml
name = "piarco-live"
pages_build_output_dir = "dist"
```

- [ ] **Step 2: Remove the superseded root-level prototype files**

```bash
cd piarco-live
git rm "Piarco Live.html" App.jsx Board.jsx Detail.jsx MapCanvas.jsx data.js styles.css
```

- [ ] **Step 3: Build**

```bash
cd piarco-live
npm run build
```

Expected: succeeds, produces `dist/index.html` and `dist/assets/`.

- [ ] **Step 4: Confirm Cloudflare auth is active**

```bash
npx wrangler whoami
```

Expected: shows an authenticated account (already confirmed authenticated to account `b65ec38a5f1cfd78723a87a4364d1db8` during planning — if this now shows logged out, run `npx wrangler login` and complete the browser OAuth flow before continuing).

- [ ] **Step 5: Deploy**

```bash
cd piarco-live
npx wrangler pages deploy dist --project-name=piarco-live
```

Expected: creates the `piarco-live` Pages project on first run and prints a `*.pages.dev` deployment URL.

- [ ] **Step 6: Verify the live deployment**

```bash
curl -s -o /dev/null -w "%{http_code}\n" <the printed *.pages.dev URL>
```

Expected: `200`. Then manually re-run the seven checks from Task 9 Step 3 and the mobile check from Task 10 Step 5 against the live URL instead of localhost.

- [ ] **Step 7: Commit the deployment config and file removals**

```bash
cd piarco-live
git add wrangler.toml
git commit -m "Add Cloudflare Pages config; remove superseded prototype files"
```

---

## Self-Review Notes

- **Spec coverage:** every spec section maps to a task — build tooling (1), module structure/data typing (2–4), great-circle routing (6, 9), runway/apron detail (3, 6, 9), interaction polish (5, 6, 7, 9), mobile layout (10), deployment (11).
- **Type consistency:** `Flight`, `LatLon`, `Airport`, `Runway` defined once in Task 2 and reused verbatim by name in every later task; `MapCanvasHandle`, `TweakState` defined once (Tasks 5–6) and consumed by exact name in Task 9; `apronSlot`/`offsetLatLon` defined once (Task 2) and consumed in Tasks 3 and 9.
- **No placeholders:** every step has literal, runnable code or an exact shell command; the two `sed`-based extraction steps in Task 4 are mechanical and the plan documents exactly which lines move where.
