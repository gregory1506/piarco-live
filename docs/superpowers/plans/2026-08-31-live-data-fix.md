# Live Data Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make piarco-live actually pull live data — real ADS-B aircraft positions via a proxied OpenSky call, and a real flight schedule via FlightAware AeroAPI — instead of failing silently and falling back to hardcoded mock data.

**Architecture:** Two Cloudflare Pages Functions (`functions/api/opensky.ts`, `functions/api/schedule.ts`) do the external HTTP calls server-side, where there's no browser CORS restriction and secrets can be stored safely. The React app calls same-origin `/api/...` paths instead of the external APIs directly. OpenSky gives aircraft positions/altitude/speed for anything airborne in the bounding box; AeroAPI gives the schedule (gates, ETAs, origin/dest) for named flights at TTPP/TTCP. The existing merge-by-callsign logic in `App.tsx` continues to combine them; illustrative mock flights remain as fallback content only when a real feed has nothing for that slot.

**Tech Stack:** React 18, TypeScript 5.6, Vite 5, Cloudflare Pages + Pages Functions, OpenSky REST API (OAuth2 client-credentials), FlightAware AeroAPI (Personal tier).

**Spec:** `docs/superpowers/specs/2026-08-31-live-data-fix-design.md`

## Global Constraints

- All new external calls happen in Pages Functions (`functions/api/*.ts`), never directly from `src/` browser code — this is the whole fix, don't reintroduce a direct browser→external-API fetch.
- Secrets (`OPENSKY_CLIENT_ID`, `OPENSKY_CLIENT_SECRET`, `AEROAPI_KEY`) are set via `npx wrangler pages secret put <NAME> --project-name piarco-live`, never committed to the repo or hardcoded.
- `tsc --noEmit && vite build` (the existing `npm run build` script) must stay clean after every task.
- Every task ends with a real `wrangler pages dev` (local Functions emulation) check before moving on — Pages Functions don't run under plain `vite dev`.
- Work happens on `main` in the primary checkout at `/Users/gregoryollivierre/Projects/Web_and_Apps/GREG_V2/piarco-live` (not a new worktree) — Task 1 first merges the only-ever-local rebuild branch into `main`, so from Task 2 onward there is one canonical branch.

---

### Task 1: Merge the rebuild branch into `main` and push to GitHub

The deployed app's entire source currently exists only in the local branch `worktree-vite-rebuild` (last commit `b03abf4`), never merged or pushed. `origin/main` still holds the old plain-JS prototype with no `package.json`. The portfolio site's "View source" link points at `main`, so right now it's misleading. Fix this before touching any code, or every task after this one edits a branch nobody can see on GitHub.

**Files:**
- No file edits — this is a git operation.

**Interfaces:**
- Produces: a `main` branch (local and pushed to `origin`) whose `HEAD` is the Vite/TypeScript rebuild, so Task 2 onward branches from/commits to it directly.

- [ ] **Step 1: Confirm the worktree branch is what's actually deployed**

```bash
cd /Users/gregoryollivierre/Projects/Web_and_Apps/GREG_V2/piarco-live
git log --oneline -1 worktree-vite-rebuild
# expect: b03abf4 Add Cloudflare Pages config; remove superseded prototype files
```

- [ ] **Step 2: Remove the worktree so the branch can be merged into the primary checkout**

```bash
git worktree remove .worktrees/vite-rebuild
```

If this fails because of uncommitted changes inside the worktree, stop and inspect with `git -C .worktrees/vite-rebuild status` before proceeding — don't discard anything unexpected.

- [ ] **Step 3: Merge into `main`**

```bash
git checkout main
git merge worktree-vite-rebuild --no-ff -m "Merge Vite/TypeScript rebuild into main

The rebuild (11-task subagent-driven pipeline, completed 2026-08-29,
deployed to Cloudflare Pages) existed only in a local branch. Merging
into main so the public GitHub repo matches what's actually running."
```

- [ ] **Step 4: Verify the build still works from `main`**

```bash
npm install
npm run build
# expect: tsc --noEmit passes, vite build produces dist/
```

- [ ] **Step 5: Push to GitHub**

```bash
git push origin main
git branch -d worktree-vite-rebuild
```

- [ ] **Step 6: Confirm on GitHub**

```bash
curl -s https://raw.githubusercontent.com/gregory1506/piarco-live/main/package.json | head -5
# expect: real package.json content, not a 404
```

---

### Task 2: Add the OpenSky Pages Function proxy (OAuth2 client-credentials)

Fixes the CORS failure and the auth deprecation by moving the OpenSky call server-side, authenticated, with the token cached across warm invocations instead of re-fetched every call.

**Prerequisite (manual, do this yourself before Task 2 starts):**
Register a free account at https://opensky-network.org/, then create an API client under your account settings to get a `client_id` / `client_secret` pair (OpenSky's docs call this "API Client" — Basic Auth username/password no longer works as of 2026-03-18).

**Files:**
- Create: `functions/api/opensky.ts`
- Modify: `src/App.tsx:150-173` (fetch URL + interval)
- Modify: `src/components/Header.tsx:31` (badge text bug — see Step 5)

**Interfaces:**
- Produces: `GET /api/opensky` → same JSON shape as OpenSky's `/api/states/all` (`{ time, states }`), so `openSkyToFlight()` in `App.tsx` (line 34) needs no changes.
- Consumes: Cloudflare Pages Function environment secrets `OPENSKY_CLIENT_ID`, `OPENSKY_CLIENT_SECRET`.

- [ ] **Step 1: Set the secrets**

```bash
cd /Users/gregoryollivierre/Projects/Web_and_Apps/GREG_V2/piarco-live
npx wrangler pages secret put OPENSKY_CLIENT_ID --project-name piarco-live
npx wrangler pages secret put OPENSKY_CLIENT_SECRET --project-name piarco-live
```

- [ ] **Step 2: Write the proxy function**

```typescript
// functions/api/opensky.ts
interface Env {
  OPENSKY_CLIENT_ID: string;
  OPENSKY_CLIENT_SECRET: string;
}

const TOKEN_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const STATES_URL = 'https://opensky-network.org/api/states/all';
const BBOX = 'lamin=8.0&lomin=-70&lamax=14.5&lomax=-57';

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(env: Env): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.OPENSKY_CLIENT_ID,
      client_secret: env.OPENSKY_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`OpenSky token request failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };

  // Refresh 60s before actual expiry to avoid a race against a 30-minute token.
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
  return cachedToken.value;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const token = await getToken(env);
    let res = await fetch(`${STATES_URL}?${BBOX}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      // Token expired early or was rejected — refresh once and retry.
      cachedToken = null;
      const freshToken = await getToken(env);
      res = await fetch(`${STATES_URL}?${BBOX}`, {
        headers: { Authorization: `Bearer ${freshToken}` },
      });
    }

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `OpenSky returned ${res.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await res.text();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

- [ ] **Step 3: Point the app at the proxy and widen the poll interval for credit safety**

In `src/App.tsx`, replace lines 150–152 and the interval on line 171:

```typescript
// was:
//   const BBOX = 'lamin=8.0&lomin=-70&lamax=14.5&lomax=-57';
//   const URL = 'https://opensky-network.org/api/states/all?' + BBOX;
const URL = '/api/opensky';
```

```typescript
// was: const i = setInterval(fetchFlights, 60000);
const i = setInterval(fetchFlights, 90000); // 90s: 960 calls/day * 2 credits = 1,920, well under the 4,000/day authenticated cap
```

- [ ] **Step 4: Verify locally with Functions emulation**

```bash
npm run build
npx wrangler pages dev dist --compatibility-date=2026-08-31
```

Open the printed local URL, check the Network tab: `GET /api/opensky` should return `200` with a real `states` array (or `[]` if nothing is currently over the bounding box — that's fine, it means the call succeeded, not that it failed).

- [ ] **Step 5: Fix the misleading "LIVE" badge**

`src/components/Header.tsx:31` currently shows the text `"LIVE"` even when `openSkyStatus` is `'error'` or `'idle'` — the exact bug this whole plan exists to fix, still visible if the feed ever goes down again. Change it to be honest about state:

```typescript
// was:
// <span title={`ADS-B: ${openSkyStatus}`}>{openSkyStatus === 'ok' ? 'ADS-B LIVE' : 'LIVE'}</span>
<span title={`ADS-B: ${openSkyStatus}`}>
  {openSkyStatus === 'ok' ? 'ADS-B LIVE' : openSkyStatus === 'loading' ? 'ADS-B CONNECTING' : 'ADS-B OFFLINE'}
</span>
```

- [ ] **Step 6: Commit**

```bash
git add functions/api/opensky.ts src/App.tsx src/components/Header.tsx
git commit -m "Proxy OpenSky through a Pages Function to fix CORS and OAuth2 auth

Direct browser calls to opensky-network.org were blocked by CORS in
production (100% failure rate) and would have hit OpenSky's deprecated
Basic Auth / anonymous rate limit anyway. The proxy runs server-side
with OAuth2 client-credentials, cached across warm invocations."
```

---

### Task 3: Deploy and verify Task 2 end-to-end on the live site

Local `wrangler pages dev` emulation isn't a substitute for the real edge environment (secrets, real network path to OpenSky). Confirm the actual fix before building on top of it.

**Files:** none — deploy + verification only.

- [ ] **Step 1: Deploy**

```bash
cd /Users/gregoryollivierre/Projects/Web_and_Apps/GREG_V2/piarco-live
npm run build
npx wrangler pages deploy dist --project-name piarco-live
```

- [ ] **Step 2: Verify the proxy directly**

```bash
curl -s https://piarco-live.pages.dev/api/opensky | head -c 300
# expect: {"time":...,"states":[[...]]} — NOT an HTML error page, NOT a CORS error (server-to-server, no CORS applies)
```

- [ ] **Step 3: Verify in a real browser via Chrome DevTools MCP**

Navigate to `https://piarco-live.pages.dev/`, check network requests and console — expect `GET /api/opensky` to return `200` (same-origin, no CORS entry in the console at all) and the header badge to read "ADS-B LIVE" within ~90s of load. If it stays on "ADS-B OFFLINE", check the Function's logs with `npx wrangler pages deployment tail --project-name piarco-live` for the actual OpenSky error before debugging further.

- [ ] **Step 4: Update `next_steps.md` / `work_log.md`**

Log completion of the ADS-B fix per the repo's existing work-tracker convention (see prior entries in `work_log.md`).

---

### Task 4: Confirm AeroAPI access and the real response shape

**This task has a manual prerequisite the project owner must complete — no agent can sign up for a third-party paid service.**

- [ ] **Step 1 (manual, project owner):** Create an account at https://www.flightaware.com/aeroapi/portal/ , confirm the Personal tier ($5/month usage credit, no minimum) is active, and generate an API key from the portal.
- [ ] **Step 2 (manual, project owner):** Set the secret:
  ```bash
  npx wrangler pages secret put AEROAPI_KEY --project-name piarco-live
  ```
- [ ] **Step 3 (implementer, once the key exists):** Log into the portal and read the current docs at https://www.flightaware.com/aeroapi/portal/documentation for the airport-flights endpoint. At the time this plan was written (without portal access) the expected shape, per AeroAPI v4's public conventions, is:
  ```
  GET https://aeroapi.flightaware.com/aeroapi/airports/{id}/flights
  Header: x-apikey: <AEROAPI_KEY>
  ```
  where `{id}` is an ICAO code (`TTPP` for Piarco, `TTCP` for Crown Point/Tobago), and the response has separate `arrivals` / `departures` / `scheduled_arrivals` / `scheduled_departures` arrays, each entry carrying at minimum an `ident` (flight number), `origin.code`/`destination.code`, `scheduled_out`/`estimated_in`/`actual_in` (ISO timestamps), and a `status` string. **Verify this against the real response before writing Task 5** — run one real call and save the output:
  ```bash
  curl -s -H "x-apikey: $AEROAPI_KEY" \
    "https://aeroapi.flightaware.com/aeroapi/airports/TTPP/flights" \
    | tee /tmp/aeroapi-sample-ttpp.json | head -c 2000
  ```
  If the path, header name, or field names differ from the above, Task 5's mapping function must be written against what you actually got back, not this guess.

- [ ] **Step 4: Commit the verified sample as a fixture for Task 5's tests**

```bash
mkdir -p src/data/__fixtures__
cp /tmp/aeroapi-sample-ttpp.json src/data/__fixtures__/aeroapi-sample-ttpp.json
git add src/data/__fixtures__/aeroapi-sample-ttpp.json
git commit -m "Add real AeroAPI response sample as a fixture for schedule mapping"
```

---

### Task 5: Add the AeroAPI Pages Function proxy and real schedule mapping

**Files:**
- Create: `functions/api/schedule.ts`
- Create: `src/data/scheduleFeed.ts`
- Modify: `src/App.tsx` (consume the fetched schedule instead of only the static `TAB_LIVE_FEED`)
- Modify: `src/data/flights.ts` (keep `FLIGHTS`'s hand-written entries as illustrative fallback only, per the spec's non-goals)

**Interfaces:**
- Produces (`functions/api/schedule.ts`): `GET /api/schedule?airport=TTPP` → passthrough JSON from AeroAPI for that airport.
- Produces (`src/data/scheduleFeed.ts`): `mapAeroApiToFlights(raw: unknown): Flight[]` — pure function, unit-testable against the Task 4 fixture, mapping AeroAPI's response shape to the existing `Flight` type from `src/data/types.ts:30-51`.
- Consumes: the `Flight` interface (unchanged) and `FEED_META` shape from `src/data/types.ts:73-79`.

- [ ] **Step 1: Write the proxy function**

```typescript
// functions/api/schedule.ts
interface Env {
  AEROAPI_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const airport = url.searchParams.get('airport');
  if (airport !== 'TTPP' && airport !== 'TTCP') {
    return new Response(JSON.stringify({ error: 'airport must be TTPP or TTCP' }), { status: 400 });
  }

  const res = await fetch(`https://aeroapi.flightaware.com/aeroapi/airports/${airport}/flights`, {
    headers: { 'x-apikey': env.AEROAPI_KEY },
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: `AeroAPI returned ${res.status}` }), { status: 502 });
  }

  const body = await res.text();
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120' },
  });
};
```

- [ ] **Step 2: Write the mapping function against the Task 4 fixture**

Write this against the *actual* saved fixture (`src/data/__fixtures__/aeroapi-sample-ttpp.json`), adjusting field paths to match what Task 4 verified. Starting point, assuming the expected shape held:

```typescript
// src/data/scheduleFeed.ts
import type { Flight, FlightStatus } from './types';
import { AIRPORTS } from './airports';

interface AeroApiFlight {
  ident: string;
  origin?: { code: string };
  destination?: { code: string };
  scheduled_out?: string;
  scheduled_in?: string;
  estimated_in?: string;
  actual_in?: string;
  gate_destination?: string;
  status?: string;
}

interface AeroApiResponse {
  arrivals?: AeroApiFlight[];
  departures?: AeroApiFlight[];
  scheduled_arrivals?: AeroApiFlight[];
  scheduled_departures?: AeroApiFlight[];
}

function toHHMM(iso: string | undefined): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function toStatus(raw: string | undefined): FlightStatus {
  const s = (raw || '').toLowerCase();
  if (s.includes('land')) return 'landed';
  if (s.includes('cancel')) return 'canceled';
  if (s.includes('taxi')) return 'taxi';
  if (s.includes('depart') || s.includes('air')) return 'enroute';
  return 'scheduled';
}

function mapOne(f: AeroApiFlight): Flight | null {
  const origin = f.origin?.code ?? '???';
  const dest = f.destination?.code ?? '???';
  const airportCode = AIRPORTS[origin] ? origin : dest;
  const apron = AIRPORTS[airportCode];
  if (!apron) return null;

  return {
    id: f.ident,
    airline: f.ident.slice(0, 2),
    type: '???',
    origin,
    dest,
    status: toStatus(f.status),
    eta: toHHMM(f.estimated_in ?? f.scheduled_in),
    dep: toHHMM(f.scheduled_out),
    gate: f.gate_destination ?? '—',
    lat: apron.lat,
    lon: apron.lon,
    alt: 0,
    spd: 0,
    hdg: 0,
    track: 'gate',
    dist: 0,
    delay: 0,
    routeProgress: 0,
    sourceStatus: f.status,
  };
}

export function mapAeroApiToFlights(raw: unknown): Flight[] {
  const data = raw as AeroApiResponse;
  const all = [
    ...(data.arrivals ?? []),
    ...(data.departures ?? []),
    ...(data.scheduled_arrivals ?? []),
    ...(data.scheduled_departures ?? []),
  ];
  const seen = new Set<string>();
  const out: Flight[] = [];
  for (const f of all) {
    if (seen.has(f.ident)) continue;
    seen.add(f.ident);
    const mapped = mapOne(f);
    if (mapped) out.push(mapped);
  }
  return out;
}
```

- [ ] **Step 3: Fetch and merge the real schedule in `App.tsx`**

Add a second effect alongside the existing OpenSky one (near `src/App.tsx:150`):

```typescript
const [scheduleFlights, setScheduleFlights] = useState<Flight[]>([]);
const [scheduleStatus, setScheduleStatus] = useState('idle');

useEffect(() => {
  const fetchSchedule = () => {
    setScheduleStatus('loading');
    Promise.all([
      fetch('/api/schedule?airport=TTPP').then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
      fetch('/api/schedule?airport=TTCP').then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    ])
      .then(([ttpp, ttcp]) => {
        setScheduleFlights([...mapAeroApiToFlights(ttpp), ...mapAeroApiToFlights(ttcp)]);
        setScheduleStatus('ok');
      })
      .catch((err) => {
        console.warn('Schedule fetch failed:', err);
        setScheduleStatus('error');
      });
  };
  fetchSchedule();
  const i = setInterval(fetchSchedule, 5 * 60 * 1000); // 5 min — schedule data changes slowly
  return () => clearInterval(i);
}, []);
```

Import `mapAeroApiToFlights` from `./data/scheduleFeed` at the top of `App.tsx`.

Change the `liveFlights` memo (`src/App.tsx:180-195`) to build its base list from `scheduleFlights` when the schedule feed is healthy, falling back to the static `FLIGHTS` array otherwise:

```typescript
const baseFlights = scheduleStatus === 'ok' && scheduleFlights.length > 0 ? scheduleFlights : FLIGHTS;
```

...and use `baseFlights` everywhere `FLIGHTS` was used inside that memo (the `.map`, `staticIds`, `groundIndex` calls). This keeps the existing mock array as the honest fallback when AeroAPI has nothing (rate-limited, key revoked, etc.) instead of the app crashing or showing an empty board.

- [ ] **Step 4: Update `FEED_META` to reflect a live source instead of a frozen date**

In `src/data/flights.ts`, remove the hardcoded `date: '2026-04-20'` claim — the label should describe the mechanism, not a specific stale snapshot:

```typescript
export const FEED_META: Record<string, FeedMeta> = {
  TAB: {
    label: 'AeroAPI live schedule feed',
    source: 'FlightAware AeroAPI (Personal tier)',
    note: 'Falls back to illustrative demo flights if the live feed is unavailable.',
  },
};
```

- [ ] **Step 5: Build and verify locally**

```bash
npm run build
npx wrangler pages dev dist --compatibility-date=2026-08-31
```

Confirm no TypeScript errors and that the board renders (with either real or fallback data — the fixture from Task 4 doesn't require a live key to sanity-check the mapping function in isolation).

- [ ] **Step 6: Commit**

```bash
git add functions/api/schedule.ts src/data/scheduleFeed.ts src/App.tsx src/data/flights.ts
git commit -m "Pull the flight schedule board from AeroAPI instead of hardcoded mock data

Falls back to the existing illustrative FLIGHTS array when the live
feed errors, so the app degrades gracefully instead of breaking."
```

---

### Task 6: Deploy, verify, and close out

**Files:** none — deploy + verification + doc updates.

- [ ] **Step 1: Deploy**

```bash
cd /Users/gregoryollivierre/Projects/Web_and_Apps/GREG_V2/piarco-live
npm run build
npx wrangler pages deploy dist --project-name piarco-live
```

- [ ] **Step 2: Verify both feeds live, via Chrome DevTools MCP**

Navigate to `https://piarco-live.pages.dev/`, confirm in the Network tab: `GET /api/opensky` → 200, `GET /api/schedule?airport=TTPP` → 200, `GET /api/schedule?airport=TTCP` → 200, no CORS errors in the console, header badge reads "ADS-B LIVE", and the board's flight rows have plausible current-day times (not `2026-04-20`-era data).

- [ ] **Step 3: Update `work_log.md` and `next_steps.md`**

Follow the existing convention in those files (see the Aug 27–29 entries) — log what changed, files touched, and status. If AeroAPI's $5/mo credit turns out too tight for the 5-minute poll interval in practice, note that as a follow-up rather than silently changing the interval.

- [ ] **Step 4: Confirm the portfolio's "View source" link now matches reality**

```bash
curl -s https://raw.githubusercontent.com/gregory1506/piarco-live/main/functions/api/opensky.ts | head -3
```

Should return real file content — confirms Task 1's merge/push is still holding and the portfolio link (added earlier at `project-site/content/projects/piarco-live.md`) isn't misleading anyone.
