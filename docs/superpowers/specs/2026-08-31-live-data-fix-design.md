# Live Data Fix — Design Spec

**Date:** 2026-08-31
**Status:** approved for planning

## Problem

The deployed app (https://piarco-live.pages.dev) badges itself "LIVE" but is not actually pulling live data, for two independent reasons found during investigation:

1. **ADS-B positions never load.** `src/App.tsx` fetches `https://opensky-network.org/api/states/all` directly from the browser. Production console shows:
   ```
   Access to fetch at 'https://opensky-network.org/api/states/all?...' from origin
   'https://piarco-live.pages.dev' has been blocked by CORS policy
   OpenSky fetch failed: TypeError: Failed to fetch
   ```
   This fails 100% of the time — OpenSky does not send an `Access-Control-Allow-Origin` header matching arbitrary client origins, so a direct browser fetch can never succeed regardless of network conditions. The app was built and reviewed without ever seeing this fail, because local dev also hits the same CORS wall and that was logged as "expected, not a bug" without a production follow-up.

   Separately: OpenSky retired HTTP Basic Auth for `/states/all` on 2026-03-18. Anonymous (unauthenticated) requests are capped at 400 credits/day; a bounding-box query the size this app uses (`lamin=8.0&lomin=-70&lamax=14.5&lomax=-57`, 84.5 sq°) costs 2 credits per call. Polling every 60s = 1,440 calls/day = 2,880 credits/day, which blows through the anonymous cap in minutes even if CORS weren't blocking it. A registered account authenticated via OAuth2 client-credentials gets 4,000 credits/day, which fits with margin.

2. **The flight schedule board is entirely static mock data**, not sourced from anything live. `src/data/flights.ts` hardcodes both the generic POS traffic array (`FLIGHTS`) and the `TAB_LIVE_FEED` array shown under the "TAB FEED" label in the board, with `FEED_META.TAB.date` frozen at `'2026-04-20'`. There is no code path that fetches a real schedule from anywhere. Only aircraft *positions* get overwritten with OpenSky data, and only for the subset of static rows whose `id` happens to match a real callsign OpenSky returns.

3. **Side finding:** the deployed app's source (the Vite/TypeScript rebuild, local branch `worktree-vite-rebuild`, currently at commit `b03abf4`) was never merged to `main` or pushed to GitHub. `origin/main` still holds the old plain-JS prototype (no `package.json`, no `src/`). The portfolio site's "View source" link for this project points at that stale `main`, so a visitor clicking it sees code that doesn't match what's running. This needs fixing before anything else, or the drift compounds.

## Decision

Confirmed with the project owner (2026-08-31): fix both gaps.

- **ADS-B (must-fix, fully spec'd here):** proxy the OpenSky call through a Cloudflare Pages Function so the request happens server-side (no browser CORS involved), authenticated via OAuth2 client-credentials for the 4,000-credit/day tier.
- **Schedule board (must-fix, spec'd with one external dependency):** replace the hardcoded `TAB_LIVE_FEED` (and the demo `FLIGHTS` baseline where practical) with a real schedule pulled from FlightAware AeroAPI's Personal tier (the only realistic free/cheap option found — Aviationstack's free tier is 100 requests/*month*, useless for a live board; AeroAPI Personal gives a $5/mo usage credit with no minimum, which at low poll frequency for two small airports should stay within the free credit). This requires the project owner to create a FlightAware AeroAPI account and generate an API key — no agent can do this step.

## Non-goals

- No redesign of the map, board, or visual style.
- No attempt to source a schedule feed for aircraft that aren't real, named flights (the existing illustrative `FLIGHTS` entries like `BW523`/`AA2290` stay as illustrative fallback content when neither live feed has data — see Task 5).
- Not chasing OpenSky's 100%-uptime guarantee — brief feed gaps are acceptable and should degrade to the last-known/static state, not crash the app.

## Research findings (for implementers)

- OpenSky OAuth2 token endpoint: `https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token`, `POST`, `application/x-www-form-urlencoded` body `grant_type=client_credentials&client_id=...&client_secret=...`. Token good for 30 minutes; a 401 on the states call means refresh and retry once.
- AeroAPI docs require a logged-in portal session to view (couldn't be fetched anonymously during this research pass) — Task 4 starts with the implementer reading the live docs at https://www.flightaware.com/aeroapi/portal/documentation after the account exists, and treats the endpoint paths/response field names below as the expected shape to verify, not confirmed fact.
