// Optional recent LIVE gift event endpoint.
// Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as Vercel Environment Variables.
// For a public demo, protect this endpoint with your own authentication before production use.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed." });
  }
  const supabaseUrl = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !key) return res.status(503).json({ connected: false, message: "LIVE event storage is not configured." });
  try {
    const url = new URL("/rest/v1/live_gift_events", supabaseUrl);
    url.searchParams.set("select", "event_id,sender_username,gift_name,gift_count,demo_points,created_at");
    url.searchParams.set("order", "created_at.desc");
    url.searchParams.set("limit", "10");
    const response = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return res.status(502).json({ connected: false, message: "Could not read LIVE events." });
    return res.status(200).json({ connected: true, events: await response.json() });
  } catch (_) {
    return res.status(502).json({ connected: false, message: "LIVE event storage could not be reached." });
  }
}
