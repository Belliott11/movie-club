import { IMG } from "@/lib/api"
import { fmt, groupAvg, key } from "@/lib/stats"
import { useStore } from "@/lib/store"
import { Card } from "@/components/ui/card"
import { StarRating } from "./StarRating"

/** The newest film, with one-tap rating for whoever is signed in and a "waiting on" line for everyone else. */
export function WeekCard() {
  const { movies, mini, me, attending, setRating } = useStore()
  const m = [...movies].sort((a, b) => b.seq - a.seq)[0]
  if (!m) return null

  // who we expect to rate: tonight's switches if set, else whoever rated the previous film
  const prev = [...movies].filter(x => x !== m && Object.keys(x.ratings).length).sort((a, b) => b.seq - a.seq)[0]
  const expected = attending.length ? attending : prev ? Object.keys(prev.ratings) : []
  const waiting = expected.filter(n => m.ratings[n] == null)
  const info = mini[key(m.title, m.year)]
  const g = groupAvg(m)
  const mine = me ? m.ratings[me] ?? null : null

  return (
    <Card className="rise gap-3 px-4">
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
      {me ? (
        <div className="flex flex-wrap items-center gap-x-3">
          <span className="text-sm text-muted-foreground">Your rating</span>
          <StarRating label={`Your rating for ${m.title}`} value={mine} onChange={v => setRating(m, me, v)} />
          <span className="font-display text-xl font-bold" aria-live="polite">{mine == null ? "" : mine}</span>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Pick your name at the top to rate this film.</p>
      )}
    </Card>
  )
}
