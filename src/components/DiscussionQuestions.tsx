import { useEffect, useMemo, useState } from "react"
import { Shuffle } from "lucide-react"
import { filmDetail, hasTmdb, searchFilm, tmdb } from "@/lib/api"
import { clubQuestions, questionsFor, type Film } from "@/lib/discussion"
import type { Movie } from "@/lib/types"
import { Button } from "@/components/ui/button"

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

/** Questions about a film's themes, for the talk after the screening. Opens on demand and looks the film up only then. */
export function DiscussionQuestions({ movie, defaultOpen = false }: { movie: Movie; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [info, setInfo] = useState<Film | null | undefined>(undefined)
  const [shuffle, setShuffle] = useState(0)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!open || info !== undefined || !hasTmdb()) return
    let dead = false
    filmInfo(movie).then(f => { if (!dead) setInfo(f) })
    return () => { dead = true }
  }, [open, movie.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const club = useMemo(() => clubQuestions(movie), [movie])
  const set = useMemo(() => (info ? questionsFor(info, club, shuffle) : null), [info, club, shuffle])
  const copy = async () => {
    if (!set) return
    const txt = `${movie.title}: questions for tonight\n${set.questions.map((q, i) => `${i + 1}. ${q.text}`).join("\n")}`
    try { await navigator.clipboard.writeText(txt); setCopied(true) } catch { prompt("Copy this:", txt) }
  }
  return (
    <details open={open} onToggle={e => setOpen(e.currentTarget.open)} className="rounded-xl bg-card ring-1 ring-foreground/10">
      <summary className="flex min-h-11 cursor-pointer items-center px-4 py-2 font-display text-lg font-bold">Discussion questions</summary>
      <div className="flex flex-col gap-3 px-4 pb-4">
        {!hasTmdb() ? <p className="text-sm text-muted-foreground">Add a TMDB key to config.js to get questions here.</p>
          : info === undefined ? <p className="text-sm text-muted-foreground" role="status">Reading up on {movie.title}…</p>
          : set ? (
            <>
              {set.themes.length > 0 && <p className="text-sm text-muted-foreground">Themes it touches: {set.themes.map(t => t.label).join(", ")}.</p>}
              <ol className="flex list-decimal flex-col gap-2.5 pl-5 leading-snug marker:text-muted-foreground">
                {set.questions.map((q, i) => <li key={i + q.text}>{q.text}<span className="ml-1.5 text-xs text-muted-foreground">{q.about}</span></li>)}
              </ol>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="h-11 gap-1.5 px-4" onClick={() => { setShuffle(s => s + 1); setCopied(false) }}><Shuffle className="size-4" aria-hidden />Another set</Button>
                <Button variant="ghost" className="h-11 px-4" onClick={copy}>{copied ? "Copied" : "Copy for the group chat"}</Button>
              </div>
            </>
          ) : <p className="text-sm text-muted-foreground">Couldn't find this film on TMDB, so there's nothing to base questions on.</p>}
      </div>
    </details>
  )
}
