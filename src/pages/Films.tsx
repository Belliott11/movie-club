import { useState, type FormEvent } from "react"
import { FilmRow } from "@/components/FilmRow"
import { FilmSearch } from "@/components/FilmSearch"
import { MovieCalendar } from "@/components/MovieCalendar"
import { WeekCard } from "@/components/WeekCard"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { fieldCls } from "@/components/field"
import { bestFilm, decadesOf, defaultFilter, filterFilms, pickOrder, type FilmFilter, type FilmSort } from "@/lib/stats"
import { useStore } from "@/lib/store"
import { todayIso } from "@/lib/today"

export default function Films() {
  const { movies, attending, me, addMovie, seed, canPick, selector, deck, deckCards, cards } = useStore()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [year, setYear] = useState("")
  const [tmdbId, setTmdbId] = useState<number | null>(null)
  const [date, setDate] = useState(todayIso)
  const [f, setF] = useState<FilmFilter>(defaultFilter)
  const shown = filterFilms(movies, f)
  const pickers = [...new Set(movies.map(m => m.pick))].sort()
  const filtering = f.q || f.picker || f.decade
  const best = bestFilm(movies)
  const next = pickOrder(movies, attending)[0]?.n || me

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    await addMovie(title.trim(), +year, String(f.get("pick")).trim(), {}, tmdbId, String(f.get("card") ?? "") || null, date)
    setTitle(""); setYear(""); setTmdbId(null)
    setDate(new Date(Date.parse(date) + 7 * 864e5).toISOString().slice(0, 10)) // stay open for the next week
  }

  return (
    <div className="stagger flex flex-col gap-3">
      {!filtering && <MovieCalendar />}
      {!filtering && <WeekCard />}
      <p className="flex flex-wrap gap-x-5 text-sm text-muted-foreground">
        <span><i className="mr-1.5 inline-block size-3 rounded-full bg-us align-[-1px]" />Our average</span>
        <span><i className="mr-1.5 inline-block size-3 rounded-full bg-world align-[-1px]" />Outside average (IMDb, Rotten Tomatoes, Metacritic, Letterboxd, out of 5)</span>
      </p>
      {movies.length > 4 && (
        <div className="flex flex-wrap items-center gap-2" role="search">
          <Input type="search" value={f.q} onChange={e => setF({ ...f, q: e.target.value })} placeholder="Search films" aria-label="Search films" className="h-10 min-w-40 flex-1" />
          <select className={fieldCls} aria-label="Sort films" value={f.sort} onChange={e => setF({ ...f, sort: e.target.value as FilmSort })}>
            <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
            <option value="highest">Highest rated</option><option value="lowest">Lowest rated</option>
            <option value="gap">Biggest gap with outside</option><option value="divisive">Most divisive</option><option value="title">Title A to Z</option>
          </select>
          <select className={fieldCls} aria-label="Filter by picker" value={f.picker} onChange={e => setF({ ...f, picker: e.target.value })}>
            <option value="">Everyone's picks</option>{pickers.map(p => <option key={p} value={p}>{p}'s picks</option>)}
          </select>
          <select className={fieldCls} aria-label="Filter by decade" value={f.decade} onChange={e => setF({ ...f, decade: e.target.value })}>
            <option value="">Any decade</option>{decadesOf(movies).map(d => <option key={d} value={d}>{d}s</option>)}
          </select>
          {filtering && <Button variant="ghost" className="h-10 px-3" onClick={() => setF({ ...f, q: "", picker: "", decade: "" })}>Clear</Button>}
        </div>
      )}
      {movies.length === 0 && (
        <Card className="items-start gap-3 px-5">
          <h2 className="text-lg font-bold">No films yet</h2>
          <p className="text-muted-foreground">The screen is blank. Import the club's 21 films, or add the first one yourself.</p>
          <Button className="h-10 px-4" onClick={seed}>Import club history</Button>
        </Card>
      )}
      {shown.map(m => <FilmRow key={m.id} m={m} best={m === best} />)}
      {filtering && shown.length === 0 && <p className="text-muted-foreground" role="status">No films match. Clear the filters to see all {movies.length}.</p>}
      {adding ? (
        <Card className="overflow-visible! px-4">
          <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
            <FilmSearch name="title" placeholder="Start typing a title" required value={title} onChange={t => { setTitle(t); setTmdbId(null) }} onPick={h => { setTitle(h.title); setYear(h.year ? String(h.year) : ""); setTmdbId(h.id) }} />
            <Input name="year" type="number" placeholder="Year" required value={year} onChange={e => setYear(e.target.value)} className="h-10 w-24" />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">Watched<Input type="date" required value={date} onChange={e => setDate(e.target.value)} className="h-10 w-40" aria-label="Day watched" /></label>
            <Input name="pick" placeholder="Picked by" defaultValue={next} required className="h-10 w-36" />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Card
              <select name="card" aria-label="Which pick card this film answers" defaultValue={deck.drawn.at(-1) ?? ""} className={fieldCls}>
                <option value="">None</option>
                {cards.filter(c => deckCards.includes(c.id) || c.id === deck.drawn.at(-1)).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </label>
            <Button type="submit" className="h-10 px-4">Add film</Button>
            <Button type="button" variant="ghost" className="h-10 px-4" onClick={() => { setAdding(false); setDate(todayIso()) }}>Done</Button>
          </form>
        </Card>
      ) : (
        movies.length > 0 && (canPick
          ? <Button variant="outline" className="h-11 w-fit px-4" onClick={() => setAdding(true)}>Add a film</Button>
          : <p className="text-sm text-muted-foreground">Only {selector} can set this week's film.</p>)
      )}
    </div>
  )
}
