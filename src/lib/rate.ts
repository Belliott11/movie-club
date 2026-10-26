import type { Movie } from "./types"

/** The club's newest film when it was watched in the last `days` days (today counts) and `me` hasn't rated it yet, sealed or not. `today` is YYYY-MM-DD. */
export function filmToRate(movies: Movie[], me: string, sealedBy: Record<string, string[]>, today: string, days = 7): Movie | null {
  if (!me || !movies.length) return null
  const m = [...movies].sort((a, b) => b.seq - a.seq)[0]
  if (!m.watched_on || m.watched_on > today) return null
  const age = (Date.parse(today) - Date.parse(m.watched_on)) / 864e5
  if (age > days) return null
  return m.ratings[me] != null || sealedBy[String(m.id)]?.includes(me) ? null : m
}
