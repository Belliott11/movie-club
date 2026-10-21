// Fetches a public Letterboxd diary feed for the club site. Browsers can't read letterboxd.com directly, so this relays it.
// Only accepts a plain username, and only ever fetches that user's /rss/ page.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  const user = new URL(req.url).searchParams.get("u") ?? ""
  if (!/^[A-Za-z0-9_]{1,40}$/.test(user)) return new Response("Bad username", { status: 400, headers: cors })
  const res = await fetch(`https://letterboxd.com/${user}/rss/`, { headers: { "User-Agent": "movie-club-friends/1.0" } })
  if (!res.ok) return new Response(`Letterboxd said ${res.status}`, { status: res.status === 404 ? 404 : 502, headers: cors })
  return new Response(await res.text(), { headers: { ...cors, "Content-Type": "application/xml" } })
})
