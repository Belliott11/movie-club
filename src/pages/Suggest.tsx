import { useEffect, useState, type FormEvent } from "react"
import { Eye, EyeOff, X } from "lucide-react"
import { hasTmdb, IMG, searchFilm, tmdb } from "@/lib/api"
import { findEntry, seenBy } from "@/lib/letterboxd"
import { groupAvg, key } from "@/lib/stats"
import { useStore } from "@/lib/store"
import type { Suggestion } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { FilmSearch } from "@/components/FilmSearch"
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
  const { movies, suggestions, suggest, flags, me, setFlag, lb, loadLb } = useStore()
  useEffect(() => { loadLb() }, [loadLb])
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
          if (n === 6) break
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

  // up to 6 candidates per film are loaded; each person sees the first 2 they haven't marked seen or not interested
  const myFlag = (id: number) => flags.find(f => f.member === me && f.tmdb_id === id)?.kind
  const sources = [...new Set((recs ?? []).map(r => r.because))]
  const onLb = (r: Rec) => !!(me && findEntry(lb[me], r.title, r.year)) // already watched on Letterboxd
  const visible = sources.flatMap(src => (recs ?? []).filter(r => r.because === src && !myFlag(r.id) && !onLb(r)).slice(0, 2))
  const hidden = (recs ?? []).filter(r => myFlag(r.id) || onLb(r))
  const [title, setTitle] = useState("")
  const [year, setYear] = useState("")
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await suggest(title.trim(), +year || null)
    setTitle(""); setYear("")
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <FilmSearch name="title" placeholder="Start typing a film to suggest" required value={title} onChange={setTitle} onPick={h => { setTitle(h.title); setYear(h.year ? String(h.year) : "") }} />
        <Input name="year" type="number" placeholder="Year" value={year} onChange={e => setYear(e.target.value)} className="h-10 w-24" />
        <Button type="submit" className="h-10 px-4">Suggest</Button>
      </form>
      <section>
        <h3 className="mb-2 text-xl font-bold">Suggested by the club</h3>
        {sorted.length ? (
          <ul className="grid grid-cols-2 gap-3">
            {sorted.map(s => <li key={s.id}><SuggestionCard s={s} /></li>)}
          </ul>
        ) : (
          <p className="text-muted-foreground">No suggestions yet. The projector is warmed up: add a film above and everyone can vote on it.</p>
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
            {visible.map(r => {
              const seenByNames = [...new Set([...flags.filter(f => f.tmdb_id === r.id && f.kind === "seen").map(f => f.member), ...seenBy(lb, r.title, r.year)])].filter(n => n !== me)
              const done = suggestions.some(x => key(x.title, x.year) === key(r.title, r.year))
              return (
                <li key={r.id}>
                  <Card className="h-full gap-2 px-3">
                    {r.poster ? <img src={`${IMG}w154${r.poster}`} alt="" loading="lazy" className="aspect-[2/3] w-full rounded-md object-cover" /> : <span className="aspect-[2/3] w-full rounded-md bg-muted" />}
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <h4 className="font-display text-lg leading-tight font-bold">{r.title} <small className="font-sans text-sm font-medium text-muted-foreground">{r.year || ""}</small></h4>
                      <p className="text-xs text-muted-foreground">{r.score ? `TMDB ${+r.score.toFixed(1)}/10 · ` : ""}because you liked {r.because}</p>
                      <p className="line-clamp-5 text-sm leading-snug">{r.overview || "No synopsis available."}</p>
                      {seenByNames.length > 0 && <p className="text-xs text-muted-foreground">Seen by {seenByNames.join(", ")}</p>}
                      <div className="mt-auto flex flex-col gap-1.5 pt-1">
                        <Button variant={done ? "ghost" : "outline"} disabled={done} className="h-10 w-full px-3" onClick={() => suggest(r.title, r.year)}>{done ? "Suggested" : "Suggest"}</Button>
                        <div className="flex flex-col gap-1.5 min-[440px]:flex-row">
                          <Button variant="ghost" className="h-10 flex-1 gap-1 px-2 text-xs" onClick={() => setFlag(r.id, r.title, "seen")}><Eye aria-hidden />Seen it</Button>
                          <Button variant="ghost" className="h-10 flex-1 gap-1 px-2 text-xs" onClick={() => setFlag(r.id, r.title, "skip")}><EyeOff aria-hidden />Not interested</Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
        {hidden.length > 0 && (
          <details className="mt-4">
            <summary className="min-h-11 cursor-pointer py-2 text-sm text-muted-foreground">Hidden for {me || "you"} ({hidden.length})</summary>
            <ul className="flex flex-col gap-1">
              {hidden.map(r => (
                <li key={r.id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate">{r.title} <small className="text-muted-foreground">{r.year || ""} · {myFlag(r.id) === "skip" ? "not interested" : "seen"}{!myFlag(r.id) && " on Letterboxd"}</small></span>
                  {myFlag(r.id) && <Button variant="ghost" className="h-10 px-3" onClick={() => setFlag(r.id, r.title, null)}>Bring back</Button>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  )
}
