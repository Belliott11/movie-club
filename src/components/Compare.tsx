import { useEffect, useState } from "react"
import { Collapse } from "@/components/Collapse"
import { Avatar } from "@/components/Avatar"
import { Button } from "@/components/ui/button"
import { headToHead, type Head2Head } from "@/lib/compare"
import { IMG } from "@/lib/api"
import { movieHref } from "@/lib/movieLink"
import { pairRecs, type PairRec } from "@/lib/pairRecs"
import type { LbHistory } from "@/lib/letterboxd"
import { fmt } from "@/lib/stats"
import { useStore } from "@/lib/store"

const f1 = (n: number) => fmt(n, 1)

function Films({ title, rows }: { title: string; rows: { film: { title: string; year: number }; text: string; ask?: boolean }[] }) {
  const { suggest } = useStore()
  if (!rows.length) return null
  return (
    <div>
      <h4 className="mb-1 font-display text-lg font-bold">{title}</h4>
      <ul className="flex flex-col">
        {rows.map(r => (
          <li key={r.film.title + r.film.year} className="flex items-center justify-between gap-2 py-1 text-sm">
            <span className="min-w-0"><a href={movieHref(r.film.title, r.film.year)} className="font-medium hover:underline">{r.film.title}</a> <span className="text-muted-foreground">{r.film.year} · {r.text}</span></span>
            {r.ask && <Button variant="ghost" className="h-9 shrink-0 px-2 text-xs" onClick={() => suggest(r.film.title, r.film.year)}>Suggest to club</Button>}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Two people's Letterboxd histories side by side: how alike they rate, what they both loved, where they split, and what to tell each other to watch. */
export function Compare({ name, lb }: { name: string; lb: LbHistory }) {
  const others = Object.keys(lb).filter(n => n !== name && lb[n]?.length)
  const [pick, setPick] = useState("")
  const who = pick || others[0]
  const { movies, suggest } = useStore()
  const [recs, setRecs] = useState<PairRec[] | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setRecs(null) }, [name, who])
  if (!lb[name]?.length) return null
  if (!others.length) return (
    <Collapse id="me-compare" title="Compare with a friend">
      <p className="text-sm text-muted-foreground">This unlocks when someone else imports their Letterboxd history on the Watchlists tab.</p>
    </Collapse>
  )
  const h: Head2Head = headToHead(lb, name, who)
  return (
    <Collapse id="me-compare" title={`${name} and ${who}`}>
    <div className="flex flex-col gap-4">
      <div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Compare with
          <select value={who} onChange={e => setPick(e.target.value)} className="h-11 rounded-lg border border-input bg-card px-3 text-foreground">
            {others.map(n => <option key={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-4 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
        <span className="flex shrink-0 -space-x-2"><Avatar name={name} /><Avatar name={who} /></span>
        <div className="min-w-0">
          {h.match != null
            ? <p><b className="font-display text-3xl">{h.match}%</b> <span className="text-muted-foreground">alike</span></p>
            : <p className="text-muted-foreground">Not enough shared ratings to score yet</p>}
          <p className="text-sm text-muted-foreground">{h.watchedBoth} films watched by both, {h.ratedBoth} rated by both{h.gap != null && <>, off by {f1(h.gap)} stars on average</>}.</p>
        </div>
      </div>
      <Films title="Both loved" rows={h.bothLoved.map(x => ({ film: x.film, text: `${f1(x.a)} and ${f1(x.b)}` }))} />
      <Films title="Where they split" rows={h.splits.map(x => ({ film: x.film, text: `${name} ${f1(x.a)}, ${who} ${f1(x.b)}` }))} />
      <Films title={`${name} loves, ${who} hasn't seen`} rows={h.aLoves.map(x => ({ film: x.film, text: `${name} gave ${f1(x.rating)}`, ask: true }))} />
      <Films title={`${who} loves, ${name} hasn't seen`} rows={h.bLoves.map(x => ({ film: x.film, text: `${who} gave ${f1(x.rating)}`, ask: true }))} />
      <div>
        <h4 className="mb-1 font-display text-lg font-bold">Films {name} and {who} would both like</h4>
        {recs == null ? (
          <Button variant="outline" className="h-11 px-4" disabled={busy} onClick={async () => { setBusy(true); setRecs(await pairRecs(lb, name, who, movies)); setBusy(false) }}>{busy ? "Finding films…" : "Find films for both of them"}</Button>
        ) : recs.length ? (
          <ul className="grid grid-cols-1 gap-2">
            {recs.map(r => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl bg-card p-2 ring-1 ring-foreground/10">
                <a href={movieHref(r.title, r.year)} aria-label={`About ${r.title}`} className="shrink-0">{r.poster ? <img src={`${IMG}w92${r.poster}`} alt="" loading="lazy" className="aspect-[2/3] w-10 rounded object-cover" /> : <span className="block aspect-[2/3] w-10 rounded bg-muted" />}</a>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium"><a href={movieHref(r.title, r.year)} className="hover:underline">{r.title}</a> <span className="font-normal text-muted-foreground">{r.year}</span></span>
                  <span className="block truncate text-xs text-muted-foreground">Because of {r.because.slice(0, 3).join(", ")}</span>
                </span>
                <Button variant="ghost" className="h-9 shrink-0 px-2 text-xs" onClick={() => suggest(r.title, r.year)}>Suggest to club</Button>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">Nothing new to recommend: they've seen the obvious ones.</p>}
        <p className="mt-1 text-xs text-muted-foreground">Films TMDB recommends alongside what both loved and each person's favorites, leaving out anything either has watched.</p>
      </div>
    </div>
    </Collapse>
  )
}
