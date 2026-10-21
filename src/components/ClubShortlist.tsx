import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { seenMatcher } from "@/lib/plan"
import { useStore } from "@/lib/store"
import { usePlan } from "@/lib/usePlan"

/** Your own club-night candidates from your private plan. Shown only to you, and only where your plan is unlocked. */
export function ClubShortlist() {
  const { me, lb, suggest, suggestions, movies } = useStore()
  const { plan, status } = usePlan(me)
  if (!me || status !== "open" || !plan?.club.length) return null
  const seen = seenMatcher(lb[me], plan.overrides)
  const asked = new Set(suggestions.map(s => s.title.toLowerCase()))
  const played = new Set(movies.map(m => m.title.toLowerCase()))
  const left = plan.club.filter(t => !seen({ title: t }) && !played.has(t.toLowerCase()))
  if (!left.length) return null
  return (
    <section>
      <h3 className="mb-1 flex items-center gap-1.5 text-xl font-bold"><Lock className="size-4" aria-hidden />Your club candidates</h3>
      <p className="mb-2 text-sm text-muted-foreground">Films from your plan that you marked as best saved for the group. Only you see this list.</p>
      <ul className="flex flex-col gap-1">
        {left.map(t => (
          <li key={t} className="flex items-center justify-between gap-2 rounded-lg bg-card px-3 py-1.5 ring-1 ring-foreground/10">
            <span className="min-w-0 truncate font-medium">{t}</span>
            <Button variant="outline" className="h-10 shrink-0 px-3" disabled={asked.has(t.toLowerCase())} onClick={() => suggest(t, null)}>{asked.has(t.toLowerCase()) ? "Suggested" : "Suggest it"}</Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
