import { useEffect, useMemo, useState } from "react"
import { Gavel, Heart, Shuffle, Trophy, type LucideIcon } from "lucide-react"
import { Breakdown } from "@/components/Breakdown"
import { Timeline } from "@/components/Timeline"
import { WatchDates } from "@/components/WatchDates"
import { PersonAtlas } from "@/components/PersonAtlas"
import { Avatar } from "@/components/Avatar"
import { CountUp } from "@/components/CountUp"
import { HeatChip } from "@/components/HeatChip"
import { LbFilmRow } from "@/components/LbFilmRow"
import { TrendChart } from "@/components/Charts"
import { PosterThumb } from "@/components/PosterThumb"
import { Scale } from "@/components/Scale"
import { SortTable } from "@/components/SortTable"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { download, letterboxdCsv, ratingsCsv } from "@/lib/exporters"
import { deepCuts, divisiveOnLb, groupFavorites, tasteTwins } from "@/lib/lbstats"
import { entryKey } from "@/lib/atlas"
import type { LbEntry } from "@/lib/letterboxd"
import { isUnused } from "@/lib/people"
import { avg, awardWinners, fmt, groupAvg, memberStats, outsideAvg, overview, ratingRange, spread, tilt, trend } from "@/lib/stats"
import { useStore } from "@/lib/store"
import type { Movie } from "@/lib/types"

const filmHref = (m: Movie) => `#/films/${encodeURIComponent(String(m.id))}`
const personHref = (n: string) => `#/people/${encodeURIComponent(n)}`

export default function Stats() {
  const { movies, members, watchlist, suggestions, renameMember, removeMember, lb, loadLb } = useStore()
  useEffect(() => { loadLb() }, [loadLb])
  const rated = movies.filter(m => Object.keys(m.ratings).length)
  // everything the club has seen between its screenings and its members' Letterboxd histories, each film once
  const lbStats = useMemo(() => ({
    club: [...new Map([...movies.map((m): LbEntry => [m.title, m.year, null]), ...Object.values(lb).flat()].map(e => [entryKey(e), e])).values()],
    twins: tasteTwins(lb),
    favs: groupFavorites(lb, movies),
    argue: divisiveOnLb(lb),
    cuts: deepCuts(lb, movies).slice(0, 6),
  }), [lb, movies])
  if (!rated.length) return <p className="text-muted-foreground">Stats appear after the first screening: rate a film and the credits start rolling.</p>

  const sum = overview(movies)
  const people = memberStats(movies, members).filter(p => p.count).map(p => ({ ...p, range: ratingRange(rated.filter(m => m.ratings[p.n] != null).map(m => m.ratings[p.n])), tilt: tilt(movies, p.n), attend: p.count / rated.length }))
  const { picker, harsh, kind, odd } = awardWinners(movies, members)
  const awards: { icon: LucideIcon; label: string; who: string; detail: string; gold?: boolean }[] = [
    picker && { icon: Trophy, label: "Best pick", who: picker.n, detail: `their picks average ${fmt(picker.pickAvg)}`, gold: true },
    harsh && { icon: Gavel, label: "Harshest critic", who: harsh.n, detail: `${fmt(harsh.avg)} on average` },
    kind && { icon: Heart, label: "Most generous", who: kind.n, detail: `${fmt(kind.avg)} on average` },
    odd && { icon: Shuffle, label: "Most contrarian", who: odd.n, detail: `${fmt(odd.offGroup)} stars from the group` },
  ].filter(Boolean) as typeof awards
  const imported = Object.keys(lb).filter(n => lb[n]?.length)
  const { club, twins, favs, argue, cuts } = lbStats
  const top = [...rated].sort((a, b) => groupAvg(b)! - groupAvg(a)!).slice(0, 5)
  const divisive = [...rated].filter(m => Object.keys(m.ratings).length > 1).sort((a, b) => spread(b) - spread(a)).slice(0, 5)
  const gap = rated.filter(m => outsideAvg(m) != null).sort((a, b) => Math.abs(groupAvg(b)! - outsideAvg(b)!) - Math.abs(groupAvg(a)! - outsideAvg(a)!)).slice(0, 5)

  return (
    <div className="stagger flex flex-col gap-8">
      <a href="#/wrapped" className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 hover:bg-muted/60"><span><b className="font-display text-lg">Club Wrapped</b><span className="block text-sm text-muted-foreground">The club's story so far, one card at a time</span></span><span aria-hidden>Open</span></a>

      <section aria-label="Summary" className="flex flex-col gap-4">
        <div className="grid grid-cols-3 divide-x divide-border border-y-2 border-foreground py-4">
          <Stat label="Films" n={sum.films} />
          <Stat label="Ratings" n={sum.ratings} />
          <Stat label="Average" n={sum.average ?? 0} format={v => fmt(v)} suffix="/5" />
        </div>
        {sum.best && (
          <a href={filmHref(sum.best)} className="flex items-center gap-4 rounded-xl py-1 hover:bg-muted/60">
            <PosterThumb title={sum.best.title} year={sum.best.year} className="w-14" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted-foreground">Highest rated</span>
              <span className="block truncate font-display text-xl leading-tight font-bold">{sum.best.title} <small className="font-sans text-sm font-medium text-muted-foreground">{sum.best.year}</small></span>
            </span>
            <span className="font-display text-4xl font-extrabold text-gold"><CountUp value={groupAvg(sum.best) ?? 0} format={v => fmt(v)} /></span>
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
                    <span className={`grow block h-2 rounded-full ${i === 0 ? "bg-sun" : "bg-us"}`} style={{ width: `${(groupAvg(m)! / 5) * 100}%`, "--d": `${200 + i * 90}ms` } as React.CSSProperties} />
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

      <Timeline movies={rated} />

      <Breakdown movies={rated} />

      {club.length > 0 && <PersonAtlas name="the club" history={club} group />}

      <section>
        <h3 className="mb-2 text-xl font-bold">People</h3>
        <div data-no-swipe>
          <SortTable
            rows={people}
            rowKey={p => p.n}
            initial={{ id: "attend", dir: "desc" }}
            columns={[
              { id: "name", label: "Name", get: p => p.n, first: "asc", render: p => <a className="flex items-center gap-1.5 font-medium hover:underline" href={personHref(p.n)}><span className="hidden min-[400px]:inline-flex"><Avatar name={p.n} size="sm" /></span>{p.n}</a> },
              {
                id: "attend", label: "Attend", get: p => p.attend,
                render: p => (
                  <span title={`${p.count} of ${rated.length} films`} className="block min-w-10">
                    {Math.round(p.attend * 100)}%<span className="sr-only"> ({p.count} of {rated.length} films)</span>
                    <span className="mt-0.5 block h-1 rounded-full bg-muted"><span className="block h-1 rounded-full bg-world" style={{ width: `${p.attend * 100}%` }} /></span>
                  </span>
                ),
              },
              { id: "avg", label: "Avg", align: "right", get: p => p.avg, render: p => (
                <span className="inline-flex flex-col items-end gap-1">
                  <HeatChip v={p.avg} lo={1.5} hi={4.5}>{fmt(p.avg)}</HeatChip>
                  {p.range
                    ? <span title={`Likely between ${fmt(p.range.lo, 1)} and ${fmt(p.range.hi, 1)} (${p.count} films)`} className="relative block h-1.5 w-14 rounded-full bg-muted"><span className="absolute h-1.5 rounded-full bg-foreground/45" style={{ left: `${(p.range.lo / 5) * 100}%`, width: `${((p.range.hi - p.range.lo) / 5) * 100}%` }} /><span className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-card" style={{ left: `${(p.range.mean / 5) * 100}%` }} /><span className="sr-only">likely between {fmt(p.range.lo, 1)} and {fmt(p.range.hi, 1)}</span></span>
                    : <span className="text-[10px] text-muted-foreground">1 film</span>}
                </span>
              ) },
              { id: "picks", label: "Picks", align: "right", get: p => p.pickAvg, render: p => <HeatChip v={p.pickAvg} lo={2} hi={4}>{fmt(p.pickAvg)}</HeatChip> },
              { id: "tilt", label: "Vs group", align: "right", get: p => p.tilt, render: p => <HeatChip v={p.tilt} lo={-1.5} hi={1.5}>{p.tilt != null && p.tilt > 0 ? "+" : ""}{fmt(p.tilt, 1)}</HeatChip> },
            ]}
          />
        </div>
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
                <a href={filmHref(m)} className="flex items-baseline justify-between gap-3 font-medium hover:underline">{m.title}<span className="text-sm font-normal text-muted-foreground">us {fmt(groupAvg(m))}, outside {fmt(outsideAvg(m))} <b className="text-foreground">({groupAvg(m)! > outsideAvg(m)! ? "+" : "−"}{fmt(Math.abs(groupAvg(m)! - outsideAvg(m)!), 1)})</b></span></a>
                <Scale us={groupAvg(m)} world={outsideAvg(m)} />
              </li>
            ))}
          </ul>
        ) : <p className="text-muted-foreground">Outside ratings are still loading.</p>}
      </section>

      <section>
        <h3 className="text-xl font-bold">From Letterboxd</h3>
        <p className="mb-4 text-sm text-muted-foreground">Built from everyone's imported history, so it gets sharper with every export. {imported.length} {imported.length === 1 ? "person has" : "people have"} imported so far.</p>
        {imported.length < 2 ? (
          <Card className="px-4"><p className="text-sm">These need at least two people to import. <a className="underline" href="#/watch">Import your Letterboxd history</a>.</p></Card>
        ) : (
          <div className="flex flex-col gap-7">
            <div>
              <h4 className="mb-2 font-display text-lg font-bold">Taste twins</h4>
              {twins.length ? (
                <Card className="gap-0 py-2">
                  {(twins.length > 3 ? [...twins.slice(0, 3), twins[twins.length - 1]] : twins).map((t, i, shown) => [i === 0 ? "Closest" : t === twins[twins.length - 1] ? "Furthest apart" : "Next closest", t, shown] as const).map(([label, t]) => (
                    <div key={label + t.a + t.b} className="flex items-center gap-3 px-4 py-2">
                      <span className="flex -space-x-2"><Avatar name={t.a} className="ring-2 ring-card" /><Avatar name={t.b} className="ring-2 ring-card" /></span>
                      <span className="min-w-0 flex-1"><b>{t.a}</b> and <b>{t.b}</b><br /><span className="text-sm text-muted-foreground">{label}: {fmt(t.gap)} stars apart over {t.shared} films</span></span>
                    </div>
                  ))}
                </Card>
              ) : <p className="text-sm text-muted-foreground">Needs two people who rated at least 15 of the same films.</p>}
            </div>
            {favs.length > 0 && (
              <div>
                <h4 className="mb-2 font-display text-lg font-bold">Group favorites the club hasn't watched</h4>
                <ul className="flex flex-col gap-3">
                  {favs.map(f => <li key={f.title + f.year}><LbFilmRow title={f.title} year={f.year}>{f.ratings.map(r => `${r.name} ${r.rating}`).join(" · ")}</LbFilmRow></li>)}
                </ul>
              </div>
            )}
            {argue.length > 0 && (
              <div>
                <h4 className="mb-2 font-display text-lg font-bold">Worth arguing about</h4>
                <ul className="flex flex-col gap-3">
                  {argue.map(({ f, spread: sp }) => <li key={f.title + f.year}><LbFilmRow title={f.title} year={f.year}>{f.ratings.map(r => `${r.name} ${r.rating}`).join(" · ")} · {fmt(sp, 1)} stars apart</LbFilmRow></li>)}
                </ul>
              </div>
            )}
            {cuts.length > 0 && (
              <div>
                <h4 className="mb-1 font-display text-lg font-bold">Deep cuts</h4>
                <p className="mb-2 text-sm text-muted-foreground">One person loved it and nobody else has even watched it.</p>
                <ul className="flex flex-col gap-3">
                  {cuts.map(f => <li key={f.title + f.year}><LbFilmRow title={f.title} year={f.year}>{f.ratings[0].name} gave it {f.ratings[0].rating}</LbFilmRow></li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-xl font-bold">Manage people</h3>
        <p className="mb-2 text-sm text-muted-foreground">Rename someone, or type an existing name to merge two spellings. Ratings, picks, watchlists and votes move over.</p>
        <Card className="gap-0 py-1">
          {members.map(n => <PersonRow key={n} name={n} unused={isUnused(n, movies, watchlist, suggestions)} onRename={to => renameMember(n, to)} onRemove={() => removeMember(n)} />)}
        </Card>
      </section>

      <WatchDates />

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

function Stat({ label, n, format, suffix }: { label: string; n: number; format?: (n: number) => string; suffix?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-display text-5xl leading-none font-extrabold tracking-tight">
        <CountUp value={n} format={format} />
        {suffix && <small className="ml-1 font-sans text-sm font-medium text-muted-foreground">{suffix}</small>}
      </span>
    </div>
  )
}

/** One dot per rater on a 0-5 ruler, colored like their avatar. Matching ratings stack upward so none hides another. */
function RaterDots({ m }: { m: Movie }) {
  const seen = new Map<number, number>()
  const vals = Object.values(m.ratings), mean = avg(vals), lo = Math.min(...vals), hi = Math.max(...vals)
  const x = (v: number) => `${(v / 5) * 100}%`
  const rows = Math.max(1, ...Object.values(vals.reduce<Record<number, number>>((a, v) => ({ ...a, [v]: (a[v] ?? 0) + 1 }), {})))
  return (
    <div className="px-2.5 pt-1" role="img" aria-label={Object.entries(m.ratings).map(([n, v]) => `${n} ${v}`).join(", ")}>
      <div className="relative" style={{ height: 14 + rows * 22 }}>
        <div className="absolute inset-x-0 bottom-0 h-px bg-foreground/40" />
        {[0, 1, 2, 3, 4, 5].map(i => <span key={i} className="absolute bottom-0 h-1.5 w-px bg-foreground/40" style={{ left: x(i) }} />)}
        {vals.length > 1 && <span className="grow absolute bottom-0 h-1.5 rounded-full bg-gradient-to-r from-us to-world opacity-70" style={{ left: x(lo), width: `${((hi - lo) / 5) * 100}%` }} />}
        {Object.entries(m.ratings).map(([n, v]) => {
          const stack = seen.get(v) ?? 0
          seen.set(v, stack + 1)
          return (
            <span key={n} title={`${n}: ${v}`} className="pop absolute -ml-2.5 flex flex-col items-center" style={{ left: x(v), bottom: 6 + stack * 22, "--d": `${stack * 80}ms` } as React.CSSProperties}>
              <span className="rounded-full ring-2 ring-card"><Avatar name={n} size="xs" className="block size-5" /></span>
            </span>
          )
        })}
        {mean != null && vals.length > 1 && <span aria-hidden className="absolute -bottom-1 -ml-1.5 size-3 rotate-45 border-2 border-card bg-foreground" style={{ left: x(mean) }} />}
      </div>
      <div className="relative mt-1.5 h-4 text-[10px] text-muted-foreground" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map(i => <span key={i} className="absolute -translate-x-1/2" style={{ left: x(i) }}>{i}</span>)}
      </div>
    </div>
  )
}

function PersonRow({ name, unused, onRename, onRemove }: { name: string; unused: boolean; onRename: (to: string) => void; onRemove: () => void }) {
  const [editing, setEditing] = useState(false)
  const [to, setTo] = useState(name)
  if (!editing) {
    return (
      <div className="flex items-center gap-2 px-4 py-1">
        <a className="flex flex-1 items-center gap-2 font-medium hover:underline" href={personHref(name)}><Avatar name={name} size="sm" />{name}</a>
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
