import { useEffect, useState } from "react"
import { filmDetail } from "./api"
import type { Movie } from "./types"

export type FilmTags = Record<string, { genres: string[]; countries: string[] }>

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
        if (d) out[String(m.id)] = { genres: (d.genres ?? []).map((g: any) => g.name), countries: (d.production_countries ?? []).map((c: any) => c.iso_3166_1 === "US" ? "USA" : c.name) }
      }))
      if (!dead) setInfo(out)
    })()
    return () => { dead = true }
  }, [ids]) // eslint-disable-line react-hooks/exhaustive-deps
  return info
}
