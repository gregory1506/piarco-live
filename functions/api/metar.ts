import { cachedJson, jsonError } from './_cache';

// aviationweather.gov sends no CORS headers, so the browser reads METARs
// through this function. Reports update hourly; 10 minutes keeps them fresh.
export const onRequestGet: PagesFunction = async ({ request, waitUntil }) =>
  cachedJson(request, { waitUntil }, 600, async () => {
    try {
      const res = await fetch('https://aviationweather.gov/api/data/metar?ids=TTPP,TTCP&format=json', {
        headers: { 'User-Agent': 'piarco-live (https://piarco-live.pages.dev)' },
      });
      return res.ok ? res : jsonError(502, `aviationweather.gov returned ${res.status}`);
    } catch (err) {
      return jsonError(502, String(err));
    }
  });
