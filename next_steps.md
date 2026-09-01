# Next Steps

Review this before starting any session. See `work_log.md`'s 2026-09-01 entries for full context, and `docs/superpowers/plans/2026-08-31-live-data-fix.md` for the complete task-by-task plan.

## Now — both live feeds are fully operational

ADS-B positions are live (session 2). AeroAPI schedule board is live with correct rendering (session 4). The full live-data-fix plan is complete.

No immediate blockers remain.

## Live and working

- **ADS-B aircraft positions are genuinely live** (fixed 2026-09-01). `src/App.tsx` fetches `https://opensky.gregstack.xyz/api/opensky` directly from the browser — a Node proxy on the Coolify VPS that does OpenSky's OAuth2 client-credentials flow server-side. Header badge reads "ADS-B LIVE" when working.
- **AeroAPI schedule board is live** (fixed 2026-09-01). `functions/api/schedule.ts` proxies FlightAware AeroAPI via Cloudflare Pages Functions. Board shows real flights with IATA codes, city names, aircraft types, and correct statuses. En-route flights render with trail polylines on the map.
- `origin/main` on GitHub matches the deployed app (fixed 2026-09-01 — previously diverged for weeks).

## How the VPS proxy deploy pattern actually works (learned the hard way)

If you ever add another VPS-hosted proxy/service, this is the real end-to-end recipe — each step below was a genuine blocker the first time:

1. **Forgejo repo:** `fj repo create <name> -H git.newscloud.store --private`. SSH clone/push uses **port 2222**, not 22 — `ssh://git@git.newscloud.store:2222/greg/<repo>.git`. The scp-style shorthand (`git@host:path`) defaults to port 22 and will fail with "Connection refused" from Coolify's build step.
2. **Deploy key:** add the shared `scrollytelling-deploy` key (already used by cv-site/project-site/opensky-proxy) to the new repo's Settings → Deploy Keys via the Forgejo web UI. Public key value is in the Coolify security-keys list (`GET /api/v1/security/keys`).
3. **Coolify app:** create via `POST /api/v1/applications/private-deploy-key` with `project_uuid`, `server_uuid`, `git_repository` (the port-2222 SSH URL), `private_key_uuid`, `build_pack: dockerfile`, `ports_exposes`. `COOLIFY_API_KEY` env var is already set locally; base URL `https://coolify.gregstack.xyz`.
4. **DNS:** add an A record at the registrar (Namecheap-managed nameservers) for the subdomain → `132.145.130.109`. Coolify's own domain fields (`fqdn`, `is_force_https_enabled`) do **not** control TLS here — see next point.
5. **The actual TLS/routing layer is NOT Coolify's docker-label Caddy.** `/home/ubuntu/homelab/caddy/Caddyfile` on the VPS is a **manually-maintained static file** with one explicit block per public domain, each doing `reverse_proxy host.docker.internal:8080` (an internal Traefik that does the final container routing via `traefik.*` docker labels Coolify sets automatically). A new domain needs an explicit block added here — Coolify will never add it for you, and its own `fqdn`/`is_force_https_enabled` API fields are silently ignored by this file. Pattern (matches `cv.gregstack.xyz`):
   ```
   <subdomain>.gregstack.xyz {
       encode zstd gzip
       reverse_proxy host.docker.internal:8080
   }
   ```
   Back up the file first (`cp Caddyfile Caddyfile.bak-$(date +%Y%m%d-%H%M%S)`), append the block, then `docker restart caddy` on the VPS. Cert issuance happens within seconds of the restart if the block is correct — confirm via `docker logs caddy --since 30s | grep <subdomain>`, looking for `"certificate obtained successfully"`.
6. **SSH access:** `con-oci` shell alias (`ssh -i ~/.ssh/firevps.key ubuntu@132.145.130.109`) — already configured, works directly, no need to go through Coolify's UI/API for anything requiring server-level access (container logs, the static Caddyfile, docker inspect).

## Known-good, don't re-break

- The shared `scrollytelling-deploy` deploy key is already added to the `opensky-proxy` repo.
- OpenSky requires OAuth2 client-credentials now (Basic Auth retired 2026-03-18). Credentials are stored as env vars on the Coolify `opensky-proxy` app; do NOT re-fetch/re-paste them into chat or files — they're already set.
- **OpenSky's servers are unreachable from Cloudflare's entire network** (not just CORS) — confirmed via direct testing. Any future OpenSky integration must go through the VPS, never a Cloudflare Pages Function calling OpenSky directly. (This is why the browser calls `opensky.gregstack.xyz` directly instead of relaying through a Cloudflare Function.)
- FlightRadar24's public feed was evaluated and rejected — bot-protected, returns fake-empty data to automated callers, still ToS-risky. Don't revisit unless the bot-protection situation changes.
- Caddy on the VPS is stuck in a perpetual failed-cert retry loop for `coolify.gregstack.xyz` itself (pre-existing, unrelated to piarco-live, not yet investigated) — noisy in `docker logs caddy` but not actually blocking anything found so far.

## Later

- Airport surface detail: terminal/apron zones, taxiway/stand approximations for ground aircraft, active-runway-by-wind-direction.
- Weather: parse real METAR instead of the static copy in the header, add wind barb, cloud ceiling/visibility badges.
- Route polish: clip paths at extreme zoom, add endpoint markers for long-haul origins when zoomed out.
- Tests: unit test route progress/bearing math, add a smoke test for map+board render.
- Product scope decision: is this for travelers/meeters, or an ops-style public dashboard? Should charter/cargo be hidden by default?
