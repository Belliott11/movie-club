import { ArrowLeft } from "lucide-react"
import { Histogram } from "@/components/Charts"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { avg, fmt, groupAvg, histogram, tasteOverlap, tilt } from "@/lib/stats"
import { useStore } from "@/lib/store"

export default function MemberPage({ name }: { name: string }) {
  const { movies, members } = useStore()
  const back = (
    <a href="#/stats" className={buttonVariants({ variant: "ghost", className: "-ml-2 h-10 w-fit gap-1 px-2" })}><ArrowLeft /> Stats</a>
  )
  const mine = movies.filter(m => m.ratings[name] != null)
  const picks = movies.filter(m => m.pick === name)
  if (!members.includes(name)) return <>{back}<p className="mt-3 text-muted-foreground">Nobody called {name} is in the club.</p></>

  const sorted = [...mine].sort((a, b) => b.ratings[name] - a.ratings[name] || a.title.localeCompare(b.title))
  const pickAvg = avg(picks.map(groupAvg).filter((x): x is number => x != null))
  const t = tilt(movies, name)
  const partners = tasteOverlap(movies, members).filter(o => o.a === name || o.b === name)
  const other = (o: { a: string; b: string }) => (o.a === name ? o.b : o.a)

  return (
    <div className="rise flex flex-col gap-5">
      {back}
      <h2 className="font-display text-4xl leading-none font-extrabold tracking-tight">{name}</h2>
      {mine.length === 0 ? (
        <p className="text-muted-foreground">{name} hasn't rated a film yet.</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Films rated", String(mine.length)],
              ["Average given", fmt(avg(mine.map(m => m.ratings[name])))],
              ["Their picks average", fmt(pickAvg)],
              ["Compared with others", t == null ? "–" : Math.abs(t) < 0.05 ? "About even" : `${fmt(Math.abs(t), 1)} ${t > 0 ? "higher" : "lower"}`],
            ].map(([l, v]) => (
              <Card key={l} className="gap-0.5 px-4"><dt className="text-xs text-muted-foreground">{l}</dt><dd className="font-display text-2xl font-bold">{v}</dd></Card>
            ))}
          </dl>
          <section>
            <h3 className="mb-2 text-xl font-bold">How {name} rates</h3>
            <Histogram bins={histogram(movies, name)} label={`${name}'s ratings by star step`} />
          </section>
          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-1 text-xl font-bold">Favorites</h3>
              <ol className="list-decimal pl-5">{sorted.slice(0, 3).map(m => <li key={m.id}><a className="underline" href={`#/films/${encodeURIComponent(String(m.id))}`}>{m.title}</a> <b>{m.ratings[name]}</b></li>)}</ol>
            </div>
            <div>
              <h3 className="mb-1 text-xl font-bold">Least favorite</h3>
              <ol className="list-decimal pl-5">{[...sorted].reverse().slice(0, 3).map(m => <li key={m.id}><a className="underline" href={`#/films/${encodeURIComponent(String(m.id))}`}>{m.title}</a> <b>{m.ratings[name]}</b></li>)}</ol>
            </div>
          </section>
        </>
      )}
      {picks.length > 0 && (
        <section>
          <h3 className="mb-1 text-xl font-bold">Their picks</h3>
          <ul>{picks.map(m => <li key={m.id}><a className="underline" href={`#/films/${encodeURIComponent(String(m.id))}`}>{m.title}</a> <small className="text-muted-foreground">{m.year}</small> · club average <b>{fmt(groupAvg(m))}</b></li>)}</ul>
        </section>
      )}
      {partners.length > 0 && (
        <section>
          <h3 className="mb-1 text-xl font-bold">Taste</h3>
          <p>Closest to <a className="underline" href={`#/people/${encodeURIComponent(other(partners[0]))}`}>{other(partners[0])}</a> ({fmt(partners[0].diff)} stars apart).</p>
          {partners.length > 1 && <p>Furthest from <a className="underline" href={`#/people/${encodeURIComponent(other(partners.at(-1)!))}`}>{other(partners.at(-1)!)}</a> ({fmt(partners.at(-1)!.diff)} stars apart).</p>}
        </section>
      )}
    </div>
  )
}
