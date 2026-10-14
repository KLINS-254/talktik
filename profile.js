// Vercel serverless profile lookup adapter.
// Configure PROFILE_LOOKUP_URL and PROFILE_LOOKUP_API_KEY in Vercel Environment Variables.
// The provider must be authorized to return public profile data and accept ?username=...
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed." });
  }
  const username = String(req.query?.username || "").replace(/^@+/, "").trim();
  if (!/^[a-zA-Z0-9._]{2,24}$/.test(username)) {
    return res.status(400).json({ message: "Enter a valid username." });
  }
  const endpoint = process.env.PROFILE_LOOKUP_URL;
  const apiKey = process.env.PROFILE_LOOKUP_API_KEY;
  if (!endpoint) {
    return res.status(503).json({ message: "Profile lookup is not configured. Add a compatible provider URL in Vercel Environment Variables." });
  }
  try {
    const url = new URL(endpoint);
    url.searchParams.set("username", username);
    const headers = { Accept: "application/json" };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const upstream = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!upstream.ok) return res.status(502).json({ message: "Profile provider did not return a successful response." });
    const raw = await upstream.json();
    // Provider adapter expects { username, displayName, avatarUrl } or { user: {...} }.
    const p = raw?.user || raw?.profile || raw;
    const foundUsername = String(p?.username || p?.uniqueId || "").replace(/^@+/, "");
    const displayName = String(p?.displayName || p?.nickname || p?.name || "").trim();
    const avatarUrl = String(p?.avatarUrl || p?.avatar || p?.avatarLarger || p?.profilePicture || "").trim();
    if (!foundUsername || !displayName || foundUsername.toLowerCase() !== username.toLowerCase()) {
      return res.status(404).json({ message: "No matching profile details were returned." });
    }
    let safeAvatar = "";
    try {
      const avatar = new URL(avatarUrl);
      if (avatar.protocol === "https:") safeAvatar = avatar.toString();
    } catch (_) {}
    return res.status(200).json({ username: foundUsername, displayName, avatarUrl: safeAvatar });
  } catch (error) {
    return res.status(502).json({ message: "Profile provider could not be reached. Check its configuration." });
  }
}
