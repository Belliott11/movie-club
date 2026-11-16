import { Collapse } from "@/components/Collapse"
import { fmt, groupAvg } from "@/lib/stats"
import { useStore } from "@/lib/store"

/** Every card the club has played so far: the film that answered it, who picked it and how it scored. Newest first. */
export function CardHistory() {
  const { movies, pickCards, cards } = useStore()
  const played = [...movies].sort((a, b) => b.seq - a.seq).flatMap(m => {
    const c = cards.find(x => x.id === pickCards[String(m.seq)])
    return c ? [{ m, c }] : []
  })
  const times = (id: string) => played.filter(p => p.c.id === id).length
  return (
    <Collapse id="next-card-history" title={`Cards played so far (${played.length})`} defaultOpen={false}>
      {played.length === 0 ? <p className="text-sm text-muted-foreground">No film has answered a card yet. When a pick is linked to a card it shows up here.</p> : (
        <ul className="flex flex-col divide-y divide-border">
          {played.map(({ m, c }) => (
            <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-2">
              <span className="min-w-0">
                <b className="font-display">{c.title}</b>{times(c.id) > 1 && <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">played {times(c.id)} times</span>}
                <span className="block text-sm text-muted-foreground"><a href={`#/films/${encodeURIComponent(String(m.id))}`} className="text-foreground hover:underline">{m.title}</a> {m.year}, {m.pick}'s pick</span>
              </span>
              <span className="font-display text-xl font-extrabold" title="Club average">{fmt(groupAvg(m))}</span>
            </li>
          ))}
        </ul>
      )}
    </Collapse>
  )
}
