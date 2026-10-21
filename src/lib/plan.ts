import { findEntry, type LbEntry } from "./letterboxd"
import { key } from "./stats"

export type PlanFilm = { title: string; year?: number; added?: boolean; canon?: string }
export type PlanGroup = { n: number; title: string; blurb: string; films: PlanFilm[] }
export type Plan = { groups: PlanGroup[]; club: string[]; long: string[] }

const list = (line: string) => line.slice(line.indexOf(":") + 1).replace(/\.\s*$/, "").split(/,\s+/).map(s => s.trim()).filter(Boolean)

/**
 * Reads a watching plan written as "GROUP 3: NAME (19 films)" headings, a one-line description, then numbered film lines such as
 * "24. Hard Boiled [canon: LB500 #344]" or "65. Intolerance (1916) [added, not on your watchlist]". Anything after the last group
 * (double features, appendices) is ignored. Also picks up a "Movie club candidates ...: A, B, C." line and a "Long hauls ...: A, B." line.
 */
export function parsePlan(text: string): Plan {
  const plan: Plan = { groups: [], club: [], long: [] }
  let cur: PlanGroup | null = null
  let done = false
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    if (/^movie club candidates/i.test(line)) { plan.club = list(line); continue }
    if (/^long hauls/i.test(line)) { plan.long = list(line); continue }
    const g = line.match(/^GROUP (\d+): (.+?) \(\d+ films?\)$/)
    if (g) { cur = { n: Number(g[1]), title: g[2], blurb: "", films: [] }; plan.groups.push(cur); continue }
    if (/^[A-Z][A-Z0-9 &,'()/:-]{8,}$/.test(line) && !/^GROUP/.test(line)) { cur = null; done = true; continue } // a closing section such as DOUBLE FEATURES
    if (done || !cur) continue
    const f = line.match(/^\d+\.\s+(.+)$/)
    if (!f) { if (!cur.films.length) cur.blurb = cur.blurb ? `${cur.blurb} ${line}` : line; continue }
    let t = f[1]
    const canon = t.match(/\[canon: ([^\]]+)\]/)?.[1]
    const added = /\[added[^\]]*\]/.test(t)
    t = t.replace(/\s*\[[^\]]*\]/g, "").trim()
    const y = t.match(/\s\((\d{4})\)$/)
    cur.films.push({ title: y ? t.slice(0, y.index).trim() : t, year: y ? Number(y[1]) : undefined, added: added || undefined, canon })
  }
  return plan
}

const titleKey = (t: string) => key(t, 0).split("|")[0]

/** Whether someone has watched a plan film, going by their Letterboxd history. Plan films without a year match on title alone. */
export function seenMatcher(history: LbEntry[] | undefined) {
  const titles = new Set((history ?? []).map(e => titleKey(e[0])))
  return (f: { title: string; year?: number }) => (f.year ? !!findEntry(history, f.title, f.year) : titles.has(titleKey(f.title)))
}

export function groupProgress(g: PlanGroup, seen: (f: PlanFilm) => boolean) {
  const done = g.films.filter(seen).length
  return { done, total: g.films.length, complete: done === g.films.length }
}

/** The first films still to watch: from the earliest group that isn't finished. */
export function upNext(plan: Plan, seen: (f: PlanFilm) => boolean, count = 3) {
  const g = plan.groups.find(x => x.films.some(f => !seen(f)))
  return g ? { group: g, films: g.films.filter(f => !seen(f)).slice(0, count) } : null
}
