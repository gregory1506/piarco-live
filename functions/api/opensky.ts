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
