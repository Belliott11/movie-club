import { onMyServices, SERVICES, hours, type Facts, type PickPrefs } from "@/lib/filmFacts"
import { usePref } from "@/lib/prefs"

export const usePickPrefs = () => usePref<PickPrefs>("pick-filters-v1", { stream: false, short: false })
export const useMyServices = () => usePref<string[]>("my-services-v1", [])

const chip = (on: boolean) => `min-h-11 rounded-full px-3.5 text-sm ring-1 ${on ? "bg-foreground font-medium text-background ring-foreground" : "bg-card ring-foreground/15"}`

/** Filters for picking tonight's film (streamable, under two hours) and the streaming services you have. Remembered on this device. */
export function PickControls() {
  const [prefs, setPrefs] = usePickPrefs()
  const [mine, setMine] = useMyServices()
  return (
    <div className="mb-3 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filters">
        <button type="button" aria-pressed={prefs.stream} className={chip(prefs.stream)} onClick={() => setPrefs({ ...prefs, stream: !prefs.stream })}>{mine.length ? "On my services" : "Streamable"}</button>
        <button type="button" aria-pressed={prefs.short} className={chip(prefs.short)} onClick={() => setPrefs({ ...prefs, short: !prefs.short })}>Under 2 hours</button>
      </div>
      <details className="text-sm">
        <summary className="min-h-11 cursor-pointer py-2 text-muted-foreground">My streaming services{mine.length ? ` (${mine.length})` : ""}</summary>
        <div className="flex flex-wrap gap-2 pb-2" role="group" aria-label="Streaming services">
          {SERVICES.map(s => <button key={s.id} type="button" aria-pressed={mine.includes(s.id)} className={chip(mine.includes(s.id))} onClick={() => setMine(mine.includes(s.id) ? mine.filter(x => x !== s.id) : [...mine, s.id])}>{s.label}</button>)}
        </div>
      </details>
    </div>
  )
}

/** "2h 05m · On Netflix" or "2h 05m · Streams on Hulu, Tubi" under a film. Empty until the facts load. */
export function FactsLine({ facts }: { facts: Facts | undefined }) {
  const [mine] = useMyServices()
  if (!facts) return null
  const on = onMyServices(facts, mine)
  const parts = [facts.runtime ? hours(facts.runtime) : "", on.length ? `On ${on.join(", ")}` : facts.stream.length ? `Streams on ${facts.stream.slice(0, 3).join(", ")}` : facts.rent.length ? "Rent only" : "Not streaming"].filter(Boolean)
  return <p className={`text-xs ${on.length ? "font-medium text-pos" : "text-muted-foreground"}`}>{parts.join(" · ")}</p>
}
