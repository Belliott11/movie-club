import { allFilms, type Film } from "./lbstats"
import type { LbHistory } from "./letterboxd"

const rating = (f: Film, who: string) => f.ratings.find(r => r.name === who)?.rating

export type Head2Head = {
  watchedBoth: number
  ratedBoth: number
  /** average gap in stars on films both rated; null with fewer than 5 of them */
  gap: number | null
  /** 0 to 100, from the gap: 100 means they always rate the same */
  match: number | null
  bothLoved: { film: Film; a: number; b: number }[]
  splits: { film: Film; a: number; b: number }[]
  /** films `a` rated 4 or higher that `b` hasn't watched, and the other way round */
  aLoves: { film: Film; rating: number }[]
  bLoves: { film: Film; rating: number }[]
}

/** Everything two people's Letterboxd histories say about each other. */
export function headToHead(lb: LbHistory, a: string, b: string, show = 5): Head2Head {
  const films = allFilms(lb)
  const both = films.filter(f => f.seenBy.includes(a) && f.seenBy.includes(b))
  const rated = both.map(f => ({ film: f, a: rating(f, a), b: rating(f, b) })).filter((x): x is { film: Film; a: number; b: number } => x.a != null && x.b != null)
  const gap = rated.length >= 5 ? rated.reduce((t, x) => t + Math.abs(x.a - x.b), 0) / rated.length : null
  const loves = (who: string, other: string) => films
    .filter(f => f.seenBy.includes(who) && !f.seenBy.includes(other) && (rating(f, who) ?? 0) >= 4)
    .map(f => ({ film: f, rating: rating(f, who)! }))
    .sort((x, y) => y.rating - x.rating || x.film.title.localeCompare(y.film.title))
    .slice(0, show)
  return {
    watchedBoth: both.length,
    ratedBoth: rated.length,
    gap,
    match: gap == null ? null : Math.round(Math.max(0, 1 - gap / 4.5) * 100),
    bothLoved: rated.filter(x => x.a >= 4 && x.b >= 4).sort((x, y) => y.a + y.b - (x.a + x.b) || x.film.title.localeCompare(y.film.title)).slice(0, show),
    splits: [...rated].sort((x, y) => Math.abs(y.a - y.b) - Math.abs(x.a - x.b) || x.film.title.localeCompare(y.film.title)).filter(x => x.a !== x.b).slice(0, show),
    aLoves: loves(a, b),
    bLoves: loves(b, a),
  }
}
