import { useEffect, useState } from "react"
import { filmDetail } from "./api"
import type { Movie } from "./types"

const regions = new Intl.DisplayNames(["en"], { type: "region" }), languages = new Intl.DisplayNames(["en"], { type: "language" })
const safe = (f: () => string | undefined) => { try { return f() } catch { return undefined } }

/** The film's main country only. TMDB lists every co-producing and financing country, which makes American films look German or British; its origin country is the first, main one. */
export const mainCountry = (d: any): string[] => {
  const code: string | undefined = d.origin_country?.[0] ?? d.production_countries?.[0]?.iso_3166_1
  if (!code) return []
  return [code === "US" ? "USA" : safe(() => regions.of(code)) ?? code]
}

export type FilmTags = Record<string, { genres: string[]; countries: string[]; language: string | null }>

/** Genres and countries for each film, from TMDB, keyed by movie id. Fills in as the lookups finish. */
export function useFilmTags(movies: Movie[]): FilmTags {
  const [info, setInfo] = useState<FilmTags>({})
  const ids = movies.map(m => m.tmdb_id).filter(Boolean).join(",")
  useEffect(() => {
    let dead = false
    ;(async () => {
      const out: FilmTags = {}
      await Promise.all(movies.filter(m => m.tmdb_id).map(async m => {
        const d = await filmDetail(m.tmdb_id!)
        if (d) out[String(m.id)] = { genres: (d.genres ?? []).map((g: any) => g.name), countries: mainCountry(d), language: d.original_language ? safe(() => languages.of(d.original_language)) ?? null : null }
      }))
      if (!dead) setInfo(out)
    })()
    return () => { dead = true }
  }, [ids]) // eslint-disable-line react-hooks/exhaustive-deps
  return info
}
