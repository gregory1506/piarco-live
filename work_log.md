# Work Log

## 2026-11-09 — UI/UX + stack rebuild

**Stack:** React 18→19, Vite 5→8 (Rolldown), `@vitejs/plugin-react` 6, TypeScript 5.6→6.0 (capped below 6.1 by typescript-eslint), new Vitest 5 + ESLint 10 (typescript-eslint, react-hooks v7). `tsc -b` project references: `tsconfig.app.json` (src), `tsconfig.node.json` (vite config), `functions/tsconfig.json` (now typechecked against `@cloudflare/workers-types` — previously not checked at all). Fonts self-hosted via `@fontsource-variable` (Google Fonts links removed). Added favicon, theme-color, description. Scripts: `dev`, `build`, `typecheck`, `lint`, `test`. Dev server proxies `/api/*` to the deployed Pages site and `/api/metar` to aviationweather.gov.

**Correctness bugs fixed:**
- ADS-B positions were never used for scheduled flights: OpenSky callsigns are ICAO (`BWA523`, `IBE0137`) but matching used the IATA board ident (`BW523`), and matched positions were then overwritten by route interpolation. Now matched by normalized ICAO callsign (`src/data/openSky.ts`) and drawn at the real fix, dead-reckoned when scrubbing.
- POS↔TAB legs appeared twice (once per airport feed) → duplicate React keys/markers. De-duplicated by `fa_flight_id`.
- All times were formatted in the viewer's browser timezone but labelled AST. Now `Intl` with `America/Port_of_Spain`; ±1 day badges for yesterday/tomorrow.
- Delays were always 0 for live data; now derived from scheduled vs estimated/actual times (strike-through scheduled time on the board).
- A 36-second synthetic "tick" pushed aircraft forward up to 6 min then snapped them back. Positions are now a pure function of time (`src/lib/positions.ts`): schedule wheels-off/on for estimates, ADS-B fix when within 20 min.
- Every scheduled arrival (even not-yet-departed from abroad) was drawn on the POS apron. Map now only shows aircraft that are actually airborne, about to depart (≤2 h), or just landed (≤45 min).
- Static fake METAR, fake "NOTAM normal ops" ticker item and fabricated `N0523`-style registrations removed; real METAR via new `functions/api/metar.ts`, real registrations from AeroAPI.
- Mock data silently replaced the live board on any fetch failure. Demo flights (`src/data/demoFlights.ts`, relative to load time) now only appear with a "Demo data" badge and banner.
- Settings panel was only reachable via a design-tool `postMessage`; `mapStyle`, `labels`, `density` were never wired. Replaced with a header Settings button; every option is wired and persisted.
- Wrong ICAO→IATA entries (e.g. `MUIH→MDE`, `TBPJ→FDF`) replaced by a single airport table keyed both ways.
- AeroAPI proxy now caches at the edge (shared across visitors) instead of each visitor triggering 2 billable calls per 5 min.

**UX:** POS/TAB/Both airport filter; "Now" divider with auto-scroll; Domestic/Caribbean/Long-haul/In-air/Delayed chips; persistent watchlist; cargo/helicopter hidden by default; ADS-B tag on rows; hollow markers = schedule estimate, solid = ADS-B; routes drawn through the aircraft; zoom-to-cursor wheel, double-click zoom, touch pan + pinch, keyboard pan/zoom; keyboard board navigation (↑/↓), Esc, `?` shortcuts list, `F` follow, `N` back to now; accessible tabs/switches/stars; mobile bottom sheet with handle (peek shows rows, expanded shows search/filters) and separate detail sheet; ticker pauses on hover and respects reduced motion.

**Verified:** `npm test` (18 tests: feed mapping, positioning, METAR runway/ceiling, ADS-B matching), `npm run typecheck`, `npm run lint`, `npm run build`. Browser at 1440/1280 desktop and 390 mobile against the real feeds via the dev proxy: live schedule + METAR + ADS-B matched (BWA266/BWA224 placed at real fixes), map drag/wheel/click-select, settings panel, mobile sheet expand + detail sheet, and the demo fallback with `/api/schedule` forced to 503.

**Deployed** 2026-11-09 to https://piarco-live.pages.dev (`wrangler pages deploy`, wrangler 4.159). First attempt failed with `No such module "node:stream"` in the Functions bundle; fixed by pinning `compatibility_date = "2026-11-01"` in `wrangler.toml`. Verified in production: `/`, `/api/metar`, `/api/schedule?airport=POS|TAB` return 200, invalid airport returns 400, edge cache serves hits (`cf-cache-status: HIT`), and the page loads with live schedule, METAR for both stations and ADS-B (18 aircraft) with no console errors.

## 2026-09-02 (session 5) — UI/UX critique + Phase 1 display fixes

**Context:** Piarco Live is already listed in the project portfolio (`project-site/content/projects/piarco-live.md`) with screenshot, tech stack, demo/source links. Portfolio site: `projects.gregstack.xyz`. No changes needed to the portfolio entry.

**Phase 1 fixes applied (display corrections, no layout changes):**
- `Detail.tsx:64`: Rounded heading from raw decimal (`161.907...°`) to `Math.round()` (`162°`)
- `styles.css`: Bumped `.map-stat .k`, `.metric .k`, `.scrub-ticks` from 9.5px → 11px for readability
- `styles.css`: Added `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` to `.metric .v` to prevent value clipping
- `styles.css`: Changed `.main` grid from `520px` → `600px` right column to give route-viz room
- `styles.css`: Adjusted `.route-viz` grid to `minmax(80px, 1fr) 60px minmax(80px, 1fr)` so "PORT OF SPAIN" fully renders
- `styles.css`: Added `overflow-x: visible` to `.detail` to prevent route clipping

**Verified:** Playwright screenshots at 1920px and 390px — all values render fully, no regressions.

## 2026-09-02 (session 5) — Phase 2: Persistent ADS-B badge + dynamic title

- `App.tsx`: Added `openSkyConnected` ref. Status only shows 'loading' on initial fetch; once connected, subsequent refetches don't reset the badge — "ADS-B LIVE" stays visible instead of flickering to "CONNECTING" every 90s.
- `App.tsx`: Added `useEffect` on `selectedId` that sets `document.title` to `${selectedId} — Piarco Live` when a flight is selected, reverts to base title when deselected.

## 2026-09-02 (session 5) — Phase 3: Mobile detail sheet

- `styles.css` (mobile `@media` block): Changed `.detail` from `position: fixed; inset: 0` (fullscreen) to `bottom: 0; left: 0; right: 0; max-height: 70vh; height: auto` — sheet now sizes to content instead of covering the entire screen.
- Added `border-radius: 12px 12px 0 0` and `box-shadow: 0 -4px 24px rgba(0,0,0,0.4)` for bottom-sheet feel.
- Added `::before` pseudo-element as a drag handle bar (36px × 4px, centered, muted color) at the top of the sheet on mobile.

## 2026-09-02 (session 5) — Phase 4: Drag-to-expand gesture

- `App.tsx`: Added touch drag gesture handling on `.right-col` for mobile. Tracks `touchstart`/`touchmove`/`touchend` with refs (`touchStartY`, `touchStartExpanded`, `isDragging`). During drag, applies `translateY(${-sheetOffset}px)` with `transition: none` for smooth movement. On release, snaps to expanded (swipe up >60px) or collapsed (swipe down >60px). Click-to-toggle on `.panel-tabs` preserved as fallback.

## 2026-09-02 (session 5) — Phase 5: Live ticker

- `Ticker.tsx`: Complete rewrite. Accepts `flights` prop, generates ticker items dynamically from live data — landed arrivals (teal), delayed flights sorted by delay severity (rose), airborne en-route with altitude/speed (teal), scheduled with ETAs. Static WX/NOTAM items preserved. Items duplicated for seamless CSS scroll loop.
- `App.tsx`: Passes `liveFlights` to `<Ticker>`.

## 2026-09-01 (session 4) — AeroAPI integration fixes: trails, IATA codes, aircraft types

**Fixed critical rendering issues discovered via Playwright testing after the AeroAPI integration (session 3).**

**Root causes found:**
1. **Zero trail polylines** — AeroAPI schedule flights had `routeProgress: 0` and `spd: 0`, so `flightOnRoute` never advanced them along their routes. The MapCanvas trail filter (`routeProgress > 0 && track !== 'gate'`) excluded all schedule flights.
2. **ICAO codes in board** — AeroAPI returns ICAO codes (KJFK, KMIA, EGKK) for airports, but the `AIRPORTS` lookup only has IATA codes (JFK, MIA, LGW). This also broke trail rendering since `AIRPORTS['KJFK']` returned undefined.
3. **All flights stacked at gate** — `flightOnRoute` used `alt < 500` to decide ground vs airborne. Schedule flights had `alt: 0` and `track: 'gate'`, so even en-route flights were forced to the apron.
4. **Aircraft type showed "???"** — mapper hardcoded `type: '???'` instead of using AeroAPI's `aircraft_type` field.

**Fixes applied:**
- `src/data/scheduleFeed.ts`: Complete rewrite. Added ICAO→IATA lookup table (40+ airports). Added `calcProgress()` that computes route progress from `actual_out`/`estimated_in` timestamps. En-route flights now get `alt: 35000`, `spd: 450`, `track: 'cruise'`, and a real `routeProgress` value. Aircraft type mapped from `aircraft_type` field. Board now shows city names (e.g., "New York", "Miami") via `code_iata` from AeroAPI.
- `src/components/MapCanvas.tsx`: Trail filter changed from `alt > 300` to `routeProgress > 0 && track !== 'gate' && track !== 'ground'`. Stats airborne counter updated similarly.
- `src/App.tsx`: Added `isAirborne()` helper checking `track` and `status` instead of only altitude. `flightOnRoute` uses this to position en-route flights along great-circle routes.
- `src/data/types.ts`: Made `FeedMeta.date` optional (live feeds don't have a static date).
- `src/data/flights.ts`: Updated `FEED_META` to reference AeroAPI.

**Playwright verification (5 viewports):**
- Desktop 1920: 6 trail polylines, 81 markers, 7 airborne, board shows IATA codes + city names + aircraft types
- Mobile 390: Map full-bleed, board collapsed to bottom-sheet tabs, responsive layout working
- All viewports: ADS-B LIVE badge, correct stats, no console errors

**Files touched:** `src/data/scheduleFeed.ts` (rewritten), `src/App.tsx`, `src/components/MapCanvas.tsx`, `src/data/types.ts`, `src/data/flights.ts`, `src/data/__fixtures__/aeroapi-sample-ttpp.json` (new), `functions/api/schedule.ts`

**Status:** Both live feeds (ADS-B + schedule) fully operational with correct rendering. Live-data-fix plan complete.

## 2026-09-01 (session 3) — AeroAPI schedule board: LIVE

**Replaced the hardcoded mock schedule with real FlightAware AeroAPI data.** Tasks 4–6 of the live-data-fix plan, completed.

**What changed:**
- `functions/api/schedule.ts`: rewrote from AeroDataBox/RapidAPI proxy to FlightAware AeroAPI proxy. Endpoint: `GET https://aeroapi.flightaware.com/aeroapi/airports/{ICAO}/flights`, auth via `x-apikey` header. Accepts IATA codes (POS/TAB) from the client, maps to ICAO (TTPP/TTCP) server-side. 5-minute cache.
- `src/data/scheduleFeed.ts`: rewrote mapper from AeroDataBox response shape to FlightAware AeroAPI shape. Handles `arrivals`, `departures`, `scheduled_arrivals`, `scheduled_departures` arrays. Uses `ident_iata` for board display IDs, `operator_iata` for airline codes. Maps FlightAware status strings ("En Route", "Landed / Taxiing", "Scheduled / Delayed", etc.) to the app's `FlightStatus` type.
- `src/App.tsx`: updated import (`mapAeroApiToFlights`), poll interval changed from 6h to 5min (AeroAPI $5/mo credit covers this easily at two small airports).
- `src/data/__fixtures__/aeroapi-sample-ttpp.json`: saved real API response as test fixture.
- Set `AEROAPI_KEY` secret on Cloudflare Pages via `wrangler pages secret put`.

**Verified live:** `curl https://piarco-live.pages.dev/api/schedule?airport=POS` returns 15 arrivals, 15 departures, 15 scheduled arrivals, 15 scheduled departures — all real FlightAware data. Deployed successfully.

**Status:** Both live data feeds (ADS-B + schedule) are now operational. The full live-data-fix plan is complete.

## 2026-09-01 (session 2) — ADS-B live data fix: RESOLVED

**Root cause of the HTTPS blocker found via direct SSH** (`con-oci` alias → `ubuntu@132.145.130.109`, key `~/.ssh/firevps.key`): the VPS's Caddy reverse proxy at `/home/ubuntu/homelab/caddy/Caddyfile` is a manually-maintained static file with an explicit domain block per app (this is the "external Caddyfile" referenced in cv-site/project-site's old work logs). `opensky.gregstack.xyz` was never added to it. Confirmed via `docker logs caddy` (zero mentions of the domain, ever) and Caddy's own admin API (`localhost:2019/config/` had no trace of it) — not a rate limit, not DNS, not container health, not the Coolify API-managed `fqdn`/`is_force_https_enabled` settings (those don't control this static file at all).

**Fix:** appended a block matching the existing `cv.gregstack.xyz` pattern:
```
opensky.gregstack.xyz {
    encode zstd gzip
    reverse_proxy host.docker.internal:8080
}
```
Restarted the `caddy` container (`docker restart caddy`) — cert issued within seconds, confirmed via `docker logs`: `"certificate obtained successfully","identifier":"opensky.gregstack.xyz"`.

**End-to-end verification:** `functions/api/opensky.ts` (the Cloudflare Pages Function — permanently dead since Cloudflare's whole network can't reach opensky-network.org) removed. `src/App.tsx` now fetches `https://opensky.gregstack.xyz/api/opensky` directly from the browser. Verified live via Chrome DevTools MCP: request returns 200, no CORS errors, header badge reads "ADS-B LIVE", real aircraft (`BWA527`, `AJT820`, `JBU361`, etc.) render on the map alongside the illustrative demo flights.

**Side note:** while diagnosing, found Caddy stuck in a perpetual failed-cert retry loop for `coolify.gregstack.xyz` itself (repeating every ~2 min, unrelated to this work, pre-existing) — not investigated further, flagged for a future session.

**Files touched (piarco-live):** `src/App.tsx`, deleted `functions/api/opensky.ts`. **Files touched (VPS, outside any repo):** `/home/ubuntu/homelab/caddy/Caddyfile` (backed up first to `Caddyfile.bak-20260901-122706`).

**Status:** Task 3 of the live-data-fix plan (ADS-B) complete. Task 4/5 (real schedule board via AeroAPI) still open — see `next_steps.md`.

## 2026-09-01 (session 1) — Live-data fix: partial progress, HTTPS blocker on VPS proxy

**Context:** The deployed app (piarco-live.pages.dev, from the Aug 2026 Vite/TypeScript SDD rebuild) badges itself "LIVE" but was never actually pulling live data. See `docs/superpowers/specs/2026-08-31-live-data-fix-design.md` and `docs/superpowers/plans/2026-08-31-live-data-fix.md` for the full investigation and plan.

**Root causes found:**
- OpenSky ADS-B fetch failed 100% of the time in production: CORS-blocked from a browser, and OpenSky retired Basic Auth for OAuth2 client-credentials on 2026-03-18 anyway.
- The flight-schedule board (`TAB FEED`) was 100% hardcoded mock data frozen at a fake `2026-04-20` date, no live source at all.
- Side finding: the deployed rebuild's source only existed in a local, unpushed git branch — fixed.

**Completed this session:**
- Merged the Vite/TypeScript rebuild branch into `main` and pushed to GitHub — `origin/main` now matches the deployed app (was previously the old plain-JS prototype).
- Removed stray `.netlify/` tracked files (leftover from an abandoned deploy target) and gitignored `.wrangler/`/`.netlify/`.
- Wrote `functions/api/opensky.ts`, a Cloudflare Pages Function that does the OpenSky OAuth2 client-credentials flow server-side and proxies `/api/opensky`. Fixed the Header badge to say "ADS-B OFFLINE" instead of the misleading generic "LIVE" when the feed is down.
- **Discovered Cloudflare's entire network is blocked from reaching opensky-network.org** — not just CORS, but a hard connect failure (confirmed via a temporary debug endpoint: `auth.opensky-network.org`, `opensky-network.org`, and the API root all time out from every Cloudflare Worker request, while working fine from a normal residential connection). This is almost certainly OpenSky's infrastructure blanket-blocking cloud-datacenter egress ranges as anti-abuse. A Cloudflare Pages Function cannot work around this.
- Pivoted to hosting the OpenSky proxy on the existing Coolify VPS instead (same infra as cv-site/project-site): created Forgejo repo `git.newscloud.store/greg/opensky-proxy` (minimal Node 20, zero dependencies, `server.js`), created the Coolify app via API, fixed a git-URL port bug (used default port 22 instead of Forgejo's actual port 2222 — same mistake is easy to make again, the working apps all use `ssh://git@git.newscloud.store:2222/...`), added the DNS A record for `opensky.gregstack.xyz` → `132.145.130.109`. The app now **builds and deploys successfully** on the VPS.
- Also tested FlightRadar24's public feed as an alternative — confirmed it's not viable: bot-protected (itself Cloudflare-fronted with active anti-scraping), returns a valid-shaped but empty JSON body to automated callers even for a busy NYC bounding box. Not pursued further.

**Blocked / not yet done:**
- **TLS won't come up on `opensky.gregstack.xyz`.** Both the ad-hoc `*.sslip.io` fallback domain and the real `opensky.gregstack.xyz` domain get an identical `LibreSSL: tlsv1 alert internal error` on HTTPS, even after disabling `is_force_https_enabled` on the Coolify app (which should have left it serving plain HTTP — it still 308-redirects to HTTPS at the edge). This is a Caddy/Let's Encrypt issue on the VPS I can't diagnose further via the Coolify API alone — needs someone with Coolify UI/server access to check the actual Caddy container logs.
- Planned next step once TLS is sorted (or bypassed): rather than fight for a directly HTTPS-reachable VPS endpoint, point the *existing* Cloudflare Pages Function at the VPS proxy over plain HTTP (server-to-server, Cloudflare→VPS has no mixed-content/CORS constraint — only the browser→Cloudflare leg needs HTTPS, and that's already solved). This avoids needing valid TLS on the VPS proxy at all.
- Plan's Task 4 (AeroAPI real schedule data) not started — still needs the manual FlightAware AeroAPI signup.
- OpenSky secrets (`OPENSKY_CLIENT_ID`/`SECRET`) are set as env vars on both the (now-dead-end) Cloudflare Pages project and the Coolify `opensky-proxy` app.

**Files touched:** `.gitignore`, `functions/api/opensky.ts`, `src/App.tsx`, `src/components/Header.tsx`, `docs/superpowers/specs/2026-08-31-live-data-fix-design.md`, `docs/superpowers/plans/2026-08-31-live-data-fix.md` (all in piarco-live); new repo `opensky-proxy` (`server.js`, `Dockerfile`, `package.json`).

**Status:** partial — proxy code and VPS deployment both work in isolation, blocked on VPS TLS before they can be wired together and verified end-to-end.

## 2026-04-18

### Project Context

Piarco Live is a high-fidelity browser prototype for tracking passenger flights in and out of Piarco International Airport, TTPP/POS. The project is a standalone React app loaded from `Piarco Live.html` using in-browser Babel and local JSX files.

### Geography And Map Context

- Replaced the original hand-drawn Trinidad/Tobago coastline with Natural Earth 1:10m Admin 0 country geometry.
- Added more realistic outlines for:
  - Trinidad
  - Tobago
  - Venezuela
  - Grenada
  - St. Vincent and the Grenadines
  - Barbados
- Added wider Atlantic/Americas/Europe map context so long-haul routes from London, Miami, New York, Houston, Toronto, Amsterdam, and similar origins have geographic context when zoomed out.
- Added labels for wider context locations including North Atlantic, Florida, New York, Houston, and London.
- Increased map zoom-out range.
- Added an `ATL` map control for a broad Atlantic route view.

### Flight Route Rendering

- Reworked aircraft movement so airborne flights are placed along computed origin-to-destination route curves.
- Added airport coordinates for POS, TAB, JFK, MIA, IAH, ATL, YYZ, LGW, LHR, AMS, PTY, BGI, ANU, UVF, SVD, BOG, and GEO.
- Added `routeProgress` values to airborne sample flights so their current positions are derived from their route rather than arbitrary lat/lon points.
- Fixed the Avianca `AV256` visual issue by positioning it on a Bogota-to-Piarco route curve instead of the previous incorrect freehand location.
- Changed flight tracks to show:
  - a full curved origin-to-destination route at partial opacity
  - a brighter flown segment from origin to the aircraft's current route progress
  - aircraft arrows rotated by the route tangent at their current position
- Updated the time scrubber so aircraft advance along their route path instead of drifting from stale heading values.
- Added a fabricated Houston-to-Piarco flight, `UA1458`, to represent Houston service in the mock dataset.

### Files Changed

- `data.js`
  - Added airport coordinate data.
  - Replaced and expanded geography outlines.
  - Added wider map context outlines.
  - Added route progress to airborne flights.
  - Added Houston sample flight.
- `MapCanvas.jsx`
  - Added support for multi-polygon geography and wider context outlines.
  - Added route curve rendering for aircraft.
  - Added flown route segment rendering.
  - Added Atlantic zoom control.
- `App.jsx`
  - Added route geometry helpers.
  - Updated live flight simulation to move aircraft along route curves.
### Verification

- Ran `node --check data.js`.
- Loaded the app through a local static server:
  - `http://127.0.0.1:8012/Piarco%20Live.html`
- Used Playwright to verify browser rendering after the geography and route changes.
- Confirmed map labels, routes, aircraft markers, and board content render.

### Known Notes

- The app should be opened through a local HTTP server, not directly as a `file://` URL, because Firefox blocks the local JSX fetches used by in-browser Babel.
- The browser console still reports a harmless missing `favicon.ico` 404.
- Flight, airline, and callsign data are still fabricated mock data.
- Natural Earth geography is simplified for SVG rendering performance.
