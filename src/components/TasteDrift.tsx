import { useMemo } from "react"
import { Collapse } from "@/components/Collapse"
import { entryKey } from "@/lib/atlas"
import { driftByYear, driftSummary, hasDates } from "@/lib/drift"
import { loadGenreCache } from "@/lib/lbCountries"
import type { LbEntry } from "@/lib/letterboxd"
import { fmt } from "@/lib/stats"

/** How someone's logging changed year by year: how much, how they rated, how old the films were, and which genres. Needs the day each film was logged. */
export function TasteDrift({ name, history, own }: { name: string; history: LbEntry[]; own: boolean }) {
  const rows = useMemo(() => {
    const genres = loadGenreCache()
    return driftByYear(history, e => genres[entryKey(e)] ?? [])
  }, [history])
  if (!history.length) return null
  if (!hasDates(history)) return (
    <Collapse id="me-drift" title={`How ${name}\'s taste changed`}>
      <p className="text-sm text-muted-foreground">{own ? "Your Letterboxd import doesn't include dates yet. Upload your export again on the Watchlists tab and this fills in." : `${name}'s Letterboxd import doesn't include dates yet, so there's no year-by-year picture.`}</p>
    </Collapse>
  )
  if (rows.length < 2) return null
  const summary = driftSummary(rows)
  return (
    <Collapse id="me-drift" title={`How ${name}\'s taste changed`}>
      <p className="mb-3 text-sm text-muted-foreground">{summary ?? "Year by year, from the days films were logged on Letterboxd."}</p>
      <ol className="flex flex-col gap-2">
        {rows.map(r => (
          <li key={r.year} className="grid grid-cols-[3rem_1fr] items-start gap-x-3 text-sm" title={`${r.year}: ${r.n} films, average ${r.avg != null ? fmt(r.avg, 1) : "unrated"}`}>
            <b className="font-display">{r.year}</b>
            <div className="flex flex-col gap-1">
              <span className="h-3 rounded-full bg-muted"><span className="grow block h-full origin-left rounded-full bg-world" style={{ width: `${((r.avg ?? 0) / 5) * 100}%` }} /></span>
              <span className="text-muted-foreground">
                <b className="text-foreground">{r.avg != null ? fmt(r.avg, 1) : "–"}</b> average · {r.n} films · median film from {r.medianRelease}{r.genres.length > 0 && <> · mostly {r.genres.join(" and ").toLowerCase()}</>}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </Collapse>
  )
}
