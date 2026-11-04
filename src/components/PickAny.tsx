import { useState } from "react"
import { FilmSearch, type FilmHit } from "@/components/FilmSearch"
import { PickFilm } from "@/components/PickFilm"
import { IMG } from "@/lib/api"

/** Any film at all: search for it and pick it, whatever the card on the table says. It's still linked to that card if there is one. */
export function PickAny({ cardId }: { cardId?: string | null }) {
  const [text, setText] = useState("")
  const [hit, setHit] = useState<FilmHit | null>(null)
  return (
    <div className="mt-4">
      <h4 className="mb-1 font-display text-lg font-bold">Or pick any film</h4>
      <p className="mb-2 text-sm text-muted-foreground">It doesn't have to be on a watchlist or fit the card.</p>
      <FilmSearch name="any" aria-label="Search for any film to pick" placeholder="Start typing a film" value={text} onChange={t => { setText(t); setHit(null) }} onPick={h => { setText(h.title); setHit(h) }} />
      {hit && (
        <div className="mt-2 flex w-40 flex-col">
          {hit.poster ? <img src={`${IMG}w185${hit.poster}`} alt="" className="aspect-[2/3] w-full rounded-md object-cover" /> : <span className="block aspect-[2/3] w-full rounded-md bg-muted" />}
          <p className="mt-1 truncate text-sm font-medium leading-tight">{hit.title}</p>
          <p className="text-xs text-muted-foreground">{hit.year ?? ""}</p>
          {hit.year && <PickFilm title={hit.title} year={hit.year} tmdbId={hit.id} cardId={cardId} />}
        </div>
      )}
    </div>
  )
}
