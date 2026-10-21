import { useEffect, useState } from "react"
import { tmdb } from "./api"
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

const KEY = "film-tags-v1" // by TMDB id, so a film is only ever looked up once per device
const read = (): Record<string, FilmTags[string]> => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") } catch { return {} } }
const fromCache = (movies: Movie[]): FilmTags => {
  const c = read(), out: FilmTags = {}
  for (const m of movies) if (m.tmdb_id && c[m.tmdb_id]) out[String(m.id)] = c[m.tmdb_id]
  return out
}

/** Genres, main country and language for each film, from TMDB, keyed by movie id. Remembered films show at once; the rest fill in as they load. */
export function useFilmTags(movies: Movie[]): FilmTags {
  const [info, setInfo] = useState<FilmTags>(() => fromCache(movies))
  const ids = movies.map(m => m.tmdb_id).filter(Boolean).join(",")
  useEffect(() => {
    let dead = false
    setInfo(fromCache(movies))
    ;(async () => {
      const cache = read(), missing = movies.filter(m => m.tmdb_id && !cache[m.tmdb_id])
      if (!missing.length) return
      await Promise.all(missing.map(async m => {
        const d = await tmdb<any>(`/movie/${m.tmdb_id}`) // the light call: no cast, crew or trailers
        if (d?.id) cache[m.tmdb_id!] = { genres: (d.genres ?? []).map((g: any) => g.name), countries: mainCountry(d), language: d.original_language ? safe(() => languages.of(d.original_language)) ?? null : null }
      }))
      try { localStorage.setItem(KEY, JSON.stringify(cache)) } catch { /* full: looked up again next time */ }
      if (!dead) setInfo(fromCache(movies))
    })()
    return () => { dead = true }
  }, [ids]) // eslint-disable-line react-hooks/exhaustive-deps
  return info
}
