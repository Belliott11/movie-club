import { groupAvg } from "./stats"
import type { Movie } from "./types"

export type Group = { name: string; n: number; avg: number }

const summarize = (name: string, ms: Movie[], value: (m: Movie) => number | null = groupAvg): Group | null => {
  const r = ms.map(value).filter((v): v is number => v != null)
  return r.length ? { name, n: ms.length, avg: r.reduce((a, b) => a + b, 0) / r.length } : null
}

/** Films and the club's average for each decade, oldest first. */
export function byDecade(movies: Movie[]): Group[] {
  const g = new Map<number, Movie[]>()
  for (const m of movies) if (m.year) g.set(Math.floor(m.year / 10) * 10, [...(g.get(Math.floor(m.year / 10) * 10) ?? []), m])
  return [...g].sort((a, b) => a[0] - b[0]).map(([d, ms]) => summarize(`${d}s`, ms)).filter((x): x is Group => !!x)
}

/** How many films came out in each year from the earliest to the latest, with empty years kept so gaps show. */
export function byYear(movies: Movie[]): { year: number; n: number }[] {
  const years = movies.map(m => m.year).filter((y): y is number => !!y)
  if (!years.length) return []
  const lo = Math.min(...years), hi = Math.max(...years)
  return Array.from({ length: hi - lo + 1 }, (_, i) => ({ year: lo + i, n: years.filter(y => y === lo + i).length }))
}

/** Group films by any list of labels (genres, countries) the caller supplies per film. */
export function byTag(movies: Movie[], tagsOf: (m: Movie) => string[], value?: (m: Movie) => number | null): Group[] {
  const g = new Map<string, Movie[]>()
  for (const m of movies) for (const t of new Set(tagsOf(m))) g.set(t, [...(g.get(t) ?? []), m])
  return [...g].map(([t, ms]) => summarize(t, ms, value)).filter((x): x is Group => !!x)
}
