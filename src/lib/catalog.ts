import { useEffect, useState } from "react"
import { continentOfCode, regionOfCode } from "./continents"
import type { Cand } from "./deck"
import { key } from "./stats"

/** One watchlist film's facts, as written by scripts/build-catalog.mjs (short names keep the file small). */
export type CatalogEntry = {
  t: string; y: number; id: number
  v?: number; rt?: number; l?: string; cc?: string[]; g?: string[]; d?: string[]
  p?: string; ri?: number; rr?: number; rm?: number; ox?: 1; wd?: 1; bw?: 1; si?: 1; ts?: 1; fr?: 1; kn?: 1; b?: number; im?: string; o?: number
}
export type Catalog = Map<string, CatalogEntry>

const intl = new Intl.DisplayNames(["en"], { type: "region" })
const countryName = (code: string) => { try { return code === "US" ? "USA" : intl.of(code) ?? code } catch { return code } }

let loading: Promise<Catalog> | null = null
/** The catalog file, read once. Empty when it isn't there, in which case the deck looks films up as it always did. */
export function loadCatalog(): Promise<Catalog> {
  return (loading ??= fetch(`${import.meta.env.BASE_URL}catalog.json`)
    .then(r => (r.ok ? r.json() : { films: [] }))
    .then((j: { films: CatalogEntry[] }) => new Map(j.films.filter(e => e.id).map(e => [key(e.t, e.y), e] as const)))
    .catch(() => new Map()))
}

/** The catalog once it has loaded, null until then. */
export function useCatalog(): Catalog | null {
  const [c, setC] = useState<Catalog | null>(null)
  useEffect(() => { loadCatalog().then(setC) }, [])
  return c
}

/** The average of whichever of IMDb (out of 10), Rotten Tomatoes (out of 100) and Metacritic (out of 100) have rated the film, as a score out of 5. The same sums the site uses for club films. */
export function outsideScore(e: CatalogEntry): number | undefined {
  const parts = [e.ri != null ? e.ri / 2 : undefined, e.rr != null ? e.rr / 20 : undefined, e.rm != null ? e.rm / 20 : undefined].filter((x): x is number => x !== undefined)
  return parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : undefined
}

/**
 * What a card needs to know about a film, from its catalog entry. A fact the catalog couldn't establish stays undefined (so the card says
 * "can't tell"), but a tag that TMDB had keywords for and didn't list counts as no.
 */
export function candFromEntry(e: CatalogEntry, base: { title: string; year: number; wantedBy: number }): Cand {
  const code = e.cc?.[0]
  return {
    ...base,
    poster: e.p,
    rating: outsideScore(e),
    runtime: e.rt, lang: e.l, genres: e.g, directors: e.d,
    country: code ? countryName(code) : undefined, continent: continentOfCode(code), region: regionOfCode(code),
    bw: e.kn ? !!e.bw : undefined, silent: e.kn ? !!e.si : undefined, trueStory: e.kn ? !!e.ts : undefined,
    franchise: e.fr ? true : e.kn ? false : undefined,
    womanDirector: e.d ? !!e.wd : undefined,
    budget: e.b,
    oscars: e.o ?? ((e.v ?? 0) < 800 ? 0 : undefined), // OMDb was only asked about well-voted films; the rest won nothing
  }
}
