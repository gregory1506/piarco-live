# Piarco Live: Vite + TypeScript Rebuild and Cloudflare Deployment

## Context

Piarco Live ("T&T Flight Board") is currently a browser-only React prototype: `Piarco Live.html` / `index.html` load React, ReactDOM, and Babel Standalone from CDN `<script>` tags, then load `data.js`, `MapCanvas.jsx`, `Board.jsx`, `Detail.jsx`, `App.jsx` as `type="text/babel"` scripts that compile in-browser. All shared state (airport coordinates, geography outlines, flight data) is attached to `window.*` globals. There is no `package.json`, no bundler, and no TypeScript.

This spec covers converting the prototype to a proper Vite + React + TypeScript build, implementing four feature items pulled forward from `next_steps.md`, and deploying the result to Cloudflare Pages.

## Goals

1. Replace the CDN/Babel loading model with a Vite build (dev server + production bundle).
2. Convert the codebase to TypeScript.
3. De-duplicate the route-geometry math currently copy-pasted between `App.jsx` and `MapCanvas.jsx`.
4. Implement four features from `next_steps.md`:
   - Great-circle route geometry (item 2)
   - Runway/airport surface detail (item 3, partial — runway centerlines + apron offset, not full taxiway modeling)
   - Interaction polish (item 5): hover tooltips, hover-to-highlight, click-to-center, follow-selected, keyboard shortcuts
   - Mobile layout pass (item 6)
5. Deploy the production build to Cloudflare Pages under the default `*.pages.dev` subdomain.

## Non-goals

- Real flight/ADS-B/weather data integration beyond the existing OpenSky Network fetch already in `App.jsx` (item 1 in next_steps.md) — out of scope for this pass.
- Full taxiway/stand modeling (next_steps.md item 3 in full) — only runway centerlines and a fixed per-airport apron offset for grounded aircraft.
- Automated tests (item 8) — out of scope; can follow in a later pass.
- Custom domain / DNS wiring — deploy to the default Cloudflare Pages subdomain only.
- CI/CD (deploy-on-push) — manual `wrangler pages deploy` for now.
- Visual/design changes to the existing dark operational theme — CSS carries over as-is, adapted only for the mobile breakpoint.

## Architecture

### Build tooling

- Vite + `@vitejs/plugin-react`, TypeScript (`tsconfig.json` targeting ES2020, `strict: true`).
- `package.json` with `dev`, `build`, `preview` scripts.
- Entry point `src/main.tsx` mounts `<App />` into `#root`, replacing the inline `ReactDOM.createRoot` script in `index.html`.
- `index.html` moves to Vite's convention: a single `<script type="module" src="/src/main.tsx">`, Google Fonts links retained, React/ReactDOM/Babel CDN `<script>` tags removed.

### Module structure

```
src/
  main.tsx
  App.tsx
  components/
    Ticker.tsx
    Header.tsx
    Scrubber.tsx
    TweaksPanel.tsx
    MapCanvas.tsx
    Board.tsx
    Detail.tsx
  data/
    types.ts        // Flight, Airport, LatLon, GeoLabel, IslandOutline, etc.
    airports.ts      // AIRPORTS, AIRPORT_DETAILS, HOME_AIRPORTS, PIARCO, runway geometry
    geography.ts     // TRINIDAD_OUTLINE, TOBAGO_OUTLINE, VENEZUELA_OUTLINE, GRENADA_OUTLINES,
                      // REGIONAL_ISLAND_OUTLINES, WORLD_CONTEXT_OUTLINES, NEARBY_ISLES, GEO_LABELS
    flights.ts       // FLIGHTS mock schedule, CITIES, FEED_META
  lib/
    geo.ts           // bearingBetween, distanceNm, clamp
    greatCircle.ts   // greatCirclePointAt, greatCircleBearingAt (slerp-based)
    projection.ts    // makeProjection (equirectangular, used by MapCanvas)
  styles.css
```

- All `window.*` reads/writes are removed. Data flows as ES module imports; the OpenSky `postMessage` edit-mode hook (`__activate_edit_mode` / `__deactivate_edit_mode` / `__edit_mode_available`) is preserved unchanged in `App.tsx` since it's an external integration point, not internal state.
- `routeControlPoint`/`routePointAt`/`routeTangentAt` (currently duplicated verbatim in `App.jsx` and `MapCanvas.jsx`) are deleted in favor of the new `greatCircle.ts` functions, called from both `App.tsx` (for position/heading updates) and `MapCanvas.tsx` (for trail rendering), eliminating the duplication.

### Data typing

Core shared types in `data/types.ts`:

```ts
interface LatLon { lat: number; lon: number }
interface Airport extends LatLon { icao?: string; iata?: string; name?: string; city?: string }
interface Flight {
  id: string; airline: string; type: string;
  origin: string; dest: string;
  status: 'scheduled' | 'boarding' | 'departing' | 'taxi' | 'enroute' | 'landed' | 'canceled';
  eta: string; dep: string; gate: string;
  lat: number; lon: number; alt: number; spd: number; hdg: number;
  track: 'ground' | 'climbing' | 'cruise' | 'descending';
  dist: number; delay: number; routeProgress: number;
  sourceStatus?: string; _live?: boolean;
}
```

Mock data in `flights.ts` is typed against `Flight[]`; this also normalizes the current loose duck-typing in `openSkyToFlight`.

## Feature 1: Great-circle route geometry

`lib/greatCircle.ts` replaces the quadratic-Bézier approximation with proper great-circle interpolation:

- `greatCirclePointAt(origin: LatLon, dest: LatLon, t: number): LatLon` — spherical linear interpolation (slerp) between two lat/lon points converted to unit vectors, re-projected back to lat/lon. Handles the antipodal/identical-point edge cases by falling back to the input point.
- `greatCircleBearingAt(origin: LatLon, dest: LatLon, t: number): number` — computes bearing via a small forward-difference step (`t` vs `t + ε`) along the same interpolation, reusing `bearingBetween` from `lib/geo.ts`.

`App.tsx`'s `flightOnRoute` and `MapCanvas.tsx`'s trail-drawing both call these instead of the old control-point math. The visual effect: long-haul routes (JFK, LGW, AMS) will show a true geodesic arc rather than the current hand-tuned "lift" curve. Route sampling for trail polylines increases point density proportionally to route span so the arc renders smoothly at all zoom levels.

## Feature 2: Runway/airport surface detail

`data/airports.ts` adds:

```ts
interface Runway { heading: number; lengthM: number; centerline: [LatLon, LatLon] }
```

- POS (TTPP): runway 10/28, ~3,200 m, centerline computed from Piarco's published runway heading and half-length offsets from the airport reference point.
- TAB (TTCP): runway 11/29, ~2,750 m, same treatment.
- Rendered in `MapCanvas.tsx` as a short thick line segment, visible only when `zoom > ~2` (a threshold constant) so it doesn't visually clutter the regional or Atlantic map views.
- Grounded aircraft (`alt < 500`) are positioned at a fixed small lat/lon offset from the airport reference point (a per-airport "apron point" constant, not real survey data) instead of stacking exactly on the airport marker coordinate, so multiple grounded flights are visually distinguishable.

## Feature 3: Interaction polish

- **Hover tooltip**: `MapCanvas` tracks `hoveredFlightId` in local state; on aircraft `onMouseEnter`/`onMouseLeave`, shows a small absolutely-positioned `<div>` (not SVG `<title>`, for style control) near the cursor with flight id/status/alt/speed.
- **Hover-to-highlight**: `hoveredId` state lifts to `App.tsx` (shared between `Board` row hover and `MapCanvas` marker/route rendering) — hovering a board row brightens that flight's route line and marker on the map.
- **Click-to-center**: `MapCanvas` accepts a `centerOn?: LatLon` prop; `App.tsx` sets it when a board row is clicked (in addition to existing `onSelect` behavior), triggering a `setCenter` inside `MapCanvas` via a `useEffect` keyed on the prop.
- **Follow-selected toggle**: new `tweakState.followSelected: boolean` in `TweaksPanel`. When true, `App.tsx`'s tick interval also calls `centerOn` with the selected flight's current position every tick.
- **Keyboard shortcuts**: a `useEffect` in `App.tsx` attaching a `keydown` listener (ignored when focus is in an input): `a`/`d` → arrivals/departures tab, `r` → recenter, `t` → Atlantic view (both by lifting `recenter`/`showAtlantic` handlers from `MapCanvas` up to `App.tsx` via a ref or prop callback), `/` → focus the board search input (via a `ref` passed into `Board`).

## Feature 4: Mobile layout pass

Breakpoint: `max-width: 800px` (consistent with the mobile breakpoint already used in the sibling `project-site` repo).

- Map becomes full-bleed background (`position: absolute`, full viewport under the header/ticker).
- Board becomes a bottom sheet: fixed to the bottom, two states (collapsed showing just the tab bar + a peek of the top rows, expanded showing the full board) toggled by tapping the tab bar or dragging a handle; implemented with a CSS `transform: translateY()` driven by a `sheetExpanded` boolean state — no drag/gesture library.
- METAR strip collapses to a single horizontally-scrollable row (`overflow-x: auto`, `white-space: nowrap`) instead of wrapping.
- Detail drawer becomes a full-height overlay (`position: fixed`, full viewport) instead of the desktop right-column layout, closed via the existing close button or a swipe-down (swipe optional/stretch — tap-to-close is the required baseline).
- Footer time scrubber stays but compacts (hide tick labels below a narrower width, keep the handle and NOW/±time label).

## Deployment

- `wrangler.toml`:
  ```toml
  name = "piarco-live"
  pages_build_output_dir = "dist"
  ```
- Build and deploy: `npm run build && npx wrangler pages deploy dist --project-name=piarco-live`.
- Cloudflare account already authenticated locally (`wrangler whoami` confirms OAuth session under account `b65ec38a5f1cfd78723a87a4364d1db8`); no new auth needed.
- Result: a `*.pages.dev` URL (exact subdomain assigned by Cloudflare on first deploy, typically `piarco-live.pages.dev` if available).
- `.gitignore` gains `node_modules/`, `dist/`.

## Testing / Verification

No automated test suite is added in this pass (explicitly out of scope). Verification is manual:

- `npm run build` completes with no TypeScript errors.
- `npm run dev` serves the app locally; manually verify: map renders with coastlines, aircraft, and now-visible runway lines at high zoom; arrivals/departures board populates; clicking a board row opens the detail drawer and centers the map; hovering a row highlights the map route; keyboard shortcuts (`a`/`d`/`r`/`t`/`/`) work; follow-selected toggle keeps the map centered on the selected aircraft; resizing to ≤800px width triggers the mobile layout (full-bleed map, bottom sheet board, collapsed METAR strip, full-screen detail drawer).
- After `wrangler pages deploy`, load the resulting `*.pages.dev` URL and re-run the same manual checks against the production build.

## Open Questions

None outstanding — all scope decisions were confirmed during brainstorming (TypeScript: yes; domain: default `*.pages.dev`; features: all four proposed items included).
