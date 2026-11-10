/** Serves `load()` through the Cloudflare edge cache so every visitor in a
 * colo shares one upstream call per `maxAgeSeconds`. Upstream failures are
 * returned uncached. */
export async function cachedJson(
  request: Request,
  ctx: { waitUntil(promise: Promise<unknown>): void },
  maxAgeSeconds: number,
  load: () => Promise<Response>,
): Promise<Response> {
  const cache = caches.default;
  const key = new Request(new URL(request.url).toString(), { method: 'GET' });
  const hit = await cache.match(key);
  if (hit) return hit;

  const upstream = await load();
  if (!upstream.ok) return upstream;

  const res = new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${maxAgeSeconds}`,
    },
  });
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

export function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
