import { findEntry, type LbHistory } from "./letterboxd"
import type { Movie } from "./types"

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
const avg = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null)

export type Film = { title: string; year: number; ratings: { name: string; rating: number }[]; seenBy: string[] }

/** Every film anyone imported, grouped by title (a year either side is the same film), with who rated and who watched it. */
export function allFilms(lb: LbHistory): Film[] {
  const byTitle = new Map<string, Film[]>()
  for (const [name, entries] of Object.entries(lb)) {
    for (const [title, year, rating] of entries) {
      const k = norm(title)
      if (!byTitle.has(k)) byTitle.set(k, [])
      const group = byTitle.get(k)!
      let f = group.find(x => Math.abs(x.year - year) <= 1)
      if (!f) { f = { title, year, ratings: [], seenBy: [] }; group.push(f) }
      if (!f.seenBy.includes(name)) f.seenBy.push(name)
      if (rating != null && !f.ratings.some(r => r.name === name)) f.ratings.push({ name, rating })
    }
  }
  return [...byTitle.values()].flat()
}
const inClub = (movies: Movie[], f: Film) => movies.some(m => norm(m.title) === norm(f.title) && Math.abs(m.year - f.year) <= 1)
const mean = (f: Film) => avg(f.ratings.map(r => r.rating))!

/**
 * How close two people's taste is across everything they both rated on Letterboxd: the average gap in stars (smaller is closer).
 * Needs `min` shared rated films, so a handful of coincidences doesn't count as a match.
 */
export function tasteTwins(lb: LbHistory, min = 15) {
  const names = Object.keys(lb).filter(n => lb[n]?.length)
  const films = allFilms(lb)
  const out: { a: string; b: string; shared: number; gap: number }[] = []
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const both = films.filter(f => f.ratings.some(r => r.name === names[i]) && f.ratings.some(r => r.name === names[j]))
      if (both.length < min) continue
      const gap = avg(both.map(f => Math.abs(f.ratings.find(r => r.name === names[i])!.rating - f.ratings.find(r => r.name === names[j])!.rating)))!
      out.push({ a: names[i], b: names[j], shared: both.length, gap })
    }
  }
  return out.sort((x, y) => x.gap - y.gap)
}

/**
 * How someone rates club films at the club versus on their own Letterboxd. Positive means higher at the club.
 * Compares only films they rated in both places.
 */
export function clubVsHome(movies: Movie[], lb: LbHistory, name: string) {
  const rows = movies
    .filter(m => m.ratings[name] != null)
    .map(m => ({ movie: m, club: m.ratings[name], home: findEntry(lb[name], m.title, m.year)?.[2] ?? null }))
    .filter((r): r is { movie: Movie; club: number; home: number } => r.home != null)
    .map(r => ({ ...r, diff: r.club - r.home }))
  return { count: rows.length, average: avg(rows.map(r => r.diff)), biggest: [...rows].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 3) }
}

/** Films rated by at least `min` people, best average first, that the club hasn't watched. */
export const groupFavorites = (lb: LbHistory, movies: Movie[], min = 3) =>
  allFilms(lb).filter(f => f.ratings.length >= min && !inClub(movies, f) && mean(f) >= 3.8).sort((a, b) => mean(b) - mean(a) || b.ratings.length - a.ratings.length).slice(0, 6)

/** Films rated by at least `min` people with the widest spread. These are the ones worth arguing about. */
export const divisiveOnLb = (lb: LbHistory, min = 3) =>
  allFilms(lb)
    .filter(f => f.ratings.length >= min)
    .map(f => ({ f, spread: Math.max(...f.ratings.map(r => r.rating)) - Math.min(...f.ratings.map(r => r.rating)) }))
    .filter(x => x.spread >= 2)
    .sort((a, b) => b.spread - a.spread || b.f.ratings.length - a.f.ratings.length)
    .slice(0, 5)

/** One person's 4.5 or 5 star film that nobody else has even watched, and the club hasn't either. */
export const deepCuts = (lb: LbHistory, movies: Movie[]) =>
  allFilms(lb)
    .filter(f => f.seenBy.length === 1 && f.ratings.length === 1 && f.ratings[0].rating >= 4.5 && !inClub(movies, f))
    .sort((a, b) => a.title.localeCompare(b.title))

/**
 * A person's favorites: their highest-rated films, and among equal ratings the ones more of their friends have also watched
 * (so the list is films people recognise, not alphabetical luck).
 */
export function favoritesOf(lb: LbHistory, name: string, n = 4): { title: string; year: number; rating: number }[] {
  const byTitle = new Map<string, Film[]>()
  for (const f of allFilms(lb)) byTitle.set(norm(f.title), [...(byTitle.get(norm(f.title)) ?? []), f])
  const counts = new Map<string, number>() // only looked up for films that tie on rating
  const seen = (title: string, year: number) => {
    const k = `${title}|${year}`
    if (!counts.has(k)) counts.set(k, byTitle.get(norm(title))?.find(f => Math.abs(f.year - year) <= 1)?.seenBy.length ?? 1)
    return counts.get(k)!
  }
  return (lb[name] ?? [])
    .filter((e): e is [string, number, number] => e[2] != null)
    .map(([title, year, rating]) => ({ title, year, rating }))
    .sort((a, b) => b.rating - a.rating || seen(b.title, b.year) - seen(a.title, a.year) || a.title.localeCompare(b.title))
    .slice(0, n)
}
