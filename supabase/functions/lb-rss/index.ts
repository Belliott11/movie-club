// Fetches a public Letterboxd diary feed (or one page of a public watchlist) for the club site. Browsers can't read letterboxd.com directly, so this relays it.
// Only accepts a plain username and a page number, and only ever fetches that user's /rss/ or /watchlist/ pages.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  const q = new URL(req.url).searchParams
  const user = q.get("u") ?? ""
  if (!/^[A-Za-z0-9_]{1,40}$/.test(user)) return new Response("Bad username", { status: 400, headers: cors })
  const page = q.get("watchlist") ? parseInt(q.get("watchlist")!) : 0
  if (q.has("watchlist") && !(page >= 1 && page <= 100)) return new Response("Bad page", { status: 400, headers: cors })
  const url = q.has("watchlist") ? `https://letterboxd.com/${user}/watchlist/page/${page}/` : `https://letterboxd.com/${user}/rss/`
  const res = await fetch(url, { headers: { "User-Agent": "movie-club-friends/1.0" } })
  if (!res.ok) return new Response(`Letterboxd said ${res.status}`, { status: res.status === 404 ? 404 : 502, headers: cors })
  return new Response(await res.text(), { headers: { ...cors, "Content-Type": q.has("watchlist") ? "text/html" : "application/xml" } })
})
