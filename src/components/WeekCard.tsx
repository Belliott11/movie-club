import { useEffect, useState } from "react"
import { filmDetail, hasTmdb, IMG, searchFilm, whereToWatch } from "@/lib/api"
import { fmt, groupAvg, key } from "@/lib/stats"
import { useStore } from "@/lib/store"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DiscussionQuestions } from "./DiscussionQuestions"
import { SealedPanel } from "./SealedPanel"
import { StarRating } from "./StarRating"

/** The newest film, with one-tap rating for whoever is signed in and a "waiting on" line for everyone else. */
export function WeekCard() {
  const { movies, mini, me, attending, setRating, seal } = useStore()
  const m = [...movies].sort((a, b) => b.seq - a.seq)[0]
  const [d, setD] = useState<any>(null)
  const [where, setWhere] = useState<{ names: string[]; link: string | null } | null>(null)

  // synopsis, director, trailer and where to watch (US) from TMDB
  useEffect(() => {
    if (!m || !hasTmdb()) return
    let dead = false
    ;(async () => {
      const id = m.tmdb_id || (await searchFilm(m.title, m.year))?.id
      if (!id) return
      const [detail, prov] = await Promise.all([filmDetail(id), whereToWatch(id)])
      if (dead) return
      setD(detail); setWhere(prov)
    })()
    return () => { dead = true }
  }, [m?.id, m?.tmdb_id])
  if (!m) return null

  // who we expect to rate: tonight's switches if set, else whoever rated the previous film
  const prev = [...movies].filter(x => x !== m && Object.keys(x.ratings).length).sort((a, b) => b.seq - a.seq)[0]
  const expected = attending.length ? attending : prev ? Object.keys(prev.ratings) : []
  const waiting = expected.filter(n => m.ratings[n] == null)
  const info = mini[key(m.title, m.year)]
  const g = groupAvg(m)
  const mine = me ? m.ratings[me] ?? null : null
  const director = ((d?.credits?.crew || []) as any[]).filter(c => c.job === "Director").map(c => c.name).join(", ")
  const trailer = ((d?.videos?.results || []) as any[]).find(v => v.site === "YouTube" && v.type === "Trailer")
  const streaming = where?.names ?? []

  return (
    <Card className={`${seal.openMovie === String(m.id) ? "" : "stub "}rise gap-3 px-4`} style={{ "--cut": "calc(100% - 4.5rem)" } as React.CSSProperties}>
      <div className="flex gap-4">
        {info?.p ? <img src={`${IMG}w154${info.p}`} alt="" className="aspect-[2/3] w-20 shrink-0 self-start rounded-md object-cover" /> : <span className="aspect-[2/3] w-20 shrink-0 self-start rounded-md bg-muted" />}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm font-medium text-muted-foreground">This week's film</p>
          <h2 className="font-display text-2xl leading-tight font-extrabold tracking-tight">
            <a href={`#/films/${encodeURIComponent(String(m.id))}`} className="hover:underline">{m.title}</a> <small className="font-sans text-sm font-medium text-muted-foreground">{m.year}</small>
          </h2>
          <p className="text-sm text-muted-foreground">{m.pick}'s pick · {g == null ? "no ratings yet" : <>{Object.keys(m.ratings).length} {Object.keys(m.ratings).length === 1 ? "rating" : "ratings"}, average <b className="text-foreground">{fmt(g)}</b></>}</p>
          {waiting.length > 0 && <p className="text-sm">Waiting on {waiting.join(", ")}</p>}
          {expected.length > 0 && waiting.length === 0 && <p className="text-sm text-pos">Everyone has rated it</p>}
        </div>
      </div>
      {d && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {[d.runtime && `${d.runtime} min`, (d.genres || []).map((g: any) => g.name).join(", "), director && `Directed by ${director}`].filter(Boolean).join(" · ")}
          </p>
          {d.overview && <p className="line-clamp-4 max-w-[62ch] text-sm leading-relaxed">{d.overview}</p>}
          {streaming.length > 0 && <p className="text-sm"><span className="text-muted-foreground">Where to watch:</span> {streaming.slice(0, 6).join(", ")}{streaming.length > 6 && <span className="text-muted-foreground"> +{streaming.length - 6} more</span>}</p>}
          <div className="flex flex-wrap gap-2">
            {trailer && <a className={buttonVariants({ variant: "outline", className: "h-10 px-4" })} href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noopener">Watch trailer</a>}
            {where?.link && <a className={buttonVariants({ variant: "outline", className: "h-10 px-4" })} href={where.link} target="_blank" rel="noopener">All watch options</a>}
            <a className={buttonVariants({ variant: "ghost", className: "h-10 px-4" })} href={`#/films/${encodeURIComponent(String(m.id))}`}>Cast &amp; crew</a>
          </div>
        </div>
      )}
      <SealedPanel m={m} />
      <DiscussionQuestions movie={m} />
      {/* while scores are being sealed for this film, the open rating row would give them away */}
      {seal.openMovie === String(m.id) ? null : me ? (
        <div className="-mx-4 flex min-h-14 flex-wrap items-center gap-x-3 border-t-2 border-dashed border-border px-4 pt-3">
          <span className="text-sm text-muted-foreground">Your rating</span>
          <StarRating label={`Your rating for ${m.title}`} value={mine} onChange={v => setRating(m, me, v)} />
          <span className="font-display text-xl font-bold" aria-live="polite">{mine == null ? "" : mine}</span>
        </div>
      ) : (
        <p className="-mx-4 min-h-14 border-t-2 border-dashed border-border px-4 pt-3 text-sm text-muted-foreground">Pick your name at the top to rate this film.</p>
      )}
    </Card>
  )
}
