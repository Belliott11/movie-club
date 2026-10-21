import { useEffect, useState } from "react"
import { filmImages, type FilmImages } from "./api"

const dayOfYear = () => Math.floor((Date.now() - +new Date(new Date().getFullYear(), 0, 0)) / 864e5)
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

/** Every poster and still TMDB has for a film, or null while loading or when there is no TMDB match. */
export function useFilmImages(tmdbId?: number | null) {
  const [imgs, setImgs] = useState<FilmImages | null>(null)
  useEffect(() => {
    setImgs(null)
    if (!tmdbId) return
    let dead = false
    filmImages(tmdbId).then(r => { if (!dead) setImgs(r) })
    return () => { dead = true }
  }, [tmdbId])
  return imgs
}

/**
 * Picks one still to show for a film and lets the caller step to the next. The first still changes with the day, the film and `spin` (bumped each time a tab opens),
 * so the header looks different over the week, and `next` cycles through the rest. Falls back to `fallback` until stills load.
 */
export function useStills(subject: { title: string; tmdbId?: number | null; fallback?: string | null } | undefined, spin = 0) {
  const imgs = useFilmImages(subject?.tmdbId)
  const [shift, setShift] = useState(0)
  useEffect(() => setShift(0), [subject?.title])
  const list = imgs?.backdrops.length ? imgs.backdrops : subject?.fallback ? [subject.fallback] : []
  const still = list.length ? list[(dayOfYear() + hash(subject?.title ?? "") + shift + spin) % list.length] : null
  return { still, count: list.length, next: () => setShift(s => s + 1) }
}
