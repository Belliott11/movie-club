import { findEntry, type LbHistory } from "./letterboxd"
import type { Movie, WatchItem } from "./types"

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")

export type Pick = {
  title: string
  year: number
  /** Everyone's Letterboxd rating of it, highest first. */
  ratings: { name: string; rating: number }[]
  /** Everyone who has watched it, rated or not. */
  seenBy: string[]
}

/** Every film anyone has in their Letterboxd history, grouped by title (a year either side counts as the same film). */
function indexHistory(lb: LbHistory): Pick[] {
  const films = new Map<string, Pick[]>()
  for (const [name, entries] of Object.entries(lb)) {
    for (const [title, year, rating] of entries) {
      const k = norm(title)
      if (!films.has(k)) films.set(k, [])
      const group = films.get(k)!
      let p = group.find(x => Math.abs(x.year - year) <= 1)
      if (!p) {
        p = { title, year, ratings: [], seenBy: [] }
        group.push(p)
      }
      if (!p.seenBy.includes(name)) p.seenBy.push(name)
      if (rating != null && !p.ratings.some(r => r.name === name)) p.ratings.push({ name, rating })
    }
  }
  return [...films.values()].flat().map(p => ({ ...p, ratings: [...p.ratings].sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name)) }))
}

const inClub = (movies: Movie[], title: string, year: number) => movies.some(m => norm(m.title) === norm(title) && Math.abs(m.year - year) <= 1)
const avgRating = (p: Pick) => (p.ratings.length ? p.ratings.reduce((t, r) => t + r.rating, 0) / p.ratings.length : 0)

/**
 * Films several members rated highly on Letterboxd that the club has not watched yet.
 * `minRaters` people must have rated it `minRating` or higher. Most-loved first.
 */
export function crowdPicks(lb: LbHistory, movies: Movie[], { minRaters = 2, minRating = 4 } = {}): Pick[] {
  const fans = (p: Pick) => p.ratings.filter(r => r.rating >= minRating)
  return indexHistory(lb)
    .filter(p => fans(p).length >= minRaters && !inClub(movies, p.title, p.year))
    .sort((a, b) => fans(b).length - fans(a).length || avgRating(b) - avgRating(a) || a.title.localeCompare(b.title))
}

export type Ranked = Pick & { score: number; reasons: string[]; wantedBy: string[] }

const names = (n: string[]) => (n.length <= 2 ? n.join(" and ") : `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`)

/**
 * Ranks what to watch tonight for the people in the room. A film scores for each attendee who has it on their watchlist (+2)
 * and for friends who aren't here but loved it (+1 each, up to 3), and loses points for each attendee who has already watched it (-2).
 * Films most of the room has seen are dropped. The reasons say why, so the ranking is never a black box.
 */
export function rankForGroup(attending: string[], lb: LbHistory, watchlist: WatchItem[], movies: Movie[], limit = 8): Ranked[] {
  if (!attending.length) return []
  const history = indexHistory(lb)
  const find = (title: string, year: number) => history.find(p => norm(p.title) === norm(title) && Math.abs(p.year - year) <= 1)

  // candidates: what the room wants to see, plus what friends loved
  const pool = new Map<string, Pick>()
  const add = (p: Pick) => {
    if (!inClub(movies, p.title, p.year) && !pool.has(norm(p.title))) pool.set(norm(p.title), p)
  }
  for (const w of watchlist) if (attending.includes(w.member)) add(find(w.title, w.year) ?? { title: w.title, year: w.year, ratings: [], seenBy: [] })
  for (const p of history) if (p.ratings.some(r => r.rating >= 4)) add(p)

  const out: Ranked[] = []
  for (const p of pool.values()) {
    const seen = attending.filter(n => findEntry(lb[n], p.title, p.year))
    if (seen.length > attending.length / 2) continue
    const wantedBy = watchlist.filter(w => attending.includes(w.member) && norm(w.title) === norm(p.title) && Math.abs(w.year - p.year) <= 1).map(w => w.member)
    const fans = p.ratings.filter(r => r.rating >= 4 && !attending.includes(r.name))
    const score = 2 * wantedBy.length + Math.min(3, fans.length) - 2 * seen.length
    if (score <= 0) continue
    const reasons: string[] = []
    if (wantedBy.length) reasons.push(`${names(wantedBy)} ${wantedBy.length === 1 ? "has it on their watchlist" : "have it on their watchlists"}`)
    if (fans.length) reasons.push(`${names(fans.map(f => `${f.name} (${f.rating})`))} loved it`)
    reasons.push(seen.length ? `${names(seen)} ${seen.length === 1 ? "has" : "have"} already seen it` : "none of you have seen it")
    out.push({ ...p, score, reasons, wantedBy })
  }
  return out.sort((a, b) => b.score - a.score || b.ratings.length - a.ratings.length || a.title.localeCompare(b.title)).slice(0, limit)
}

/** Club members who have rated at least `min` films but have no Letterboxd history imported. */
export const needsImport = (movies: Movie[], lb: LbHistory, members: string[], min = 3) =>
  members.filter(n => !lb[n]?.length && movies.filter(m => m.ratings[n] != null).length >= min)
