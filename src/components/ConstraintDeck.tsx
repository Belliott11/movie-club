import { useEffect, useMemo, useRef, useState } from "react"
import { Layers } from "lucide-react"
import { PosterThumb } from "@/components/PosterThumb"
import { Collapse } from "@/components/Collapse"
import { Button } from "@/components/ui/button"
import { CardIdeas } from "@/components/CardIdeas"
import { CardPicker } from "@/components/CardPicker"
import { PickFilm } from "@/components/PickFilm"
import { IMG } from "@/lib/api"
import { candFromEntry } from "@/lib/catalog"
import { useDeckData } from "@/lib/useDeckData"
import { deal, fitting, type Card, type Cand } from "@/lib/deck"
import { afterDeal, canRedraw } from "@/lib/deckFlow"
import { continentOfCode, regionOfCode } from "@/lib/continents"
import { useExtras, useOscars } from "@/lib/filmExtras"
import { useFacts } from "@/lib/filmFacts"
import { movieHref } from "@/lib/movieLink"
import { key } from "@/lib/stats"
import { useStore } from "@/lib/store"

const EXTRAS = ["bw", "silent", "trueStory", "franchise", "lowBudget", "womanDirector", "famous"]
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches
type Stage = "idle" | "shuffling" | "dealing" | "face-up"

/**
 * A deck of constraints for the next pick. Deal a card and it says what the pick has to be (before 1970, not in English, a country
 * the club has never watched...), then lists films from the watchlists that fit. One redraw per turn (never the same card), and every deal is random from the whole deck.
 */
export function ConstraintDeck() {
  const { movies, lb, loadLb, loadSeal, suggest, suggestions, canPick, selector, deck, setDeck, deckCards, watchlist, cards } = useStore()
  useEffect(() => { loadLb(); loadSeal() }, [loadLb, loadSeal])
  // see the card the selector draws without reloading
  useEffect(() => { const t = setInterval(() => { if (!document.hidden) loadSeal(true) }, 8000); return () => clearInterval(t) }, [loadSeal])
  const deckPool = cards.filter(c => deckCards.includes(c.id))
  const mine = { drawn: deck.drawn }
  const [stage, setStage] = useState<Stage>(mine.drawn.length ? "face-up" : "idle")
  // someone else dealing (or a new pick starting) changes what's on the table
  useEffect(() => { if (stage === "idle" && mine.drawn.length) setStage("face-up"); if (stage === "face-up" && !mine.drawn.length) setStage("idle") }, [mine.drawn.length, stage])
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const card: Card | undefined = cards.find(c => c.id === mine.drawn[mine.drawn.length - 1])
  const redrawsLeft = canRedraw(mine.drawn)
  const [notice, setNotice] = useState("")

  const play = (isRedraw: boolean) => {
    const next = deal(mine.drawn, Math.random, deckPool.length ? deckPool : cards)
    setNotice("")
    // the deal is refused if someone else dealt since this device last looked; their card stays on the table
    const commit = async () => {
      const ok = await setDeck(afterDeal(mine.drawn, isRedraw, next.id), mine.drawn)
      if (!ok) { setNotice("Someone else just dealt, so their card is on the table."); setStage("face-up") }
      return ok
    }
    if (reduced()) { commit().then(ok => ok && setStage("face-up")); return }
    setStage("shuffling")
    timers.current.push(
      window.setTimeout(() => { commit().then(ok => { if (ok) setStage("dealing") }) }, 750),
      window.setTimeout(() => setStage(st => (st === "dealing" ? "face-up" : st)), 750 + 520 + 400),
    )
  }

  // films on anyone's watchlist that the club hasn't played and fewer than two of you have seen
  const { pool, ctx, catalog, room } = useDeckData()

  // cards that need facts (length, language, country, genres) look the films up; only the most-wanted ones, to keep it light
  const known = (c: { title: string; year: number }) => catalog?.get(key(c.title, c.year))
  const sample = useMemo(() => [...pool].filter(c => !(catalog && catalog.get(key(c.title, c.year)))).sort((a, b) => b.wantedBy - a.wantedBy || a.title.localeCompare(b.title)).slice(0, 60), [pool, catalog])
  const needsFacts = !!card && !["old", "recent", "movement", "word", ...EXTRAS, "oscar"].includes(card.id)
  const facts = useFacts(needsFacts && stage === "face-up" ? sample : [])
  const extras = useExtras(card && EXTRAS.includes(card.id) && stage === "face-up" ? sample : [])
  const oscars = useOscars(card?.id === "oscar" && stage === "face-up" ? sample : [])
  const regions = useMemo(() => new Intl.DisplayNames(["en"], { type: "region" }), [])
  const lazy: Cand[] = sample.map(c => {
    const f = facts[key(c.title, c.year)]
    const name = f?.country ? (f.country === "US" ? "USA" : (() => { try { return regions.of(f.country!) ?? f.country } catch { return f.country } })()) : undefined
    const x = extras[key(c.title, c.year)]
    return { ...c, directors: x?.directors, bw: x?.bw, silent: x?.silent, trueStory: x?.trueStory, franchise: x?.franchise, budget: x?.budget, womanDirector: x?.womanDirector, oscars: oscars[key(c.title, c.year)]?.n, runtime: f?.runtime, lang: f?.lang, country: name, continent: continentOfCode(f?.country), region: regionOfCode(f?.country), genres: f?.genres }
  })
  const cands: Cand[] = [...pool.flatMap(c => { const e = known(c); return e ? [candFromEntry(e, c)] : [] }), ...lazy]
  const asked = new Set(suggestions.map(s => key(s.title, s.year)))
  const fits = card && stage === "face-up" ? fitting(card, cands, ctx, 12) : []
  // films a card can't be checked against (TMDB lacks the fact, or it hasn't loaded)
  const unchecked = card && stage === "face-up" ? cands.filter(c => card.fits(c, ctx) === undefined) : []
  // outside suggestions skip what the club played and what anyone in the room has seen
  const skipSet = useMemo(() => {
    const out = new Set(movies.map(m => key(m.title, m.year)))
    for (const [member, h] of Object.entries(lb)) if (room.includes(member)) for (const e of h) out.add(key(e[0], e[1]))
    return out
  }, [movies, lb, room])
  const wantedBy = useMemo(() => {
    const w = new Map<string, string[]>()
    for (const x of watchlist) w.set(key(x.title, x.year), [...(w.get(key(x.title, x.year)) ?? []), x.member])
    return w
  }, [watchlist])
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    setSettled(!needsFacts && !(card && EXTRAS.includes(card.id)) && card?.id !== "oscar")
    const t = window.setTimeout(() => setSettled(true), 4000)
    return () => clearTimeout(t)
  }, [card?.id, needsFacts]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section aria-label="Constraint deck">
      <h3 className="mb-1 flex items-center gap-1.5 text-xl font-bold"><Layers className="size-4" aria-hidden />Deal a pick card</h3>
      <p className="mb-3 text-sm text-muted-foreground">A twist for the next pick, to push the club somewhere new. The selector gets one redraw.</p>

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
          {stage === "idle" && (canPick ? <Button className="h-12 px-5" onClick={() => play(false)}>Deal a card</Button> : <p className="text-sm text-muted-foreground">Waiting for {selector} to deal this week's card.</p>)}
          {stage === "shuffling" && <p role="status" className="text-sm text-muted-foreground">Shuffling…</p>}
          {stage === "face-up" && card && (
            <>
              <p className="text-lg leading-snug"><b className="font-display">{card.title}.</b> {card.rule}</p>
              {deck.by && <p className="text-xs text-muted-foreground">Dealt by {deck.by}</p>}
              <div className="flex flex-wrap gap-2">
                {canPick ? <><Button variant="outline" className="h-11 px-4" disabled={!redrawsLeft} onClick={() => play(true)}>{redrawsLeft ? "Redraw once" : "No redraws left"}</Button><Button variant="ghost" className="h-11 px-4" onClick={() => { if (confirm("Clear the card and start over? That gives you a fresh deal and a fresh redraw.")) setDeck([], mine.drawn) }}>Start over</Button></> : <p className="text-xs text-muted-foreground">Only {selector} can redraw.</p>}
              </div>
            </>
          )}
        </div>
      </div>

      {notice && <p role="status" className="mt-3 text-sm font-medium">{notice}</p>}
      {stage === "face-up" && card && (
        <div className="mt-4">
          <h4 className="mb-1 font-display text-lg font-bold">{card.loose ? "Obvious fits on the watchlists" : "Watchlist films that fit"}</h4>
          {card.loose && <p className="mb-2 text-sm text-muted-foreground">This card is about an impression, so the list is only the easy answers.</p>}
          {fits.length ? (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {fits.map(f => (
                <li key={f.title + f.year} className="min-w-0">
                  <a href={movieHref(f.title, f.year)} aria-label={`About ${f.title}`}>{f.poster ? <img src={`${IMG}w185${f.poster}`} alt="" loading="lazy" className="aspect-[2/3] w-full rounded-md object-cover" /> : <PosterThumb title={f.title} year={f.year} className="w-full" />}</a>
                  <p className="mt-1 truncate text-sm font-medium leading-tight">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.year} · wanted by {f.wantedBy}</p>
                  {(card.id === "famous" || card.id === "womanDirector") && f.directors?.[0] && <p className="truncate text-xs">dir. {f.directors[0]}</p>}
                  <PickFilm title={f.title} year={f.year} tmdbId={f.tmdbId} cardId={card.id} />
                  <Button variant="ghost" className="mt-0.5 h-9 w-full px-1 text-xs" disabled={asked.has(key(f.title, f.year))} onClick={() => suggest(f.title, f.year)}>{asked.has(key(f.title, f.year)) ? "Suggested" : "Suggest"}</Button>
                </li>
              ))}
            </ul>
          ) : (
            !settled && sample.length ? <p className="text-sm text-muted-foreground">Checking the watchlists…</p> : <CardIdeas card={card} ctx={ctx} skip={skipSet} wanted={wantedBy} asked={asked} onSuggest={suggest} />
          )}
          {settled && unchecked.length > 0 && (
            <details className="mt-3 text-sm text-muted-foreground">
              <summary className="min-h-11 cursor-pointer py-2">{unchecked.length} watchlist {unchecked.length === 1 ? "film" : "films"} couldn't be checked for this card</summary>
              <p className="mb-1 text-xs">TMDB doesn't have the detail this card needs for them, so they may fit. Have a look yourself:</p>
              <ul className="flex flex-col gap-0.5">{unchecked.slice(0, 12).map(f => <li key={f.title + f.year}><a href={movieHref(f.title, f.year)} className="hover:underline">{f.title}</a> <small>{f.year}</small></li>)}</ul>
            </details>
          )}
        </div>
      )}

      <Collapse id="deck-cards" title={`Cards in play (${deckPool.length} of ${cards.length})`} defaultOpen={false}>
        <CardPicker current={card?.id} />
      </Collapse>
    </section>
  )
}
