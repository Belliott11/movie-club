import { groupAvg } from "./stats"
import type { Movie } from "./types"

const dayOfYear = (d: Date) => Math.floor((+d - +new Date(d.getFullYear(), 0, 0)) / 864e5)

/**
 * Which film's still to show behind the page title. A film page shows that film, a person's page shows their favorite,
 * Stats shows the club's best, and every other page rotates through the films the club rated 3.5 or higher
 * (one step further each time you open a tab, so the opening shot is a great film, not whatever was added last).
 */
export function pickHeroFilm(ms: Movie[], hasStill: (m: Movie) => boolean, route: string[], today = new Date(), spin = 0): Movie | undefined {
  const pool = ms.filter(hasStill)
  if (!pool.length) return undefined
  const [tab = "films", sub] = route
  if (tab === "films" && sub) {
    const m = pool.find(x => String(x.id) === sub)
    if (m) return m
  }
  if (tab === "people" && sub) {
    const mine = pool.filter(m => m.ratings[sub] != null).sort((a, b) => b.ratings[sub] - a.ratings[sub] || a.title.localeCompare(b.title))
    if (mine[0]) return mine[0]
  }
  if (tab === "stats") return [...pool].sort((a, b) => (groupAvg(b) ?? -1) - (groupAvg(a) ?? -1))[0]
  const loved = pool.filter(m => (groupAvg(m) ?? 0) >= 3.5)
  const rotation = loved.length ? loved : pool
  return rotation[(dayOfYear(today) + spin) % rotation.length]
}
