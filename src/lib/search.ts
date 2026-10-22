import { fold } from "./stats"
import type { Movie, Suggestion, WatchItem } from "./types"

export type Hit = { kind: "film" | "person" | "title"; label: string; sub: string; href: string }

const norm = (s: string) => fold(s).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()
/** Matches when every word typed appears at the start of a word in the text, so "cit god" finds "City of God". */
const matches = (q: string, text: string) => { const t = norm(text).split(" "); return q.split(" ").every(w => t.some(x => x.startsWith(w))) }

/**
 * Everything on the site that matches what was typed: films the club has played, people, and films from suggestions and watchlists.
 * Club films come first, then people, then the rest. The caller adds TMDB results for films outside the club.
 */
export function searchLocal(text: string, movies: Movie[], members: string[], watchlist: WatchItem[], suggestions: Suggestion[], limit = 8): Hit[] {
  const q = norm(text)
  if (q.length < 2) return []
  const out: Hit[] = []
  for (const m of movies) if (matches(q, m.title)) out.push({ kind: "film", label: m.title, sub: `${m.year} · the club watched it`, href: `#/films/${encodeURIComponent(String(m.id))}` })
  for (const n of members) if (matches(q, n)) out.push({ kind: "person", label: n, sub: "Person", href: `#/people/${encodeURIComponent(n)}` })
  const seen = new Set(movies.map(m => norm(m.title)))
  for (const t of [...watchlist.map(w => ({ title: w.title, year: w.year, why: "on a watchlist" })), ...suggestions.map(s => ({ title: s.title, year: s.year ?? 0, why: "suggested" }))]) {
    const k = norm(t.title)
    if (seen.has(k) || !matches(q, t.title)) continue
    seen.add(k)
    out.push({ kind: "title", label: t.title, sub: `${t.year || ""} · ${t.why}`.replace(/^ · /, ""), href: `#/movie/${encodeURIComponent(t.title)}/${t.year || 0}` })
  }
  return out.slice(0, limit)
}
