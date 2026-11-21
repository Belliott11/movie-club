import { movieHref } from "@/lib/movieLink"
import { fmt } from "@/lib/stats"

/** One film behind a bar: its title, year and the rating that went into the bar. Club films link to their own page. */
export type BarFilm = { title: string; year: number; rating: number | null; href?: string }

/** The films that make up a bar, highest rated first. Long lists scroll inside their own box. */
export function BarFilms({ films, label }: { films: BarFilm[]; label: string }) {
  const sorted = [...films].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.title.localeCompare(b.title))
  return (
    <ul aria-label={label} className="animate-in fade-in-0 slide-in-from-top-1 mt-1 mb-2 grid max-h-72 grid-cols-[minmax(0,1fr)] gap-x-4 overflow-y-auto rounded-lg bg-muted/50 px-3 py-1 duration-200 sm:grid-cols-2">
      {sorted.map(f => (
        <li key={`${f.title}|${f.year}`} className="flex min-h-9 items-baseline justify-between gap-2 border-b border-border py-1.5 text-sm last:border-b-0">
          <span className="min-w-0"><a href={f.href ?? movieHref(f.title, f.year)} className="font-medium hover:underline">{f.title}</a>{f.year ? <span className="text-muted-foreground"> {f.year}</span> : null}</span>
          <span className="shrink-0 font-display font-bold">{f.rating != null ? fmt(f.rating, 1) : <span className="font-sans text-xs font-normal text-muted-foreground">no rating</span>}</span>
        </li>
      ))}
    </ul>
  )
}
