import { useMemo } from "react"
import { Collapse } from "@/components/Collapse"
import { byTag } from "@/lib/breakdown"
import { avg, fmt } from "@/lib/stats"
import { useFilmTags } from "@/lib/useFilmTags"
import type { Movie } from "@/lib/types"

/**
 * Which genres someone rates above or below their own average, from the club films they've rated. Each row is a genre:
 * the bar runs from their overall average, to the right (teal) when they rate that genre higher and to the left (red) when lower.
 */
export function GenreTaste({ movies, name }: { movies: Movie[]; name: string }) {
  const mine = useMemo(() => movies.filter(m => m.ratings[name] != null), [movies, name])
  const tags = useFilmTags(mine)
  const mean = avg(mine.map(m => m.ratings[name]))
  const rows = useMemo(
    () => byTag(mine, m => tags[String(m.id)]?.genres ?? [], m => m.ratings[name]).filter(g => g.n >= 2).sort((a, b) => b.n - a.n || b.avg - a.avg).slice(0, 8),
    [mine, tags, name],
  )
  if (mean == null || rows.length < 3) return null
  const reach = Math.max(0.5, ...rows.map(r => Math.abs(r.avg - mean)))
  return (
    <Collapse id="me-genres" title={`${name}\'s taste by genre`}>
      <p className="mb-3 text-sm text-muted-foreground">Compared with {name}'s own average of {fmt(mean, 1)}. Genres with at least two films.</p>
      <ul className="flex flex-col gap-2.5">
        {rows.map(r => {
          const d = r.avg - mean, w = (Math.abs(d) / reach) * 50
          return (
            <li key={r.name} className="grid grid-cols-[6rem_1fr_auto] items-center gap-2 text-sm">
              <span className="truncate font-medium">{r.name}</span>
              <span className="relative h-3 rounded-full bg-muted" aria-hidden>
                <span className="absolute inset-y-0 left-1/2 w-px bg-foreground/40" />
                <span className="grow absolute inset-y-0 rounded-full" style={{ [d >= 0 ? "left" : "right"]: "50%", width: `${w}%`, background: d >= 0 ? "var(--world)" : "var(--us)", transformOrigin: d >= 0 ? "left" : "right" }} />
              </span>
              <span className="text-right text-muted-foreground"><b className="font-display text-foreground">{fmt(r.avg, 1)}</b> · {r.n} {r.n === 1 ? "film" : "films"}</span>
            </li>
          )
        })}
      </ul>
      <ul className="sr-only">{rows.map(r => <li key={r.name}>{r.name}: {fmt(r.avg, 1)} across {r.n} films, {r.avg >= mean ? "above" : "below"} their average</li>)}</ul>
    </Collapse>
  )
}
