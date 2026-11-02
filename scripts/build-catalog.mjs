// Sorts every film on the club's watchlists into the facts the pick cards need (runtime, language, countries, genres, directors,
// black and white, silent, true story, franchise, budget, woman director, Oscars) and writes public/catalog.json for the site to read.
// Run it again whenever the watchlists have grown:  npm run catalog
// Reads the keys from public/config.js, takes a few minutes, and keeps what it already knows between runs.
import { readFileSync, writeFileSync, existsSync } from "node:fs"

const CONFIG = new Function(`${readFileSync("public/config.js", "utf8")}; return CONFIG`)()
const OUT = "public/catalog.json"
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url)
      if (res.status === 429) { await sleep(1500 * (i + 1)); continue }
      if (!res.ok) return null
      return await res.json()
    } catch { await sleep(500 * (i + 1)) }
  }
  return null
}
const tmdb = (path, q = "") => getJson(`https://api.themoviedb.org/3${path}?api_key=${CONFIG.TMDB_KEY}${q}`)

// every watchlist row, a page at a time
const rows = []
for (let off = 0; ; off += 1000) {
  const r = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/watchlist?select=title,year&order=title&limit=1000&offset=${off}`, { headers: { apikey: CONFIG.SUPABASE_KEY, Authorization: `Bearer ${CONFIG.SUPABASE_KEY}` } })
  const part = await r.json()
  rows.push(...part)
  if (part.length < 1000) break
}
const films = [...new Map(rows.filter(r => r.title && r.year).map(r => [`${r.title}|${r.year}`, { t: r.title, y: r.year }])).values()]
console.log(`${rows.length} watchlist rows, ${films.length} different films`)

const old = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { films: [] }
const done = new Map(old.films.map(f => [`${f.t}|${f.y}`, f]))
// films with no poster recorded are looked up again (older catalogs didn't keep it), keeping what they already know
const todo = films.filter(f => { const e = done.get(`${f.t}|${f.y}`); return !e || (e.id && !e.p) })
console.log(`${todo.length} to look up`)

const has = (kw, ...names) => kw.some(k => names.some(n => k === n || k.includes(n)))
async function look({ t, y }) {
  let hit = (await tmdb("/search/movie", `&query=${encodeURIComponent(t)}&year=${y}`))?.results?.[0]
  if (!hit) hit = (await tmdb("/search/movie", `&query=${encodeURIComponent(t)}`))?.results?.find(r => Math.abs(+(r.release_date ?? "").slice(0, 4) - y) <= 1)
  if (!hit) return { t, y, id: 0 }
  const d = await tmdb(`/movie/${hit.id}`, "&append_to_response=keywords,credits,external_ids")
  if (!d?.id) return { t, y, id: 0 }
  const kw = (d.keywords?.keywords ?? []).map(k => String(k.name).toLowerCase())
  const dirs = (d.credits?.crew ?? []).filter(c => c.job === "Director")
  const e = { t, y, id: d.id, v: d.vote_count ?? 0 }
  if (d.poster_path) e.p = d.poster_path
  const was = done.get(`${t}|${y}`)
  if (was?.o !== undefined) e.o = was.o
  if (d.runtime) e.rt = d.runtime
  if (d.original_language) e.l = d.original_language
  const cc = d.origin_country?.length ? d.origin_country : (d.production_countries ?? []).map(c => c.iso_3166_1)
  if (cc.length) e.cc = cc
  if (d.genres?.length) e.g = d.genres.map(g => g.name)
  if (dirs.length) { e.d = [...new Set(dirs.map(c => c.name))].slice(0, 2); if (dirs.some(c => c.gender === 1)) e.wd = 1 }
  if (kw.length) {
    e.kn = 1 // TMDB has keywords for it, so a missing tag means the film really lacks it
    if (has(kw, "black and white")) e.bw = 1
    if (has(kw, "silent film")) e.si = 1
    if (has(kw, "based on true story", "true story")) e.ts = 1
  }
  if (d.belongs_to_collection || has(kw, "sequel", "prequel", "franchise")) e.fr = 1
  if (d.budget > 0) e.b = d.budget
  if (d.external_ids?.imdb_id) e.im = d.external_ids.imdb_id
  return e
}

// a pool of workers, a few requests at a time
let next = 0, n = 0
const results = new Map(done)
async function worker() {
  while (next < todo.length) {
    const f = todo[next++]
    results.set(`${f.t}|${f.y}`, await look(f))
    if (++n % 100 === 0) { console.log(`${n} / ${todo.length}`); save() }
  }
}
function save() {
  const list = films.map(f => results.get(`${f.t}|${f.y}`)).filter(Boolean)
  writeFileSync(OUT, JSON.stringify({ built: new Date().toISOString().slice(0, 10), films: list }))
}
await Promise.all(Array.from({ length: 8 }, worker))
save()

// OMDb gives the outside scores (IMDb, Rotten Tomatoes, Metacritic) and the Oscars. Its free key allows about a thousand calls a day, so the
// best-known films go first and a rerun tomorrow carries on where this stopped.
if (CONFIG.OMDB_KEY) {
  const all = [...results.values()].filter(e => e.im && !e.ox).sort((a, b) => (b.v ?? 0) - (a.v ?? 0)).slice(0, 950)
  console.log(`${all.length} films to ask OMDb about`)
  let i = 0, stopped = false
  const w = async () => {
    while (i < all.length && !stopped) {
      const e = all[i++]
      const r = await getJson(`https://www.omdbapi.com/?apikey=${CONFIG.OMDB_KEY}&i=${e.im}`)
      if (r?.Error?.toLowerCase().includes("limit")) { stopped = true; break }
      if (r?.Response !== "True") continue
      e.ox = 1
      const num = x => { const n = parseFloat(x); return isNaN(n) ? undefined : n }
      const imdb = num(r.imdbRating), rt = num((r.Ratings ?? []).find(x => x.Source === "Rotten Tomatoes")?.Value), mc = num(r.Metascore)
      if (imdb !== undefined) e.ri = imdb
      if (rt !== undefined) e.rr = rt
      if (mc !== undefined) e.rm = mc
      e.o = +(/won (\d+) oscars?/i.exec(r.Awards ?? "")?.[1] ?? 0)
    }
  }
  await Promise.all(Array.from({ length: 4 }, w))
  if (stopped) console.log("OMDb's daily limit was reached; run this again tomorrow for the rest")
  save()
}
const final = JSON.parse(readFileSync(OUT, "utf8")).films
console.log(`${final.length} films in the catalog, ${final.filter(e => !e.id).length} with no TMDB match`)
