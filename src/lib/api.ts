import { key } from "./stats"
import type { Mini, Movie } from "./types"

export const IMG = "https://image.tmdb.org/t/p/"
export const hasTmdb = () => !!CONFIG.TMDB_KEY

export async function tmdb<T = any>(path: string, q = ""): Promise<T | null> {
  if (!CONFIG.TMDB_KEY) return null
  try {
    return await (await fetch(`https://api.themoviedb.org/3${path}?api_key=${CONFIG.TMDB_KEY}${q}`)).json()
  } catch {
    return null
  }
}
export const searchFilm = (title: string, year: number | null) =>
  tmdb<{ results?: any[] }>("/search/movie", `&query=${encodeURIComponent(title)}${year ? `&year=${year}` : ""}`).then(r => r?.results?.[0])

const detailCache = new Map<number, any>()
export async function filmDetail(tmdbId: number) {
  if (!detailCache.has(tmdbId)) detailCache.set(tmdbId, await tmdb(`/movie/${tmdbId}`, "&append_to_response=credits,videos"))
  return detailCache.get(tmdbId)
}

// ---- poster + TMDB score cache (per browser) ----
const MINI_KEY = "mini-v1"
export const loadMini = (): Record<string, Mini> => {
  try { return JSON.parse(localStorage.getItem(MINI_KEY) || "{}") } catch { return {} }
}
export const saveMini = (m: Record<string, Mini>) => {
  try { localStorage.setItem(MINI_KEY, JSON.stringify(m)) } catch { /* private mode */ }
}

// ---- OMDb: fill blank IMDb / Rotten Tomatoes / Metacritic. Each film is retried at most weekly. ----
const TRIED_KEY = "omdb-tried"
const tried = (): Record<string, number> => {
  try { return JSON.parse(localStorage.getItem(TRIED_KEY) || "{}") } catch { return {} }
}

export async function omdbFill(m: Movie): Promise<Partial<Movie> | null> {
  if (!CONFIG.OMDB_KEY || [m.imdb, m.rt, m.mc].every(x => x != null)) return null
  const k = key(m.title, m.year), t = tried()
  if (Date.now() - (t[k] || 0) < 7 * 864e5) return null
  t[k] = Date.now()
  try { localStorage.setItem(TRIED_KEY, JSON.stringify(t)) } catch { /* ignore */ }
  const omdb = (q: string) => fetch(`https://www.omdbapi.com/?apikey=${CONFIG.OMDB_KEY}&${q}`).then(r => r.json()).catch(() => ({}))
  let r = await omdb(`t=${encodeURIComponent(m.title)}&y=${m.year}`)
  if (r.Response !== "True" && m.tmdb_id) {
    const x = await tmdb<{ imdb_id?: string }>(`/movie/${m.tmdb_id}/external_ids`)
    if (x?.imdb_id) r = await omdb(`i=${x.imdb_id}`)
  }
  if (r.Response !== "True") return null
  const rt = (r.Ratings || []).find((x: any) => x.Source === "Rotten Tomatoes")?.Value
  const all = { imdb: parseFloat(r.imdbRating), rt: rt ? parseFloat(rt) : NaN, mc: parseFloat(r.Metascore) }
  const f: Partial<Movie> = {}
  for (const [k2, v] of Object.entries(all)) if (!isNaN(v) && m[k2 as "imdb"] == null) (f as any)[k2] = v
  return Object.keys(f).length ? f : null
}
