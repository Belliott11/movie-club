import type { Movie, Suggestion, WatchItem } from "./types"

/** Moves everything belonging to `from` onto `to`. When both rated the same film, `to`'s rating is kept. */
export function mergeMovies(ms: Movie[], from: string, to: string): Movie[] {
  return ms.map(m => {
    const ratings = { ...m.ratings }
    if (ratings[from] != null) {
      if (ratings[to] == null) ratings[to] = ratings[from]
      delete ratings[from]
    }
    return { ...m, pick: m.pick === from ? to : m.pick, ratings }
  })
}

export function mergeWatch(wl: WatchItem[], from: string, to: string): WatchItem[] {
  const have = new Set(wl.filter(w => w.member === to).map(w => `${w.title}|${w.year}`))
  return wl.flatMap(w => {
    if (w.member !== from) return [w]
    return have.has(`${w.title}|${w.year}`) ? [] : [{ ...w, member: to }]
  })
}

export function mergeSuggestions(ss: Suggestion[], from: string, to: string): Suggestion[] {
  return ss.map(s => ({
    ...s,
    by: s.by === from ? to : s.by,
    votes: [...new Set((s.votes || []).map(v => (v === from ? to : v)))],
  }))
}

/** True when nothing in the club refers to this person, so they can be removed safely. */
export const isUnused = (name: string, ms: Movie[], wl: WatchItem[], ss: Suggestion[]) =>
  !ms.some(m => m.pick === name || m.ratings[name] != null) && !wl.some(w => w.member === name) && !ss.some(s => s.by === name || (s.votes || []).includes(name))
