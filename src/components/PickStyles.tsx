import { Collapse } from "@/components/Collapse"
import { useMemo } from "react"
import { Avatar } from "@/components/Avatar"
import { HeatChip } from "@/components/HeatChip"
import { SortTable } from "@/components/SortTable"
import { pickStyles, styleLabel } from "@/lib/pickRisk"
import { fmt } from "@/lib/stats"
import type { Movie } from "@/lib/types"

const filmHref = (m: Movie) => `#/films/${encodeURIComponent(String(m.id))}`

/** How each person picks: do their films split the room, and how often do they beat the club's average? */
export function PickStyles({ movies }: { movies: Movie[] }) {
  const { styles, clubAverage } = useMemo(() => pickStyles(movies), [movies])
  if (styles.length < 2) return null
  const rows = styles.map(s => ({ ...s, label: styleLabel(s, styles) }))
  const gambler = [...styles].sort((a, b) => b.risk - a.risk)[0]
  return (
    <Collapse id="pickstyles" title="How people pick" source="club">
      <p className="mb-3 text-sm text-muted-foreground">
        Risk is how much a pick splits the room. A gambler's films are loved by some of you and hated by others. A hit is a pick that beat the club's overall average of {fmt(clubAverage, 1)}.
      </p>
      <div data-no-swipe>
        <SortTable
          rows={rows}
          rowKey={r => r.n}
          initial={{ id: "risk", dir: "desc" }}
          columns={[
            { id: "n", label: "Picker", get: r => r.n, first: "asc", render: r => <a className="flex items-center gap-1.5 font-medium hover:underline" href={`#/people/${encodeURIComponent(r.n)}`}><span className="hidden min-[400px]:inline-flex"><Avatar name={r.n} size="sm" /></span>{r.n}</a> },
            { id: "risk", label: "Risk", align: "right", get: r => r.risk, render: r => <span className="num inline-block min-w-8 rounded-md px-1 py-0.5 text-center text-sm font-medium" style={{ background: `color-mix(in oklab, var(--sun) ${Math.round(Math.min(1, r.risk / 1.8) * 70)}%, transparent)` }}>{fmt(r.risk, 1)}</span> },
            { id: "result", label: "Result", align: "right", get: r => r.result, render: r => <HeatChip v={r.result} lo={2} hi={4}>{fmt(r.result, 1)}</HeatChip> },
            { id: "hits", label: "Hits", align: "right", get: r => r.hitRate, render: r => <span>{Math.round(r.hitRate * 100)}%<span className="sr-only"> of {r.picks} picks beat the average</span></span> },
          ]}
        />
      </div>
      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {rows.map(r => <li key={r.n}><b>{r.n}</b>: {r.label.toLowerCase()}. Boldest pick <a className="underline" href={filmHref(r.boldest)}>{r.boldest.title}</a>, best pick <a className="underline" href={filmHref(r.best)}>{r.best.title}</a>.</li>)}
      </ul>
      {gambler && <p className="mt-2 text-sm text-muted-foreground">{gambler.n} picks the films that divide you most.</p>}
    </Collapse>
  )
}
