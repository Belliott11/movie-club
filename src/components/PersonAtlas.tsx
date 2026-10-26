import { useEffect, useMemo, useRef, useState } from "react"
import { Collapse } from "@/components/Collapse"
import { WorldMap } from "@/components/WorldMap"
import { Button } from "@/components/ui/button"
import { movieHref } from "@/lib/movieLink"
import { Bars, Tags } from "@/components/Breakdown"
import { continentOfCode, regionOfCode } from "@/lib/continents"
import { blindspots, decadeOf, entryKey, movementBlindspots, NATIONS, tallyBy, tallyCountries } from "@/lib/atlas"
import { loadCountryCache, loadGenreCache, resolveCountries, topUnseen, type CountryCache, type GenreCache } from "@/lib/lbCountries"
import { findEntry, type LbEntry } from "@/lib/letterboxd"
import { fmt } from "@/lib/stats"
import { useStore } from "@/lib/store"

const regions = new Intl.DisplayNames(["en"], { type: "region" })
const nameOf = (code: string) => NATIONS.find(n => n.code === code)?.name ?? (code === "US" ? "USA" : (() => { try { return regions.of(code) ?? code } catch { return code } })())

/** Someone's Letterboxd history as a world tour: countries watched, the countries they've neglected, and film movements left unseen. */
export function PersonAtlas({ name, history, group = false }: { name: string; history: LbEntry[]; group?: boolean }) {
  const { suggest } = useStore()
  const [cache, setCache] = useState<CountryCache>(loadCountryCache)
  const [genreCache, setGenreCache] = useState<GenreCache>(loadGenreCache)
  const [running, setRunning] = useState(false)
  const stop = useRef(false)
  useEffect(() => () => { stop.current = true }, [])
  const known = history.filter(e => cache[entryKey(e)]).length, looked = history.filter(e => cache[entryKey(e)] !== undefined && genreCache[entryKey(e)] !== undefined).length
  const counts = useMemo(() => tallyCountries(history, e => cache[entryKey(e)] || undefined), [history, cache])
  const spots = useMemo(() => blindspots(counts), [counts])
  const continents = useMemo(() => tallyBy(history, e => { const c = continentOfCode(cache[entryKey(e)]); return c ? [c] : [] }).filter(c => c.rated > 0).sort((a, b) => b.n - a.n), [history, cache])
  const regions = useMemo(() => tallyBy(history, e => { const r = regionOfCode(cache[entryKey(e)]); return r ? [r] : [] }).filter(r => r.rated > 0).sort((a, b) => b.n - a.n), [history, cache])
  const decades = useMemo(() => tallyBy(history, e => (e[1] ? [decadeOf(e[1])] : [])).filter(d => d.rated > 0).sort((a, b) => a.name.localeCompare(b.name)), [history])
  const genres = useMemo(() => tallyBy(history, e => genreCache[entryKey(e)] ?? []), [history, genreCache])
  const moves = useMemo(() => movementBlindspots(history).slice(0, 5), [history])
  const [ideas, setIdeas] = useState<Record<string, { title: string; year: number } | null>>({})
  const spotKey = spots.map(s => s.code).join()
  useEffect(() => {
    if (running || looked < history.length || !history.length) return
    spots.forEach(s => topUnseen(s.code, history).then(p => setIdeas(i => ({ ...i, [s.code]: p }))))
  }, [spotKey, running, looked, history.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const go = async () => {
    stop.current = false; setRunning(true)
    await resolveCountries(history, (c, g) => { setCache(c); setGenreCache(g) }, () => stop.current)
    setRunning(false)
  }
  const top = counts.slice(0, 8), max = Math.max(1, ...top.map(c => c.n))
  const complete = looked >= history.length

  return (
    <section className="flex flex-col gap-6">
      <Collapse id="atlas-tour" defaultOpen={false} title={group ? "The club's world tour" : `${name}'s world tour`}>
      <div>
        <p className="mb-3 text-sm text-muted-foreground">{group ? "Countries of every film the club has played or any member has logged on Letterboxd" : `Countries of the films ${name} has logged on Letterboxd`}, using TMDB's main country for each film.</p>
        {!complete && (
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Button className="h-11 px-4" onClick={go} disabled={running}>{running ? `Looking up films… ${looked} of ${history.length}` : looked ? `Continue (${looked} of ${history.length} done)` : `Build ${name}'s country list`}</Button>
            {running && <Button variant="ghost" className="h-11 px-4" onClick={() => { stop.current = true; setRunning(false) }}>Pause</Button>}
          </div>
        )}
        {counts.length > 0 && <div className="mb-4"><WorldMap counts={Object.fromEntries(counts.map(c => [c.code, c.n]))} label={`World map of the films ${name} has watched, shaded by country`} seen={(t, y) => !!findEntry(history, t, y)} /></div>}
        {top.length > 0 && (
          <ul className="flex flex-col gap-2">
            {top.map(c => (
              <li key={c.code} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-2 text-sm">
                <span className="truncate font-medium">{nameOf(c.code)}</span>
                <span className="h-3 rounded-full bg-muted"><span className="grow block h-full origin-left rounded-full bg-world" style={{ width: `${(c.n / max) * 100}%` }} /></span>
                <span className="text-right text-muted-foreground"><b className="font-display text-foreground">{c.n}</b> {c.n === 1 ? "film" : "films"}{c.avg != null && <> · {fmt(c.avg, 1)}★</>}</span>
              </li>
            ))}
          </ul>
        )}
        {complete && known < history.length && <p className="mt-2 text-xs text-muted-foreground">{history.length - known} films had no country on TMDB and are left out.</p>}
      </div>
      </Collapse>

      {continents.length > 0 && (
        <Collapse id="atlas-continents" defaultOpen={false} title={group ? "Films by continent" : `${name}'s continents`}>
        <div className="flex flex-col gap-2">
          <Bars rows={continents.map(c => ({ name: c.name, n: c.n, avg: c.avg }))} />
          <p className="text-xs text-muted-foreground">Russia counts as Europe and Turkey as Asia.</p>
        </div>
        </Collapse>
      )}

      {regions.length > 0 && (
        <Collapse id="atlas-regions" defaultOpen={false} title={group ? "Films by region" : `${name}'s regions`}>
        <div className="flex flex-col gap-2">
          <Bars rows={regions.map(r => ({ name: r.name, n: r.n, avg: r.avg }))} />
          <p className="text-xs text-muted-foreground">Regions are slices of the world smaller than a continent, like East Asia or the Nordic countries.</p>
        </div>
        </Collapse>
      )}

      {decades.length > 0 && (
        <Collapse id="atlas-decades" defaultOpen={false} title={group ? "Films by decade" : `${name}'s decades`}>
        <div className="flex flex-col gap-2">
          <Bars rows={decades.map(d => ({ name: d.name, n: d.n, avg: d.avg }))} />
          <p className="text-xs text-muted-foreground">Bars show the average rating for each decade, with how many films went into it.</p>
        </div>
        </Collapse>
      )}

      {genres.length > 0 && <Tags title={group ? "Genres across the club" : `${name}'s genres`} groups={genres.filter(g => g.rated > 0)} />}

      {complete && counts.length > 0 && (
        <Collapse id="atlas-countries" defaultOpen={false} title="Biggest country blindspots">
        <div>
          <p className="mb-3 text-sm text-muted-foreground">{group ? "Major film nations the club has seen the least of, with a top-rated film from each that nobody has seen." : `Major film nations ${name} has watched the least, with a top-rated film from each that they haven't seen.`}</p>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
            {spots.map(s => {
              const idea = ideas[s.code]
              return (
                <li key={s.code} className="flex min-w-0 flex-col gap-1 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
                  <span className="flex items-baseline justify-between gap-2"><b className="font-display text-lg">{s.name}</b><span className="text-sm text-muted-foreground">{s.n} {s.n === 1 ? "film" : "films"}</span></span>
                  {idea ? (
                    <span className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">Try <a href={movieHref(idea.title, idea.year)} className="hover:underline">{idea.title}</a> ({idea.year})</span>
                      <Button variant="outline" className="h-10 shrink-0 px-3" onClick={() => suggest(idea.title, idea.year)}>Suggest it</Button>
                    </span>
                  ) : <span className="text-sm text-muted-foreground">{idea === null ? "Nothing to recommend." : "Finding a film…"}</span>}
                </li>
              )
            })}
          </ul>
        </div>
        </Collapse>
      )}

      {moves.length > 0 && (
        <Collapse id="atlas-movements" defaultOpen={false} title="Movement blindspots">
        <div>
          <p className="mb-3 text-sm text-muted-foreground">Landmark films from film movements, picked by hand, so it's a starting point and not a full canon.</p>
          <ul className="flex flex-col gap-3">
            {moves.map(m => (
              <li key={m.name}>
                <div className="flex items-baseline justify-between gap-3"><b>{m.name}</b><span className="text-sm text-muted-foreground">{m.years} · {m.seen} of {m.total} seen</span></div>
                <span className="mt-1 block h-2 rounded-full bg-muted"><span className="grow block h-full origin-left rounded-full bg-us" style={{ width: `${(m.seen / m.total) * 100}%` }} /></span>
                <p className="mt-1 text-sm text-muted-foreground">Start with {m.missing.slice(0, 3).map(([t, y]) => `${t} (${y})`).join(", ")}.</p>
              </li>
            ))}
          </ul>
        </div>
        </Collapse>
      )}
    </section>
  )
}
