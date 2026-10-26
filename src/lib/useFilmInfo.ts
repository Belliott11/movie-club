import { useEffect, useState } from "react"
import { hasTmdb, searchFilm } from "./api"
import { key } from "./stats"

const cache = new Map<string, any>()

/** Poster, synopsis and score for a title, looked up on TMDB once per browser session. Always the info for the title asked about, never the previous one's. */
export function useFilmInfo(title: string, year: number | null) {
  const k = key(title, year)
  const [found, setFound] = useState<{ k: string; info: any } | null>(null)
  useEffect(() => {
    if (!title || !hasTmdb() || cache.has(k)) return
    let dead = false
    searchFilm(title, year).then(r => {
      cache.set(k, r || null)
      if (!dead) setFound({ k, info: r || null })
    })
    return () => { dead = true }
  }, [k, title, year])
  return cache.has(k) ? cache.get(k) : found?.k === k ? found.info : undefined
}
