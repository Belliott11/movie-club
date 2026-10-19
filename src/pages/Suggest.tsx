import { useEffect, useState, type FormEvent } from "react"
import { X } from "lucide-react"
import { hasTmdb, IMG, searchFilm, tmdb } from "@/lib/api"
import { groupAvg, key } from "@/lib/stats"
import { useStore } from "@/lib/store"
import type { Suggestion } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const infoCache = new Map<string, any>()
/** Poster, synopsis and score for a suggested title, looked up once per browser session. */
function useInfo(title: string, year: number | null) {
  const k = key(title, year)
  const [info, setInfo] = useState<any>(infoCache.get(k))
  useEffect(() => {
    if (!hasTmdb() || infoCache.has(k)) return
    let dead = false
    searchFilm(title, year).then(r => {
      infoCache.set(k, r || null)
      if (!dead) setInfo(r || null)
    })
    return () => { dead = true }
  }, [k, title, year])
  return info
}

function SuggestionCard({ s }: { s: Suggestion }) {
  const { me, vote, removeSuggestion } = useStore()
  const info = useInfo(s.title, s.year)
  return (
    <Card className="h-full gap-2 px-3">
      {info?.poster_path ? <img src={`${IMG}w154${info.poster_path}`} alt="" loading="lazy" className="aspect-[2/3] w-full rounded-md object-cover" /> : <span className="aspect-[2/3] w-full rounded-md bg-muted" />}
      <h4 className="font-display text-lg leading-tight font-bold">{s.title} <small className="font-sans text-sm font-medium text-muted-foreground">{s.year || ""}</small></h4>
      <p className="text-xs text-muted-foreground">{info?.vote_average ? `TMDB ${+info.vote_average.toFixed(1)}/10 · ` : ""}suggested by {s.by}</p>
      {info?.overview && <p className="line-clamp-5 text-sm leading-snug">{info.overview}</p>}
      <div className="mt-auto flex items-center gap-2">
        <Button variant={s.votes?.includes(me) ? "default" : "outline"} className="h-10 min-w-14 px-3" onClick={() => vote(s)} aria-label={`Vote for ${s.title}`}>▲ {s.votes?.length || 0}</Button>
        <Button variant="ghost" size="icon" className="ml-auto size-10" aria-label={`Remove ${s.title}`} onClick={() => removeSuggestion(s)}><X /></Button>
      </div>
    </Card>
  )
}

type Rec = { id: number; title: string; year: number; because: string; poster: string | null; overview: string; score: number }

export default function Suggest() {
  const { movies, suggestions, suggest } = useStore()
  const [recs, setRecs] = useState<Rec[] | null>(null)
  const sorted = [...suggestions].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0))

  useEffect(() => {
    if (!hasTmdb() || !movies.length) return
    let dead = false
    ;(async () => {
      const seen = new Set(movies.map(m => key(m.title, m.year)))
      const out: Rec[] = []
      const top = [...movies].filter(m => m.tmdb_id && (groupAvg(m) ?? 0) >= 3.5).sort((a, b) => (groupAvg(b) ?? 0) - (groupAvg(a) ?? 0)).slice(0, 10)
      for (const m of top) {
        const r = await tmdb<{ results?: any[] }>(`/movie/${m.tmdb_id}/recommendations`)
        let n = 0
        for (const x of r?.results || []) {
          if (n === 2) break
          const year = +(x.release_date || "").slice(0, 4)
          if (seen.has(key(x.title, year)) || out.some(q => q.id === x.id)) continue
          out.push({ id: x.id, title: x.title, year, because: m.title, poster: x.poster_path, overview: x.overview || "", score: x.vote_average })
          n++
        }
      }
      if (!dead) setRecs(out)
    })()
    return () => { dead = true }
  }, [movies])

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget, f = new FormData(form)
    await suggest(String(f.get("title")).trim(), +String(f.get("year")) || null)
    form.reset()
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <Input name="title" placeholder="Suggest a film" required className="h-10 min-w-48 flex-1" />
        <Input name="year" type="number" placeholder="Year" className="h-10 w-24" />
        <Button type="submit" className="h-10 px-4">Suggest</Button>
      </form>
      <section>
        <h3 className="mb-2 text-xl font-bold">Suggested by the club</h3>
        {sorted.length ? (
          <ul className="grid grid-cols-2 gap-3">
            {sorted.map(s => <li key={s.id}><SuggestionCard s={s} /></li>)}
          </ul>
        ) : (
          <p className="text-muted-foreground">Nothing suggested yet. Add a film above and everyone can vote on it.</p>
        )}
      </section>
      <section>
        <h3 className="mb-2 text-xl font-bold">Because you liked them (group average 3.5 or higher)</h3>
        {!hasTmdb() ? (
          <p className="text-muted-foreground">Add a TMDB key to config.js to get recommendations here.</p>
        ) : recs === null ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {recs.map(r => {
              const done = suggestions.some(x => key(x.title, x.year) === key(r.title, r.year))
              return (
                <li key={r.id}>
                  <Card className="h-full gap-2 px-3">
                    {r.poster ? <img src={`${IMG}w154${r.poster}`} alt="" loading="lazy" className="aspect-[2/3] w-full rounded-md object-cover" /> : <span className="aspect-[2/3] w-full rounded-md bg-muted" />}
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <h4 className="font-display text-lg leading-tight font-bold">{r.title} <small className="font-sans text-sm font-medium text-muted-foreground">{r.year || ""}</small></h4>
                      <p className="text-xs text-muted-foreground">{r.score ? `TMDB ${+r.score.toFixed(1)}/10 · ` : ""}because you liked {r.because}</p>
                      <p className="line-clamp-5 text-sm leading-snug">{r.overview || "No synopsis available."}</p>
                      <Button variant={done ? "ghost" : "outline"} disabled={done} className="mt-auto h-9 w-fit px-3" onClick={() => suggest(r.title, r.year)}>{done ? "Suggested" : "Suggest"}</Button>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
