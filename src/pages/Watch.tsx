import { useState, type ChangeEvent } from "react"
import { Card } from "@/components/ui/card"
import { parseWatchlist } from "@/lib/csv"
import { key } from "@/lib/stats"
import { useStore } from "@/lib/store"

export default function Watch() {
  const { me, movies, watchlist, importWatchlist } = useStore()
  const [msg, setMsg] = useState("")
  const counts = new Map<string, number>()
  watchlist.forEach(w => counts.set(w.member, (counts.get(w.member) || 0) + 1))
  const watched = new Set(movies.map(m => key(m.title, m.year)))
  const shared = new Map<string, { t: string; y: number; n: number }>()
  for (const w of watchlist) {
    if (watched.has(key(w.title, w.year))) continue
    const s = shared.get(key(w.title, w.year)) || { t: w.title, y: w.year, n: 0 }
    s.n++
    shared.set(key(w.title, w.year), s)
  }
  const both = [...shared.values()].filter(x => x.n > 1).sort((a, b) => b.n - a.n).slice(0, 30)

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    try {
      const items = parseWatchlist(await f.text(), me)
      await importWatchlist(items)
      setMsg(`Saved ${items.length} films for ${me}.`)
    } catch (err) {
      setMsg((err as Error).message)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="gap-2 px-5">
        <p>Export from Letterboxd: Settings, then Import &amp; Export, then Export your data. Upload <code className="rounded bg-muted px-1.5">watchlist.csv</code> here. A new upload replaces your old watchlist.</p>
        {me ? (
          <label className="inline-flex h-11 w-fit cursor-pointer items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground focus-within:ring-3 focus-within:ring-ring/50">
            Upload watchlist.csv as {me}
            <input type="file" accept=".csv" className="sr-only" onChange={upload} />
          </label>
        ) : (
          <p className="font-medium">Pick your name at the top first.</p>
        )}
        {msg && <p role="status" className="text-sm text-muted-foreground">{msg}</p>}
      </Card>
      <section>
        <h3 className="mb-2 text-xl font-bold">Uploaded so far</h3>
        {counts.size ? <ul>{[...counts].map(([n, c]) => <li key={n}>{n}: {c} films</li>)}</ul> : <p className="text-muted-foreground">Nobody has uploaded a watchlist yet.</p>}
      </section>
      <section>
        <h3 className="mb-2 text-xl font-bold">On more than one watchlist (not watched yet)</h3>
        {both.length ? <ul>{both.map(x => <li key={x.t + x.y}>{x.t} <small className="text-muted-foreground">{x.y || ""}</small> · {x.n} people</li>)}</ul> : <p className="text-muted-foreground">No overlaps yet.</p>}
      </section>
    </div>
  )
}
