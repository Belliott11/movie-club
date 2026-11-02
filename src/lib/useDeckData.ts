import { useMemo } from "react"
import { continentOfName, regionOfName } from "./continents"
import { untouchedMovementKeys, type Ctx } from "./deck"
import { seenBy } from "./letterboxd"
import { key } from "./stats"
import { useStore } from "./store"
import { useCatalog } from "./catalog"
import { useFilmTags } from "./useFilmTags"

/**
 * What the pick cards work from: the watchlist films nobody in the room has seen (the room is whoever is switched on, or everyone when
 * nobody is), what the club has already done, and the catalog of watchlist film facts.
 */
export function useDeckData() {
  const { movies, watchlist, lb, countries: fixed, attending, members } = useStore()
  const room = attending.length ? attending : members
  const pool = useMemo(() => {
    const played = new Set(movies.map(m => key(m.title, m.year)))
    const by = new Map<string, { title: string; year: number; who: Set<string> }>()
    for (const w of watchlist) {
      const k = key(w.title, w.year)
      if (played.has(k)) continue
      const e = by.get(k) ?? { title: w.title, year: w.year, who: new Set<string>() }
      e.who.add(w.member)
      by.set(k, e)
    }
    return [...by.values()]
      .map(e => ({ title: e.title, year: e.year, wantedBy: e.who.size, who: [...e.who], seenInRoom: seenBy(lb, e.title, e.year).filter(n => room.includes(n)) }))
      .filter(e => e.seenInRoom.length === 0)
  }, [movies, watchlist, lb, room])

  // what the club has done already, so a card can ask for something new
  const tags = useFilmTags(movies)
  const ctx: Ctx = useMemo(() => ({
    thisYear: new Date().getFullYear(),
    countries: new Set(movies.flatMap(m => (fixed[String(m.id)] ? [fixed[String(m.id)]] : tags[String(m.id)]?.countries ?? []))),
    continents: new Set(movies.flatMap(m => { const c = continentOfName(fixed[String(m.id)] ?? tags[String(m.id)]?.countries?.[0]); return c ? [c] : [] })),
    regions: new Set(movies.flatMap(m => { const r = regionOfName(fixed[String(m.id)] ?? tags[String(m.id)]?.countries?.[0]); return r ? [r] : [] })),
    movementKeys: untouchedMovementKeys(new Set(movies.map(m => key(m.title, 0).split("|")[0]))),
  }), [movies, tags, fixed])

  return { pool, ctx, room, catalog: useCatalog() }
}
