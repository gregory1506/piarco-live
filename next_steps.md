# Next Steps

Review this before starting any session. See `work_log.md`'s 2026-09-01 entry for full context, and `docs/superpowers/plans/2026-08-31-live-data-fix.md` for the complete task-by-task plan.

## Now — resume the live-data fix

1. **Diagnose the VPS TLS blocker.** `opensky.gregstack.xyz` (Coolify app `swut1oqmd0c0yd8gtlve9uaq`) builds and deploys fine but HTTPS fails with `tlsv1 alert internal error` on every attempt, even with `is_force_https_enabled: false`. Needs Coolify UI or SSH access to see the actual Caddy container logs — not diagnosable via the Coolify API alone.
2. **Once TLS is sorted (or intentionally bypassed):** point the existing `functions/api/opensky.ts` Cloudflare Pages Function at the VPS proxy over plain `http://opensky.gregstack.xyz/api/opensky` (server-to-server, no mixed-content issue) instead of doing the OAuth2 dance in the Function itself. This sidesteps needing valid TLS on the VPS origin entirely — only the browser→Cloudflare leg needs HTTPS, which already works.
3. Redeploy piarco-live, verify `/api/opensky` returns real aircraft data end-to-end via Chrome DevTools MCP (check Network tab + header badge reads "ADS-B LIVE").
4. Then Task 4 of the plan: manually sign up for FlightAware AeroAPI (Personal tier, $5/mo free credit) to replace the mock schedule board — no agent can do this signup step.

## Known-good, don't re-break

- `origin/main` on GitHub now matches the deployed app (fixed 2026-09-01 — previously diverged for weeks).
- Forgejo SSH is on **port 2222**, not 22 — `ssh://git@git.newscloud.store:2222/greg/<repo>.git`. Got this wrong once already when creating the `opensky-proxy` Coolify app.
- The shared `scrollytelling-deploy` deploy key (used by cv-site/project-site too) is already added to the `opensky-proxy` repo.
- OpenSky requires OAuth2 client-credentials now (Basic Auth retired 2026-03-18). Credentials are stored as env vars on the Coolify `opensky-proxy` app; do NOT re-fetch/re-paste them into chat or files — they're already set.
- **OpenSky's servers are unreachable from Cloudflare's entire network** (not just CORS) — confirmed via direct testing. Any future OpenSky integration must go through the VPS, never a Cloudflare Function calling OpenSky directly.
- FlightRadar24's public feed was evaluated and rejected — bot-protected, returns fake-empty data to automated callers, still ToS-risky. Don't revisit unless the bot-protection situation changes.

## Later

- **Schedule/gate/ETA data is still 100% mock** — see plan Task 4/5 (AeroAPI). This is the second half of making the "LIVE" badge honest.
- Airport surface detail: terminal/apron zones, taxiway/stand approximations for ground aircraft, active-runway-by-wind-direction.
- Weather: parse real METAR instead of the static copy in the header, add wind barb, cloud ceiling/visibility badges.
- Route polish: clip paths at extreme zoom, add endpoint markers for long-haul origins when zoomed out.
- Tests: unit test route progress/bearing math, add a smoke test for map+board render.
- Product scope decision: is this for travelers/meeters, or an ops-style public dashboard? Should charter/cargo be hidden by default?
