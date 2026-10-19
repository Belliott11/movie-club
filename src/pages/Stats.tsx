import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fmt, groupAvg, memberStats, outsideAvg, spread } from "@/lib/stats"
import { useStore } from "@/lib/store"

export default function Stats() {
  const { movies, members } = useStore()
  const rated = movies.filter(m => Object.keys(m.ratings).length)
  if (!rated.length) return <p className="text-muted-foreground">Stats show up once the club has rated a film.</p>

  const people = memberStats(movies, members).filter(p => p.count)
  const regulars = people.filter(p => p.count >= 5)
  const by = (arr: typeof regulars, f: (p: (typeof regulars)[number]) => number) => [...arr].sort((a, b) => f(b) - f(a))[0]
  const picker = by(people.filter(p => p.pickAvg != null), p => p.pickAvg!)
  const harsh = by(regulars, p => -p.avg!), kind = by(regulars, p => p.avg!), odd = by(regulars, p => p.offGroup!)
  const awards: [string, string][] = [
    picker && ["Best pick", `${picker.n} (their picks average ${fmt(picker.pickAvg)})`],
    harsh && ["Harshest critic", `${harsh.n} (${fmt(harsh.avg)} on average)`],
    kind && ["Most generous", `${kind.n} (${fmt(kind.avg)} on average)`],
    odd && ["Most contrarian", `${odd.n} (${fmt(odd.offGroup)} away from the group, on average)`],
  ].filter(Boolean) as [string, string][]
  const top = [...rated].sort((a, b) => groupAvg(b)! - groupAvg(a)!).slice(0, 5)
  const divisive = [...rated].sort((a, b) => spread(b) - spread(a)).slice(0, 5)
  const gap = rated.filter(m => outsideAvg(m) != null).sort((a, b) => Math.abs(groupAvg(b)! - outsideAvg(b)!) - Math.abs(groupAvg(a)! - outsideAvg(a)!)).slice(0, 5)

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="text-xl font-bold">Awards</h3>
        <p className="mb-2 text-sm text-muted-foreground">Critic awards count people with at least 5 films rated.</p>
        <Card className="gap-0 py-2">
          {awards.map(([l, v]) => (
            <div key={l} className="grid grid-cols-[9rem_1fr] gap-2 px-4 py-1.5"><dt className="text-sm text-muted-foreground">{l}</dt><dd>{v}</dd></div>
          ))}
        </Card>
      </section>
      <section>
        <h3 className="mb-2 text-xl font-bold">Attendance</h3>
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          {[...people].sort((a, b) => b.count - a.count).map(p => (
            <li key={p.n}>{p.n} <b>{Math.round((p.count / rated.length) * 100)}%</b> <small className="text-muted-foreground">{p.count} of {rated.length}</small></li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="mb-2 text-xl font-bold">Top films</h3>
        <ol className="list-decimal pl-5">{top.map((m, i) => <li key={m.id}>{m.title} <b className={i === 0 ? "text-gold" : ""}>{fmt(groupAvg(m))}</b></li>)}</ol>
      </section>
      <section>
        <h3 className="mb-2 text-xl font-bold">People</h3>
        <Card data-no-swipe className="py-1">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Avg given</TableHead><TableHead>Rated</TableHead><TableHead>Picks avg</TableHead></TableRow></TableHeader>
            <TableBody>
              {[...people].sort((a, b) => (b.pickAvg ?? 0) - (a.pickAvg ?? 0)).map(p => (
                <TableRow key={p.n}><TableCell>{p.n}</TableCell><TableCell>{fmt(p.avg)}</TableCell><TableCell>{p.count}</TableCell><TableCell>{fmt(p.pickAvg)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>
      <section>
        <h3 className="mb-2 text-xl font-bold">Most divisive</h3>
        <ol className="list-decimal pl-5">{divisive.map(m => <li key={m.id}>{m.title} <span className="text-muted-foreground">spread {fmt(spread(m))}</span></li>)}</ol>
      </section>
      <section>
        <h3 className="mb-2 text-xl font-bold">Biggest gap with outside ratings</h3>
        {gap.length ? <ol className="list-decimal pl-5">{gap.map(m => <li key={m.id}>{m.title}: us {fmt(groupAvg(m))}, outside {fmt(outsideAvg(m))}</li>)}</ol> : <p className="text-muted-foreground">Outside ratings are still loading.</p>}
      </section>
    </div>
  )
}
