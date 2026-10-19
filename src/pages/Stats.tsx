import { useState } from "react"
import { TrendChart } from "@/components/Charts"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SortTable } from "@/components/SortTable"
import { download, letterboxdCsv, ratingsCsv } from "@/lib/exporters"
import { isUnused } from "@/lib/people"
import { fmt, groupAvg, memberStats, outsideAvg, spread, tasteOverlap, tilt, trend } from "@/lib/stats"
import { useStore } from "@/lib/store"

export default function Stats() {
  const { movies, members, watchlist, suggestions, renameMember, removeMember } = useStore()
  const rated = movies.filter(m => Object.keys(m.ratings).length)
  if (!rated.length) return <p className="text-muted-foreground">Stats show up once the club has rated a film.</p>

  const people = memberStats(movies, members).filter(p => p.count).map(p => ({ ...p, tilt: tilt(movies, p.n), attend: p.count / rated.length }))
  const regulars = people.filter(p => p.count >= 5)
  const by = (arr: typeof regulars, f: (p: (typeof regulars)[number]) => number) => [...arr].sort((a, b) => f(b) - f(a))[0]
  const picker = by(people.filter(p => p.pickAvg != null), p => p.pickAvg!)
  const harsh = by(regulars, p => -p.avg!), kind = by(regulars, p => p.avg!), odd = by(regulars, p => p.offGroup!)
  const awards: [string, string][] = [
    picker && ["Best pick", `${picker.n} (their picks average ${fmt(picker.pickAvg)})`],
    harsh && ["Harshest critic", `${harsh.n} (${fmt(harsh.avg)} on average)`],
    kind && ["Most generous", `${kind.n} (${fmt(kind.avg)} on average)`],
    odd && ["Most contrarian", `${odd.n} (${fmt(odd.offGroup)} away from the group, on average)`],
  ].filter(Boolean) as [string, string][]
  const overlap = tasteOverlap(rated, members)
  const top = [...rated].sort((a, b) => groupAvg(b)! - groupAvg(a)!).slice(0, 5)
  const divisive = [...rated].sort((a, b) => spread(b) - spread(a)).slice(0, 5)
  const gap = rated.filter(m => outsideAvg(m) != null).sort((a, b) => Math.abs(groupAvg(b)! - outsideAvg(b)!) - Math.abs(groupAvg(a)! - outsideAvg(a)!)).slice(0, 5)

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="text-xl font-bold">Awards</h3>
        <p className="mb-2 text-sm text-muted-foreground">Critic awards count people with at least 5 films rated.</p>
        <Card className="gap-0 py-2">
          {awards.map(([l, v]) => (
            <div key={l} className="grid grid-cols-[9rem_1fr] gap-2 px-4 py-1.5"><dt className="text-sm text-muted-foreground">{l}</dt><dd>{v}</dd></div>
          ))}
        </Card>
      </section>
      <section>
        <h3 className="mb-2 text-xl font-bold">Group average over time</h3>
        <TrendChart points={trend(rated)} />
      </section>
      {overlap.length > 1 && (
        <section>
          <h3 className="text-xl font-bold">Who agrees</h3>
          <p className="mb-2 text-sm text-muted-foreground">Average distance between two people's ratings on films they both rated (at least 5). Smaller means closer taste.</p>
          <Card className="gap-0 py-2">
            {[...overlap.slice(0, 3).map(o => ["Closest", o] as const), ...overlap.slice(-3).reverse().map(o => ["Furthest apart", o] as const)].filter((r, i, a) => a.findIndex(q => q[1] === r[1]) === i).map(([l, o]) => (
              <div key={`${l}${o.a}${o.b}`} className="grid grid-cols-[8.5rem_1fr] gap-2 px-4 py-1.5"><dt className="text-sm text-muted-foreground">{l}</dt><dd>{o.a} and {o.b} <span className="text-muted-foreground">({fmt(o.diff)} stars apart over {o.n} films)</span></dd></div>
            ))}
          </Card>
        </section>
      )}
      <section>
        <h3 className="mb-2 text-xl font-bold">Top films</h3>
        <ol className="list-decimal pl-5">{top.map((m, i) => <li key={m.id}>{m.title} <b className={i === 0 ? "text-gold" : ""}>{fmt(groupAvg(m))}</b></li>)}</ol>
      </section>
      <section>
        <h3 className="mb-2 text-xl font-bold">People</h3>
        <Card data-no-swipe className="py-1">
          <SortTable
            rows={people}
            rowKey={p => p.n}
            initial={{ id: "attend", dir: "desc" }}
            columns={[
              { id: "name", label: "Name", get: p => p.n, first: "asc", render: p => <a className="underline" href={`#/people/${encodeURIComponent(p.n)}`}>{p.n}</a> },
              { id: "attend", label: "Attend", get: p => p.attend, render: p => <span title={`${p.count} of ${rated.length} films`}>{Math.round(p.attend * 100)}%<span className="sr-only"> ({p.count} of {rated.length} films)</span></span> },
              { id: "avg", label: "Avg", get: p => p.avg, render: p => fmt(p.avg) },
              { id: "picks", label: "Picks", get: p => p.pickAvg, render: p => fmt(p.pickAvg) },
              { id: "tilt", label: "vs all", get: p => p.tilt, render: p => (p.tilt == null ? "–" : `${p.tilt > 0 ? "+" : ""}${fmt(p.tilt, 1)}`) },
            ]}
          />
        </Card>
      </section>
      <section>
        <h3 className="mb-2 text-xl font-bold">Most divisive</h3>
        <ol className="list-decimal pl-5">{divisive.map(m => <li key={m.id}>{m.title} <span className="text-muted-foreground">spread {fmt(spread(m))}</span></li>)}</ol>
      </section>
      <section>
        <h3 className="mb-2 text-xl font-bold">Biggest gap with outside ratings</h3>
        {gap.length ? <ol className="list-decimal pl-5">{gap.map(m => <li key={m.id}>{m.title}: us {fmt(groupAvg(m))}, outside {fmt(outsideAvg(m))}</li>)}</ol> : <p className="text-muted-foreground">Outside ratings are still loading.</p>}
      </section>
    <section>
        <h3 className="text-xl font-bold">Manage people</h3>
        <p className="mb-2 text-sm text-muted-foreground">Rename someone, or type an existing name to merge two spellings. Ratings, picks, watchlists and votes move over.</p>
        <Card className="gap-0 py-1">
          {members.map(n => <PersonRow key={n} name={n} unused={isUnused(n, movies, watchlist, suggestions)} onRename={to => renameMember(n, to)} onRemove={() => removeMember(n)} />)}
        </Card>
      </section>
      <section>
        <h3 className="text-xl font-bold">Download your data</h3>
        <p className="mb-2 text-sm text-muted-foreground">A copy of everything, in case you want it somewhere else.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-10 px-4" onClick={() => download("movie-club-ratings.csv", ratingsCsv(movies, members))}>Ratings spreadsheet (.csv)</Button>
          <Button variant="outline" className="h-10 px-4" onClick={() => download("movie-club-letterboxd-list.csv", letterboxdCsv(movies))}>Letterboxd list (.csv)</Button>
          <Button variant="outline" className="h-10 px-4" onClick={() => download("movie-club-backup.json", JSON.stringify({ exported: new Date().toISOString(), movies, watchlist, suggestions }, null, 2), "application/json")}>Full backup (.json)</Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">To use the Letterboxd list: Letterboxd, then Lists, New list, Import.</p>
      </section>
    </div>
  )
}

function PersonRow({ name, unused, onRename, onRemove }: { name: string; unused: boolean; onRename: (to: string) => void; onRemove: () => void }) {
  const [editing, setEditing] = useState(false)
  const [to, setTo] = useState(name)
  if (!editing) {
    return (
      <div className="flex items-center gap-2 px-4 py-1">
        <a className="flex-1 underline" href={`#/people/${encodeURIComponent(name)}`}>{name}</a>
        <Button variant="ghost" className="h-10 px-3" onClick={() => { setTo(name); setEditing(true) }}>Rename or merge</Button>
        {unused && <Button variant="ghost" className="h-10 px-3 text-destructive" onClick={onRemove}>Remove</Button>}
      </div>
    )
  }
  return (
    <form className="flex flex-wrap items-center gap-2 px-4 py-1" onSubmit={e => { e.preventDefault(); if (to.trim() && to.trim() !== name) onRename(to); setEditing(false) }}>
      <Input value={to} onChange={e => setTo(e.target.value)} aria-label={`New name for ${name}`} autoFocus className="h-10 w-44" />
      <Button type="submit" className="h-10 px-4">Save</Button>
      <Button type="button" variant="ghost" className="h-10 px-3" onClick={() => setEditing(false)}>Cancel</Button>
    </form>
  )
}
