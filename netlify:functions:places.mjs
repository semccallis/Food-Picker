// Proxies requests to Google Places so the API key stays on the server.
// Reads the key from the Netlify environment variable API_KEY.
const ALLOWED = new Set(["places:searchNearby", "places:searchText"]);

export default async (req) => {
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Only accept calls coming from this site's own pages
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(req.url).host) return json({ error: "Forbidden" }, 403);

  const key = Netlify.env.get("API_KEY");
  if (!key) return json({ error: "API_KEY is not set in Netlify environment variables." }, 500);

  let payload;
  try { payload = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
  const { path, body, mask } = payload || {};
  if (!ALLOWED.has(path) || typeof mask !== "string" || mask.length > 1000 || typeof body !== "object")
    return json({ error: "Bad request" }, 400);

  const res = await fetch("https://places.googleapis.com/v1/" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": mask },
    body: JSON.stringify(body),
  });
  return new Response(await res.text(), { status: res.status, headers: { "Content-Type": "application/json" } });
};

export const config = { path: "/api/places" };
