import { Collapse } from "@/components/Collapse"
import { PosterThumb } from "@/components/PosterThumb"
import { fmt, groupAvg } from "@/lib/stats"
import { byMonth, longestBreak, longestStreak } from "@/lib/timeline"
import type { Movie } from "@/lib/types"

/** The club's screenings month by month, oldest first. Empty months stay in, so a gap reads as a gap. */
export function Timeline({ movies }: { movies: Movie[] }) {
  const months = byMonth(movies)
  if (!months.length) return null
  const brk = longestBreak(movies), run = longestStreak(movies)
  const peak = Math.max(1, ...months.map(m => m.films.length))
  return (
    <Collapse id="timeline" title="Month by month" source="club">
      <p className="mb-3 text-sm text-muted-foreground">
        {run && run.films > 1 && <>Longest run of weekly screenings: {run.films} in a row. </>}
        {brk && brk.days > 8 && <>Longest break: {Math.round(brk.days / 7)} weeks, between {brk.from.title} and {brk.to.title}.</>}
      </p>
      <ol className="flex flex-col">
        {months.map(m => (
          <li key={m.key} className="grid grid-cols-[5.5rem_1fr] gap-x-3 border-t border-border py-2 first:border-t-0">
            <div>
              <p className="text-sm font-medium">{m.label.replace(" ", " ")}</p>
              <p className="text-xs text-muted-foreground">{m.films.length ? `${m.films.length} ${m.films.length === 1 ? "film" : "films"}` : "No screenings"}</p>
            </div>
            {m.films.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {m.films.map(f => (
                  <li key={f.id}>
                    <a href={`#/films/${encodeURIComponent(String(f.id))}`} className="flex w-14 flex-col gap-1" aria-label={`${f.title}, ${fmt(groupAvg(f), 1)} out of 5`}>
                      <PosterThumb title={f.title} year={f.year} className="w-full" badge={groupAvg(f) == null ? "–" : fmt(groupAvg(f), 1)} />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <span aria-hidden className="mt-2 block h-1 rounded-full bg-muted" style={{ width: `${(1 / peak) * 30}%` }} />
            )}
          </li>
        ))}
      </ol>
    </Collapse>
  )
}
