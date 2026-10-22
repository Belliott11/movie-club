import { useState } from "react"
import { X } from "lucide-react"
import { FilmSearch } from "@/components/FilmSearch"
import { Button } from "@/components/ui/button"
import { Collapse } from "@/components/Collapse"
import { MiniFilm } from "@/components/MiniFilm"
import { seenMatcher } from "@/lib/plan"
import { useStore } from "@/lib/store"
import { usePlan } from "@/lib/usePlan"

type Item = { t: string; y?: number }

/**
 * Each player's own list of films they'd like to bring to the club. If your private plan marks some as best saved for the group they
 * start on the list; add any film yourself, or take any off. The list is kept per player, and only you see it here.
 */
export function ClubShortlist() {
  const { me, lb, suggest, suggestions, movies, candidates, setCandidates, loadSeal } = useStore()
  const { plan, status } = usePlan(me)
  const [title, setTitle] = useState("")
  const [year, setYear] = useState<number | null>(null)
  if (!me) return null
  const mine = candidates[me] ?? { add: [], hide: [] }
  const hidden = new Set(mine.hide.map(t => t.toLowerCase()))
  const fromPlan: Item[] = status === "open" ? (plan?.club ?? []).filter(t => !hidden.has(t.toLowerCase())).map(t => ({ t })) : []
  const items = [...fromPlan, ...mine.add.filter(a => !fromPlan.some(p => p.t.toLowerCase() === a.t.toLowerCase()))]
  const seen = seenMatcher(lb[me], plan?.overrides)
  const asked = new Set(suggestions.map(s => s.title.toLowerCase()))
  const played = new Set(movies.map(m => m.title.toLowerCase()))
  const left = items.filter(i => !seen({ title: i.t, year: i.y }) && !played.has(i.t.toLowerCase()))

  const add = () => {
    const t = title.trim()
    if (!t || items.some(i => i.t.toLowerCase() === t.toLowerCase())) return
    setCandidates(me, { add: [...mine.add, year ? { t, y: year } : { t }], hide: mine.hide.filter(h => h.toLowerCase() !== t.toLowerCase()) })
    setTitle(""); setYear(null); loadSeal()
  }
  const remove = (i: Item) => {
    if (fromPlan.some(p => p.t === i.t)) setCandidates(me, { add: mine.add, hide: [...mine.hide, i.t] })
    else setCandidates(me, { add: mine.add.filter(a => a.t !== i.t), hide: mine.hide })
  }

  return (
    <Collapse id="next-candidates" title="Your club candidates">
      <p className="mb-2 text-sm text-muted-foreground">Films you'd like to bring to the club, {me}. Add your own or take any off; the ones you've seen or the club has played drop off by themselves.</p>
      {left.length > 0 ? (
        <ul className="mb-3 flex flex-col gap-2">
          {left.map(i => (
            <li key={i.t} className="rounded-lg bg-card p-2 ring-1 ring-foreground/10">
              <MiniFilm title={i.t} year={i.y} action={
                <span className="flex shrink-0 flex-col items-end">
                  <button type="button" aria-label={`Take ${i.t} off your list`} onClick={() => remove(i)} className="-mt-1 -mr-1 flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
                  <Button variant="outline" className="-mt-2 h-9 px-3 text-xs" disabled={asked.has(i.t.toLowerCase())} onClick={() => suggest(i.t, i.y ?? null)}>{asked.has(i.t.toLowerCase()) ? "Suggested" : "Suggest it"}</Button>
                </span>
              } />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-2 text-sm text-muted-foreground">Nothing on your list yet.</p>
      )}
      <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); add() }}>
        <FilmSearch name="candidate" aria-label="Add a film to your club candidates" placeholder="Add a film to your list" value={title} onChange={t => { setTitle(t); setYear(null) }} onPick={h => { setTitle(h.title); setYear(h.year) }} />
        <Button type="submit" variant="outline" className="h-10 px-4" disabled={!title.trim()}>Add</Button>
      </form>
    </Collapse>
  )
}
