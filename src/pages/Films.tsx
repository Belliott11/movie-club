import { useState, type FormEvent } from "react"
import { FilmRow } from "@/components/FilmRow"
import { FilmSearch } from "@/components/FilmSearch"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { bestFilm, pickOrder } from "@/lib/stats"
import { useStore } from "@/lib/store"

export default function Films() {
  const { movies, attending, me, addMovie, seed } = useStore()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [year, setYear] = useState("")
  const [tmdbId, setTmdbId] = useState<number | null>(null)
  const best = bestFilm(movies)
  const next = pickOrder(movies, attending)[0]?.n || me

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    await addMovie(title.trim(), +year, String(f.get("pick")).trim(), {}, tmdbId)
    setAdding(false); setTitle(""); setYear(""); setTmdbId(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="flex flex-wrap gap-x-5 text-sm text-muted-foreground">
        <span><i className="mr-1.5 inline-block size-3 rounded-full bg-us align-[-1px]" />Our average</span>
        <span><i className="mr-1.5 inline-block size-3 rounded-full bg-world align-[-1px]" />Outside average (IMDb, Rotten Tomatoes, Metacritic, Letterboxd, out of 5)</span>
      </p>
      {movies.length === 0 && (
        <Card className="items-start gap-3 px-5">
          <h2 className="text-lg font-bold">No films yet</h2>
          <p className="text-muted-foreground">Import the club's 21 films from Letterboxd, or add the first one yourself.</p>
          <Button className="h-10 px-4" onClick={seed}>Import club history</Button>
        </Card>
      )}
      {[...movies].reverse().map(m => <FilmRow key={m.id} m={m} best={m === best} />)}
      {adding ? (
        <Card className="overflow-visible! px-4">
          <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
            <FilmSearch name="title" placeholder="Start typing a title" required value={title} onChange={t => { setTitle(t); setTmdbId(null) }} onPick={h => { setTitle(h.title); setYear(h.year ? String(h.year) : ""); setTmdbId(h.id) }} />
            <Input name="year" type="number" placeholder="Year" required value={year} onChange={e => setYear(e.target.value)} className="h-10 w-24" />
            <Input name="pick" placeholder="Picked by" defaultValue={next} required className="h-10 w-36" />
            <Button type="submit" className="h-10 px-4">Add film</Button>
            <Button type="button" variant="ghost" className="h-10 px-4" onClick={() => setAdding(false)}>Cancel</Button>
          </form>
        </Card>
      ) : (
        movies.length > 0 && <Button variant="outline" className="h-11 w-fit px-4" onClick={() => setAdding(true)}>Add a film</Button>
      )}
    </div>
  )
}
