import { useState } from "react"
import { Collapse } from "@/components/Collapse"
import { movieHref } from "@/lib/movieLink"
import { MiniFilm } from "@/components/MiniFilm"
import { Button } from "@/components/ui/button"
import { filmKey, groupProgress, upNextAll, type Plan, type PlanFilm } from "@/lib/plan"

/** A plan as an expandable checklist: a progress bar per group, films you can tick or untick, and the next few films to watch. */
export function PlanList({ plan, seen, overrides, onSeen, onSuggest, onWatching }: {
  plan: Plan
  seen: (f: PlanFilm) => boolean
  overrides?: Record<string, boolean>
  onSeen: (f: PlanFilm, value: boolean | null) => void
  onSuggest: (f: PlanFilm) => void
  /** When given, each group can be marked as one you're watching now. */
  onWatching?: (groups: number[]) => void
}) {
  const [openGroup, setOpenGroup] = useState<number | null>(null)
  const all = plan.groups.flatMap(g => g.films)
  const done = all.filter(seen).length
  const nexts = upNextAll(plan, seen)
  const watching = plan.watching ?? []
  const toggle = (n: number) => onWatching?.(watching.includes(n) ? watching.filter(x => x !== n) : [...watching, n])
  const shout = (t: string) => (t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t) // pasted plans write group names in capitals
  return (
    <>
      <p><b className="font-display text-2xl">{done}</b> <span className="text-muted-foreground">of {all.length} films seen, going by your Letterboxd history</span></p>
      {nexts.length > 0 && (
        <Collapse id="plan-next" title={watching.length ? "Watching now" : "Up next"}>
          <div className="flex flex-col gap-3">
            {nexts.map(next => (
              <div key={next.group.n} className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
                <p className="text-sm text-muted-foreground">Group {next.group.n}, {shout(next.group.title).toLowerCase()}</p>
                <ul className="mt-2 flex flex-col gap-3">
                  {next.films.map(f => <li key={f.title}><MiniFilm title={f.title} year={f.year} note={plan.long.includes(f.title) ? "long, save for a weekend" : undefined} /></li>)}
                </ul>
              </div>
            ))}
          </div>
        </Collapse>
      )}
      <Collapse id="plan-groups" title="All groups">
      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {plan.groups.map((g, i) => {
          const p = groupProgress(g, seen), isOpen = openGroup === g.n
          const newTier = g.tier && g.tier.n !== plan.groups[i - 1]?.tier?.n
          return (
            <li key={g.n}>
              {newTier && <p className="pt-3 pb-1 text-sm font-semibold text-muted-foreground">Tier {g.tier!.n}: {g.tier!.name}</p>}
              <div className="flex items-center gap-1">
              <button type="button" aria-expanded={isOpen} onClick={() => setOpenGroup(isOpen ? null : g.n)} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 py-2 text-left">
                <span className="min-w-0 flex-1">
                  <span className={`block truncate font-medium ${p.complete ? "text-muted-foreground line-through" : ""}`}>{g.n}. {shout(g.title)}{!onWatching && plan.watching?.includes(g.n) && <span className="ml-2 rounded-sm bg-world px-1.5 py-0.5 text-[11px] font-medium text-primary-foreground no-underline">watching now</span>}</span>
                  <span className="mt-1 block h-1.5 rounded-full bg-muted"><span className="block h-full rounded-full bg-world" style={{ width: `${(p.done / Math.max(1, p.total)) * 100}%` }} /></span>
                </span>
                <span className="shrink-0 text-sm text-muted-foreground">{p.done} / {p.total}</span>
              </button>
              {onWatching && <button type="button" role="switch" aria-checked={watching.includes(g.n)} aria-label={`Watching ${shout(g.title)} now`} onClick={() => toggle(g.n)} className={`min-h-11 shrink-0 rounded-md px-2.5 text-xs ${watching.includes(g.n) ? "bg-world font-medium text-primary-foreground" : "text-muted-foreground ring-1 ring-foreground/20"}`}>{watching.includes(g.n) ? "Watching" : "Watch now"}</button>}
              </div>
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
                          <span className={`min-w-0 flex-1 ${s ? "text-muted-foreground line-through" : ""}`}><a href={movieHref(f.title, f.year)} className="hover:underline">{f.title}{f.year ? ` (${f.year})` : ""}</a>{f.priority && f.priority !== "core" && <span className="ml-1.5 text-xs text-muted-foreground">{f.priority}</span>}{overrides?.[filmKey(f)] != null && <button type="button" className="ml-1.5 text-xs underline" onClick={() => onSeen(f, null)}>set by you, undo</button>}</span>
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
      </Collapse>
    </>
  )
}
