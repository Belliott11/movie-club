import { useState } from "react"
import { IMG } from "@/lib/api"
import { fmt, groupAvg, key, outsideAvg } from "@/lib/stats"
import { useStore } from "@/lib/store"
import type { Movie } from "@/lib/types"
import { buttonVariants } from "@/components/ui/button"
import { AddPerson } from "./AddPerson"
import { FilmSearch } from "./FilmSearch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  const { mini, members, setRating, patchMovie, deleteMovie } = useStore()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [title, setTitle] = useState(m.title)
  const [year, setYear] = useState(String(m.year))
  const [pick, setPick] = useState(m.pick)
  const [tmdbId, setTmdbId] = useState<number | null | undefined>(undefined) // undefined = unchanged
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
        <span className="text-sm text-muted-foreground">{m.pick}'s pick · {Object.keys(m.ratings).length} {Object.keys(m.ratings).length === 1 ? "rating" : "ratings"}</span>
        <span className="col-span-2"><Scale us={g} world={o} /></span>
        <span className="col-span-2 mt-0.5 flex flex-wrap gap-x-3.5 text-sm text-muted-foreground">
          {chips.length ? chips.map(([l, v, u]) => <span key={l}><b className="font-semibold text-foreground">{l}</b> {fmt(v, 1)}{u}</span>) : <span>Looking up outside ratings…</span>}
        </span>
        {note && <span className="col-span-2 text-sm text-muted-foreground">{note}</span>}
      </button>
      {open && (
        <div className="animate-in fade-in-0 slide-in-from-top-2 flex flex-col gap-4 px-4 pb-4 duration-300">
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
            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
              Someone new?
              <AddPerson label="Add" />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2.5">
            {([["imdb", "IMDb /10"], ["rt", "Rotten Tomatoes /100"], ["mc", "Metacritic /100"], ["lb", "Letterboxd /5"]] as const).map(([k, l]) => (
              <label key={k} className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                {l}
                <input type="number" step="any" className={`${fieldCls} w-32`} defaultValue={m[k] ?? ""} onBlur={e => patchMovie(m, { [k]: e.target.value === "" ? null : +e.target.value })} />
              </label>
            ))}
          </div>
          {editing ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={async e => {
                e.preventDefault()
                const f: Partial<Movie> = { title: title.trim(), year: +year, pick: pick.trim() }
                if (tmdbId !== undefined) f.tmdb_id = tmdbId
                else if (key(f.title!, f.year!) !== key(m.title, m.year)) f.tmdb_id = null // a different film now: look it up again
                await patchMovie(m, f)
                setEditing(false)
              }}
            >
              <FilmSearch value={title} onChange={t => { setTitle(t); setTmdbId(null) }} onPick={h => { setTitle(h.title); setYear(h.year ? String(h.year) : year); setTmdbId(h.id) }} aria-label="Title" required />
              <Input type="number" value={year} onChange={e => setYear(e.target.value)} aria-label="Year" required className="h-10 w-24" />
              <Input value={pick} onChange={e => setPick(e.target.value)} aria-label="Picked by" required className="h-10 w-36" />
              <Button type="submit" className="h-10 px-4">Save</Button>
              <Button type="button" variant="ghost" className="h-10 px-4" onClick={() => { setEditing(false); setTitle(m.title); setYear(String(m.year)); setPick(m.pick); setTmdbId(undefined) }}>Cancel</Button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <a href={`#/films/${encodeURIComponent(String(m.id))}`} className={buttonVariants({ variant: "outline", className: "h-10 w-fit px-4" })}>
                Cast, crew &amp; synopsis
              </a>
              <Button variant="outline" className="h-10 px-4" onClick={() => setEditing(true)}>Edit film</Button>
              {confirmDelete ? (
                <span className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-1">
                  <span className="text-sm">Delete {m.title} and its {Object.keys(m.ratings).length} ratings?</span>
                  <Button variant="destructive" className="h-9 px-3" onClick={() => deleteMovie(m)}>Delete</Button>
                  <Button variant="ghost" className="h-9 px-3" onClick={() => setConfirmDelete(false)}>Keep</Button>
                </span>
              ) : (
                <Button variant="ghost" className="h-10 px-4 text-destructive" onClick={() => setConfirmDelete(true)}>Delete</Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
