import type { Movie, WatchItem } from "./types"

export const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
export const fmt = (n: number | null | undefined, d = 2) => (n == null ? "–" : String(+n.toFixed(d)))
export const key = (t: string, y: number | null) => `${t}|${y}`.toLowerCase().replace(/[^a-z0-9|]/g, "")

export const groupAvg = (m: Movie) => avg(Object.values(m.ratings))
/** IMDb/10, RT/100, Metacritic/100 and Letterboxd/5, all normalized to 5. */
export const outsideAvg = (m: Movie) =>
  avg([m.imdb != null && m.imdb / 2, m.rt != null && m.rt / 20, m.mc != null && m.mc / 20, m.lb].filter((x): x is number => typeof x === "number" && !isNaN(x)))
export const spread = (m: Movie) => {
  const v = Object.values(m.ratings), a = avg(v)
  return a == null || v.length < 2 ? 0 : Math.sqrt(avg(v.map(x => (x - a) ** 2))!)
}
export const bestFilm = (ms: Movie[]) => [...ms].filter(m => Object.keys(m.ratings).length >= 3).sort((a, b) => groupAvg(b)! - groupAvg(a)!)[0]

export const membersOf = (ms: Movie[], wl: WatchItem[], extra: string[] = []) =>
  [...new Set([...ms.flatMap(m => [m.pick, ...Object.keys(m.ratings)]), ...wl.map(w => w.member), ...extra].filter(Boolean))].sort()

/** Attendees ordered by who picked longest ago (never = first), ties alphabetical. */
export function pickOrder(ms: Movie[], attending: string[]) {
  const last = (n: string) => Math.max(-1, ...ms.filter(m => m.pick === n).map(m => m.seq))
  return [...attending].sort((a, b) => last(a) - last(b) || a.localeCompare(b)).map(n => ({ n, last: last(n) }))
}

export function memberStats(ms: Movie[], members: string[]) {
  const rated = ms.filter(m => Object.keys(m.ratings).length)
  return members.map(n => {
    const mine = rated.filter(m => m.ratings[n] != null)
    const picks = ms.filter(m => m.pick === n).map(groupAvg).filter((x): x is number => x != null)
    return {
      n, count: mine.length, avg: avg(mine.map(m => m.ratings[n])), pickAvg: avg(picks),
      offGroup: avg(mine.map(m => Math.abs(m.ratings[n] - groupAvg(m)!))),
    }
  })
}

export type FilmSort = "newest" | "oldest" | "highest" | "lowest" | "gap" | "divisive" | "title"
export type FilmFilter = { q: string; sort: FilmSort; picker: string; decade: string }
export const defaultFilter: FilmFilter = { q: "", sort: "newest", picker: "", decade: "" }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")

/** Search by title (case and punctuation ignored), filter by picker and decade, then sort. Films with no data sort last. */
export function filterFilms(ms: Movie[], f: FilmFilter) {
  const q = norm(f.q)
  const gap = (m: Movie) => { const g = groupAvg(m), o = outsideAvg(m); return g == null || o == null ? -1 : Math.abs(g - o) }
  const hi = (m: Movie) => groupAvg(m) ?? -1
  const lo = (m: Movie) => groupAvg(m) ?? 99
  const sorters: Record<FilmSort, (a: Movie, b: Movie) => number> = {
    newest: (a, b) => b.seq - a.seq,
    oldest: (a, b) => a.seq - b.seq,
    highest: (a, b) => hi(b) - hi(a),
    lowest: (a, b) => lo(a) - lo(b),
    gap: (a, b) => gap(b) - gap(a),
    divisive: (a, b) => spread(b) - spread(a),
    title: (a, b) => a.title.localeCompare(b.title),
  }
  return ms
    .filter(m => !q || norm(m.title).includes(q))
    .filter(m => !f.picker || m.pick === f.picker)
    .filter(m => !f.decade || Math.floor(m.year / 10) * 10 === +f.decade)
    .sort(sorters[f.sort])
}
export const decadesOf = (ms: Movie[]) => [...new Set(ms.map(m => Math.floor(m.year / 10) * 10))].sort((a, b) => b - a)

/** A few plain sentences about one film, for the film page and the group chat. */
export function recapLines(m: Movie, all: Movie[]): string[] {
  const g = groupAvg(m), o = outsideAvg(m), rs = Object.entries(m.ratings)
  if (g == null) return [`${m.pick} picked it. Nobody has rated it yet.`]
  const out = [`${m.pick} picked it. The club averaged ${fmt(g)} from ${rs.length} ${rs.length === 1 ? "rating" : "ratings"}.`]
  if (o != null) {
    const d = g - o
    out.push(Math.abs(d) < 0.05 ? `That matches the outside average of ${fmt(o)}.` : `Everyone else gave ${fmt(o)}, so we were ${fmt(Math.abs(d))} ${d > 0 ? "higher" : "lower"}.`)
  }
  if (rs.length > 1) {
    const hi = rs.reduce((a, b) => (b[1] > a[1] ? b : a)), lo = rs.reduce((a, b) => (b[1] < a[1] ? b : a))
    if (hi[1] !== lo[1]) out.push(`${hi[0]} liked it most (${hi[1]}) and ${lo[0]} least (${lo[1]}).${spread(m) >= 1 ? " A real split." : ""}`)
    else out.push(`Everyone gave it ${hi[1]}.`)
  }
  const rated = all.filter(x => groupAvg(x) != null).sort((a, b) => groupAvg(b)! - groupAvg(a)!)
  const rank = rated.findIndex(x => x.id === m.id) + 1
  if (rank) out.push(`It ranks #${rank} of ${rated.length} films the club has watched.`)
  return out
}

/** For each pair who both rated at least `min` of the same films: average distance between their ratings (smaller = closer taste). */
export function tasteOverlap(ms: Movie[], members: string[], min = 5) {
  const out: { a: string; b: string; n: number; diff: number }[] = []
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const both = ms.filter(m => m.ratings[members[i]] != null && m.ratings[members[j]] != null)
      if (both.length >= min) out.push({ a: members[i], b: members[j], n: both.length, diff: avg(both.map(m => Math.abs(m.ratings[members[i]] - m.ratings[members[j]])))! })
    }
  }
  return out.sort((x, y) => x.diff - y.diff)
}

/** How much higher (+) or lower (-) this person rates than everyone else on the same films. */
export function tilt(ms: Movie[], name: string) {
  const d = ms.filter(m => m.ratings[name] != null && Object.keys(m.ratings).length > 1).map(m => {
    const others = Object.entries(m.ratings).filter(([n]) => n !== name).map(([, v]) => v)
    return m.ratings[name] - avg(others)!
  })
  return avg(d)
}

/** Count of ratings at each half-star step, 0.5 to 5. */
export const histogram = (ms: Movie[], name: string) =>
  Array.from({ length: 10 }, (_, i) => ({ v: (i + 1) / 2, n: ms.filter(m => m.ratings[name] === (i + 1) / 2).length }))

/** Group average per film, oldest first. */
export const trend = (ms: Movie[]) =>
  [...ms].sort((a, b) => a.seq - b.seq).map(m => ({ id: m.id, title: m.title, avg: groupAvg(m) })).filter((x): x is { id: Movie["id"]; title: string; avg: number } => x.avg != null)
