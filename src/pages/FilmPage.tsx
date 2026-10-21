import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { filmDetail, hasTmdb, IMG, searchFilm, whereToWatch } from "@/lib/api"
import { Lightbox } from "@/components/Lightbox"
import { useFilmImages } from "@/lib/useStills"
import { findEntry } from "@/lib/letterboxd"
import { key } from "@/lib/stats"
import { fmt, groupAvg, outsideAvg, recapLines } from "@/lib/stats"
import { useStore } from "@/lib/store"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function FilmPage({ id }: { id: string }) {
  const { movies, patchMovie, takes, setTake, me, lb, loadLb, setRating, mini, setPoster } = useStore()
  const [view, setView] = useState<{ kind: "still" | "poster"; i: number } | null>(null)
  useEffect(() => { loadLb() }, [loadLb])
  const [where, setWhere] = useState<{ names: string[]; link: string | null } | null>(null)
  const [recapCopied, setRecapCopied] = useState(false)
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
      const w = tid ? await whereToWatch(tid) : null
      if (!dead) { setD(detail); setWhere(w) }
    })()
    return () => { dead = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.id])

  const imgs = useFilmImages(m?.tmdb_id ?? d?.id)
  const myPoster = m ? mini[key(m.title, m.year)]?.p : null

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
        {(myPoster || d?.poster_path) && <img src={`${IMG}w500${myPoster || d.poster_path}`} alt={`Poster for ${m.title}`} className="w-full max-w-56 rounded-xl bg-card sm:max-w-none" />}
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
          {where && where.names.length > 0 && (
            <p className="max-w-[62ch]"><span className="text-sm text-muted-foreground">Where to watch (US): </span>{where.names.slice(0, 8).join(", ")}{where.names.length > 8 && <span className="text-muted-foreground"> +{where.names.length - 8} more</span>}{where.link && <> · <a className="underline" href={where.link} target="_blank" rel="noopener">all options</a></>}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-10 px-4" onClick={share}>{copied ? "Copied" : "Copy for group chat"}</Button>
            {trailer && <a className={buttonVariants({ className: "h-10 px-4" })} href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noopener">Watch trailer</a>}
          </div>
        </div>
      </div>
      {imgs && (imgs.backdrops.length > 0 || imgs.posters.length > 1) && (
        <section className="flex flex-col gap-5">
          {imgs.backdrops.length > 0 && (
            <div>
              <h3 className="mb-2 text-xl font-bold">Stills</h3>
              <ul data-no-swipe className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
                {imgs.backdrops.map((b, i) => (
                  <li key={b} className="shrink-0">
                    <button type="button" onClick={() => setView({ kind: "still", i })} className="block overflow-hidden rounded-lg ring-1 ring-foreground/10 focus-visible:ring-2" aria-label={`Open still ${i + 1} of ${imgs.backdrops.length}`}>
                      <img src={`${IMG}w300${b}`} alt="" loading="lazy" className="aspect-video h-24 object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {imgs.posters.length > 1 && (
            <div>
              <h3 className="mb-2 text-xl font-bold">Posters</h3>
              <ul data-no-swipe className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
                {imgs.posters.map((pth, i) => (
                  <li key={pth} className="shrink-0">
                    <button type="button" onClick={() => setView({ kind: "poster", i })} className={`block overflow-hidden rounded-lg ring-1 focus-visible:ring-2 ${pth === myPoster ? "ring-2 ring-gold" : "ring-foreground/10"}`} aria-label={`Open poster ${i + 1} of ${imgs.posters.length}`}>
                      <img src={`${IMG}w185${pth}`} alt="" loading="lazy" className="aspect-[2/3] h-32 object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
      {view && imgs && (
        <Lightbox
          paths={view.kind === "still" ? imgs.backdrops : imgs.posters}
          start={view.i}
          kind={view.kind}
          label={m.title}
          onClose={() => setView(null)}
          extra={view.kind === "poster" ? (pth => (
            <div className="flex gap-2">
              <Button className="h-11 px-4" onClick={() => { setPoster(m, pth); setView(null) }}>Use this poster</Button>
              {myPoster && <Button variant="outline" className="h-11 px-4" onClick={() => { setPoster(m, null); setView(null) }}>Back to the default</Button>}
            </div>
          )) : undefined}
        />
      )}
      <section>
        <h3 className="mb-2 text-xl font-bold">Recap</h3>
        <Card className="gap-2 px-4">
          {recapLines(m, movies).map(l => <p key={l}>{l}</p>)}
          <Button variant="outline" className="h-10 w-fit px-4" onClick={async () => {
            const txt = `${m.title} (${m.year})
${recapLines(m, movies).join(" ")}`
            try { await navigator.clipboard.writeText(txt); setRecapCopied(true) } catch { prompt("Copy this:", txt) }
          }}>{recapCopied ? "Copied" : "Copy recap"}</Button>
        </Card>
      </section>
      <section>
        <h3 className="mb-1 text-xl font-bold">Our ratings</h3>
        {me && m.ratings[me] == null && findEntry(lb[me], m.title, m.year)?.[2] != null && (
          <p className="mb-2 flex flex-wrap items-center gap-2 text-sm">
            You rated this {findEntry(lb[me], m.title, m.year)![2]} on Letterboxd.
            <Button variant="outline" className="h-10 px-3" onClick={() => setRating(m, me, findEntry(lb[me], m.title, m.year)![2])}>Use that rating</Button>
          </p>
        )}
        <p className="font-display text-3xl font-extrabold">{fmt(groupAvg(m))} <small className="font-sans text-sm font-normal text-muted-foreground">average from {Object.keys(m.ratings).length} people · {m.pick}'s pick</small></p>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          {Object.entries(m.ratings).sort((a, b) => b[1] - a[1]).map(([n, v]) => <li key={n}>{n} <b>{v}</b></li>)}
        </ul>
      </section>
      <section>
        <h3 className="mb-2 text-xl font-bold">Takes</h3>
        <ul className="flex flex-col gap-2">
          {Object.entries(takes).filter(([k]) => k.startsWith(`${m.id}|`)).map(([k, text]) => {
            const n = k.slice(String(m.id).length + 1)
            return <li key={n} className="max-w-[62ch]"><b>{n}</b> <span className="text-muted-foreground">{m.ratings[n] != null ? m.ratings[n] : ""}</span><br />{text}</li>
          })}
        </ul>
        {!Object.keys(takes).some(k => k.startsWith(`${m.id}|`)) && <p className="text-muted-foreground">No takes yet. Somebody has to be the first critic in the room.</p>}
        {me ? (
          <form className="mt-3 flex max-w-xl gap-2" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); setTake(m, me, String(f.get("take") || "")) }}>
            <Input key={`${m.id}|${me}|${takes[`${m.id}|${me}`] ?? ""}`} name="take" maxLength={200} defaultValue={takes[`${m.id}|${me}`] ?? ""} placeholder={`Your take on ${m.title}, in one line`} aria-label="Your take" className="h-10 flex-1" />
            <Button type="submit" variant="outline" className="h-10 px-4">Save</Button>
          </form>
        ) : <p className="mt-2 text-sm text-muted-foreground">Pick your name at the top to add a take.</p>}
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
