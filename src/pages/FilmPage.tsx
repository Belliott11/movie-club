import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { filmDetail, hasTmdb, IMG, searchFilm } from "@/lib/api"
import { fmt, groupAvg, outsideAvg } from "@/lib/stats"
import { useStore } from "@/lib/store"
import { Button, buttonVariants } from "@/components/ui/button"

export default function FilmPage({ id }: { id: string }) {
  const { movies, patchMovie } = useStore()
  const m = movies.find(x => String(x.id) === id)
  const [d, setD] = useState<any | undefined>(undefined) // undefined = loading, null = no match
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!m || !hasTmdb()) return
    let dead = false
    ;(async () => {
      let tid = m.tmdb_id
      if (!tid) {
        tid = (await searchFilm(m.title, m.year))?.id
        if (tid) patchMovie(m, { tmdb_id: tid })
      }
      const detail = tid ? await filmDetail(tid) : null
      if (!dead) setD(detail)
    })()
    return () => { dead = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.id])

  const back = (
    <a href="#/films" className={buttonVariants({ variant: "ghost", className: "-ml-2 h-10 w-fit gap-1 px-2" })}>
      <ArrowLeft /> All films
    </a>
  )
  if (!m) return <>{back}<p className="mt-3 text-muted-foreground">That film isn't in the club's list.</p></>

  const crew = (jobs: string[]) => [...new Set(((d?.credits?.crew || []) as any[]).filter(c => jobs.includes(c.job)).map(c => c.name as string))]
  const rows = [["Director", crew(["Director"])], ["Writing", crew(["Screenplay", "Writer", "Story"])], ["Cinematography", crew(["Director of Photography"])], ["Music", crew(["Original Music Composer", "Music"])]].filter(r => r[1].length)
  const trailer = ((d?.videos?.results || []) as any[]).find(v => v.site === "YouTube" && v.type === "Trailer")
  const cast = ((d?.credits?.cast || []) as any[]).slice(0, 14)
  const o = outsideAvg(m)

  const share = async () => {
    const txt = `${m.title} (${m.year}): we gave it ${fmt(groupAvg(m))}/5${o != null ? `, everyone else ${fmt(o)}/5` : ""}. ${m.pick}'s pick. ${location.href}`
    try { await navigator.clipboard.writeText(txt); setCopied(true) } catch { prompt("Copy this:", txt) }
  }

  return (
    <div className="rise flex flex-col gap-5">
      {back}
      <div className="grid gap-6 sm:grid-cols-[minmax(150px,230px)_1fr]">
        {d?.poster_path && <img src={`${IMG}w500${d.poster_path}`} alt={`Poster for ${m.title}`} className="w-full max-w-56 rounded-xl bg-card sm:max-w-none" />}
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-4xl leading-none font-extrabold tracking-tight">
            {m.title} <small className="font-sans text-base font-medium text-muted-foreground">{m.year}</small>
          </h2>
          {d && <p className="text-muted-foreground">{[d.runtime && `${d.runtime} min`, (d.genres || []).map((g: any) => g.name).join(", "), d.vote_average ? `TMDB ${fmt(d.vote_average, 1)}/10` : ""].filter(Boolean).join(" · ")}</p>}
          {d?.tagline && <p className="font-display text-lg font-medium">{d.tagline}</p>}
          {d === undefined && hasTmdb() && <p className="text-muted-foreground">Loading details…</p>}
          {d === null && <p className="text-muted-foreground">No match found on TMDB.</p>}
          {d && <p className="max-w-[62ch] leading-relaxed">{d.overview || "No synopsis available."}</p>}
          {rows.length > 0 && (
            <dl className="flex flex-col">
              {rows.map(([l, v]) => (
                <div key={l as string} className="grid grid-cols-[8.5rem_1fr] gap-2 py-1">
                  <dt className="text-sm text-muted-foreground">{l}</dt>
                  <dd>{(v as string[]).join(", ")}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-10 px-4" onClick={share}>{copied ? "Copied" : "Copy for group chat"}</Button>
            {trailer && <a className={buttonVariants({ className: "h-10 px-4" })} href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noopener">Watch trailer</a>}
          </div>
        </div>
      </div>
      <section>
        <h3 className="mb-1 text-xl font-bold">Our ratings</h3>
        <p className="font-display text-3xl font-extrabold">{fmt(groupAvg(m))} <small className="font-sans text-sm font-normal text-muted-foreground">average from {Object.keys(m.ratings).length} people · {m.pick}'s pick</small></p>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          {Object.entries(m.ratings).sort((a, b) => b[1] - a[1]).map(([n, v]) => <li key={n}>{n} <b>{v}</b></li>)}
        </ul>
      </section>
      {cast.length > 0 && (
        <section>
          <h3 className="mb-2 text-xl font-bold">Cast</h3>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3.5">
            {cast.map(c => (
              <li key={c.id} className="flex flex-col gap-0.5">
                {c.profile_path ? <img src={`${IMG}w185${c.profile_path}`} alt="" loading="lazy" className="aspect-[2/3] w-full rounded-lg object-cover" /> : <span className="aspect-[2/3] w-full rounded-lg bg-card" />}
                <b className="text-sm leading-tight font-semibold">{c.name}</b>
                <small className="leading-tight text-muted-foreground">{c.character}</small>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
