import type { LbEntry } from "./letterboxd"

export type YearRow = {
  year: number
  /** films logged that year */
  n: number
  /** average rating given that year, null when nothing was rated */
  avg: number | null
  rated: number
  /** the middle release year of the films watched: a low number means a year of older films */
  medianRelease: number
  /** the most-watched genres that year (only when genres have been looked up) */
  genres: string[]
}

/** Whether a history carries the day each film was logged. Older imports don't; uploading the export again adds them. */
export const hasDates = (h: LbEntry[] | undefined) => !!h?.some(e => e[3])

const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }

/** One row per calendar year of logging, oldest first: how much they watched, how they rated, how old the films were, what genres. Years with fewer than `min` films are left out. */
export function driftByYear(history: LbEntry[], genresOf: (e: LbEntry) => string[] = () => [], min = 5): YearRow[] {
  const byYear = new Map<number, LbEntry[]>()
  for (const e of history) if (e[3]) byYear.set(+e[3].slice(0, 4), [...(byYear.get(+e[3].slice(0, 4)) ?? []), e])
  return [...byYear]
    .filter(([, es]) => es.length >= min)
    .sort((a, b) => a[0] - b[0])
    .map(([year, es]) => {
      const rated = es.filter(e => e[2] != null).map(e => e[2] as number)
      const g = new Map<string, number>()
      for (const e of es) for (const x of new Set(genresOf(e))) g.set(x, (g.get(x) ?? 0) + 1)
      return {
        year, n: es.length, rated: rated.length,
        avg: rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : null,
        medianRelease: median(es.map(e => e[1])),
        genres: [...g].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2).map(x => x[0]),
      }
    })
}

/** A sentence about the biggest change between the first and last year, or null when there isn't enough to say. */
export function driftSummary(rows: YearRow[]): string | null {
  if (rows.length < 2) return null
  const a = rows[0], b = rows[rows.length - 1]
  const parts: string[] = []
  if (a.avg != null && b.avg != null && Math.abs(b.avg - a.avg) >= 0.2) parts.push(`ratings ${b.avg > a.avg ? "up" : "down"} from ${a.avg.toFixed(1)} to ${b.avg.toFixed(1)}`)
  if (Math.abs(b.medianRelease - a.medianRelease) >= 8) parts.push(`${b.medianRelease > a.medianRelease ? "newer" : "older"} films (the middle one went from ${a.medianRelease} to ${b.medianRelease})`)
  if (b.n >= a.n * 1.5 || a.n >= b.n * 1.5) parts.push(`${b.n > a.n ? "more" : "fewer"} films logged (${a.n} in ${a.year}, ${b.n} in ${b.year})`)
  return parts.length ? `From ${a.year} to ${b.year}: ${parts.join(", ")}.` : null
}
