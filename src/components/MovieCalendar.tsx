import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Collapse } from "@/components/Collapse"
import { Button } from "@/components/ui/button"
import { fromIso, monthGrid, niceDate, toIso } from "@/lib/calendar"
import { IMG } from "@/lib/api"
import { key } from "@/lib/stats"
import { useStore } from "@/lib/store"
import { relativeDay, useToday } from "@/lib/today"

const DAYS = ["S", "M", "T", "W", "T", "F", "S"]

/** Says what day it is against the newest film's date, with a month calendar of every watch date. Tap a day to see the film, or to move the newest film's date there. */
export function MovieCalendar() {
  const { movies, mini, canPick, setWatched } = useStore()
  const today = useToday()
  const newest = [...movies].sort((a, b) => b.seq - a.seq)[0]
  const t = fromIso(today)!
  const start = fromIso(newest?.watched_on ?? "") ?? t
  const [view, setView] = useState({ y: start.y, m: start.m })
  const [sel, setSel] = useState("")
  const step = (n: number) => setView(v => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  const byDay = new Map<string, typeof movies>()
  for (const m of movies) if (m.watched_on) byDay.set(m.watched_on, [...(byDay.get(m.watched_on) ?? []), m])
  const status = !newest ? "" : !newest.watched_on ? `${newest.title} has no date yet` : newest.watched_on > today ? `${newest.title}: movie night ${relativeDay(newest.watched_on, today)}` : newest.watched_on === today ? `${newest.title}: movie night is tonight` : `${newest.title}: watched ${relativeDay(newest.watched_on, today)}`
  const picked = sel ? byDay.get(sel) ?? [] : []
  const month = new Date(view.y, view.m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
  return (
    <section>
      <p className="text-sm text-muted-foreground">Today is <b className="text-foreground">{new Date(`${today}T12:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</b>{status && <> · <b className="text-foreground">{status}</b></>}</p>
      <Collapse id="calendar" title="Calendar" defaultOpen={false}>
        <div className="mb-1 flex items-center justify-between">
          <button type="button" aria-label="Previous month" onClick={() => step(-1)} className="flex size-11 items-center justify-center rounded-full hover:bg-muted"><ChevronLeft className="size-5" /></button>
          <span className="font-display font-bold">{month}</span>
          <button type="button" aria-label="Next month" onClick={() => step(1)} className="flex size-11 items-center justify-center rounded-full hover:bg-muted"><ChevronRight className="size-5" /></button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs text-muted-foreground" aria-hidden>{DAYS.map((d, i) => <span key={i} className="py-1">{d}</span>)}</div>
        <div className="grid grid-cols-7 gap-0.5">
          {monthGrid(view.y, view.m).flat().map((d, i) => {
            if (d == null) return <span key={i} />
            const iso = toIso(view.y, view.m, d), films = byDay.get(iso), p = films && mini[key(films[0].title, films[0].year)]?.p
            return (
              <button key={i} type="button" onClick={() => setSel(iso)} aria-pressed={sel === iso} aria-label={`${niceDate(iso)}${films ? `: ${films.map(f => f.title).join(", ")}` : ""}${iso === today ? ", today" : ""}`}
                className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-lg text-sm ${iso === today ? "ring-2 ring-world" : ""} ${sel === iso ? "outline-2 outline-foreground" : ""} ${films ? "font-bold text-white" : "hover:bg-muted"}`}
                style={films ? { background: p ? `linear-gradient(#0009,#0009), url(${IMG}w92${p}) center/cover` : "var(--us)" } : undefined}>
                {d}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">The ring is today. Days with a poster are films the club watched or has lined up.</p>
        {sel && (
          <div className="mt-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
            <p className="text-sm font-medium">{niceDate(sel)} · {relativeDay(sel, today)}</p>
            {picked.map(m => <p key={m.id} className="text-sm"><a href={`#/films/${m.id}`} className="font-medium hover:underline">{m.title}</a> <span className="text-muted-foreground">{m.year} · picked by {m.pick}</span></p>)}
            {!picked.length && <p className="text-sm text-muted-foreground">No film on this day.</p>}
            {newest && newest.watched_on !== sel && (canPick
              ? <Button variant="outline" className="mt-2 h-11 px-4" onClick={() => setWatched(newest, sel)}>Move {newest.title} to this day</Button>
              : <p className="mt-1 text-xs text-muted-foreground">Only the selector can move the date.</p>)}
          </div>
        )}
      </Collapse>
    </section>
  )
}
