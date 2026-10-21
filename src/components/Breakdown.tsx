import { useMemo, useState } from "react"
import { byDecade, byTag, byYear, type Group } from "@/lib/breakdown"
import { useFilmTags } from "@/lib/useFilmTags"
import { fmt } from "@/lib/stats"
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

/** Release-year columns: one per year, so an era the club skipped shows as a gap. */
function Years({ movies }: { movies: Movie[] }) {
  const years = byYear(movies), max = Math.max(...years.map(y => y.n), 1)
  return (
    <figure>
      <div className="flex h-24 items-end gap-px" aria-hidden>
        {years.map(y => <span key={y.year} title={`${y.year}: ${y.n}`} className="grow-y min-w-px flex-1 rounded-t-sm bg-world" style={{ height: y.n ? `${(y.n / max) * 100}%` : 2, opacity: y.n ? 1 : 0.25 }} />)}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>{years[0]?.year}</span><span>{years[years.length - 1]?.year}</span></div>
      <figcaption className="sr-only">{years.filter(y => y.n).map(y => `${y.year}: ${y.n}`).join(", ")}</figcaption>
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
