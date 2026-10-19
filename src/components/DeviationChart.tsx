import { fmt, type deviations } from "@/lib/stats"

/** Films where this person differed most from everyone else. Bars to the right are higher than the group, to the left lower. */
export function DeviationChart({ rows, name }: { rows: ReturnType<typeof deviations>; name: string }) {
  if (!rows.length) return null
  const max = Math.max(1, ...rows.map(r => Math.abs(r.diff)))
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map(r => {
        const up = r.diff > 0
        return (
          <li key={r.movie.id}>
            <a className="text-sm font-medium underline-offset-2 hover:underline" href={`#/films/${encodeURIComponent(String(r.movie.id))}`}>{r.movie.title}</a>
            <span className="text-sm text-muted-foreground"> · {name} gave {r.mine}, others {fmt(r.others, 1)}</span>
            <div className="relative mt-1 h-5" aria-hidden>
              <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
              <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-muted-foreground/60" />
              <span
                className={`grow absolute inset-y-1 rounded-full ${up ? "left-1/2 bg-pos" : "right-1/2 bg-us"}`}
                style={{ width: `${(Math.abs(r.diff) / max) * 50}%`, transformOrigin: up ? "left" : "right" }}
              />
            </div>
            <span className="sr-only">{up ? "higher" : "lower"} by {fmt(Math.abs(r.diff), 1)} stars</span>
          </li>
        )
      })}
    </ul>
  )
}
