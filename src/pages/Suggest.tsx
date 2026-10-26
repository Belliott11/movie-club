import { CardSkeletons } from "@/components/Skeleton"
import { useEffect, useState, type FormEvent } from "react"
import { Eye, EyeOff, X } from "lucide-react"
import { FactsLine, PickControls, useMyServices, usePickPrefs } from "@/components/PickControls"
import { passesFilters, useFacts } from "@/lib/filmFacts"
import { movieHref } from "@/lib/movieLink"
import { hasTmdb, IMG, searchFilm, tmdb } from "@/lib/api"
import { findEntry, seenBy } from "@/lib/letterboxd"
import { chosenFavorites, favoritesOf } from "@/lib/lbstats"
import { groupAvg, key } from "@/lib/stats"
import { useStore } from "@/lib/store"
import { useFilmInfo } from "@/lib/useFilmInfo"
import type { Suggestion } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { FilmSearch } from "@/components/FilmSearch"
import { ImportNudge } from "@/components/ImportNudge"
import { Card } from "@/components/ui/card"
import { Collapse } from "@/components/Collapse"
import { Input } from "@/components/ui/input"

function SuggestionCard({ s }: { s: Suggestion }) {
  const { me, vote, removeSuggestion } = useStore()
  const info = useFilmInfo(s.title, s.year)
  return (
    <Card className="h-full gap-2 px-3">
      <a href={movieHref(s.title, s.year)} aria-label={`About ${s.title}`}>{info?.poster_path ? <img src={`${IMG}w154${info.poster_path}`} alt="" loading="lazy" className="aspect-[2/3] w-full rounded-md object-cover" /> : <span className="block aspect-[2/3] w-full rounded-md bg-muted" />}</a>
      <h4 className="font-display text-lg leading-tight font-bold"><a href={movieHref(s.title, s.year)} className="hover:underline">{s.title}</a> <small className="font-sans text-sm font-medium text-muted-foreground">{s.year || ""}</small></h4>
      <p className="text-xs text-muted-foreground">{info?.vote_average ? `TMDB ${+info.vote_average.toFixed(1)}/10 · ` : ""}suggested by {s.by}</p>
      {info?.overview && <p className="line-clamp-5 text-sm leading-snug">{info.overview}</p>}
      <div className="mt-auto flex items-center gap-2">
        <Button variant={s.votes?.includes(me) ? "default" : "outline"} className="h-10 min-w-14 px-3" onClick={() => vote(s)} aria-label={`Vote for ${s.title}`}>▲ {s.votes?.length || 0}</Button>
        <Button variant="ghost" size="icon" className="ml-auto size-10" aria-label={`Remove ${s.title}`} onClick={() => removeSuggestion(s)}><X /></Button>
      </div>
    </Card>
  )
}

const RECS = "suggest-recs-v1"
const readRecs = (sig: string): Rec[] | null => {
  try {
    const c = JSON.parse(localStorage.getItem(RECS) ?? "null")
    return c && c.sig === sig && Date.now() - c.t < 864e5 ? c.recs : null
  } catch { return null }
}
const writeRecs = (sig: string, recs: Rec[]) => { try { localStorage.setItem(RECS, JSON.stringify({ sig, t: Date.now(), recs })) } catch { /* full: it will look up again */ } }

type Rec = { id: number; title: string; year: number; because: string; wantedBy: string[]; poster: string | null; overview: string; score: number }

export default function Suggest() {
  const { movies, suggestions, suggest, flags, me, setFlag, lb, loadLb, watchlist, favs } = useStore()
  useEffect(() => { loadLb() }, [loadLb])
  // the same inputs give the same answer, so a repeat visit shows it at once (and for a day, skips the lookups)
  const sig = [movies.length, watchlist.length, me, Object.values(lb).reduce((t, h) => t + h.length, 0)].join("|")
  const [recs, setRecs] = useState<Rec[] | null>(() => readRecs(sig))
  const sorted = [...suggestions].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0))

  useEffect(() => {
    if (!hasTmdb() || !movies.length) return
    const saved = readRecs(sig)
    if (saved) { setRecs(saved); return }
    let dead = false
    ;(async () => {
      const played = new Set(movies.map(m => key(m.title, m.year)))
      // the pool is what the club has on its watchlists, minus films already played and films two or more of you have seen
      const pool = new Map<string, { title: string; year: number; wantedBy: string[] }>()
      for (const w of watchlist) {
        const k = key(w.title, w.year)
        if (played.has(k)) continue
        const e = pool.get(k) ?? { title: w.title, year: w.year, wantedBy: [] }
        if (!e.wantedBy.includes(w.member)) e.wantedBy.push(w.member)
        pool.set(k, e)
      }
      const cands = [...pool.values()].filter(c => seenBy(lb, c.title, c.year).length < 2)
      // seeds: your own Letterboxd favorites first (films the club hasn't watched), then the club's highest-rated films
      const mine = me ? [...chosenFavorites(favs[me], lb, me), ...favoritesOf(lb, me, 5)].filter(f => !played.has(key(f.title, f.year))) : []
      const seeds: { id: number; title: string }[] = []
      for (const [f, hit] of await Promise.all(mine.map(async f => [f, await searchFilm(f.title, f.year)] as const))) if (hit?.id) seeds.push({ id: hit.id, title: f.title })
      seeds.push(...[...movies].filter(m => m.tmdb_id && (groupAvg(m) ?? 0) >= 3.5).sort((a, b) => (groupAvg(b) ?? 0) - (groupAvg(a) ?? 0)).slice(0, 10).map(m => ({ id: m.tmdb_id!, title: m.title })))
      // a watchlist film is "because you liked X" when TMDB recommends it alongside X
      const because = new Map<string, string>()
      const recSets = await Promise.all(seeds.map(async seed => [seed, await tmdb<{ results?: any[] }>(`/movie/${seed.id}/recommendations`)] as const))
      for (const [seed, r] of recSets) {
        for (const x of r?.results || []) {
          const c = cands.find(c => key(c.title, c.year) === key(x.title, +(x.release_date || "").slice(0, 4)))
          if (c && !because.has(key(c.title, c.year))) because.set(key(c.title, c.year), seed.title)
        }
      }
      const ranked = cands.sort((a, b) => Number(because.has(key(b.title, b.year))) - Number(because.has(key(a.title, a.year))) || b.wantedBy.length - a.wantedBy.length || a.title.localeCompare(b.title)).slice(0, 36)
      const out: Rec[] = (await Promise.all(ranked.map(async c => {
        const x = await searchFilm(c.title, c.year)
        return x ? { id: x.id as number, title: c.title, year: c.year, because: because.get(key(c.title, c.year)) ?? "", wantedBy: c.wantedBy, poster: x.poster_path as string | null, overview: (x.overview as string) || "", score: x.vote_average as number } : null
      }))).filter((r): r is Rec => !!r)
      if (!dead) { setRecs(out); writeRecs(sig, out) }
    })()
    return () => { dead = true }
  }, [sig]) // eslint-disable-line react-hooks/exhaustive-deps

  // everyone sees the watchlist films they haven't marked seen or not interested
  const myFlag = (id: number) => flags.find(f => f.member === me && f.tmdb_id === id)?.kind
  const onLb = (r: Rec) => !!(me && findEntry(lb[me], r.title, r.year)) // already watched on Letterboxd
  const [prefs] = usePickPrefs()
  const [mine] = useMyServices()
  const facts = useFacts((recs ?? []).map(r => ({ title: r.title, year: r.year })))
  const visible = (recs ?? []).filter(r => !myFlag(r.id) && !onLb(r) && passesFilters(facts[key(r.title, r.year)], prefs, mine))
  const hidden = (recs ?? []).filter(r => myFlag(r.id) || onLb(r))
  const [title, setTitle] = useState("")
  const [year, setYear] = useState("")
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await suggest(title.trim(), +year || null)
    setTitle(""); setYear("")
  }

  return (
    <div className="stagger flex flex-col gap-6">
      <ImportNudge />
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <FilmSearch name="title" aria-label="Film to suggest" placeholder="Start typing a film to suggest" required value={title} onChange={setTitle} onPick={h => { setTitle(h.title); setYear(h.year ? String(h.year) : "") }} />
        <Input name="year" type="number" aria-label="Year" placeholder="Year" value={year} onChange={e => setYear(e.target.value)} className="h-10 w-24" />
        <Button type="submit" className="h-10 px-4">Suggest</Button>
      </form>
      <Collapse id="sug-club" title="Suggested by the club">
        {sorted.length ? (
          <ul className="grid grid-cols-2 gap-3">
            {sorted.map(s => <li key={s.id}><SuggestionCard s={s} /></li>)}
          </ul>
        ) : (
          <p className="text-muted-foreground">No suggestions yet. The projector is warmed up: add a film above and everyone can vote on it.</p>
        )}
      </Collapse>
      <Collapse id="sug-watchlists" title="From your watchlists">
        <p className="mb-3 text-sm text-muted-foreground">Films on the club's watchlists that none of you have played and that fewer than two of you have seen. The ones that fit what you and the club loved come first.</p>
        <PickControls />
        {!hasTmdb() ? (
          <p className="text-muted-foreground">Add a TMDB key to config.js to get recommendations here.</p>
        ) : recs === null ? (
          <CardSkeletons />
        ) : (
          <ul className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 md:grid-cols-4">
            {visible.map(r => {
              const seenByNames = [...new Set([...flags.filter(f => f.tmdb_id === r.id && f.kind === "seen").map(f => f.member), ...seenBy(lb, r.title, r.year)])].filter(n => n !== me)
              const done = suggestions.some(x => key(x.title, x.year) === key(r.title, r.year))
              return (
                <li key={r.id}>
                  <Card className="h-full gap-2 px-3">
                    <a href={movieHref(r.title, r.year)} aria-label={`About ${r.title}`}>{r.poster ? <img src={`${IMG}w154${r.poster}`} alt="" loading="lazy" className="aspect-[2/3] w-full rounded-md object-cover" /> : <span className="block aspect-[2/3] w-full rounded-md bg-muted" />}</a>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <h4 className="font-display text-base leading-tight font-bold"><a href={movieHref(r.title, r.year)} className="hover:underline">{r.title}</a> <small className="font-sans text-xs font-medium text-muted-foreground">{r.year || ""}</small></h4>
                      <p className="text-xs text-muted-foreground">{r.score ? `TMDB ${+r.score.toFixed(1)}/10 · ` : ""}{r.because ? `because you liked ${r.because}` : `wanted by ${r.wantedBy.join(", ")}`}</p>
                      <FactsLine facts={facts[key(r.title, r.year)]} />
                      <p className="line-clamp-3 text-xs leading-snug">{r.overview || "No synopsis available."}</p>
                      {seenByNames.length > 0 && <p className="text-xs text-muted-foreground">Seen by {seenByNames.join(", ")}</p>}
                      <div className="mt-auto flex flex-col gap-1.5 pt-1">
                        <Button variant={done ? "ghost" : "outline"} disabled={done} className="h-10 w-full px-3" onClick={() => suggest(r.title, r.year)}>{done ? "Suggested" : "Suggest"}</Button>
                        <div className="flex flex-col gap-1.5 min-[440px]:flex-row">
                          <Button variant="ghost" className="h-10 w-full gap-1 px-2 text-xs min-[440px]:flex-1" onClick={() => setFlag(r.id, r.title, "seen")}><Eye aria-hidden />Seen it</Button>
                          <Button variant="ghost" className="h-10 w-full gap-1 px-2 text-xs min-[440px]:flex-1" onClick={() => setFlag(r.id, r.title, "skip")}><EyeOff aria-hidden />Not interested</Button>
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
      </Collapse>
    </div>
  )
}
