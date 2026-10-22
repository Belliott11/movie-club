import { useEffect, useMemo, useState } from "react"
import { Shuffle, X } from "lucide-react"
import { curatedQuestions } from "@/data/filmQuestions"
import { filmDetail, hasTmdb, searchFilm, tmdb } from "@/lib/api"
import { clubQuestions, questionsFor, type Film } from "@/lib/discussion"
import { useStore } from "@/lib/store"
import type { Movie } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const KW = "film-keywords-v1"
const readKw = (): Record<string, string[]> => { try { return JSON.parse(localStorage.getItem(KW) ?? "{}") } catch { return {} } }

/** What a film is about, from TMDB: its keywords, genres and synopsis. Keywords are remembered on this device. */
async function filmInfo(m: Movie): Promise<Film | null> {
  const id = m.tmdb_id ?? (await searchFilm(m.title, m.year))?.id
  if (!id) return null
  const cached = readKw()[id]
  const [kw, d] = await Promise.all([
    cached ? Promise.resolve(cached) : tmdb<{ keywords?: { name: string }[] }>(`/movie/${id}/keywords`).then(r => {
      const k = (r?.keywords ?? []).map(x => x.name)
      if (k.length) try { localStorage.setItem(KW, JSON.stringify({ ...readKw(), [id]: k })) } catch { /* fine */ }
      return k
    }),
    filmDetail(id),
  ])
  return { keywords: kw, genres: (d?.genres ?? []).map((g: any) => g.name as string), overview: d?.overview ?? "" }
}

/**
 * Questions for the talk after a screening. Films with questions written for them show those first (spoilers, so it opens closed);
 * anyone can add their own, which everyone sees; and questions built from the film's themes are there when you want more.
 */
export function DiscussionQuestions({ movie }: { movie: Movie }) {
  const { questions, setQuestions, loadSeal } = useStore()
  useEffect(() => { loadSeal() }, [loadSeal])
  const written = curatedQuestions(movie.title, movie.year)
  const added = questions[String(movie.id)] ?? []
  const [open, setOpen] = useState(false)
  const [more, setMore] = useState(false) // show the theme questions as well
  const wantThemes = open && hasTmdb() && (more || !written)
  const [info, setInfo] = useState<Film | null | undefined>(undefined)
  const [shuffle, setShuffle] = useState(0)
  const [draft, setDraft] = useState("")
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!wantThemes || info !== undefined) return
    let dead = false
    filmInfo(movie).then(f => { if (!dead) setInfo(f) })
    return () => { dead = true }
  }, [wantThemes, movie.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const club = useMemo(() => clubQuestions(movie), [movie])
  const set = useMemo(() => (info ? questionsFor(info, club, shuffle) : null), [info, club, shuffle])

  const all = [...(written ?? []), ...added, ...(wantThemes && set ? set.questions.map(q => q.text) : [])]
  const copy = async () => {
    const txt = `${movie.title}: questions for tonight\n${all.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
    try { await navigator.clipboard.writeText(txt); setCopied(true) } catch { prompt("Copy this:", txt) }
  }
  const add = () => { if (draft.trim()) { setQuestions(movie, [...added, draft]); setDraft("") } }
  const list = "flex list-decimal flex-col gap-2.5 pl-5 leading-snug marker:text-muted-foreground"

  return (
    <details open={open} onToggle={e => setOpen(e.currentTarget.open)} className="rounded-xl bg-card ring-1 ring-foreground/10">
      <summary className="flex min-h-11 cursor-pointer items-center px-4 py-2 font-display text-lg font-bold">Discussion questions</summary>
      <div className="flex flex-col gap-4 px-4 pb-4">
        {written ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Written for {movie.title}. Spoilers: they assume you've seen it.</p>
            <ol className={list}>{written.map(q => <li key={q}>{q}</li>)}</ol>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nobody has written questions for this film yet. The ones below come from its themes; add your own at the bottom, and everyone will see them.</p>
        )}

        {added.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Added by the club</p>
            <ul className="flex flex-col gap-1.5">
              {added.map((q, i) => (
                <li key={q + i} className="flex items-start gap-2 leading-snug">
                  <span className="min-w-0 flex-1">{q}</span>
                  <button type="button" aria-label={`Remove: ${q}`} onClick={() => setQuestions(movie, added.filter((_, j) => j !== i))} className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {written && !more && hasTmdb() && <Button variant="outline" className="h-11 w-fit px-4" onClick={() => setMore(true)}>More questions about its themes</Button>}
        {wantThemes && (info === undefined ? <p className="text-sm text-muted-foreground" role="status">Reading up on {movie.title}…</p>
          : set ? (
            <div className="flex flex-col gap-2">
              {set.themes.length > 0 && <p className="text-sm text-muted-foreground">Themes it touches: {set.themes.map(t => t.label).join(", ")}.</p>}
              <ol className={list}>{set.questions.map((q, i) => <li key={i + q.text}>{q.text}<span className="ml-1.5 text-xs text-muted-foreground">{q.about}</span></li>)}</ol>
              <Button variant="outline" className="h-11 w-fit gap-1.5 px-4" onClick={() => { setShuffle(s => s + 1); setCopied(false) }}><Shuffle className="size-4" aria-hidden />Another set</Button>
            </div>
          ) : <p className="text-sm text-muted-foreground">Couldn't find this film on TMDB, so there's nothing to base theme questions on.</p>)}

        <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); add() }}>
          <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Add a question of your own" aria-label={`Add a question about ${movie.title}`} className="h-11 min-w-48 flex-1" />
          <Button type="submit" variant="outline" className="h-11 px-4" disabled={!draft.trim()}>Add</Button>
        </form>
        <Button variant="ghost" className="h-11 w-fit px-4" onClick={copy} disabled={!all.length}>{copied ? "Copied" : "Copy for the group chat"}</Button>
      </div>
    </details>
  )
}
