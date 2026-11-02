import { findEntry, type LbEntry } from "./letterboxd"
import { key } from "./stats"

export type PlanFilm = { title: string; year?: number; added?: boolean; canon?: string; priority?: "core" | "main" | "stretch" }
export type PlanGroup = { n: number; title: string; blurb: string; films: PlanFilm[]; tier?: { n: number; name: string } }
/** `overrides` holds the owner's own corrections: true = seen, false = not seen, whatever Letterboxd says. */
export type Plan = { groups: PlanGroup[]; club: string[]; long: string[]; /** group numbers the plan says to work through now */ watching?: number[]; overrides?: Record<string, boolean> }

export const filmKey = (f: { title: string; year?: number }) => key(f.title, f.year ?? 0)

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
  let tier: PlanGroup["tier"]
  let watching = "" // the plan's own suggestion, which the owner can change
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    if (/^movie club candidates/i.test(line)) { plan.club = list(line); continue }
    if (/^long hauls/i.test(line)) { plan.long = list(line); continue }
    // "TIER 1: CORE (195 films, 52 groups)" starts a tier; its description line is skipped
    const tm = line.match(/^TIER (\d+): (.+?) \(\d+ films?/)
    if (tm) { tier = { n: Number(tm[1]), name: tm[2].charAt(0) + tm[2].slice(1).toLowerCase() }; cur = null; continue }
    // "CURRENTLY WATCHING, a cap of three groups at a time: Deep dive: Kurosawa, Crime and noir, War."
    if (/^currently watching/i.test(line)) { watching = line.replace(/^[^:]*at a time:/i, "").replace(/\.\s+[A-Z].*$/, "").toLowerCase(); continue }
    const g = line.match(/^GROUP (\d+): (.+?) \(\d+ films?(?:, \d+ core)?\)$/)
    if (g) { cur = { n: Number(g[1]), title: g[2], blurb: "", films: [], tier }; plan.groups.push(cur); continue }
    // a closing section such as DOUBLE FEATURES (a heading line before the first group, like WATCH PLAN BY TIER, is just a title)
    if (plan.groups.length && /^[A-Z][A-Z0-9 &,'()/:-]{8,}$/.test(line) && !/^GROUP/.test(line)) { cur = null; done = true; continue }
    if (done || !cur) continue
    const f = line.match(/^\d+\.\s+(.+)$/)
    if (!f) { if (!cur.films.length) cur.blurb = cur.blurb ? `${cur.blurb} ${line}` : line; continue }
    let t = f[1]
    const canon = t.match(/\[canon: ([^\]]+)\]/)?.[1]
    const added = /\[added[^\]]*\]/.test(t)
    const priority = t.match(/\[(CORE|MAIN|STRETCH)\]/)?.[1].toLowerCase() as PlanFilm["priority"]
    t = t.replace(/\s*\[[^\]]*\]/g, "").trim()
    const star = /\*$/.test(t) // an asterisk marks a film that isn't on the owner's watchlist
    t = t.replace(/\s*\*$/, "").trim()
    const y = t.match(/\s\((\d{4})\)$/)
    cur.films.push({ title: y ? t.slice(0, y.index).trim() : t, year: y ? Number(y[1]) : undefined, added: added || star || undefined, canon, priority })
  }
  // the groups named under CURRENTLY WATCHING: the first group with each title that the line mentions as a whole phrase (some names contain commas)
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const taken = new Set<string>(), found: number[] = []
  for (const g of plan.groups) {
    const t = g.title.toLowerCase()
    if (!taken.has(t) && new RegExp(`(^|[\\s,:])${esc(t)}(?=$|[\\s,.])`).test(watching)) { taken.add(t); found.push(g.n) }
  }
  if (found.length) plan.watching = found.slice(0, 3)
  return plan
}

const titleKey = (t: string) => key(t, 0).split("|")[0]

/** Whether someone has watched a plan film: their own correction if they made one, otherwise their Letterboxd history. Plan films without a year match on title alone. */
export function seenMatcher(history: LbEntry[] | undefined, overrides: Record<string, boolean> = {}) {
  const titles = new Set((history ?? []).map(e => titleKey(e[0])))
  return (f: { title: string; year?: number }) => overrides[filmKey(f)] ?? (f.year ? !!findEntry(history, f.title, f.year) : titles.has(titleKey(f.title)))
}

export function groupProgress(g: PlanGroup, seen: (f: PlanFilm) => boolean) {
  const done = g.films.filter(seen).length
  return { done, total: g.films.length, complete: done === g.films.length }
}

/** The first films still to watch: from the earliest group that isn't finished. */
/** The next films of every group marked as being watched now (each group's first few unseen films); with none marked, just the earliest unfinished group. */
export function upNextAll(plan: Plan, seen: (f: PlanFilm) => boolean, count = 3) {
  const now = (plan.watching ?? []).flatMap(n => { const g = plan.groups.find(x => x.n === n); return g && g.films.some(f => !seen(f)) ? [{ group: g, films: g.films.filter(f => !seen(f)).slice(0, count) }] : [] })
  if (now.length) return now
  const first = upNext(plan, seen, count)
  return first ? [first] : []
}

export function upNext(plan: Plan, seen: (f: PlanFilm) => boolean, count = 3) {
  const g = plan.groups.find(x => x.films.some(f => !seen(f)))
  return g ? { group: g, films: g.films.filter(f => !seen(f)).slice(0, count) } : null
}
