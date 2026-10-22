import { useState } from "react"
import { movieHref } from "@/lib/movieLink"
import { MiniFilm } from "@/components/MiniFilm"
import { Button } from "@/components/ui/button"
import { filmKey, groupProgress, upNext, type Plan, type PlanFilm } from "@/lib/plan"

/** A plan as an expandable checklist: a progress bar per group, films you can tick or untick, and the next few films to watch. */
export function PlanList({ plan, seen, overrides, onSeen, onSuggest }: {
  plan: Plan
  seen: (f: PlanFilm) => boolean
  overrides?: Record<string, boolean>
  onSeen: (f: PlanFilm, value: boolean | null) => void
  onSuggest: (f: PlanFilm) => void
}) {
  const [openGroup, setOpenGroup] = useState<number | null>(null)
  const all = plan.groups.flatMap(g => g.films)
  const done = all.filter(seen).length
  const next = upNext(plan, seen)
  const shout = (t: string) => (t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t) // pasted plans write group names in capitals
  return (
    <>
      <p><b className="font-display text-2xl">{done}</b> <span className="text-muted-foreground">of {all.length} films seen, going by your Letterboxd history</span></p>
      {next && (
        <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
          <p className="text-sm text-muted-foreground">Up next: group {next.group.n}, {shout(next.group.title).toLowerCase()}</p>
          <ul className="mt-2 flex flex-col gap-3">
            {next.films.map(f => <li key={f.title}><MiniFilm title={f.title} year={f.year} note={plan.long.includes(f.title) ? "long, save for a weekend" : undefined} /></li>)}
          </ul>
        </div>
      )}
      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {plan.groups.map(g => {
          const p = groupProgress(g, seen), isOpen = openGroup === g.n
          return (
            <li key={g.n}>
              <button type="button" aria-expanded={isOpen} onClick={() => setOpenGroup(isOpen ? null : g.n)} className="flex min-h-11 w-full items-center gap-3 py-2 text-left">
                <span className="min-w-0 flex-1">
                  <span className={`block truncate font-medium ${p.complete ? "text-muted-foreground line-through" : ""}`}>{g.n}. {shout(g.title)}</span>
                  <span className="mt-1 block h-1.5 rounded-full bg-muted"><span className="block h-full rounded-full bg-world" style={{ width: `${(p.done / Math.max(1, p.total)) * 100}%` }} /></span>
                </span>
                <span className="shrink-0 text-sm text-muted-foreground">{p.done} / {p.total}</span>
              </button>
              {isOpen && (
                <div className="pb-3">
                  {g.blurb && <p className="mb-2 text-sm text-muted-foreground">{g.blurb}</p>}
                  <ul className="flex flex-col">
                    {g.films.map(f => {
                      const s = seen(f)
                      return (
                        <li key={f.title + f.year} className="flex items-center gap-2 py-1 text-sm">
                          <button type="button" role="checkbox" aria-checked={s} aria-label={`${f.title}: seen`} onClick={() => onSeen(f, !s)} className="-m-2 flex size-11 shrink-0 items-center justify-center">
                            <span className={`block size-5 rounded-full border-2 ${s ? "border-world bg-world" : "border-border"}`} />
                          </button>
                          <span className={`min-w-0 flex-1 ${s ? "text-muted-foreground line-through" : ""}`}><a href={movieHref(f.title, f.year)} className="hover:underline">{f.title}{f.year ? ` (${f.year})` : ""}</a>{overrides?.[filmKey(f)] != null && <button type="button" className="ml-1.5 text-xs underline" onClick={() => onSeen(f, null)}>set by you, undo</button>}</span>
                          {!s && <Button variant="ghost" className="h-9 shrink-0 px-2 text-xs" onClick={() => onSuggest(f)}>Suggest to club</Button>}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
