import { useEffect, useMemo, useRef, useState } from "react"
import { Wand2 } from "lucide-react"
import { PlanList } from "@/components/PlanList"
import { Button } from "@/components/ui/button"
import { entryKey } from "@/lib/atlas"
import { affinityFrom, generatePlan, type Cand } from "@/lib/genPlan"
import { loadCountryCache, loadDirectorCache, loadGenreCache, loadVoteCache, resolveCountries, type CountryCache, type DirectorCache, type GenreCache } from "@/lib/lbCountries"
import type { LbEntry } from "@/lib/letterboxd"
import { filmKey, seenMatcher } from "@/lib/plan"
import { useStore } from "@/lib/store"

const NONE: LbEntry[] = []
const regions = new Intl.DisplayNames(["en"], { type: "region" })
const countryName = (code: string) => { try { return regions.of(code) ?? code } catch { return code } }

/**
 * A watching plan built from your watchlist and what your Letterboxd history says you like. Nothing is saved: the plan is worked out
 * again from the current watchlist and history each time, so it changes when they do. Films you've seen tick themselves.
 */
export function AutoPlan({ name, history }: { name: string; history: LbEntry[] | undefined }) {
  const { watchlist, suggest } = useStore()
  const mine = useMemo(() => {
    const seen = new Set<string>()
    return watchlist.filter(w => w.member === name && w.year).flatMap((w): LbEntry[] => (seen.has(entryKey([w.title, w.year, null])) ? [] : (seen.add(entryKey([w.title, w.year, null])), [[w.title, w.year, null]])))
  }, [watchlist, name])
  const [countries, setCountries] = useState<CountryCache>(loadCountryCache)
  const [genres, setGenres] = useState<GenreCache>(loadGenreCache)
  const [votes, setVotes] = useState(loadVoteCache)
  const [directors, setDirectors] = useState<DirectorCache>(loadDirectorCache)
  const [running, setRunning] = useState(false)
  const stop = useRef(false)
  useEffect(() => () => { stop.current = true }, [])
  const overKey = `plan-auto-seen:${name}`
  const [overrides, setOverrides] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(overKey) ?? "{}") } catch { return {} } })
  const hist = history ?? NONE

  const looked = mine.filter(e => countries[entryKey(e)] !== undefined && genres[entryKey(e)] !== undefined && directors[entryKey(e)] !== undefined).length
  const plan = useMemo(() => {
    if (!mine.length) return null
    const histCountry = (e: LbEntry) => countries[entryKey(e)] || undefined
    const aff = affinityFrom(hist, histCountry, e => genres[entryKey(e)] ?? [])
    const cands: Cand[] = mine.map(e => ({ title: e[0], year: e[1], country: countries[entryKey(e)] || undefined, genres: genres[entryKey(e)] ?? [], vote: votes[entryKey(e)], directors: directors[entryKey(e)] }))
    return generatePlan(cands, aff, countryName)
  }, [mine, hist, countries, genres, votes, directors])
  const seen = useMemo(() => seenMatcher(history, overrides), [history, overrides])

  const analyze = async () => {
    stop.current = false; setRunning(true)
    await resolveCountries(mine, (c, g) => { setCountries(c); setGenres(g); setVotes(loadVoteCache()); setDirectors(loadDirectorCache()) }, () => stop.current, true)
    setRunning(false)
  }
  const setSeen = (f: { title: string; year?: number }, v: boolean | null) => {
    const next = { ...overrides }
    if (v == null) delete next[filmKey(f)]
    else next[filmKey(f)] = v
    setOverrides(next)
    try { localStorage.setItem(overKey, JSON.stringify(next)) } catch { /* fine */ }
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h3 className="flex items-center gap-1.5 text-xl font-bold"><Wand2 className="size-4" aria-hidden />Plan from my watchlist</h3>
        <p className="text-sm text-muted-foreground">Built from the {mine.length} films on your watchlist, grouped by movement, director, country and genre, with the kinds of film you rate highest first and the best-reviewed in each group first. It redraws itself when your watchlist or Letterboxd history changes.</p>
      </div>
      {!mine.length ? (
        <p className="text-sm text-muted-foreground">Upload your Letterboxd watchlist on the Watchlists tab and your plan appears here.</p>
      ) : (
        <>
          {looked < mine.length && (
            <div className="flex flex-wrap items-center gap-3">
              <Button className="h-11 px-4" onClick={analyze} disabled={running}>{running ? `Looking up films… ${looked} of ${mine.length}` : looked ? `Continue (${looked} of ${mine.length} done)` : "Build my plan"}</Button>
              {running && <Button variant="ghost" className="h-11 px-4" onClick={() => { stop.current = true; setRunning(false) }}>Pause</Button>}
              <p className="w-full text-xs text-muted-foreground">One quick lookup per film, then remembered on this device. Until then, films are grouped by movement and decade only. Directors need the lookup too.</p>
            </div>
          )}
          {plan && <PlanList plan={plan} seen={seen} overrides={overrides} onSeen={setSeen} onSuggest={f => suggest(f.title, f.year ?? null)} />}
        </>
      )}
    </section>
  )
}
