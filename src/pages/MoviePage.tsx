import { TextSkeleton } from "@/components/Skeleton"
import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { filmDetail, hasTmdb, IMG, searchFilm, whereToWatch } from "@/lib/api"
import { Button, buttonVariants } from "@/components/ui/button"
import { findEntry } from "@/lib/letterboxd"
import { fmt, key } from "@/lib/stats"
import { useStore } from "@/lib/store"

/**
 * Info for any film, found by title and year: synopsis, cast and crew, trailer, where to watch, and what the club knows about it
 * (who has seen it on Letterboxd, who has it on a watchlist). Films the club has played go on to their own page, with ratings.
 */
export default function MoviePage({ title, year }: { title: string; year: number }) {
  const { movies, lb, loadLb, watchlist, suggestions, suggest } = useStore()
  useEffect(() => { loadLb() }, [loadLb])
  const club = movies.find(m => key(m.title, m.year) === key(title, year) || (m.title.toLowerCase() === title.toLowerCase() && (!year || Math.abs(m.year - year) <= 1)))
  const [d, setD] = useState<any | undefined>(undefined) // undefined = loading, null = no match
  const [where, setWhere] = useState<{ names: string[]; link: string | null } | null>(null)

  useEffect(() => { if (club) location.replace(`#/films/${encodeURIComponent(String(club.id))}`) }, [club?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (club || !hasTmdb()) return
    let dead = false
    setD(undefined)
    ;(async () => {
      const hit = await searchFilm(title, year || null)
      const detail = hit?.id ? await filmDetail(hit.id) : null
      const w = hit?.id ? await whereToWatch(hit.id) : null
      if (!dead) { setD(detail?.id ? detail : null); setWhere(w) }
    })()
    return () => { dead = true }
  }, [title, year, club?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const back = (
    <button type="button" onClick={() => history.back()} className={buttonVariants({ variant: "ghost", className: "-ml-2 h-10 w-fit gap-1 px-2" })}><ArrowLeft /> Back</button>
  )
  if (club) return null
  const y = d?.release_date ? +String(d.release_date).slice(0, 4) : year
  const crew = (jobs: string[]) => [...new Set(((d?.credits?.crew || []) as any[]).filter(c => jobs.includes(c.job)).map(c => c.name as string))]
  const trailer = ((d?.videos?.results || []) as any[]).find(v => v.site === "YouTube" && v.type === "Trailer")
  const cast = ((d?.credits?.cast || []) as any[]).slice(0, 12)
  const seen = Object.keys(lb).filter(n => findEntry(lb[n], title, y || null)).map(n => ({ n, r: findEntry(lb[n], title, y || null)![2] }))
  const wanted = [...new Set(watchlist.filter(w => key(w.title, w.year) === key(title, y)).map(w => w.member))]
  const asked = suggestions.some(s => key(s.title, s.year) === key(title, y))
  const rows: [string, string[]][] = [["Director", crew(["Director"])], ["Writing", crew(["Screenplay", "Writer", "Story"])], ["Cinematography", crew(["Director of Photography"])], ["Music", crew(["Original Music Composer", "Music"])]]

  return (
    <div className="stagger flex flex-col gap-5">
      {back}
      <div className="grid gap-6 sm:grid-cols-[minmax(150px,230px)_1fr]">
        {d?.poster_path ? <img src={`${IMG}w500${d.poster_path}`} alt={`Poster for ${title}`} className="w-full max-w-56 rounded-xl bg-card sm:max-w-none" /> : <span className="aspect-[2/3] w-full max-w-56 rounded-xl bg-muted sm:max-w-none" />}
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-4xl leading-none font-extrabold tracking-tight">{title} <small className="font-sans text-base font-medium text-muted-foreground">{y || ""}</small></h2>
          {d && <p className="text-muted-foreground">{[d.runtime && `${d.runtime} min`, (d.genres || []).map((g: any) => g.name).join(", "), d.vote_average ? `TMDB ${fmt(d.vote_average, 1)}/10` : ""].filter(Boolean).join(" · ")}</p>}
          {d?.tagline && <p className="font-display text-lg font-medium">{d.tagline}</p>}
          {d === undefined && hasTmdb() && <TextSkeleton />}
          {d === null && <p className="text-muted-foreground">No match found on TMDB.</p>}
          {d && <p className="max-w-[62ch] leading-relaxed">{d.overview || "No synopsis available."}</p>}
          {rows.some(r => r[1].length) && (
            <dl className="flex flex-col">
              {rows.filter(r => r[1].length).map(([l, v]) => (
                <div key={l} className="grid grid-cols-[8.5rem_1fr] gap-2 py-1"><dt className="text-sm text-muted-foreground">{l}</dt><dd>{v.join(", ")}</dd></div>
              ))}
            </dl>
          )}
          {where && where.names.length > 0 && <p className="max-w-[62ch]"><span className="text-sm text-muted-foreground">Where to watch (US): </span>{where.names.slice(0, 8).join(", ")}{where.link && <> · <a className="underline" href={where.link} target="_blank" rel="noopener">all options</a></>}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant={asked ? "ghost" : "default"} disabled={asked} className="h-10 px-4" onClick={() => suggest(title, y || null)}>{asked ? "Suggested to the club" : "Suggest to the club"}</Button>
            {trailer && <a className={buttonVariants({ variant: "outline", className: "h-10 px-4" })} href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noopener">Trailer</a>}
          </div>
        </div>
      </div>

      {(seen.length > 0 || wanted.length > 0) && (
        <section className="flex flex-col gap-1">
          <h3 className="text-xl font-bold">In the club</h3>
          {seen.length > 0 && <p><span className="text-muted-foreground">Seen on Letterboxd by </span>{seen.map(s => `${s.n}${s.r != null ? ` (${s.r})` : ""}`).join(", ")}</p>}
          {wanted.length > 0 && <p><span className="text-muted-foreground">On the watchlist of </span>{wanted.join(", ")}</p>}
        </section>
      )}

      {cast.length > 0 && (
        <section>
          <h3 className="mb-2 text-xl font-bold">Cast</h3>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {cast.map((c: any) => (
              <li key={c.id} className="min-w-0">
                {c.profile_path ? <img src={`${IMG}w185${c.profile_path}`} alt="" loading="lazy" className="aspect-[2/3] w-full rounded-lg object-cover" /> : <span className="block aspect-[2/3] w-full rounded-lg bg-card" />}
                <p className="mt-1 truncate text-sm font-medium">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">{c.character}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
