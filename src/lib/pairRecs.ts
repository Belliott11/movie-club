import { searchFilm, tmdb } from "./api"
import { favoritesOf } from "./lbstats"
import { findEntry, type LbHistory } from "./letterboxd"
import { headToHead } from "./compare"
import { key } from "./stats"
import type { Movie } from "./types"

export type PairRec = { id: number; title: string; year: number; poster: string | null; because: string[]; votes: number }
type Batch = { because: string; results: { id: number; title: string; year: number; poster: string | null; votes: number }[] }

/**
 * Films that several of the seed films recommend, that neither person has watched, best first:
 * the more seeds point at a film, the higher it ranks, then by TMDB score. Only well-regarded films (7 or higher) count.
 */
export function rankPairRecs(batches: Batch[], seen: (title: string, year: number) => boolean, limit = 6): PairRec[] {
  const m = new Map<number, PairRec & { score: number }>()
  for (const b of batches) {
    for (const r of b.results) {
      if (r.votes < 7 || !r.year || seen(r.title, r.year)) continue
      const cur = m.get(r.id) ?? { id: r.id, title: r.title, year: r.year, poster: r.poster, because: [], votes: r.votes, score: 0 }
      if (!cur.because.includes(b.because)) { cur.because.push(b.because); cur.score++ }
      m.set(r.id, cur)
    }
  }
  return [...m.values()].sort((a, b) => b.score - a.score || b.votes - a.votes || a.title.localeCompare(b.title)).slice(0, limit)
}

const CACHE = "pair-recs-v1"
const read = (): Record<string, { t: number; recs: PairRec[] }> => { try { return JSON.parse(localStorage.getItem(CACHE) ?? "{}") } catch { return {} } }

/** Recommendations for two people: seeded from what they both loved, plus each one's own favorites. Remembered for a week. */
export async function pairRecs(lb: LbHistory, a: string, b: string, movies: Movie[]): Promise<PairRec[]> {
  const id = [a, b].sort().join("|") + (lb[a]?.length ?? 0) + "|" + (lb[b]?.length ?? 0)
  const hit = read()[id]
  if (hit && Date.now() - hit.t < 7 * 864e5) return hit.recs
  const h = headToHead(lb, a, b, 6)
  const seeds = [
    ...h.bothLoved.map(x => ({ title: x.film.title, year: x.film.year })),
    ...[a, b].flatMap(n => favoritesOf(lb, n, 3)),
  ]
  const uniq = [...new Map(seeds.map(s => [key(s.title, s.year), s])).values()].slice(0, 12)
  const batches = await Promise.all(uniq.map(async s => {
    const found = await searchFilm(s.title, s.year)
    const r = found?.id ? await tmdb<{ results?: any[] }>(`/movie/${found.id}/recommendations`) : null
    return { because: s.title, results: (r?.results ?? []).map(x => ({ id: x.id as number, title: x.title as string, year: parseInt(x.release_date), poster: (x.poster_path as string) ?? null, votes: x.vote_average as number })) }
  }))
  const played = new Set(movies.map(m => key(m.title, m.year)))
  const recs = rankPairRecs(batches, (t, y) => !!findEntry(lb[a], t, y) || !!findEntry(lb[b], t, y) || played.has(key(t, y)))
  try { localStorage.setItem(CACHE, JSON.stringify({ ...read(), [id]: { t: Date.now(), recs } })) } catch { /* fine */ }
  return recs
}
