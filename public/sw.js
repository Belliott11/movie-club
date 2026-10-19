// Keeps the site opening with no signal. Data itself comes from Supabase; the app keeps its own saved copy for offline reading.
const CACHE = "movie-club-v1"
const FRESH = [/\/config\.js$/, /\/manifest\.webmanifest$/]

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k)
    await self.clients.claim()
  })())
})

self.addEventListener("fetch", e => {
  const req = e.request
  if (req.method !== "GET") return
  const url = new URL(req.url)
  const mine = url.origin === location.origin
  const assets = url.hostname === "image.tmdb.org" || url.hostname === "fonts.gstatic.com" || url.hostname === "fonts.googleapis.com"
  if (!mine && !assets) return // Supabase, TMDB and OMDb data always go to the network

  const networkFirst = req.mode === "navigate" || FRESH.some(r => r.test(url.pathname))
  e.respondWith((async () => {
    const cache = await caches.open(CACHE)
    const cached = await cache.match(req, { ignoreSearch: false })
    const fetchAndStore = fetch(req).then(res => {
      if (res.ok || res.type === "opaque") cache.put(req, res.clone())
      return res
    })
    if (networkFirst) {
      try { return await fetchAndStore } catch { return cached || (await cache.match(self.registration.scope)) || Response.error() }
    }
    if (cached) { fetchAndStore.catch(() => {}); return cached } // stale while revalidate
    return fetchAndStore
  })())
})
