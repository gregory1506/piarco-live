interface Env {
  AEROAPI_KEY: string;
}

const ICAO_BY_AIRPORT: Record<string, string> = {
  POS: 'TTPP',
  TAB: 'TTCP',
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const airport = url.searchParams.get('airport');
  const icao = airport ? ICAO_BY_AIRPORT[airport] : undefined;
  if (!icao) {
    return new Response(JSON.stringify({ error: 'airport must be POS or TAB' }), { status: 400 });
  }

  try {
    const res = await fetch(
      `https://aeroapi.flightaware.com/aeroapi/airports/${icao}/flights`,
      { headers: { 'x-apikey': env.AEROAPI_KEY } },
    );

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `AeroAPI returned ${res.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await res.text();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
