import { Avatar } from "@/components/Avatar"
import { fmt, type agreementMatrix } from "@/lib/stats"

/** Who agrees with whom. Darker means fewer stars apart. The numbers are the average distance, so they read without the colors too. */
export function Heatmap({ matrix }: { matrix: ReturnType<typeof agreementMatrix> }) {
  const { people, get } = matrix
  if (people.length < 2) return null
  const worst = Math.max(1, ...people.flatMap(a => people.map(b => get(a, b)?.diff ?? 0)))
  return (
    <div data-no-swipe role="table" aria-label="Average stars apart between each pair of people" className="grid gap-1" style={{ gridTemplateColumns: `2.25rem repeat(${people.length}, minmax(0, 1fr))` }}>
      <span role="presentation" />
      {people.map(n => (
        <span key={n} role="columnheader" className="flex flex-col items-center gap-0.5 text-[11px] leading-tight text-muted-foreground">
          <Avatar name={n} size="sm" />
          <span className="max-w-full truncate">{n}</span>
        </span>
      ))}
      {people.map(a => (
        <div key={a} role="row" className="contents">
          <span role="rowheader" className="flex items-center"><Avatar name={a} size="sm" /><span className="sr-only">{a}</span></span>
          {people.map(b => {
            const c = a === b ? undefined : get(a, b)
            const strength = c ? 1 - Math.min(1, c.diff / worst) : 0
            return (
              <span
                key={b}
                role="cell"
                aria-label={c ? `${a} and ${b}: ${fmt(c.diff)} stars apart over ${c.n} films` : a === b ? `${a}` : `${a} and ${b}: not enough shared films`}
                className="flex aspect-square items-center justify-center rounded-md font-display text-sm font-bold"
                style={{
                  background: c ? `color-mix(in oklab, var(--world) ${Math.round(18 + strength * 72)}%, var(--card))` : "transparent",
                  color: c && strength > 0.55 ? "white" : "var(--foreground)",
                  border: c ? undefined : "1px dashed var(--border)",
                }}
              >
                {c ? fmt(c.diff, 1) : ""}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}
