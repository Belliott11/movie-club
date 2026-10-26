import { Card } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { filmToRate } from "@/lib/rate"
import { useStore } from "@/lib/store"
import { useToday } from "@/lib/today"

/** Reminds you to rate the club's newest film on the day it's watched, and for a week after, until you have. */
export function RateBanner() {
  const { movies, me, seal } = useStore()
  const today = useToday()
  const m = filmToRate(movies, me, seal.sealedBy, today)
  if (!m) return null
  return (
    <Card role="note" className="mb-4 flex-row flex-wrap items-center gap-x-4 gap-y-1 px-4">
      <p className="min-w-0 flex-1 basis-48 text-sm"><b>{m.watched_on === today ? "Tonight's film is" : "You haven't rated"} {m.title}.</b> {m.watched_on === today ? "Rate it while it's fresh." : ""}</p>
      <a href="#/films" className={buttonVariants({ variant: "default", className: "h-11 px-4" })}>Rate it</a>
    </Card>
  )
}
