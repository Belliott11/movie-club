import { useState } from "react"
import { Gavel, Heart, Shuffle, Trophy, type LucideIcon } from "lucide-react"
import { Avatar } from "@/components/Avatar"
import { TrendChart } from "@/components/Charts"
import { PosterThumb } from "@/components/PosterThumb"
import { Scale } from "@/components/Scale"
import { SortTable } from "@/components/SortTable"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { download, letterboxdCsv, ratingsCsv } from "@/lib/exporters"
import { isUnused } from "@/lib/people"
import { awardWinners, fmt, groupAvg, memberStats, outsideAvg, overview, spread, tilt, trend } from "@/lib/stats"
import { useStore } from "@/lib/store"
import type { Movie } from "@/lib/types"

const filmHref = (m: Movie) => `#/films/${encodeURIComponent(String(m.id))}`
const personHref = (n: string) => `#/people/${encodeURIComponent(n)}`

export default function Stats() {
  const { movies, members, watchlist, suggestions, renameMember, removeMember } = useStore()
  const rated = movies.filter(m => Object.keys(m.ratings).length)
  if (!rated.length) return <p className="text-muted-foreground">Stats show up once the club has rated a film.</p>

  const sum = overview(movies)
  const people = memberStats(movies, members).filter(p => p.count).map(p => ({ ...p, tilt: tilt(movies, p.n), attend: p.count / rated.length }))
  const { picker, harsh, kind, odd } = awardWinners(movies, members)
  const awards: { icon: LucideIcon; label: string; who: string; detail: string; gold?: boolean }[] = [
    picker && { icon: Trophy, label: "Best pick", who: picker.n, detail: `their picks average ${fmt(picker.pickAvg)}`, gold: true },
    harsh && { icon: Gavel, label: "Harshest critic", who: harsh.n, detail: `${fmt(harsh.avg)} on average` },
    kind && { icon: Heart, label: "Most generous", who: kind.n, detail: `${fmt(kind.avg)} on average` },
    odd && { icon: Shuffle, label: "Most contrarian", who: odd.n, detail: `${fmt(odd.offGroup)} stars from the group` },
  ].filter(Boolean) as typeof awards
  const top = [...rated].sort((a, b) => groupAvg(b)! - groupAvg(a)!).slice(0, 5)
  const divisive = [...rated].filter(m => Object.keys(m.ratings).length > 1).sort((a, b) => spread(b) - spread(a)).slice(0, 5)
  const gap = rated.filter(m => outsideAvg(m) != null).sort((a, b) => Math.abs(groupAvg(b)! - outsideAvg(b)!) - Math.abs(groupAvg(a)! - outsideAvg(a)!)).slice(0, 5)

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="Summary" className="grid grid-cols-3 gap-2 sm:gap-3">
        <Tile label="Films" value={String(sum.films)} />
        <Tile label="Ratings" value={String(sum.ratings)} />
        <Tile label="Average" value={fmt(sum.average)} suffix="/5" />
        {sum.best && (
          <a href={filmHref(sum.best)} className="rise col-span-3 flex items-center gap-4 rounded-xl bg-card p-3 ring-1 ring-foreground/10 hover:bg-muted">
            <PosterThumb title={sum.best.title} year={sum.best.year} className="w-14" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted-foreground">Highest rated</span>
              <span className="block truncate font-display text-xl leading-tight font-bold">{sum.best.title} <small className="font-sans text-sm font-medium text-muted-foreground">{sum.best.year}</small></span>
            </span>
            <span className="font-display text-4xl font-extrabold text-gold">{fmt(groupAvg(sum.best))}</span>
          </a>
        )}
      </section>

      <section>
        <h3 className="text-xl font-bold">Awards</h3>
        <p className="mb-3 text-sm text-muted-foreground">Critic awards count people with at least 5 films rated.</p>
        <div className="grid grid-cols-2 gap-3">
          {awards.map(a => (
            <Card key={a.label} className="rise gap-2 px-4">
              <span className={`flex items-center gap-1.5 text-sm font-medium ${a.gold ? "text-gold" : "text-muted-foreground"}`}><a.icon className="size-4" aria-hidden />{a.label}</span>
              <a href={personHref(a.who)} className="flex items-center gap-2 font-display text-xl leading-tight font-bold hover:underline"><Avatar name={a.who} size="sm" />{a.who}</a>
              <span className="text-sm text-muted-foreground">{a.detail}</span>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xl font-bold">Top films</h3>
        <ol className="flex flex-col gap-2.5">
          {top.map((m, i) => (
            <li key={m.id}>
              <a href={filmHref(m)} className="flex items-center gap-3">
                <PosterThumb title={m.title} year={m.year} className="w-9" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{m.title} <small className="font-normal text-muted-foreground">{m.year}</small></span>
                  <span className="mt-1 block h-2 rounded-full bg-muted">
                    <span className={`grow block h-2 rounded-full ${i === 0 ? "bg-gold" : "bg-us"}`} style={{ width: `${(groupAvg(m)! / 5) * 100}%` }} />
                  </span>
                </span>
                <span className={`w-12 text-right font-display text-xl font-bold ${i === 0 ? "text-gold" : ""}`}>{fmt(groupAvg(m))}</span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className="mb-2 text-xl font-bold">Group average over time</h3>
        <TrendChart points={trend(rated)} average={sum.average} />
      </section>

      <section>
        <h3 className="mb-2 text-xl font-bold">People</h3>
        <Card data-no-swipe className="py-1">
          <SortTable
            rows={people}
            rowKey={p => p.n}
            initial={{ id: "attend", dir: "desc" }}
            columns={[
              { id: "name", label: "Name", get: p => p.n, first: "asc", render: p => <a className="flex items-center gap-1.5 underline" href={personHref(p.n)}><span className="hidden min-[400px]:inline-flex"><Avatar name={p.n} size="sm" /></span>{p.n}</a> },
              {
                id: "attend", label: "Attend", get: p => p.attend,
                render: p => (
                  <span title={`${p.count} of ${rated.length} films`} className="block min-w-10">
                    {Math.round(p.attend * 100)}%<span className="sr-only"> ({p.count} of {rated.length} films)</span>
                    <span className="mt-0.5 block h-1 rounded-full bg-muted"><span className="block h-1 rounded-full bg-world" style={{ width: `${p.attend * 100}%` }} /></span>
                  </span>
                ),
              },
              { id: "avg", label: "Avg", get: p => p.avg, render: p => fmt(p.avg) },
              { id: "picks", label: "Picks", get: p => p.pickAvg, render: p => fmt(p.pickAvg) },
              { id: "tilt", label: "Vs group", get: p => p.tilt, render: p => (p.tilt == null ? "–" : <span className={p.tilt > 0.05 ? "text-pos" : p.tilt < -0.05 ? "text-us" : ""}>{p.tilt > 0 ? "+" : ""}{fmt(p.tilt, 1)}</span>) },
            ]}
          />
        </Card>
      </section>

      <section>
        <h3 className="mb-1 text-xl font-bold">Most divisive</h3>
        <ul className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground" aria-label="Who each dot is">
          {[...new Set(divisive.flatMap(m => Object.keys(m.ratings)))].sort().map(n => <li key={n} className="flex items-center gap-1.5"><Avatar name={n} size="xs" />{n}</li>)}
        </ul>
        <ul className="flex flex-col gap-3">
          {divisive.map(m => (
            <li key={m.id}>
              <a href={filmHref(m)} className="flex items-baseline justify-between gap-3 font-medium hover:underline">{m.title}<span className="text-sm font-normal text-muted-foreground">spread {fmt(spread(m))}</span></a>
              <RaterDots m={m} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-1 text-xl font-bold">Biggest gap with outside ratings</h3>
        <p className="mb-3 text-sm text-muted-foreground"><i className="mr-1.5 inline-block size-3 rounded-full bg-us align-[-1px]" />Us <i className="mr-1.5 ml-3 inline-block size-3 rounded-full bg-world align-[-1px]" />Outside</p>
        {gap.length ? (
          <ul className="flex flex-col gap-3">
            {gap.map(m => (
              <li key={m.id}>
                <a href={filmHref(m)} className="flex items-baseline justify-between gap-3 font-medium hover:underline">{m.title}<span className="text-sm font-normal text-muted-foreground">us {fmt(groupAvg(m))}, outside {fmt(outsideAvg(m))}</span></a>
                <Scale us={groupAvg(m)} world={outsideAvg(m)} />
              </li>
            ))}
          </ul>
        ) : <p className="text-muted-foreground">Outside ratings are still loading.</p>}
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

function Tile({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="rise flex flex-col justify-center gap-0.5 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-display text-3xl leading-none font-extrabold tracking-tight sm:text-4xl">{value}{suffix && <small className="ml-1 font-sans text-sm font-medium text-muted-foreground">{suffix}</small>}</span>
    </div>
  )
}

/** One dot per rater on a 0-5 ruler, colored like their avatar. Matching ratings stack upward so none hides another. */
function RaterDots({ m }: { m: Movie }) {
  const seen = new Map<number, number>()
  return (
    <div className="relative mt-1 h-12" role="img" aria-label={Object.entries(m.ratings).map(([n, v]) => `${n} ${v}`).join(", ")}>
      <div className="absolute inset-x-0 bottom-2 h-0.5 bg-border" />
      {[1, 2, 3, 4].map(i => <span key={i} className="absolute bottom-1.5 h-2.5 w-0.5 bg-border" style={{ left: `${(i / 5) * 100}%` }} />)}
      {Object.entries(m.ratings).map(([n, v]) => {
        const stack = seen.get(v) ?? 0
        seen.set(v, stack + 1)
        return <span key={n} title={`${n}: ${v}`} className="absolute -ml-2.5 rounded-full ring-2 ring-card" style={{ left: `${(v / 5) * 100}%`, bottom: 0 + stack * 14 }}><Avatar name={n} size="xs" className="block size-5" /></span>
      })}
    </div>
  )
}

function PersonRow({ name, unused, onRename, onRemove }: { name: string; unused: boolean; onRename: (to: string) => void; onRemove: () => void }) {
  const [editing, setEditing] = useState(false)
  const [to, setTo] = useState(name)
  if (!editing) {
    return (
      <div className="flex items-center gap-2 px-4 py-1">
        <a className="flex flex-1 items-center gap-2 underline" href={personHref(name)}><Avatar name={name} size="sm" />{name}</a>
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
