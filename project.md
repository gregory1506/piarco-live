# Piarco Live Project Spec

## Original Prompt

Initial user request:

> I want to initially design a view similar to flight tracker that lets people track all passenger flights in and out on Piarco airport. Use a modern design.

Follow-up direction:

- Hi-fi design.
- Interactive prototype.
- Primary view should be a split layout with a live map plus departures/arrivals board.
- Aesthetic should be utilitarian and data-dense, similar in spirit to operational flight trackers, but original.
- Features should include:
  - live map with aircraft positions
  - departures board
  - arrivals board
  - weather overlay with ceiling, wind, and METAR
- Platform should be responsive desktop and mobile.
- Audience is the general public and travelers meeting someone at the airport.
- Interactions should include:
  - click a flight on the map to open a detail drawer
  - switch arrivals/departures tabs
  - map zoom and pan
  - watchlist star toggle
  - time scrubber for past, now, and future positions
- Add subtle Caribbean/Trinidad context, but keep the interface modern and operational.

## Product Concept

T&T Flight Board is a modern public-facing flight tracker for Trinidad and Tobago's passenger airports: Piarco International Airport, TTPP/POS, and A.N.R. Robinson International Airport, TTCP/TAB.

The product should let a traveler, family member, airport observer, or airport operations enthusiast quickly understand:

- what passenger flights are arriving at POS and TAB
- what passenger flights are departing from POS and TAB
- where aircraft are on the map
- whether a flight is delayed, airborne, boarding, taxiing, landed, or scheduled
- how weather and airport conditions may affect arrivals and departures
- what local geographic context matters around Trinidad, Tobago, the Caribbean, northern South America, and wider Atlantic routes

The product is not meant to copy any existing flight tracker. It should borrow the usefulness of flight tracking tools while using an original interface.

## Design Direction

### Visual Style

The interface should feel like a compact operations dashboard:

- dark near-black background
- dense but readable information
- precise grid and map overlays
- restrained color coding
- small but legible typography
- strong use of monospaced text for operational data
- minimal decorative elements

The design should avoid looking like a generic travel app or marketing landing page. The first screen should be the actual tracker experience.

### Suggested Palette

- Background: near-black
- Panels: dark charcoal
- Lines/grid: low-contrast blue-gray
- Primary live/inbound accent: teal
- Outbound/departure accent: amber
- Delay/alert accent: rose
- Secondary map accent: muted blue

### Typography

- Use a clean sans-serif for general UI.
- Use a monospaced font for:
  - flight numbers
  - airport codes
  - METAR values
  - time values
  - coordinates
  - operational labels

## Core Layout

The primary desktop layout should include:

1. Top live ticker
   - compact strip with recent arrival/departure/weather/status messages

2. Header
   - brand/title
   - METAR/weather strip
   - live clock

3. Main split view
   - left: interactive map
   - right: arrivals/departures board

4. Detail drawer
   - opens when a flight is selected
   - shows route, aircraft, airline, gate, altitude, speed, heading, delay, and status

5. Footer time scrubber
   - allows the user to move aircraft positions backward or forward in time

## Map Requirements

The map should be the main visual surface.

### Geographic Scope

The map should support at least two practical views:

- Local Trinidad/Tobago view
  - Trinidad
  - Tobago
  - Gulf of Paria
  - Caribbean Sea
  - Atlantic Ocean
  - nearby Venezuelan coast
  - Grenada and nearby islands when relevant

- Wider Atlantic route view
  - Trinidad and Tobago
  - Caribbean
  - northern South America
  - eastern/southeastern United States
  - Houston/Texas context
  - New York context
  - Florida/Miami context
  - UK/London context
  - wider North Atlantic

### Geographic Detail

Coastlines should use realistic outlines, not hand-drawn rough polygons. Natural Earth or another public-domain/open map source is acceptable for prototype geometry.

### Map Layers

The map should support:

- landmass outlines
- ocean labels
- country/island labels
- airport markers for TTPP/POS and TTCP/TAB
- aircraft route paths
- aircraft markers
- radar rings
- coordinate grid
- weather overlays in later versions

## Flight Tracking Behavior

### Aircraft

Aircraft markers should:

- look like directional arrows or aircraft sprites
- rotate according to the aircraft's current route bearing
- move along their route path when time changes
- use different colors for inbound, outbound, delayed, and ground states

### Routes

Flight paths should:

- connect the origin airport to the destination airport
- be visible at partial opacity
- show a brighter flown segment from origin to current aircraft position
- use route geometry rather than arbitrary straight decorative strokes
- eventually use great-circle sampling for long-haul realism

### Supported Sample Routes

The prototype should include representative passenger routes such as:

- New York/JFK to POS
- Miami/MIA to POS
- Houston/IAH to POS
- London/LGW or LHR to POS
- Amsterdam/AMS to POS
- Panama City/PTY to POS
- Bridgetown/BGI from POS
- Tobago/TAB to/from POS
- Tobago/TAB to/from London, Frankfurt, Bridgetown, and other relevant passenger routes
- Bogota/BOG to POS
- Atlanta/ATL to POS
- Toronto/YYZ from POS
- Georgetown/GEO from POS
- regional Caribbean routes such as St. Lucia, Antigua, St. Vincent

## Arrivals And Departures Board

The board should be compact, sortable/filterable, and readable.

### Required Board Features

- Arrivals tab
- Departures tab
- flight number
- airline
- origin or destination
- ETA or departure time
- gate
- status
- delay handling
- watchlist star
- search
- filter chips

### Useful Filters

- all
- in air
- ground
- delayed
- international
- regional
- watched

## Detail Drawer

Clicking a flight should open a detail drawer with:

- flight number
- airline
- aircraft type
- origin city and airport code
- destination city and airport code
- route visualization
- gate
- status
- altitude
- speed
- heading
- delay
- scheduled and estimated times

The drawer should be compact and data-forward, not a marketing-style card.

## Weather And Airport Operations

Weather is part of the project concept even if it starts as mock data.

Required weather fields:

- METAR station codes, TTPP and TTCP
- temperature
- wind direction and speed
- visibility
- cloud ceiling/layers
- QNH/pressure
- dew point
- active runway

Future weather overlays:

- wind barb
- ceiling category
- precipitation or storm cells
- runway-use recommendation

## Interaction Requirements

Required interactions:

- pan map
- zoom map
- recenter on Trinidad and Tobago
- broad Atlantic route view
- select aircraft on map
- select flight from board
- open/close detail drawer
- switch arrivals/departures
- star/unstar watchlist items
- search flights
- scrub time backward/forward

Recommended future interactions:

- hover tooltip for aircraft
- highlight route when hovering a flight row
- click row to center map on aircraft
- toggle map layers
- follow selected aircraft

## Responsive Behavior

Desktop:

- split map and board layout
- detail drawer in right column
- persistent header and ticker
- footer scrubber

Mobile:

- map-first layout
- board as bottom sheet or tabbed panel
- compact METAR strip
- detail drawer as full-screen or bottom-sheet panel
- fewer always-on map labels

## Data Model Expectations

A future implementation should separate these concepts:

- airport metadata
- flight schedule data
- live aircraft position data
- route geometry
- weather data
- map geography data

Mock data should remain available as a demo mode.

## Real Data Recommendations

Possible flight data providers:

- ADS-B Exchange
- OpenSky Network
- FlightAware AeroAPI
- Aviationstack
- Cirium

Possible weather data:

- NOAA/METAR sources
- aviationweather.gov
- commercial aviation weather APIs

## Technical Direction

The prototype may start as a standalone HTML/React/Babel app, but a production-quality version should use a build system.

Recommended stack:

- Vite
- React
- SVG or Canvas for the custom map
- modular data files
- TypeScript if the project grows

Important implementation notes:

- Avoid opening the prototype directly as `file://` if it uses browser-loaded JSX. Serve it over local HTTP.
- Convert global `window.*` data into modules when migrating to Vite.
- Keep route math testable and separate from rendering.
- Keep map layer toggles separate from data transforms.

## Current Prototype Caveats

- Flight data is fabricated.
- Callsigns and airline names may be fictional.
- Natural Earth geography is simplified for browser SVG rendering.
- Route curves are approximate and should eventually become great-circle paths.
- Weather is static mock data.
- No real ADS-B, schedule, or METAR feed is connected yet.

## Definition Of A Good Rebuild

A rebuild is on track if the first screen immediately feels like a working tracker:

- the map is visible without scrolling
- aircraft are visible and directional
- route paths connect real origins and destinations
- arrivals/departures board is visible
- selecting a flight updates the detail drawer
- POS, TAB, and Trinidad/Tobago geography are recognizable
- long-haul routes have enough map context to make sense
- the interface feels operational, modern, and data-dense
