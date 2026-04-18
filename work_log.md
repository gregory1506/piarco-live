# Work Log

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

### Maritime Layer

- Added a Trinidad/Tobago maritime layer scoped only to vessels coming to, leaving, or moving between Trinidad/Tobago ports.
- Added local ports:
  - Port of Spain
  - Point Lisas
  - Chaguaramas
  - La Brea / Brighton
  - Galeota
  - Scarborough
- Added sea lanes:
  - Gulf of Paria coastal traffic
  - Inter-island ferry lane
  - Atlantic energy traffic
  - Caribbean approach lane
- Added sample vessels:
  - `CARIBBEAN TRADER` to Port of Spain
  - `NARIVA EXPRESS` on the inter-island ferry lane
  - `ATLANTIC SPIRIT` to Galeota
  - `PARIA PILOT` to Point Lisas
  - `BAY ANCHOR` to Port of Spain
- Rendered ports as diamond markers.
- Rendered ships as directional vessel markers.
- Added dashed sea-lane paths at partial opacity.
- Updated the map legend with ship and port symbols.

### Files Changed

- `data.js`
  - Added airport coordinate data.
  - Replaced and expanded geography outlines.
  - Added wider map context outlines.
  - Added route progress to airborne flights.
  - Added Houston sample flight.
  - Added ports, sea lanes, and ships.
- `MapCanvas.jsx`
  - Added support for multi-polygon geography and wider context outlines.
  - Added route curve rendering for aircraft.
  - Added flown route segment rendering.
  - Added Atlantic zoom control.
  - Added maritime port, lane, and ship rendering.
- `App.jsx`
  - Added route geometry helpers.
  - Updated live flight simulation to move aircraft along route curves.
- `styles.css`
  - Added legend styling for ships and ports.

### Verification

- Ran `node --check data.js`.
- Loaded the app through a local static server:
  - `http://127.0.0.1:8012/Piarco%20Live.html`
- Used Playwright to verify browser rendering after the geography, route, and maritime changes.
- Confirmed map labels, routes, ship markers, port markers, and board content render.

### Known Notes

- The app should be opened through a local HTTP server, not directly as a `file://` URL, because Firefox blocks the local JSX fetches used by in-browser Babel.
- The browser console still reports a harmless missing `favicon.ico` 404.
- Flight, vessel, airline, and callsign data are still fabricated mock data.
- Natural Earth geography is simplified for SVG rendering performance.
