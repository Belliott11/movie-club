import { useEffect, useRef, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { fromIso, monthGrid, niceDate, toIso } from "@/lib/calendar"

const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString("en-US", { month: "long" }))
const DAYS = ["S", "M", "T", "W", "T", "F", "S"]

/** A button showing the date that opens a calendar to click a day on, instead of typing one. Value is YYYY-MM-DD or "". */
export function DatePicker({ value, onChange, label, placeholder = "Pick a date", className = "" }: {
  value: string
  onChange: (iso: string) => void
  label: string
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const now = new Date()
  const start = fromIso(value) ?? { y: now.getFullYear(), m: now.getMonth(), d: 0 }
  const [view, setView] = useState({ y: start.y, m: start.m })
  useEffect(() => {
    if (!open) return
    box.current?.focus() // move into the calendar, and back to the button when it closes
    const t = trigger.current
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    addEventListener("keydown", f)
    return () => { removeEventListener("keydown", f); t?.focus() }
  }, [open])
  const show = () => { const s = fromIso(value) ?? { y: now.getFullYear(), m: now.getMonth() }; setView({ y: s.y, m: s.m }); setOpen(true) }
  const step = (n: number) => setView(v => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  const pick = (iso: string) => { onChange(iso); setOpen(false) }
  const sel = fromIso(value), isToday = (d: number) => view.y === now.getFullYear() && view.m === now.getMonth() && d === now.getDate()
  const years = Array.from({ length: 16 }, (_, i) => now.getFullYear() + 1 - i)

  return (
    <>
      <button ref={trigger} type="button" onClick={show} aria-label={`${label}: ${value ? niceDate(value) : "no date"}. Open calendar`} aria-haspopup="dialog"
        className={`flex h-11 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm ${className}`}>
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className={value ? "" : "text-muted-foreground"}>{value ? niceDate(value) : placeholder}</span>
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[95] flex items-center justify-center bg-black/55 p-4" onClick={() => setOpen(false)}>
          <div ref={box} tabIndex={-1} className="w-full max-w-72 rounded-2xl bg-card p-3 shadow-2xl ring-1 ring-foreground/10 outline-none" onClick={e => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-1">
              <button type="button" aria-label="Previous month" onClick={() => step(-1)} className="flex size-11 items-center justify-center rounded-full hover:bg-muted"><ChevronLeft className="size-5" /></button>
              <div className="flex items-center gap-1">
                <span className="font-display font-bold">{MONTHS[view.m]}</span>
                <select aria-label="Year" value={view.y} onChange={e => setView(v => ({ ...v, y: +e.target.value }))} className="h-9 rounded-md bg-muted px-1.5 text-sm">
                  {(years.includes(view.y) ? years : [view.y, ...years]).map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
              <button type="button" aria-label="Next month" onClick={() => step(1)} className="flex size-11 items-center justify-center rounded-full hover:bg-muted"><ChevronRight className="size-5" /></button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-muted-foreground" aria-hidden>{DAYS.map((d, i) => <span key={i} className="py-1">{d}</span>)}</div>
            <div className="grid grid-cols-7">
              {monthGrid(view.y, view.m).flat().map((d, i) => d == null ? <span key={i} /> : (
                <button key={i} type="button" onClick={() => pick(toIso(view.y, view.m, d))} aria-label={niceDate(toIso(view.y, view.m, d))} aria-pressed={!!sel && sel.y === view.y && sel.m === view.m && sel.d === d}
                  className={`mx-auto flex size-10 items-center justify-center rounded-full text-sm hover:bg-muted ${sel && sel.y === view.y && sel.m === view.m && sel.d === d ? "bg-foreground font-semibold text-background hover:bg-foreground" : isToday(d) ? "ring-1 ring-foreground/40" : ""}`}>{d}</button>
              ))}
            </div>
            <div className="mt-2 flex justify-between">
              <button type="button" onClick={() => pick("")} disabled={!value} className="min-h-11 rounded-lg px-3 text-sm text-muted-foreground disabled:opacity-40">Clear</button>
              <button type="button" onClick={() => pick(toIso(now.getFullYear(), now.getMonth(), now.getDate()))} className="min-h-11 rounded-lg px-3 text-sm font-medium">Today</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
