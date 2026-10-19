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
