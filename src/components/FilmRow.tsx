import { useState } from "react"
import { IMG } from "@/lib/api"
import { fmt, groupAvg, key, outsideAvg } from "@/lib/stats"
import { useStore } from "@/lib/store"
import type { Movie } from "@/lib/types"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { fieldCls } from "./field"
import { Scale } from "./Scale"

const HALVES = Array.from({ length: 10 }, (_, i) => (i + 1) / 2)

export function outsideChips(m: Movie, tmdbScore?: number | null) {
  return [
    ["IMDb", m.imdb, "/10"], ["Rotten Tomatoes", m.rt, "%"], ["Metacritic", m.mc, "/100"], ["Letterboxd", m.lb, "/5"], ["TMDB", tmdbScore, "/10"],
  ].filter((c): c is [string, number, string] => c[1] != null && c[1] !== 0)
}

export function FilmRow({ m, best }: { m: Movie; best: boolean }) {
  const { mini, members, setRating, patchMovie } = useStore()
  const [open, setOpen] = useState(false)
  const g = groupAvg(m), o = outsideAvg(m), d = g != null && o != null ? g - o : null
  const info = mini[key(m.title, m.year)]
  const chips = outsideChips(m, info?.v)
  const who = [...new Set([...members, ...Object.keys(m.ratings)])]
  const note = d == null ? "" : Math.abs(d) < 0.05 ? "Matches the outside average" : `${fmt(Math.abs(d))} ${d > 0 ? "above" : "below"} the outside average (${fmt(o)})`

  return (
    <Card className="rise gap-0 py-0">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="grid w-full grid-cols-[52px_1fr_auto] gap-x-4 px-4 py-3.5 text-left">
        {info?.p ? (
          <img src={`${IMG}w154${info.p}`} alt="" loading="lazy" className="row-span-5 aspect-[2/3] w-[52px] rounded-md object-cover" />
        ) : (
          <span className="row-span-5 aspect-[2/3] w-[52px] rounded-md bg-muted" />
        )}
        <span className="font-display text-xl leading-tight font-bold tracking-tight">
          {m.title} <small className="font-sans text-sm font-medium text-muted-foreground">{m.year}</small>
        </span>
        <span className={`row-span-2 self-center font-display text-4xl leading-none font-extrabold tracking-tight ${best ? "text-gold" : ""}`} title={best ? "Highest rated" : "Group average"}>
          {fmt(g)}
        </span>
        <span className="text-sm text-muted-foreground">{m.pick}'s pick · {Object.keys(m.ratings).length} ratings</span>
        <span className="col-span-2"><Scale us={g} world={o} /></span>
        <span className="col-span-2 mt-0.5 flex flex-wrap gap-x-3.5 text-sm text-muted-foreground">
          {chips.length ? chips.map(([l, v, u]) => <span key={l}><b className="font-semibold text-foreground">{l}</b> {fmt(v, 1)}{u}</span>) : <span>Looking up outside ratings…</span>}
        </span>
        {note && <span className="col-span-2 text-sm text-muted-foreground">{note}</span>}
      </button>
      {open && (
        <div className="flex flex-col gap-4 px-4 pb-4">
          <div className="flex flex-wrap gap-2.5">
            {who.map(n => (
              <label key={n} className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                {n}
                <select className={fieldCls} value={m.ratings[n] ?? ""} onChange={e => setRating(m, n, e.target.value === "" ? null : +e.target.value)}>
                  <option value="">–</option>
                  {HALVES.map(v => <option key={v}>{v}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2.5">
            {([["imdb", "IMDb /10"], ["rt", "Rotten Tomatoes /100"], ["mc", "Metacritic /100"], ["lb", "Letterboxd /5"]] as const).map(([k, l]) => (
              <label key={k} className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                {l}
                <input type="number" step="any" className={`${fieldCls} w-32`} defaultValue={m[k] ?? ""} onBlur={e => patchMovie(m, { [k]: e.target.value === "" ? null : +e.target.value })} />
              </label>
            ))}
          </div>
          <a href={`#/films/${encodeURIComponent(String(m.id))}`} className={buttonVariants({ variant: "outline", className: "h-10 w-fit px-4" })}>
            Cast, crew &amp; synopsis
          </a>
        </div>
      )}
    </Card>
  )
}
