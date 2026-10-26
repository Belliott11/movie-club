import { useEffect, useState } from "react"

/** Today's date on this device as YYYY-MM-DD. */
export const todayIso = () => new Date().toLocaleDateString("en-CA")

/** Today's date, kept current while the page stays open (it ticks over at midnight and when you come back to the tab). */
export function useToday() {
  const [today, setToday] = useState(todayIso)
  useEffect(() => {
    const tick = () => setToday(todayIso())
    const t = setInterval(tick, 60_000)
    document.addEventListener("visibilitychange", tick)
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick) }
  }, [])
  return today
}

const days = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 864e5)

/** How far a film's date is from today, in words: "tonight", "tomorrow", "in 3 days", "yesterday", "5 days ago". */
export function relativeDay(date: string, today: string): string {
  const n = days(date, today)
  if (n === 0) return "tonight"
  if (n === 1) return "tomorrow"
  if (n === -1) return "yesterday"
  return n > 0 ? `in ${n} days` : `${-n} days ago`
}
