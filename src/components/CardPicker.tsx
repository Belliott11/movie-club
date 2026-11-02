import { Button } from "@/components/ui/button"
import { CARDS, DEFAULT_CARDS } from "@/lib/deck"
import { useStore } from "@/lib/store"

/** Everyone can add cards to the deck or take them out. The choice is shared with the whole club; at least three stay in. */
export function CardPicker({ current }: { current?: string }) {
  const { deckCards, setDeckCards } = useStore()
  const toggle = (id: string) => setDeckCards(deckCards.includes(id) ? deckCards.filter(x => x !== id) : CARDS.map(c => c.id).filter(x => x === id || deckCards.includes(x)))
  return (
    <>
      <p className="mb-2 text-sm text-muted-foreground">Tick a card to put it in the deck, untick it to take it out. {deckCards.length} of {CARDS.length} are in, and everyone here sees the same deck. Each deal is random from the cards that are in, so a card can come up again.</p>
      <div className="mb-2 flex flex-wrap gap-2">
        <Button variant="outline" className="h-10 px-3" onClick={() => setDeckCards(null)}>Recommended ({DEFAULT_CARDS.length})</Button>
        <Button variant="outline" className="h-10 px-3" onClick={() => setDeckCards(CARDS.map(c => c.id))}>All</Button>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {CARDS.map(c => (
          <li key={c.id}>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
              <input type="checkbox" className="mt-1 size-4 shrink-0" checked={deckCards.includes(c.id)} disabled={deckCards.includes(c.id) && deckCards.length <= 3} onChange={() => toggle(c.id)} />
              <span className="min-w-0 flex-1"><b className="font-medium">{c.title}</b><span className="block text-sm text-muted-foreground">{c.rule}</span></span>
              {c.id === current && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">on the table</span>}
            </label>
          </li>
        ))}
      </ul>
    </>
  )
}
