import { useMemo, useState } from "react"
import { Collapse } from "@/components/Collapse"
import { candFromEntry } from "@/lib/catalog"
import { CARDS } from "@/lib/deck"
import { movieHref } from "@/lib/movieLink"
import { key } from "@/lib/stats"
import { useStore } from "@/lib/store"
import { useDeckData } from "@/lib/useDeckData"

/** Every watchlist film nobody here has seen, sorted under each pick card it qualifies for. Films may sit under several cards. */
export function WatchlistByCard() {
  const { deckCards } = useStore()
  const { pool, ctx, catalog, room } = useDeckData()
  const [open, setOpen] = useState<string | null>(null)
  const rows = useMemo(() => {
    if (!catalog) return null
    const cands = pool.flatMap(c => { const e = catalog.get(key(c.title, c.year)); return e ? [{ c, cand: candFromEntry(e, c) }] : [] })
    return {
      sorted: CARDS.map(card => ({ card, films: cands.filter(x => card.fits(x.cand, ctx) === true).sort((a, b) => b.c.wantedBy - a.c.wantedBy || a.c.title.localeCompare(b.c.title)) })),
      unsorted: pool.length - cands.length,
      anyCard: cands.filter(x => CARDS.some(card => card.fits(x.cand, ctx) === true)).length,
      total: cands.length,
    }
  }, [pool, catalog, ctx])
  return (
    <Collapse id="next-bycard" title="Watchlists sorted by card" defaultOpen={false}>
      {!rows ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <>
          <p className="mb-2 text-sm text-muted-foreground">{rows.total} watchlist films nobody {room.length === 1 ? "here" : "in the room"} has seen, {rows.anyCard} of them under at least one card. Cards that aren't in the deck are dimmed.{rows.unsorted > 0 && ` ${rows.unsorted} films aren't in the catalog yet.`}</p>
          <ul className="flex flex-col divide-y divide-border">
            {rows.sorted.map(({ card, films }) => (
              <li key={card.id} className={deckCards.includes(card.id) ? "" : "opacity-60"}>
                <button type="button" aria-expanded={open === card.id} disabled={!films.length} onClick={() => setOpen(open === card.id ? null : card.id)} className="flex min-h-11 w-full items-center justify-between gap-3 py-1.5 text-left disabled:cursor-default">
                  <span className="min-w-0"><b className="font-medium">{card.title}</b><span className="block text-xs text-muted-foreground">{card.rule}</span></span>
                  <span className="num shrink-0 text-sm text-muted-foreground">{films.length}</span>
                </button>
                {open === card.id && (
                  <ul className="mb-2 grid gap-x-4 gap-y-0.5 text-sm sm:grid-cols-2">
                    {films.map(({ c }) => <li key={c.title + c.year} className="truncate"><a href={movieHref(c.title, c.year)} className="hover:underline">{c.title}</a> <small className="text-muted-foreground">{c.year} · {c.who.join(", ")}</small></li>)}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </Collapse>
  )
}
