import { searchFilm, tmdb } from "./api"
import { entryKey } from "./atlas"
import { findEntry, type LbEntry } from "./letterboxd"

const KEY = "lb-country-v1"
/** Film (title and year) to its main country code, remembered on this device. An empty string means TMDB had no match, so it isn't asked again. */
export type CountryCache = Record<string, string>

export const loadCountryCache = (): CountryCache => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") } catch { return {} }
}

const GENRES = "lb-genres-v1"
/** Film (title and year) to its TMDB genres, filled by the same lookups as the countries. */
export type GenreCache = Record<string, string[]>
export const loadGenreCache = (): GenreCache => {
  try { return JSON.parse(localStorage.getItem(GENRES) ?? "{}") } catch { return {} }
}
const saveGenres = (g: GenreCache) => { try { localStorage.setItem(GENRES, JSON.stringify(g)) } catch { /* storage full: it will look up again */ } }
const save = (c: CountryCache) => { try { localStorage.setItem(KEY, JSON.stringify(c)) } catch { /* storage full: it will just look up again next time */ } }

/**
 * Looks up the main country of every film in a Letterboxd history that isn't cached yet: one TMDB search and one detail call each,
 * six at a time. `onStep` gets the updated cache as it fills, and `stopped()` ends the run early. Results are kept between visits.
 */
export async function resolveCountries(history: LbEntry[], onStep: (c: CountryCache, g: GenreCache) => void, stopped: () => boolean) {
  const cache = loadCountryCache(), genres = loadGenreCache()
  const todo = history.filter(e => cache[entryKey(e)] === undefined || genres[entryKey(e)] === undefined)
  let next = 0, done = 0
  const worker = async () => {
    while (!stopped()) {
      const e = todo[next++]
      if (!e) return
      const hit = await searchFilm(e[0], e[1])
      const d = hit?.id ? await tmdb<any>(`/movie/${hit.id}`) : null
      cache[entryKey(e)] = d?.origin_country?.[0] ?? d?.production_countries?.[0]?.iso_3166_1 ?? ""
      genres[entryKey(e)] = (d?.genres ?? []).map((g: any) => g.name as string)
      if (++done % 20 === 0) { save(cache); saveGenres(genres); onStep({ ...cache }, { ...genres }) }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
  save(cache); saveGenres(genres)
  onStep({ ...cache }, { ...genres })
}

const PICKS = "lb-unseen-v1"
const readPicks = (): Record<string, { pick: { title: string; year: number } | null; t: number }> => { try { return JSON.parse(localStorage.getItem(PICKS) ?? "{}") } catch { return {} } }
const picks = new Map<string, { title: string; year: number } | null>()
/** The best-rated well-known film from a country that this person hasn't watched, or null. */
export async function topUnseen(code: string, history: LbEntry[]) {
  const k = code + history.length
  if (picks.has(k)) return picks.get(k)!
  const saved = readPicks()[k]
  if (saved && Date.now() - saved.t < 7 * 864e5) { picks.set(k, saved.pick); return saved.pick }
  // start with films lots of people have rated, and relax the vote count for countries with fewer (Thailand has almost none above 2000)
  let pick: { title: string; year: number } | null = null
  for (const votes of [2000, 500, 100]) {
    const pages = await Promise.all([1, 2, 3].map(p => tmdb<{ results?: any[] }>("/discover/movie", `&with_origin_country=${code}&sort_by=vote_average.desc&vote_count.gte=${votes}&page=${p}`)))
    const films = pages.flatMap(r => r?.results ?? []).map(x => ({ title: x.title as string, year: parseInt(x.release_date) }))
    pick = films.find(f => f.year && !findEntry(history, f.title, f.year)) ?? null
    if (pick) break
  }
  picks.set(k, pick)
  try { localStorage.setItem(PICKS, JSON.stringify({ ...readPicks(), [k]: { pick, t: Date.now() } })) } catch { /* fine */ }
  return pick
}
