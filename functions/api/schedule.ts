import { cachedJson, jsonError } from './_cache';

interface Env {
  AEROAPI_KEY: string;
}

const ICAO_BY_AIRPORT: Record<string, string> = {
  POS: 'TTPP',
  TAB: 'TTCP',
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const airport = new URL(request.url).searchParams.get('airport');
  const icao = airport ? ICAO_BY_AIRPORT[airport] : undefined;
  if (!icao) return jsonError(400, 'airport must be POS or TAB');

  return cachedJson(request, { waitUntil }, 300, async () => {
    try {
      const res = await fetch(`https://aeroapi.flightaware.com/aeroapi/airports/${icao}/flights`, {
        headers: { 'x-apikey': env.AEROAPI_KEY },
      });
      return res.ok ? res : jsonError(502, `AeroAPI returned ${res.status}`);
    } catch (err) {
      return jsonError(502, String(err));
    }
  });
};
