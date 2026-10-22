import { Collapse } from "@/components/Collapse"
import { useState } from "react"
import { DatePicker } from "@/components/DatePicker"
import { Button } from "@/components/ui/button"
import { niceDate } from "@/lib/calendar"
import { useStore } from "@/lib/store"
import { weeklyDates } from "@/lib/watchDates"

/** Every film with the day the club watched it. Fill the blanks in one go from a first date, then fix the odd one by hand. */
export function WatchDates() {
  const { movies, setWatched } = useStore()
  const [start, setStart] = useState("")
  const [step, setStep] = useState(7)
  const [busy, setBusy] = useState(false)
  const films = [...movies].sort((a, b) => a.seq - b.seq)
  const missing = films.filter(m => !m.watched_on).length
  const plan = start ? weeklyDates(movies, start, step) : []
  const fill = async () => {
    setBusy(true)
    for (const { movie, date } of plan) await setWatched(movie, date)
    setBusy(false)
  }
  return (
    <Collapse id="watchdates" title="Watch dates" defaultOpen={false}>
      <p className="mb-3 text-sm text-muted-foreground">{missing ? `${missing} of ${films.length} films have no date.` : "Every film has a date."} Dates let Club Wrapped show a single year.</p>
      {missing > 0 && (
        <div className="mb-3 flex flex-col gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
          <p className="text-sm font-medium">Fill the blanks from the first film</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">First film on</span>
              <DatePicker value={start} onChange={setStart} label="First film watched on" />
            </div>
            <label className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">then every</span>
              <select value={step} onChange={e => setStep(+e.target.value)} className="h-11 rounded-lg border border-input bg-background px-2">
                <option value={7}>week</option><option value={14}>2 weeks</option><option value={28}>4 weeks</option>
              </select>
            </label>
            <Button className="h-11 px-4" disabled={!start || busy} onClick={fill}>{busy ? "Filling…" : `Fill ${plan.length} dates`}</Button>
          </div>
          {plan.length > 0 && <p className="text-xs text-muted-foreground">That puts {plan[0].movie.title} on {niceDate(plan[0].date)} and {plan[plan.length - 1].movie.title} on {niceDate(plan[plan.length - 1].date)}. You can change any date after.</p>}
        </div>
      )}
      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {films.map(m => (
          <li key={m.id} className="flex min-h-12 items-center justify-between gap-3 py-1">
            <span className="min-w-0 truncate">{m.title} <small className="text-muted-foreground">{m.year}</small></span>
            <DatePicker value={m.watched_on ?? ""} onChange={v => setWatched(m, v || null)} label={`Watched ${m.title} on`} placeholder="Add date" className="shrink-0" />
          </li>
        ))}
      </ul>
    </Collapse>
  )
}
