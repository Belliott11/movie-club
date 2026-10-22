import type { Movie } from "./types"

const day = (iso: string) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5)
const dated = (ms: Movie[]) => ms.filter((m): m is Movie & { watched_on: string } => !!m.watched_on).sort((a, b) => a.watched_on.localeCompare(b.watched_on) || a.seq - b.seq)

export type Month = { key: string; label: string; films: Movie[] }

/** Every month from the first screening to the last, oldest first, with the films watched in it. Months with none are kept, so gaps show. */
export function byMonth(ms: Movie[]): Month[] {
  const d = dated(ms)
  if (!d.length) return []
  const out: Month[] = []
  let y = +d[0].watched_on.slice(0, 4), m = +d[0].watched_on.slice(5, 7)
  const endKey = d[d.length - 1].watched_on.slice(0, 7)
  for (;;) {
    const k = `${y}-${String(m).padStart(2, "0")}`
    out.push({ key: k, label: new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }), films: d.filter(f => f.watched_on.startsWith(k)) })
    if (k >= endKey) break
    if (++m > 12) { m = 1; y++ }
  }
  return out
}

/** The longest stretch with no screening: the two films either side of it and the number of days between them. */
export function longestBreak(ms: Movie[]) {
  const d = dated(ms)
  let best: { from: Movie; to: Movie; days: number } | null = null
  for (let i = 1; i < d.length; i++) {
    const days = day(d[i].watched_on) - day(d[i - 1].watched_on)
    if (!best || days > best.days) best = { from: d[i - 1], to: d[i], days }
  }
  return best
}

/** The longest run of screenings each no more than `within` days after the one before it (a weekly club keeps the streak with within = 8). */
export function longestStreak(ms: Movie[], within = 8) {
  const d = dated(ms)
  let best = { films: 0, from: "", to: "" }, run = 0, from = ""
  for (let i = 0; i < d.length; i++) {
    if (i && day(d[i].watched_on) - day(d[i - 1].watched_on) <= within) run++
    else { run = 1; from = d[i].watched_on }
    if (run > best.films) best = { films: run, from, to: d[i].watched_on }
  }
  return best.films ? best : null
}

/** The month with the most screenings (the first one, if tied). */
export const busiestMonth = (ms: Movie[]) => byMonth(ms).reduce<Month | null>((a, b) => (!a || b.films.length > a.films.length ? b : a), null)
