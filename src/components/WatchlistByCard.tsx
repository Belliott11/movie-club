import { useMemo, useState } from "react"
import { Collapse } from "@/components/Collapse"
import { Input } from "@/components/ui/input"
import { candFromEntry } from "@/lib/catalog"
import { movieHref } from "@/lib/movieLink"
import { fold, key } from "@/lib/stats"
import { useStore } from "@/lib/store"
import { useDeckData } from "@/lib/useDeckData"

type Row = { title: string; year: number; who: string[] }

/** Every watchlist film nobody here has seen, sorted under each pick card it qualifies for. Films may sit under several cards. */
export function WatchlistByCard() {
  const { deckCards, cards } = useStore()
  const { pool, ctx, catalog, room } = useDeckData()
  const [open, setOpen] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const rows = useMemo(() => {
    if (!catalog) return null
    const known = pool.flatMap(c => { const e = catalog.get(key(c.title, c.year)); return e ? [{ c, cand: candFromEntry(e, c) }] : [] })
    const byFilm = known.map(x => ({ c: x.c, cards: cards.filter(card => card.fits(x.cand, ctx) === true) }))
    const sorted = cards.map(card => ({ card, films: byFilm.filter(f => f.cards.some(k => k.id === card.id)).map(f => f.c).sort((a, b) => b.wantedBy - a.wantedBy || a.title.localeCompare(b.title)) }))
    const unknown = pool.filter(c => !catalog.get(key(c.title, c.year))).sort((a, b) => a.title.localeCompare(b.title))
    return {
      sorted, byFilm,
      none: byFilm.filter(f => !f.cards.length).map(f => f.c).sort((a, b) => a.title.localeCompare(b.title)),
      unknown,
      anyCard: byFilm.filter(f => f.cards.length).length,
      total: known.length,
    }
  }, [pool, catalog, ctx, cards])
  const found = useMemo(() => {
    const needle = fold(q.trim())
    if (!rows || needle.length < 2) return null
    return rows.byFilm.filter(f => fold(f.c.title).includes(needle)).slice(0, 12)
  }, [rows, q])

  const list = (id: string, title: string, note: string, films: Row[], dim = false) => (
    <li key={id} className={dim ? "opacity-60" : ""}>
      <button type="button" aria-expanded={open === id} disabled={!films.length} onClick={() => setOpen(open === id ? null : id)} className="flex min-h-11 w-full items-center justify-between gap-3 py-1.5 text-left disabled:cursor-default">
        <span className="min-w-0"><b className="font-medium">{title}</b><span className="block text-xs text-muted-foreground">{note}</span></span>
        <span className="num shrink-0 text-sm text-muted-foreground">{films.length}</span>
      </button>
      {open === id && (
        <ul className="mb-2 grid gap-x-4 gap-y-0.5 text-sm sm:grid-cols-2">
          {films.map(c => <li key={c.title + c.year} className="truncate"><a href={movieHref(c.title, c.year)} className="hover:underline">{c.title}</a> <small className="text-muted-foreground">{c.year} · {c.who.join(", ")}</small></li>)}
        </ul>
      )}
    </li>
  )

  return (
    <Collapse id="next-bycard" title="Watchlists sorted by card" defaultOpen={false}>
      {!rows ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <>
          <p className="mb-2 text-sm text-muted-foreground">{rows.total} watchlist films nobody {room.length === 1 ? "here" : "in the room"} has seen, {rows.anyCard} of them under at least one card. Cards that aren't in the deck are dimmed.</p>
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Find a film to see its cards" aria-label="Find a film" className="mb-2 h-11" />
          {found && (
            <ul className="mb-3 flex flex-col gap-1.5 rounded-lg bg-card p-3 text-sm ring-1 ring-foreground/10">
              {found.length ? found.map(f => (
                <li key={f.c.title + f.c.year}><a href={movieHref(f.c.title, f.c.year)} className="font-medium hover:underline">{f.c.title}</a> <small className="text-muted-foreground">{f.c.year}</small>
                  <span className="block text-xs text-muted-foreground">{f.cards.length ? f.cards.map(k => k.title).join(" · ") : "Fits no card"}</span></li>
              )) : <li className="text-muted-foreground">No unseen watchlist film matches that.</li>}
            </ul>
          )}
          <ul className="flex flex-col divide-y divide-border">
            {rows.sorted.map(({ card, films }) => list(card.id, card.title, card.rule, films, !deckCards.includes(card.id)))}
            {list("none", "Fits no card", "On a watchlist, but none of the cards describe it.", rows.none)}
            {rows.unknown.length > 0 && list("unknown", "Not sorted yet", "Not in the catalog, so no card can tell. Run npm run catalog to add them.", rows.unknown)}
          </ul>
        </>
      )}
    </Collapse>
  )
}
