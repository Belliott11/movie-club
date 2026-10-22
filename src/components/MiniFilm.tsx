import { useEffect, useState, type ReactNode } from "react"
import { IMG, searchFilm } from "@/lib/api"
import { FactsLine } from "@/components/PickControls"
import { filmFacts, type Facts } from "@/lib/filmFacts"
import { movieHref } from "@/lib/movieLink"

/** A film in a list: small poster, title and year, TMDB score, runtime and where it streams, a two-line synopsis. Looked up by title and year, cached. `note` and `action` slot in beside it. */
export function MiniFilm({ title, year, note, action }: { title: string; year?: number | null; note?: ReactNode; action?: ReactNode }) {
  const [hit, setHit] = useState<any>(null)
  const [facts, setFacts] = useState<Facts | undefined>()
  useEffect(() => {
    let dead = false
    searchFilm(title, year || null).then(async h => {
      if (dead || !h) return
      setHit(h)
      const f = h.id ? await filmFacts(h.id) : null
      if (!dead && f) setFacts(f)
    })
    return () => { dead = true }
  }, [title, year])
  const y = year || (hit?.release_date ? +hit.release_date.slice(0, 4) : 0)
  return (
    <div className="flex items-start gap-3">
      <a href={movieHref(title, y)} aria-label={`About ${title}`} className="shrink-0">
        {hit?.poster_path ? <img src={`${IMG}w92${hit.poster_path}`} alt="" loading="lazy" className="aspect-[2/3] w-11 rounded object-cover" /> : <span className="block aspect-[2/3] w-11 rounded bg-muted" />}
      </a>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium"><a href={movieHref(title, y)} className="hover:underline">{title}</a>{y ? <span className="font-normal text-muted-foreground"> {y}</span> : null}{hit?.vote_average ? <span className="text-xs font-normal text-muted-foreground"> · TMDB {hit.vote_average.toFixed(1)}</span> : null}</p>
        <FactsLine facts={facts} />
        {hit?.overview && <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">{hit.overview}</p>}
        {note && <div className="text-xs text-muted-foreground">{note}</div>}
      </div>
      {action}
    </div>
  )
}
