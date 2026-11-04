import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { IMG } from "@/lib/api"
import type { Card, Ctx } from "@/lib/deck"
import { cardIdeas, discoverParams, type Idea } from "@/lib/deckSuggest"
import { PickFilm } from "@/components/PickFilm"
import { movieHref } from "@/lib/movieLink"
import { key } from "@/lib/stats"

/** Well-known films that meet the card, shown when nothing on anyone's watchlist does. */
export function CardIdeas({ card, ctx, skip, wanted, asked, onSuggest }: { card: Card; ctx: Ctx; skip: Set<string>; wanted: Map<string, string[]>; asked: Set<string>; onSuggest: (title: string, year: number) => void }) {
  const [ideas, setIdeas] = useState<Idea[] | null>(null)
  useEffect(() => {
    let dead = false
    setIdeas(null)
    cardIdeas(card, ctx, skip).then(r => { if (!dead) setIdeas([...r].sort((a, b) => (wanted.get(key(b.title, b.year))?.length ?? 0) - (wanted.get(key(a.title, a.year))?.length ?? 0))) })
    return () => { dead = true }
  }, [card.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (ideas === null) return <p className="text-sm text-muted-foreground">Looking for well-known films that fit…</p>
  if (!ideas.length) return <p className="text-sm text-muted-foreground">{discoverParams(card, ctx) === null && !["bw", "silent", "trueStory"].includes(card.id) ? "Nothing on the watchlists fits, and this card can't be searched for. Redraw, or pick anything that meets it." : "Nothing well known turned up for this card. Redraw, or pick anything that meets it."}</p>
  return (
    <>
      <p className="mb-2 text-sm text-muted-foreground">Nothing on the watchlists fits. Well-known films that do, none of them seen by anyone here:</p>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {ideas.map(f => (
          <li key={f.id} className="min-w-0">
            <a href={movieHref(f.title, f.year)} aria-label={`About ${f.title}`}>{f.poster ? <img src={`${IMG}w185${f.poster}`} alt="" loading="lazy" className="aspect-[2/3] w-full rounded-md object-cover" /> : <span className="block aspect-[2/3] w-full rounded-md bg-muted" />}</a>
            <p className="mt-1 truncate text-sm leading-tight font-medium">{f.title}</p>
            <p className="text-xs text-muted-foreground">{f.year} · TMDB {f.score.toFixed(1)}</p>
            {wanted.get(key(f.title, f.year)) && <p className="text-xs font-medium text-pos">on {wanted.get(key(f.title, f.year))!.join(", ")}'s list</p>}
            <PickFilm title={f.title} year={f.year} tmdbId={f.id} cardId={card.id} />
            <Button variant="ghost" className="mt-0.5 h-9 w-full px-1 text-xs" disabled={asked.has(key(f.title, f.year))} onClick={() => onSuggest(f.title, f.year)}>{asked.has(key(f.title, f.year)) ? "Suggested" : "Suggest"}</Button>
          </li>
        ))}
      </ul>
    </>
  )
}
