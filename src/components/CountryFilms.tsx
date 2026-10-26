import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { hasTmdb, IMG, tmdb } from "@/lib/api"
import { movieHref } from "@/lib/movieLink"

type Film = { id: number; title: string; year: number; poster: string | null; score: number; votes: number; overview: string }
const KINDS = [["known", "Best known", "vote_count.desc", 0], ["top", "Highest rated", "vote_average.desc", 300]] as const
const KEY = "country-films-v1"
const read = (): Record<string, { films: Film[]; t: number }> => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") } catch { return {} } }

/** A country's best known and highest rated films from TMDB (made there, per its origin-country tag), remembered on this device for a month. */
async function countryFilms(code: string, sort: string, minVotes: number): Promise<Film[]> {
  const k = `${code}|${sort}`, hit = read()[k]
  if (hit && Date.now() - hit.t < 30 * 864e5) return hit.films
  // small film nations have few well-voted films, so relax the vote floor until there are enough to list
  for (const floor of minVotes ? [minVotes, 100, 25] : [0]) {
    const r = await tmdb<{ results?: any[] }>("/discover/movie", `&with_origin_country=${code}&sort_by=${sort}&vote_count.gte=${floor}&include_adult=false`)
    if (!r) return []
    const films = (r.results ?? []).slice(0, 6).map(x => ({ id: x.id, title: x.title, year: +(x.release_date ?? "").slice(0, 4) || 0, poster: x.poster_path, score: x.vote_average, votes: x.vote_count, overview: String(x.overview ?? "") }))
    if (films.length >= 5 || floor === (minVotes ? 25 : 0)) {
      try { localStorage.setItem(KEY, JSON.stringify({ ...read(), [k]: { films, t: Date.now() } })) } catch { /* full: looked up again next time */ }
      return films
    }
  }
  return []
}

/** The best known and highest rated films from one country, with a tick on the ones `seen` says the person has watched. */
export function CountryFilms({ code, name, seen }: { code: string; name: string; seen?: (title: string, year: number) => boolean }) {
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>("known")
  const [films, setFilms] = useState<Film[] | null>(null)
  useEffect(() => {
    const [, , sort, min] = KINDS.find(k => k[0] === kind)!
    let dead = false
    setFilms(null)
    countryFilms(code, sort, min).then(f => { if (!dead) setFilms(f) })
    return () => { dead = true }
  }, [code, kind])
  if (!hasTmdb()) return null
  return (
    <div className="mt-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-display text-lg font-bold">Films from {name}</h4>
        <div role="radiogroup" aria-label="Which films" className="flex gap-1 rounded-full bg-muted p-1">
          {KINDS.map(([id, label]) => <button key={id} type="button" role="radio" aria-checked={kind === id} onClick={() => setKind(id)} className={`min-h-9 rounded-full px-3 text-sm ${kind === id ? "bg-foreground font-medium text-background" : "text-muted-foreground"}`}>{label}</button>)}
        </div>
      </div>
      {films === null ? <p className="text-sm text-muted-foreground">Loading…</p> : films.length === 0 ? <p className="text-sm text-muted-foreground">TMDB has no well-known films tagged to {name}.</p> : (
        <ul className="flex flex-col gap-3">
          {films.map(f => (
            <li key={f.id} className="flex items-start gap-3">
              <a href={movieHref(f.title, f.year)} aria-label={`About ${f.title}`} className="shrink-0">{f.poster ? <img src={`${IMG}w92${f.poster}`} alt="" loading="lazy" className="aspect-[2/3] w-11 rounded object-cover" /> : <span className="block aspect-[2/3] w-11 rounded bg-muted" />}</a>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium"><a href={movieHref(f.title, f.year)} className="hover:underline">{f.title}</a>{f.year ? <span className="font-normal text-muted-foreground"> {f.year}</span> : null}{seen?.(f.title, f.year) && <Check aria-label="seen" className="ml-1.5 inline size-4 text-pos" />}</p>
                <p className="text-xs text-muted-foreground">TMDB {f.score.toFixed(1)} · {f.votes.toLocaleString()} votes</p>
                {f.overview && <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">{f.overview}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
