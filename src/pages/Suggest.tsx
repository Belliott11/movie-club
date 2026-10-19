import { useEffect, useState, type FormEvent } from "react"
import { X } from "lucide-react"
import { hasTmdb, tmdb } from "@/lib/api"
import { groupAvg, key } from "@/lib/stats"
import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Rec = { title: string; year: number; because: string }

export default function Suggest() {
  const { movies, suggestions, me, suggest, vote, removeSuggestion } = useStore()
  const [recs, setRecs] = useState<Rec[] | null>(null)
  const sorted = [...suggestions].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0))

  useEffect(() => {
    if (!hasTmdb() || !movies.length) return
    let dead = false
    ;(async () => {
      const seen = new Set(movies.map(m => key(m.title, m.year)))
      const out: Rec[] = []
      const top = [...movies].filter(m => m.tmdb_id).sort((a, b) => (groupAvg(b) ?? 0) - (groupAvg(a) ?? 0)).slice(0, 4)
      for (const m of top) {
        const r = await tmdb<{ results?: any[] }>(`/movie/${m.tmdb_id}/recommendations`)
        for (const x of r?.results?.slice(0, 6) || []) {
          const year = +(x.release_date || "").slice(0, 4)
          if (!seen.has(key(x.title, year)) && !out.some(q => q.title === x.title)) out.push({ title: x.title, year, because: m.title })
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
          <ul className="flex flex-col gap-1.5">
            {sorted.map(s => (
              <li key={s.id} className="flex items-center gap-2">
                <Button size="default" variant={s.votes?.includes(me) ? "default" : "outline"} className="h-10 min-w-14 px-3" onClick={() => vote(s)} aria-label={`Vote for ${s.title}`}>▲ {s.votes?.length || 0}</Button>
                <span>{s.title} <small className="text-muted-foreground">{s.year || ""} · by {s.by}</small></span>
                <Button variant="ghost" size="icon" className="ml-auto size-10" aria-label={`Remove ${s.title}`} onClick={() => removeSuggestion(s)}><X /></Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Nothing suggested yet. Add a film above and everyone can vote on it.</p>
        )}
      </section>
      <section>
        <h3 className="mb-2 text-xl font-bold">Based on your highest-rated films</h3>
        {!hasTmdb() ? (
          <p className="text-muted-foreground">Add a TMDB key to config.js to get recommendations here.</p>
        ) : recs === null ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {recs.slice(0, 20).map(r => (
              <li key={r.title + r.year} className="flex flex-wrap items-center gap-2">
                <span>{r.title} <small className="text-muted-foreground">{r.year} · because you liked {r.because}</small></span>
                <Button variant="outline" size="sm" className="h-9 px-3" onClick={() => suggest(r.title, r.year)}>Suggest</Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
