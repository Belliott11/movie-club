import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Collapse } from "@/components/Collapse"
import { MiniFilm } from "@/components/MiniFilm"
import { IMG, searchFilm } from "@/lib/api"
import { fromIso, monthGrid, niceDate, toIso } from "@/lib/calendar"
import type { LbEntry } from "@/lib/letterboxd"
import { key } from "@/lib/stats"
import { useToday } from "@/lib/today"

const DAYS = ["S", "M", "T", "W", "T", "F", "S"]
const stars = (r: number | null) => (r == null ? "watched" : `${r}`)

/** A person's Letterboxd diary as a month calendar: a poster on each day they logged a film, and a summary of the month. Needs the dates in their export or feed. */
export function DiaryCalendar({ name, history, own }: { name: string; history: LbEntry[]; own: boolean }) {
  const today = useToday()
  // one row per real watch: a rewatch is another day, and a rating changed later is not a watch at all
  const dated = useMemo(() => history.flatMap(e => (e[4] ?? []).map(d => [e[0], e[1], e[2], d] as const)), [history])
  const byDay = useMemo(() => {
    const m = new Map<string, typeof dated>()
    for (const e of dated) m.set(e[3], [...(m.get(e[3]) ?? []), e])
    return m
  }, [dated])
  const last = fromIso(dated.reduce((a, e) => (e[3] > a ? e[3] : a), "")) ?? fromIso(today)!
  const first = dated.reduce((a, e) => (e[3] < a ? e[3] : a), today).slice(0, 4)
  const [view, setView] = useState({ y: last.y, m: last.m })
  const [sel, setSel] = useState("")
  const [posters, setPosters] = useState<Record<string, string | null>>({})
  const step = (n: number) => setView(v => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  const prefix = `${view.y}-${String(view.m + 1).padStart(2, "0")}-`
  const month = dated.filter(e => e[3].startsWith(prefix))
  const rated = month.filter(e => e[2] != null)

  // posters for the days on screen, looked up a few at a time and remembered
  useEffect(() => {
    let dead = false
    const need = month.filter(e => !(key(e[0], e[1]) in posters))
    ;(async () => {
      for (let i = 0; i < need.length; i += 6) {
        const part = await Promise.all(need.slice(i, i + 6).map(async e => [key(e[0], e[1]), (await searchFilm(e[0], e[1]))?.poster_path ?? null] as const))
        if (dead) return
        setPosters(p => ({ ...p, ...Object.fromEntries(part) }))
      }
    })()
    return () => { dead = true }
  }, [prefix, dated]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!dated.length) {
    return (
      <Collapse id="me-diary" title={`${name}'s diary calendar`} defaultOpen={false}>
        <p className="text-sm text-muted-foreground">{own ? "This shows the days you watched things, taken from your Letterboxd diary. Upload your export again on the Watchlists tab (it includes diary.csv) and your diary shows up here. Dates from ratings and the watched list aren't used, since those are when you rated or logged a film." : `${name}'s Letterboxd import doesn't include diary dates yet.`}</p>
      </Collapse>
    )
  }
  const title = new Date(view.y, view.m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const years = Array.from({ length: last.y - +first + 1 }, (_, i) => last.y - i)
  const picked = sel ? byDay.get(sel) ?? [] : []
  return (
    <Collapse id="me-diary" title={`${name}'s diary calendar`} source="letterboxd" defaultOpen={false}>
      <div className="mb-1 flex items-center justify-between gap-1">
        <button type="button" aria-label="Previous month" onClick={() => step(-1)} className="flex size-11 items-center justify-center rounded-full hover:bg-muted"><ChevronLeft className="size-5" /></button>
        <div className="flex items-center gap-1">
          <span className="font-display font-bold">{title.split(" ")[0]}</span>
          <select aria-label="Year" value={view.y} onChange={e => setView(v => ({ ...v, y: +e.target.value }))} className="h-9 rounded-md bg-muted px-1.5 text-sm">{(years.includes(view.y) ? years : [view.y, ...years]).map(y => <option key={y}>{y}</option>)}</select>
        </div>
        <button type="button" aria-label="Next month" onClick={() => step(1)} className="flex size-11 items-center justify-center rounded-full hover:bg-muted"><ChevronRight className="size-5" /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground" aria-hidden>{DAYS.map((d, i) => <span key={i} className="py-1">{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-0.5">
        {monthGrid(view.y, view.m).flat().map((d, i) => {
          if (d == null) return <span key={i} />
          const iso = toIso(view.y, view.m, d), films = byDay.get(iso), p = films && posters[key(films[0][0], films[0][1])]
          return (
            <button key={i} type="button" onClick={() => setSel(iso)} aria-pressed={sel === iso} aria-label={`${niceDate(iso)}${films ? `: ${films.map(f => f[0]).join(", ")}` : ""}${iso === today ? ", today" : ""}`}
              className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-lg text-sm ${iso === today ? "ring-2 ring-world" : ""} ${sel === iso ? "outline-2 outline-foreground" : ""} ${films ? "font-bold text-white" : "hover:bg-muted"}`}
              style={films ? { background: p ? `linear-gradient(#0009,#0009), url(${IMG}w92${p}) center/cover` : "var(--world)" } : undefined}>
              {d}
              {films && films.length > 1 && <span className="absolute right-0.5 bottom-0.5 rounded bg-black/70 px-1 text-[10px] leading-4">{films.length}</span>}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{month.length ? <><b className="text-foreground">{month.length}</b> {month.length === 1 ? "film" : "films"} logged in {title.split(" ")[0]}{rated.length ? <>, averaging <b className="text-foreground">{(rated.reduce((t, e) => t + (e[2] as number), 0) / rated.length).toFixed(1)}</b> stars</> : ""}.</> : `Nothing logged in ${title}.`}</p>
      {sel && (
        <div className="mt-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
          <p className="mb-2 text-sm font-medium">{niceDate(sel)}</p>
          {picked.length ? <ul className="flex flex-col gap-3">{picked.map(e => <li key={e[0] + e[1]}><MiniFilm title={e[0]} year={e[1]} note={`${name} ${e[2] == null ? "watched it without rating" : `gave it ${stars(e[2])}`}`} /></li>)}</ul> : <p className="text-sm text-muted-foreground">Nothing logged this day.</p>}
        </div>
      )}
    </Collapse>
  )
}
