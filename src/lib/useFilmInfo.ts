import { useEffect, useState } from "react"
import { hasTmdb, searchFilm } from "./api"
import { key } from "./stats"

const cache = new Map<string, any>()

/** Poster, synopsis and score for a title, looked up on TMDB once per browser session. */
export function useFilmInfo(title: string, year: number | null) {
  const k = key(title, year)
  const [info, setInfo] = useState<any>(cache.get(k))
  useEffect(() => {
    if (!title || !hasTmdb() || cache.has(k)) return
    let dead = false
    searchFilm(title, year).then(r => {
      cache.set(k, r || null)
      if (!dead) setInfo(r || null)
    })
    return () => { dead = true }
  }, [k, title, year])
  return info
}
