import { MOVEMENTS, decadeOf, tallyBy } from "./atlas"
import type { LbEntry } from "./letterboxd"
import type { Plan, PlanFilm, PlanGroup } from "./plan"
import { key } from "./stats"

/** A watchlist film with what is known about it from TMDB. */
export type Cand = { title: string; year: number; country?: string; genres: string[]; vote?: number }
export type Affinity = { overall: number; genre: Map<string, number>; country: Map<string, number>; decade: Map<string, number> }

const MIN_SAMPLE = 5 // an average over fewer films than this says nothing about taste

/** How highly someone rates each genre, country and decade, from their own Letterboxd history. */
export function affinityFrom(history: LbEntry[], countryOf: (e: LbEntry) => string | undefined, genresOf: (e: LbEntry) => string[]): Affinity {
  const avgs = (rows: { name: string; n: number; avg: number; rated: number }[]) => new Map(rows.filter(r => r.rated >= MIN_SAMPLE).map(r => [r.name, r.avg]))
  const rated = history.filter(e => e[2] != null).map(e => e[2] as number)
  return {
    overall: rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 3,
    genre: avgs(tallyBy(history, genresOf)),
    country: avgs(tallyBy(history, e => { const c = countryOf(e); return c ? [c] : [] })),
    decade: avgs(tallyBy(history, e => (e[1] ? [decadeOf(e[1])] : []))),
  }
}

const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined)

/** How much someone is likely to enjoy a film, from how they rate its genres, country and decade. Falls back to their overall average. */
export const filmAffinity = (c: Cand, a: Affinity) =>
  mean([mean(c.genres.map(g => a.genre.get(g)).filter((x): x is number => x != null)), c.country ? a.country.get(c.country) : undefined, a.decade.get(decadeOf(c.year))].filter((x): x is number => x != null)) ?? a.overall

const movementOf = (() => {
  const m = new Map<string, string>()
  for (const mv of MOVEMENTS) for (const [t, , alt] of mv.films) for (const n of [t, alt]) if (n) m.set(key(n, 0).split("|")[0], mv.name)
  return (c: Cand) => m.get(key(c.title, 0).split("|")[0])
})()

/**
 * Builds a watching plan from a watchlist, with no lists to maintain: films that belong to a film movement are grouped by movement,
 * then a country with at least three films gets its own group, then genres with at least four, then decades, and the rest are wildcards.
 * Groups are ordered by how much the person tends to like that kind of film, and within a group the best-reviewed films come first.
 * `name` turns a country code into its name.
 */
export function generatePlan(cands: Cand[], aff: Affinity, countryName: (code: string) => string): Plan {
  const left = new Set(cands)
  const groups: { title: string; blurb: string; films: Cand[]; bonus: number }[] = []
  const take = (title: string, blurb: string, films: Cand[], bonus = 0) => { films.forEach(f => left.delete(f)); groups.push({ title, blurb, films, bonus }) }

  // 1. movements with at least two films on the watchlist
  const byMovement = new Map<string, Cand[]>()
  for (const c of cands) { const m = movementOf(c); if (m) byMovement.set(m, [...(byMovement.get(m) ?? []), c]) }
  for (const [m, films] of byMovement) if (films.length >= 2) take(`Movement: ${m}`, `${films.length} films from your watchlist that belong to ${m}.`, films, 0.3)

  // 2. countries (outside the US) with at least three of what's left
  const byCountry = new Map<string, Cand[]>()
  for (const c of left) if (c.country && c.country !== "US") byCountry.set(c.country, [...(byCountry.get(c.country) ?? []), c])
  for (const [code, films] of byCountry) if (films.length >= 3) take(`${countryName(code)}`, `${films.length} films from ${countryName(code)}.`, films)

  // 3. genres: each remaining film goes to its most common genre among the leftovers, if that genre has at least four films
  const genreCount = new Map<string, number>()
  for (const c of left) for (const g of c.genres) genreCount.set(g, (genreCount.get(g) ?? 0) + 1)
  const bestGenre = (c: Cand) => [...c.genres].sort((a, b) => (genreCount.get(b) ?? 0) - (genreCount.get(a) ?? 0) || a.localeCompare(b))[0]
  const byGenre = new Map<string, Cand[]>()
  for (const c of left) { const g = bestGenre(c); if (g && (genreCount.get(g) ?? 0) >= 4) byGenre.set(g, [...(byGenre.get(g) ?? []), c]) }
  for (const [g, films] of byGenre) if (films.length >= 4) take(g, `${films.length} ${g.toLowerCase()} films.`, films)

  // 4. decades with at least three of what's left, then everything else
  const byDecade = new Map<string, Cand[]>()
  for (const c of left) byDecade.set(decadeOf(c.year), [...(byDecade.get(decadeOf(c.year)) ?? []), c])
  for (const [d, films] of byDecade) if (films.length >= 3) take(`Films from the ${d}`, `${films.length} films from the ${d}.`, films)
  if (left.size) take("Wildcards", `${left.size} films that don't fit a group.`, [...left])

  const score = (g: { films: Cand[]; bonus: number }) => (mean(g.films.map(f => filmAffinity(f, aff))) ?? aff.overall) + g.bonus
  const ordered = groups.sort((a, b) => score(b) - score(a) || b.films.length - a.films.length || a.title.localeCompare(b.title))
  return {
    groups: ordered.map((g, i): PlanGroup => ({
      n: i + 1,
      title: g.title,
      blurb: `${g.blurb} Best-reviewed first.`,
      films: [...g.films].sort((a, b) => (b.vote ?? 0) - (a.vote ?? 0) || a.title.localeCompare(b.title)).map((f): PlanFilm => ({ title: f.title, year: f.year })),
    })),
    club: [],
    long: [],
  }
}
