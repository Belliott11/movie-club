import { useMemo } from "react"
import { byTag } from "@/lib/breakdown"
import { fmt } from "@/lib/stats"
import { useFilmTags } from "@/lib/useFilmTags"
import type { Movie } from "@/lib/types"

/**
 * A person's taste as a flower: one petal per genre they've rated (up to eight, the most-watched first).
 * A longer petal means a higher average from them in that genre; a wider petal means more films.
 */
export function Flower({ movies, name }: { movies: Movie[]; name: string }) {
  const mine = useMemo(() => movies.filter(m => m.ratings[name] != null), [movies, name])
  const tags = useFilmTags(mine)
  const genres = useMemo(
    () => byTag(mine, m => tags[String(m.id)]?.genres ?? [], m => m.ratings[name]).sort((a, b) => b.n - a.n || b.avg - a.avg).slice(0, 8),
    [mine, tags, name],
  )
  if (genres.length < 3) return null
  const R = 100, C = 120, maxN = Math.max(...genres.map(g => g.n))
  return (
    <section>
      <h3 className="mb-2 text-xl font-bold">{name}'s taste by genre</h3>
      <figure>
      <svg viewBox="-50 -10 340 260" className="mx-auto block w-full max-w-md" role="img" aria-label={`${name}'s average rating by genre`}>
        {[1, 2, 3, 4, 5].map(r => <circle key={r} cx={C} cy={C} r={(r / 5) * R} fill="none" stroke="var(--border)" strokeWidth={r === 5 ? 1 : 0.6} strokeDasharray={r === 5 ? undefined : "2 3"} />)}
        {genres.map((g, i) => {
          const a = (i / genres.length) * 2 * Math.PI - Math.PI / 2, len = (g.avg / 5) * R, w = 0.2 + 0.2 * (g.n / maxN) // half-angle of the petal
          const p = (ang: number, r: number) => `${C + Math.cos(ang) * r},${C + Math.sin(ang) * r}`
          const lx = C + Math.cos(a) * (R + 14), ly = C + Math.sin(a) * (R + 14)
          return (
            <g key={g.name}>
              <path
                className="pop" style={{ "--d": `${i * 70}ms`, transformOrigin: `${C}px ${C}px` } as React.CSSProperties}
                d={`M${C},${C} Q${p(a - w, len * 0.7)} ${p(a, len)} Q${p(a + w, len * 0.7)} ${C},${C}`}
                fill="color-mix(in oklab, var(--us) 70%, var(--sun))" fillOpacity={0.35 + 0.5 * (g.avg / 5)} stroke="var(--us)" strokeWidth={1.2}
              />
              <text x={lx} y={ly} textAnchor={Math.abs(Math.cos(a)) < 0.2 ? "middle" : Math.cos(a) > 0 ? "start" : "end"} dominantBaseline="middle" className="fill-foreground text-[9px] font-medium">{g.name}</text>
            </g>
          )
        })}
        <circle cx={C} cy={C} r={3} fill="var(--foreground)" />
      </svg>
      <figcaption className="sr-only">{genres.map(g => `${g.name}: ${fmt(g.avg, 1)} across ${g.n} films`).join(". ")}</figcaption>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-hidden>
        {genres.map(g => <li key={g.name}>{g.name} <b className="text-foreground">{fmt(g.avg, 1)}</b> · {g.n}</li>)}
      </ul>
      </figure>
    </section>
  )
}
