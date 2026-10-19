import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { key, pickOrder } from "@/lib/stats"
import { useStore } from "@/lib/store"

export default function Next() {
  const { movies, members, attending, toggleAttend, watchlist } = useStore()
  const order = pickOrder(movies, attending)
  const watched = new Set(movies.map(m => key(m.title, m.year)))
  const hits = new Map<string, { t: string; y: number; who: string[] }>()
  for (const w of watchlist) {
    if (!attending.includes(w.member) || watched.has(key(w.title, w.year))) continue
    const h = hits.get(key(w.title, w.year)) || { t: w.title, y: w.year, who: [] }
    h.who.push(w.member)
    hits.set(key(w.title, w.year), h)
  }
  const top = [...hits.values()].sort((a, b) => b.who.length - a.who.length).slice(0, 12)

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-2 text-xl font-bold">Who's here this week?</h3>
        <div className="flex flex-wrap gap-2">
          {members.map(n => (
            <label key={n} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-full bg-card py-1.5 pr-4 pl-3">
              <Switch checked={attending.includes(n)} onCheckedChange={() => toggleAttend(n)} />
              {n}
            </label>
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-xl font-bold">Pick order</h3>
        {order.length ? (
          <Card className="gap-0 py-2">
            {order.map((x, i) => (
              <p key={x.n} className={`flex items-baseline justify-between gap-3 px-4 py-2 ${i === 0 ? "font-bold" : ""}`}>
                <span>{x.n}{i === 0 && " is up next"}</span>
                <small className="font-normal text-muted-foreground">last picked: {x.last < 0 ? "never" : movies.find(m => m.seq === x.last)?.title}</small>
              </p>
            ))}
          </Card>
        ) : (
          <p className="text-muted-foreground">Switch on whoever is coming and the pick order shows here.</p>
        )}
      </section>
      <section>
        <h3 className="mb-2 text-xl font-bold">On the attendees' watchlists</h3>
        {top.length ? (
          <ul className="flex flex-col gap-1.5">
            {top.map(h => (
              <li key={h.t + h.y}>{h.t} <small className="text-muted-foreground">{h.y || ""}</small> · {h.who.length} of {attending.length}: {h.who.join(", ")}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Upload watchlists on the Watchlists tab, then switch on who's here.</p>
        )}
      </section>
    </div>
  )
}
