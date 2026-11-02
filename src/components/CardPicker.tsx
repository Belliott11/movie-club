import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fieldCls } from "@/components/field"
import { NATIONS } from "@/lib/atlas"
import { candFromEntry } from "@/lib/catalog"
import { buildCard, cardId, GENRE_IDS, LANG_CHOICES, TAGS } from "@/lib/customCard"
import { type CardDef } from "@/lib/deck"
import { key } from "@/lib/stats"
import { useStore } from "@/lib/store"
import { useDeckData } from "@/lib/useDeckData"

const num = (v: string) => (v.trim() === "" || isNaN(+v) ? undefined : +v)

/** Make a card of your own from a few options. It goes straight into the deck for everyone, and shows how many watchlist films fit before you add it. */
function CustomCardForm() {
  const { me, addCustomCard } = useStore()
  const { pool, ctx, catalog } = useDeckData()
  const [title, setTitle] = useState("")
  const [rule, setRule] = useState("")
  const [f, setF] = useState<CardDef["f"]>({})
  const set = (patch: Partial<CardDef["f"]>) => setF(x => ({ ...x, ...patch }))
  const def: CardDef = { id: "preview", title: title.trim() || "Your card", rule: rule.trim(), by: me || undefined, f }
  const hasOptions = Object.values(f).some(v => v !== undefined && v !== "")
  const fits = useMemo(() => {
    if (!catalog || !hasOptions) return null
    const card = buildCard(def)
    return pool.filter(c => { const e = catalog.get(key(c.title, c.year)); return e && card.fits(candFromEntry(e, c), ctx) === true }).length
  }, [pool, catalog, ctx, f]) // eslint-disable-line react-hooks/exhaustive-deps
  const add = async () => {
    if (!title.trim()) return
    await addCustomCard({ ...def, id: cardId(title), title: title.trim() })
    setTitle(""); setRule(""); setF({})
  }
  const row = "flex flex-wrap items-center gap-2 text-sm"
  return (
    <details className="mt-4 border-t border-border pt-2">
      <summary className="min-h-11 cursor-pointer py-2 font-medium">Make your own card</summary>
      <form className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); add() }}>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Card name, like Heist night" aria-label="Card name" className="h-11" required />
        <Input value={rule} onChange={e => setRule(e.target.value)} placeholder="What the pick has to be (optional, written from the options below if blank)" aria-label="Card rule" className="h-11" />
        <p className="text-xs text-muted-foreground">Options. A film has to meet every one you set, and the card then finds watchlist films that do.</p>
        <div className={row}>Made <Input inputMode="numeric" value={f.from ?? ""} onChange={e => set({ from: num(e.target.value) })} placeholder="from year" aria-label="From year" className="h-10 w-28" /> to <Input inputMode="numeric" value={f.to ?? ""} onChange={e => set({ to: num(e.target.value) })} placeholder="to year" aria-label="To year" className="h-10 w-28" /></div>
        <div className={row}>Runtime <Input inputMode="numeric" value={f.minRun ?? ""} onChange={e => set({ minRun: num(e.target.value) })} placeholder="min" aria-label="Shortest runtime in minutes" className="h-10 w-20" /> to <Input inputMode="numeric" value={f.maxRun ?? ""} onChange={e => set({ maxRun: num(e.target.value) })} placeholder="max" aria-label="Longest runtime in minutes" className="h-10 w-20" /> minutes</div>
        <div className={row}>
          <select value={f.lang ?? ""} onChange={e => set({ lang: e.target.value || undefined })} aria-label="Language" className={fieldCls}><option value="">Any language</option>{LANG_CHOICES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
          <select value={f.genre ?? ""} onChange={e => set({ genre: e.target.value || undefined })} aria-label="Genre" className={fieldCls}><option value="">Any genre</option>{Object.keys(GENRE_IDS).map(g => <option key={g}>{g}</option>)}</select>
          <select value={f.country ?? ""} onChange={e => set({ country: e.target.value || undefined })} aria-label="Country" className={fieldCls}><option value="">Any country</option>{[...NATIONS].sort((a, b) => a.name.localeCompare(b.name)).map(n => <option key={n.code} value={n.code}>{n.name}</option>)}</select>
          <select value={f.tag ?? ""} onChange={e => set({ tag: (e.target.value || undefined) as CardDef["f"]["tag"] })} aria-label="Also" className={fieldCls}><option value="">Anything else</option>{Object.entries(TAGS).map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
        </div>
        <div className={row}>
          <Input value={f.director ?? ""} onChange={e => set({ director: e.target.value || undefined })} placeholder="Director's name" aria-label="Director" className="h-10 w-44" />
          <Input value={f.word ?? ""} onChange={e => set({ word: e.target.value || undefined })} placeholder="Word in the title" aria-label="Word in the title" className="h-10 w-44" />
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">{fits === null ? (hasOptions ? "Counting…" : "No options set: the card works as a rule only, with no automatic matches.") : `${fits} watchlist ${fits === 1 ? "film fits" : "films fit"} now, none of them seen by anyone here.`}</p>
        <div><Button type="submit" className="h-11 px-4" disabled={!title.trim()}>Add to the deck</Button></div>
      </form>
    </details>
  )
}

/** The cards in the deck. Only the host ticks cards in or out; anyone can add a card of their own. */
export function CardPicker({ current }: { current?: string }) {
  const { cards, deckCards, setDeckCards, canDesignate, me, removeCustomCard } = useStore()
  const toggle = (id: string) => setDeckCards(deckCards.includes(id) ? deckCards.filter(x => x !== id) : cards.map(c => c.id).filter(x => x === id || deckCards.includes(x)))
  const shown = canDesignate ? cards : cards.filter(c => deckCards.includes(c.id))
  return (
    <>
      <p className="mb-2 text-sm text-muted-foreground">{deckCards.length} of {cards.length} cards are in the deck. Each deal is random from them, so a card can come up again. {canDesignate ? "Tick a card to put it in, untick it to take it out." : "The host chooses which of the built-in cards are in. Anyone can make a card of their own below."}</p>
      {canDesignate && (
        <div className="mb-2 flex flex-wrap gap-2">
          <Button variant="outline" className="h-10 px-3" onClick={() => setDeckCards(cards.map(c => c.id))}>All</Button>
        </div>
      )}
      <ul className="flex flex-col divide-y divide-border">
        {shown.map(c => (
          <li key={c.id} className="flex items-start gap-3 py-2">
            {canDesignate && <input type="checkbox" aria-label={`${c.title} in the deck`} className="mt-1 size-4 shrink-0" checked={deckCards.includes(c.id)} disabled={deckCards.includes(c.id) && deckCards.length <= 3} onChange={() => toggle(c.id)} />}
            <span className="min-w-0 flex-1"><b className="font-medium">{c.title}</b>{c.custom && <span className="text-xs text-muted-foreground"> · made by {c.custom.by || "someone"}</span>}<span className="block text-sm text-muted-foreground">{c.rule}</span></span>
            {c.id === current && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">on the table</span>}
            {c.custom && (canDesignate || (me && c.custom.by === me)) && <Button variant="ghost" className="h-9 shrink-0 px-2 text-xs text-destructive" onClick={() => { if (confirm(`Delete the card "${c.title}"?`)) removeCustomCard(c.id) }}>Delete</Button>}
          </li>
        ))}
      </ul>
      <CustomCardForm />
    </>
  )
}
