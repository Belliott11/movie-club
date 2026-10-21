import { useMemo, useState } from "react"
import { byDecade, byTag, byYear, type Group } from "@/lib/breakdown"
import { scale } from "@/components/Charts"
import { useFilmTags } from "@/lib/useFilmTags"
import { fmt, groupAvg } from "@/lib/stats"
import type { Movie } from "@/lib/types"

/** Rows of name, a bar and the numbers. The bar shows the club's average. */
function Bars({ rows }: { rows: Group[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {rows.map(r => (
        <li key={r.name} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2 text-sm">
          <span className="truncate font-medium">{r.name}</span>
          <span className="h-3 rounded-full bg-muted"><span className="grow block h-full origin-left rounded-full bg-us" style={{ width: `${(r.avg / 5) * 100}%` }} /></span>
          <span className="text-right text-muted-foreground"><b className="font-display text-foreground">{fmt(r.avg)}</b> · {r.n} {r.n === 1 ? "film" : "films"}</span>
        </li>
      ))}
    </ul>
  )
}

/** Genre and country lists, most watched or highest rated. */
function Tags({ title, groups }: { title: string; groups: Group[] }) {
  const [mode, setMode] = useState<"watched" | "rated">("watched")
  const rows = [...groups].filter(g => mode === "watched" || g.n >= 2).sort((a, b) => mode === "watched" ? b.n - a.n || b.avg - a.avg : b.avg - a.avg || b.n - a.n).slice(0, 6)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-display text-lg font-bold">{title}</h4>
        <div role="group" aria-label={`Sort ${title}`} className="flex rounded-full bg-muted p-0.5 text-sm">
          {([["watched", "Most watched"], ["rated", "Highest rated"]] as const).map(([v, l]) => (
            <button key={v} type="button" aria-pressed={mode === v} onClick={() => setMode(v)} className={`min-h-9 rounded-full px-3 ${mode === v ? "bg-card font-semibold shadow-sm" : "text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
      </div>
      {rows.length ? <Bars rows={rows} /> : <p className="text-sm text-muted-foreground">Needs at least two films in a group.</p>}
    </div>
  )
}

/** Release-year columns: one per year, colored by the club's average for films from that year. Tap a column to see which films. */
function Years({ movies }: { movies: Movie[] }) {
  const [on, setOn] = useState<number | null>(null)
  const years = byYear(movies), max = Math.max(...years.map(y => y.n), 1)
  const films = (yr: number) => movies.filter(m => m.year === yr)
  const avgOf = (yr: number) => { const r = films(yr).map(groupAvg).filter((v): v is number => v != null); return r.length ? r.reduce((a, b) => a + b, 0) / r.length : null }
  const first = years[0]?.year ?? 0, ticks = years.filter((y, i) => y.year % 10 === 0 || ((i === 0 || i === years.length - 1) && !years.some(o => o !== y && o.year % 10 === 0 && Math.abs(o.year - y.year) < 5)))
  const span = Math.max(1, years.length - 1)
  const picked = on != null ? films(on) : []
  return (
    <figure data-no-swipe>
      <div className="relative flex h-28 items-end gap-px border-b border-foreground/40">
        {[0.5, 1].map(f => <span key={f} aria-hidden className="absolute inset-x-0 border-t border-dashed border-border" style={{ bottom: `${f * 100}%` }} />)}
        {years.map(y => (
          <button key={y.year} type="button" disabled={!y.n} aria-label={`${y.year}: ${y.n} ${y.n === 1 ? "film" : "films"}`} aria-pressed={on === y.year} onClick={() => setOn(on === y.year ? null : y.year)} className="relative z-10 flex h-full min-w-px flex-1 items-end disabled:cursor-default">
            <span className="grow-y block w-full rounded-t-sm" style={{ height: y.n ? `${(y.n / max) * 100}%` : 0, minHeight: y.n ? 4 : 0, background: scale(((avgOf(y.year) ?? 2.5) - 0.5) / 4.5), outline: on === y.year ? "2px solid var(--foreground)" : undefined }} />
          </button>
        ))}
      </div>
      <div className="relative mt-1 h-4 text-[11px] text-muted-foreground" aria-hidden>
        {ticks.map(t => <span key={t.year} className="absolute -translate-x-1/2 first:translate-x-0 last:translate-x-[-100%]" style={{ left: `${((t.year - first) / span) * 100}%` }}>{t.year}</span>)}
      </div>
      <p className="mt-1 min-h-10 text-sm" aria-live="polite">
        {on == null ? <span className="text-muted-foreground">Bars are colored by the club's average for that year, red low to teal high. Tap one to see the films.</span> : <><b>{on}</b>: {picked.map(m => `${m.title} ${fmt(groupAvg(m), 1)}`).join(", ")}</>}
      </p>
      <p className="sr-only">{years.filter(y => y.n).map(y => `${y.year}: ${y.n}`).join(", ")}</p>
    </figure>
  )
}

export function Breakdown({ movies }: { movies: Movie[] }) {
  const info = useFilmTags(movies)
  const genres = useMemo(() => byTag(movies, m => info[String(m.id)]?.genres ?? []), [movies, info])
  const countries = useMemo(() => byTag(movies, m => info[String(m.id)]?.countries ?? []), [movies, info])
  const decades = byDecade(movies)
  return (
    <section className="flex flex-col gap-5">
      <h3 className="text-xl font-bold">What the club watches</h3>
      <div className="flex flex-col gap-2">
        <h4 className="font-display text-lg font-bold">By decade</h4>
        <Bars rows={decades} />
      </div>
      <div className="flex flex-col gap-2">
        <h4 className="font-display text-lg font-bold">Films by release year</h4>
        <Years movies={movies} />
      </div>
      {genres.length > 0 && <Tags title="Genres" groups={genres} />}
      {countries.length > 0 && <Tags title="Countries" groups={countries} />}
    </section>
  )
}
