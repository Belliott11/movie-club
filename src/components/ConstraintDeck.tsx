import { useEffect, useMemo, useRef, useState } from "react"
import { Layers } from "lucide-react"
import { PosterThumb } from "@/components/PosterThumb"
import { Button } from "@/components/ui/button"
import { CARDS, deal, fitting, untouchedMovementKeys, type Card, type Cand, type Ctx } from "@/lib/deck"
import { continentOfCode, continentOfName, regionOfCode, regionOfName } from "@/lib/continents"
import { useFacts } from "@/lib/filmFacts"
import { seenBy } from "@/lib/letterboxd"
import { movieHref } from "@/lib/movieLink"
import { key } from "@/lib/stats"
import { useStore } from "@/lib/store"
import { useFilmTags } from "@/lib/useFilmTags"
import { usePref } from "@/lib/prefs"

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches
type Stage = "idle" | "shuffling" | "dealing" | "face-up"

/**
 * A deck of constraints for the next pick. Deal a card and it says what the pick has to be (before 1970, not in English, a country
 * the club has never watched...), then lists films from the watchlists that fit. One redraw per turn, and no repeats until the deck's done.
 */
export function ConstraintDeck() {
  const { movies, watchlist, lb, loadLb, countries: fixed, loadSeal, suggest, suggestions } = useStore()
  useEffect(() => { loadLb(); loadSeal() }, [loadLb, loadSeal])
  const turn = Math.max(0, ...movies.map(m => m.seq)) + 1 // the pick being decided
  const [hand, setHand] = usePref<{ turn: number; drawn: string[]; used: string[] }>("deck-v1", { turn: 0, drawn: [], used: [] })
  const mine = hand.turn === turn ? hand : { turn, drawn: [], used: hand.used.length >= CARDS.length - 1 ? [] : hand.used }
  const [stage, setStage] = useState<Stage>(mine.drawn.length ? "face-up" : "idle")
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const card: Card | undefined = CARDS.find(c => c.id === mine.drawn[mine.drawn.length - 1])
  const redrawsLeft = mine.drawn.length < 2

  const play = (isRedraw: boolean) => {
    const next = deal([...mine.used, ...mine.drawn])
    const commit = () => setHand({ turn, drawn: [...(isRedraw ? mine.drawn : []), next.id], used: mine.used })
    if (reduced()) { commit(); setStage("face-up"); return }
    setStage("shuffling")
    timers.current.push(
      window.setTimeout(() => { commit(); setStage("dealing") }, 750),
      window.setTimeout(() => setStage("face-up"), 750 + 520),
    )
  }

  // films on anyone's watchlist that the club hasn't played and fewer than two of you have seen
  const pool = useMemo(() => {
    const played = new Set(movies.map(m => key(m.title, m.year)))
    const by = new Map<string, { title: string; year: number; who: Set<string> }>()
    for (const w of watchlist) {
      const k = key(w.title, w.year)
      if (played.has(k)) continue
      const e = by.get(k) ?? { title: w.title, year: w.year, who: new Set<string>() }
      e.who.add(w.member)
      by.set(k, e)
    }
    return [...by.values()].map(e => ({ title: e.title, year: e.year, wantedBy: e.who.size, seenBy: seenBy(lb, e.title, e.year).length })).filter(e => e.seenBy < 2)
  }, [movies, watchlist, lb])

  // what the club has done already, so a card can ask for something new
  const tags = useFilmTags(movies)
  const ctx: Ctx = useMemo(() => ({
    thisYear: new Date().getFullYear(),
    countries: new Set(movies.flatMap(m => (fixed[String(m.id)] ? [fixed[String(m.id)]] : tags[String(m.id)]?.countries ?? []))),
    continents: new Set(movies.flatMap(m => { const c = continentOfName(fixed[String(m.id)] ?? tags[String(m.id)]?.countries?.[0]); return c ? [c] : [] })),
    regions: new Set(movies.flatMap(m => { const r = regionOfName(fixed[String(m.id)] ?? tags[String(m.id)]?.countries?.[0]); return r ? [r] : [] })),
    movementKeys: untouchedMovementKeys(new Set(movies.map(m => key(m.title, 0).split("|")[0]))),
  }), [movies, tags, fixed])

  // cards that need facts (length, language, country, genres) look the films up; only the most-wanted ones, to keep it light
  const sample = useMemo(() => [...pool].sort((a, b) => b.wantedBy - a.wantedBy || a.title.localeCompare(b.title)).slice(0, 60), [pool])
  const needsFacts = !!card && !["old", "recent", "movement", "word"].includes(card.id)
  const facts = useFacts(needsFacts && stage === "face-up" ? sample : [])
  const regions = useMemo(() => new Intl.DisplayNames(["en"], { type: "region" }), [])
  const cands: Cand[] = sample.map(c => {
    const f = facts[key(c.title, c.year)]
    const name = f?.country ? (f.country === "US" ? "USA" : (() => { try { return regions.of(f.country!) ?? f.country } catch { return f.country } })()) : undefined
    return { ...c, runtime: f?.runtime, lang: f?.lang, country: name, continent: continentOfCode(f?.country), region: regionOfCode(f?.country), genres: f?.genres }
  })
  const asked = new Set(suggestions.map(s => key(s.title, s.year)))
  const fits = card && stage === "face-up" ? fitting(card, cands, ctx, 6) : []

  return (
    <section aria-label="Constraint deck">
      <h3 className="mb-1 flex items-center gap-1.5 text-xl font-bold"><Layers className="size-4" aria-hidden />Deal a pick card</h3>
      <p className="mb-3 text-sm text-muted-foreground">A twist for the next pick, to push the club somewhere new. You get one redraw.</p>

      <div className="flex flex-wrap items-start gap-4">
        {/* the deck, and the card that comes off it */}
        <div className="relative h-44 w-32 shrink-0" style={{ perspective: 800 }}>
          <div className={`absolute inset-0 ${stage === "shuffling" ? "riffle" : ""}`} aria-hidden>
            {[0, 1, 2, 3].map(i => (
              <span key={i} className="absolute inset-0 rounded-xl border border-foreground/20 bg-foreground shadow-md" style={{ transform: `translate(${i * 3}px, ${i * -3}px)`, ["--x" as string]: (i % 2 ? 1 : -1) * (14 + i * 4), ["--r" as string]: (i % 2 ? 1 : -1) * (4 + i * 2), ["--d" as string]: `${i * 60}ms` }}>
                <span className="absolute inset-2 rounded-lg border border-background/30" />
                <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-extrabold tracking-wide text-background/70">MOVIE CLUB</span>
              </span>
            ))}
          </div>
          {card && (stage === "dealing" || stage === "face-up") && (
            <div key={card.id} className="deal-out absolute inset-0 z-10" style={{ transformStyle: "preserve-3d" }}>
              <div className="flip-up card-glow absolute inset-0 rounded-xl bg-sun p-3 text-[#1c1915] shadow-xl" style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}>
                <p className="font-display text-xl leading-[1.05] font-extrabold">{card.title}</p>
                <p className="mt-2 text-xs leading-snug">{card.rule}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {stage === "idle" && <Button className="h-12 px-5" onClick={() => play(false)}>Deal a card</Button>}
          {stage === "shuffling" && <p role="status" className="text-sm text-muted-foreground">Shuffling…</p>}
          {stage === "face-up" && card && (
            <>
              <p className="text-lg leading-snug"><b className="font-display">{card.title}.</b> {card.rule}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="h-11 px-4" disabled={!redrawsLeft} onClick={() => play(true)}>{redrawsLeft ? "Redraw once" : "No redraws left"}</Button>
              </div>
            </>
          )}
        </div>
      </div>

      {stage === "face-up" && card && (
        <div className="mt-4">
          <h4 className="mb-1 font-display text-lg font-bold">Watchlist films that fit</h4>
          {fits.length ? (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {fits.map(f => (
                <li key={f.title + f.year} className="min-w-0">
                  <a href={movieHref(f.title, f.year)} aria-label={`About ${f.title}`}><PosterThumb title={f.title} year={f.year} className="w-full" /></a>
                  <p className="mt-1 truncate text-sm font-medium leading-tight">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.year} · wanted by {f.wantedBy}</p>
                  <Button variant="ghost" className="mt-0.5 h-9 w-full px-1 text-xs" disabled={asked.has(key(f.title, f.year))} onClick={() => suggest(f.title, f.year)}>{asked.has(key(f.title, f.year)) ? "Suggested" : "Suggest"}</Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{needsFacts && Object.keys(facts).length < sample.length && sample.length ? "Checking the watchlists…" : "Nothing on the watchlists fits this card. Time to hunt, or redraw."}</p>
          )}
        </div>
      )}
    </section>
  )
}
