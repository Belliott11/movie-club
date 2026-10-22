import { movieHref } from "@/lib/movieLink"
import { AddPerson } from "@/components/AddPerson"
import { PickControls, FactsLine, useMyServices, usePickPrefs } from "@/components/PickControls"
import { passesFilters, useFacts } from "@/lib/filmFacts"
import { ConstraintDeck } from "@/components/ConstraintDeck"
import { SelectorPanel } from "@/components/SelectorPanel"
import { ClubShortlist } from "@/components/ClubShortlist"
import { ImportNudge } from "@/components/ImportNudge"
import { PickCard } from "@/components/PickCard"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useEffect, useMemo } from "react"
import { seenBy } from "@/lib/letterboxd"
import { rankForGroup } from "@/lib/picks"
import { key, pickOrder } from "@/lib/stats"
import { useStore } from "@/lib/store"

export default function Next() {
  const { movies, members, attending, toggleAttend, watchlist, lb, loadLb, suggestions, suggest } = useStore()
  useEffect(() => { loadLb() }, [loadLb])
  const pool = useMemo(() => rankForGroup(attending, lb, watchlist, movies, 16), [attending, lb, watchlist, movies])
  const [prefs] = usePickPrefs()
  const [mine] = useMyServices()
  const facts = useFacts(pool)
  const ranked = pool.filter(r => passesFilters(facts[key(r.title, r.year)], prefs, mine)).slice(0, 6)
  const order = pickOrder(movies, attending)
  const watched = new Set(movies.map(m => key(m.title, m.year)))
  const hits = new Map<string, { t: string; y: number; who: string[] }>()
  for (const w of watchlist) {
    if (!attending.includes(w.member) || watched.has(key(w.title, w.year))) continue
    const h = hits.get(key(w.title, w.year)) || { t: w.title, y: w.year, who: [] }
    h.who.push(w.member)
    hits.set(key(w.title, w.year), h)
  }
  const seenAmong = (h: { t: string; y: number }) => seenBy(lb, h.t, h.y).filter(n => attending.includes(n))
  // most wanted first; among ties, films fewer of tonight's group have already seen
  const top = [...hits.values()].sort((a, b) => b.who.length - a.who.length || seenAmong(a).length - seenAmong(b).length).slice(0, 12)

  return (
    <div className="stagger flex flex-col gap-6">
      <ImportNudge />
      <ClubShortlist />
      <SelectorPanel />
      <ConstraintDeck />
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
        <div className="mt-3">
          <AddPerson label="Add and switch on" onAdded={n => { if (!attending.includes(n)) toggleAttend(n) }} />
        </div>
      </section>
      <section>
        <h3 className="mb-1 text-xl font-bold">Best picks for tonight</h3>
        <p className="mb-3 text-sm text-muted-foreground">Scored from the room's watchlists and what friends loved on Letterboxd. Films two or more of the room have seen are dropped.</p>
        <PickControls />
        {!attending.length ? (
          <p className="text-muted-foreground">Switch on whoever is coming and the best picks show up here.</p>
        ) : ranked.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {ranked.map(r => (
              <li key={r.title + r.year}>
                <PickCard
                  title={r.title}
                  year={r.year}
                  lines={r.reasons}
                  extra={<FactsLine facts={facts[key(r.title, r.year)]} />}
                  done={suggestions.some(x => key(x.title, x.year) === key(r.title, r.year))}
                  onSuggest={() => suggest(r.title, r.year)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No clear pick yet. Ask the room to add watchlists or import Letterboxd and this fills in.</p>
        )}
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
          <p className="text-muted-foreground">Switch on whoever is coming and the seats fill up.</p>
        )}
      </section>
      <section>
        <h3 className="mb-2 text-xl font-bold">On the attendees' watchlists</h3>
        {top.length ? (
          <ul className="flex flex-col gap-1.5">
            {top.map(h => (
              <li key={h.t + h.y}><a href={movieHref(h.t, h.y)} className="hover:underline">{h.t}</a> <small className="text-muted-foreground">{h.y || ""}</small> · {h.who.length} of {attending.length}: {h.who.join(", ")}{seenAmong(h).length > 0 && <span className="text-muted-foreground"> · already seen by {seenAmong(h).join(", ")}</span>}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Upload watchlists on the Watchlists tab, then switch on who's here.</p>
        )}
      </section>
    </div>
  )
}
