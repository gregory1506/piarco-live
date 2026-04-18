# Next Steps

## 1. Replace Mock Data With Real Feeds

The biggest credibility jump is moving from fabricated flight and vessel data to real or semi-real sources.

- Evaluate flight data providers:
  - ADS-B Exchange
  - OpenSky Network
  - Aviationstack
  - FlightAware AeroAPI
  - Cirium, if commercial-grade schedules are needed
- Separate scheduled airport board data from live aircraft positions.
- Add a data freshness indicator per feed.
- Show clear fallback states when live aircraft position is unavailable but scheduled flight data exists.
- Keep the current mock data as a local demo mode.

## 2. Improve Route Geometry

The current route curves are credible for a prototype, but still approximate.

- Replace quadratic SVG route curves with great-circle route sampling.
- Add route clipping so paths do not visually overrun the map at extreme zoom levels.
- Separate route path styling by status:
  - inbound
  - outbound
  - delayed
  - landed
  - scheduled but not airborne
- Add airport endpoint markers for long-haul origins when zoomed out.

## 3. Add Real Airport Surface Detail

Piarco is currently represented as a point marker. A realistic airport layer would improve local zoom views.

- Add runway 10/28 geometry.
- Add terminal/apron zones.
- Add taxiway/stand approximations for ground aircraft.
- Place grounded aircraft near the terminal instead of stacking them at the airport coordinate.
- Show active runway based on wind direction.

## 4. Make Maritime Optional

The ship layer is useful, but it should not compete with the main flight-tracking experience.

- Add a map layer toggle for:
  - aircraft
  - ship traffic
  - ports
  - weather
  - routes
- Consider hiding maritime labels at low zoom.
- Add ship count stats only when the maritime layer is enabled.
- Keep vessel traffic limited to Trinidad/Tobago arrivals, departures, ferry, and energy traffic.

## 5. Add Weather And Operational Overlays

Weather was part of the original design brief and can become a strong differentiator.

- Add METAR parsing instead of static METAR copy.
- Add wind barb or wind direction indicator near TTPP.
- Add cloud ceiling and visibility badges.
- Add precipitation or storm-cell overlay if a weather API is used.
- Add runway recommendation based on wind direction.

## 6. Improve Interaction Design

The prototype has map clicks and a detail drawer, but the data layers can be more discoverable.

- Add hover tooltips for aircraft, ships, ports, and airports.
- Let route paths highlight when hovering a flight row.
- Let clicking a flight row center the map on that aircraft.
- Add a "follow selected" toggle.
- Add keyboard shortcuts for:
  - arrivals/departures tabs
  - recenter
  - Atlantic view
  - search focus

## 7. Mobile Layout Pass

The design is desktop-first. A specific mobile pass will prevent the board and map from fighting for space.

- Make the map full-screen first on mobile.
- Put arrivals/departures in a bottom sheet.
- Collapse METAR into a horizontal strip.
- Move detail drawer to a full-height mobile panel.
- Reduce always-on labels on the map at narrow widths.

## 8. Convert The Prototype To A Buildable App

The current app loads React and Babel in the browser, which is fine for prototyping but fragile for normal use.

- Move to Vite or another lightweight build setup.
- Convert global `window.*` data into ES modules.
- Add npm scripts for local dev and build.
- Add a production build output.
- Add a favicon to remove the current harmless browser 404.

## 9. Add Basic Tests

The app is visual, but a few tests would protect the routing and projection logic.

- Unit test route progress and bearing calculations.
- Unit test route point generation for inbound and outbound flights.
- Add a smoke test that loads the app and checks:
  - map SVG exists
  - flights render
  - ports render
  - arrivals/departures board renders
- Add visual regression screenshots once the layout stabilizes.

## 10. Data And Product Boundaries

Before connecting real feeds, decide exactly what this product is.

- Is this mainly for travelers and people meeting arrivals?
- Is it an ops-style public dashboard?
- Should cargo, private, and charter flights be hidden by default?
- Should ship traffic stay as a secondary context layer or become a full mode?
- Should Trinidad/Tobago airport and port coverage expand beyond Piarco?

## Recommended Immediate Order

1. Convert the app to Vite so local development is reliable.
2. Add runway and airport surface geometry for Piarco.
3. Replace the current route curve math with great-circle sampling.
4. Add hover/click interactions that link board rows, aircraft, ships, and paths.
5. Add a layer toggle panel for flights, ships, ports, weather, and routes.
6. Start evaluating real flight schedule and ADS-B data providers.
