import { useEffect, useState, type ChangeEvent } from "react"
import { Avatar } from "@/components/Avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { parseWatchlist } from "@/lib/csv"
import { findEntry, parseExports, readZip } from "@/lib/letterboxd"
import { fmt, key } from "@/lib/stats"
import { useStore } from "@/lib/store"

export default function Watch() {
  const { me, movies, watchlist, importWatchlist, lb, loadLb, importLb, fillFromLb } = useStore()
  const [msg, setMsg] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => { loadLb() }, [loadLb])

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

  const mine = me ? lb[me] : undefined
  const clubFilms = mine ? movies.map(m => ({ m, e: findEntry(mine, m.title, m.year) })) : []
  const missing = clubFilms.filter(x => me && x.m.ratings[me] == null && x.e?.[2] != null)
  const seenUnrated = clubFilms.filter(x => me && x.m.ratings[me] == null && x.e && x.e[2] == null).length

  /** Takes the Letterboxd export zip, or its loose CSV files, and imports the watchlist and the watched/rated history from them. */
  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const picked = [...(e.target.files || [])]
    e.target.value = ""
    if (!picked.length || !me) return
    setBusy(true)
    setMsg("")
    try {
      const files: { name: string; text: string }[] = []
      for (const f of picked) {
        if (/\.zip$/i.test(f.name)) {
          if (typeof DecompressionStream === "undefined") throw new Error("This browser can't open zip files. Unzip it and pick watched.csv, ratings.csv and watchlist.csv instead.")
          files.push(...(await readZip(await f.arrayBuffer())))
        } else files.push({ name: f.name, text: await f.text() })
      }
      const done: string[] = []
      const wl = files.find(f => /(^|\/)watchlist\.csv$/i.test(f.name))
      if (wl) {
        const items = parseWatchlist(wl.text, me)
        await importWatchlist(items)
        done.push(`${items.length} watchlist films`)
      }
      const history = parseExports(files)
      if (history.length) {
        await importLb(history)
        done.push(`${history.length} watched films (${history.filter(h => h[2] != null).length} rated)`)
      }
      setMsg(done.length ? `Imported ${done.join(" and ")} for ${me}.` : "Didn't find watched.csv, ratings.csv or watchlist.csv in that. Pick the zip you get from Letterboxd's Export your data.")
    } catch (err) {
      setMsg((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stagger flex flex-col gap-6">
      <Card className="gap-3 px-5">
        <h3 className="text-xl font-bold">Import from Letterboxd</h3>
        <ol className="list-decimal pl-5 text-sm leading-relaxed">
          <li>On letterboxd.com, open Settings, then Import &amp; Export, then Export your data.</li>
          <li>Upload the zip you get here. You don't need to unzip it.</li>
        </ol>
        <p className="text-sm text-muted-foreground">It reads your watched films, ratings and watchlist. Uploading again replaces what was there.</p>
        {me ? (
          <label className="inline-flex h-11 w-fit cursor-pointer items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground focus-within:ring-3 focus-within:ring-ring/50">
            {busy ? "Importing…" : `Upload Letterboxd export as ${me}`}
            <input type="file" accept=".zip,.csv" multiple disabled={busy} className="sr-only" onChange={upload} />
          </label>
        ) : (
          <p className="font-medium">Pick your name at the top first.</p>
        )}
        {msg && <p role="status" className="text-sm">{msg}</p>}
      </Card>

      {me && mine && (
        <Card className="gap-3 px-5">
          <h3 className="text-xl font-bold">{me}'s Letterboxd history</h3>
          <p className="text-sm text-muted-foreground">{mine.length} films watched, {mine.filter(e => e[2] != null).length} rated. Films you've seen are hidden from your recommendations.</p>
          {missing.length > 0 ? (
            <>
              <p>You rated {missing.length} club {missing.length === 1 ? "film" : "films"} on Letterboxd but not here:</p>
              <ul className="grid gap-x-6 sm:grid-cols-2">
                {missing.map(({ m, e }) => <li key={m.id}>{m.title} <b>{fmt(e![2], 1)}</b></li>)}
              </ul>
              <Button className="h-11 w-fit px-4" onClick={async () => { const n = await fillFromLb(); setMsg(`Added ${n} ${n === 1 ? "rating" : "ratings"}.`) }}>Add {missing.length === 1 ? "that rating" : `those ${missing.length} ratings`} to the club</Button>
            </>
          ) : (
            <p className="text-sm">Nothing to add: every club film you rated on Letterboxd is already rated here.</p>
          )}
          {seenUnrated > 0 && <p className="text-sm text-muted-foreground">You've also watched {seenUnrated} club {seenUnrated === 1 ? "film" : "films"} without rating {seenUnrated === 1 ? "it" : "them"} on Letterboxd.</p>}
        </Card>
      )}

      <section>
        <h3 className="mb-2 text-xl font-bold">Who has imported</h3>
        {counts.size || Object.keys(lb).length ? (
          <ul className="flex flex-col gap-2">
            {[...new Set([...counts.keys(), ...Object.keys(lb)])].sort().map(n => (
              <li key={n} className="flex items-center gap-3">
                <Avatar name={n} size="sm" />
                <span><b>{n}</b> <span className="text-muted-foreground">{[counts.get(n) ? `${counts.get(n)} on watchlist` : "", lb[n] ? `${lb[n].length} watched` : ""].filter(Boolean).join(" · ")}</span></span>
              </li>
            ))}
          </ul>
        ) : <p className="text-muted-foreground">Nobody has imported yet. Upload an export to get the reels rolling.</p>}
      </section>
      <section>
        <h3 className="mb-2 text-xl font-bold">On more than one watchlist (not watched yet)</h3>
        {both.length ? <ul>{both.map(x => <li key={x.t + x.y}>{x.t} <small className="text-muted-foreground">{x.y || ""}</small> · {x.n} people</li>)}</ul> : <p className="text-muted-foreground">No overlaps yet.</p>}
      </section>
    </div>
  )
}
