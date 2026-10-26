import { useState } from "react"
import { Avatar } from "@/components/Avatar"
import { MiniFilm } from "@/components/MiniFilm"
import { Button } from "@/components/ui/button"
import { crowdPicks } from "@/lib/picks"
import { key } from "@/lib/stats"
import { useStore } from "@/lib/store"

const SHOWN = 3

/** Films one person rated 4 or higher on Letterboxd that no one else has seen, grouped by who loved them. Their best-rated come first, and ones already on a friend's watchlist beat the rest. */
export function LovedByOne() {
  const { lb, movies, watchlist, suggestions, suggest } = useStore()
  const [more, setMore] = useState<Record<string, boolean>>({})
  const wanted = new Map<string, string[]>()
  for (const w of watchlist) wanted.set(key(w.title, w.year), [...(wanted.get(key(w.title, w.year)) ?? []), w.member])
  const byPerson = new Map<string, { title: string; year: number; rating: number; also: string[] }[]>()
  for (const p of crowdPicks(lb, movies, { minRaters: 1, maxSeen: 1 })) {
    const fan = p.ratings.find(r => r.rating >= 4)!
    byPerson.set(fan.name, [...(byPerson.get(fan.name) ?? []), { title: p.title, year: p.year, rating: fan.rating, also: (wanted.get(key(p.title, p.year)) ?? []).filter(n => n !== fan.name) }])
  }
  const people = [...byPerson.entries()].map(([name, films]) => [name, films.sort((a, b) => b.rating - a.rating || b.also.length - a.also.length || a.title.localeCompare(b.title))] as const).sort((a, b) => a[0].localeCompare(b[0]))
  const imported = Object.values(lb).filter(h => h.length).length
  if (!people.length) return <p className="text-muted-foreground">{imported < 2 ? "This fills in once two or more people have imported their Letterboxd history." : "No film is loved by just one of you and unseen by the rest yet."}</p>
  return (
    <div className="flex flex-col gap-5">
      {people.map(([name, films]) => {
        const open = more[name], shown = open ? films : films.slice(0, SHOWN)
        return (
          <div key={name}>
            <h4 className="mb-2 flex items-center gap-2 font-display text-lg font-bold"><Avatar name={name} size="sm" />{name} <span className="font-sans text-sm font-normal text-muted-foreground">{films.length} {films.length === 1 ? "film" : "films"}</span></h4>
            <ul className="flex flex-col gap-3">
              {shown.map(f => {
                const done = suggestions.some(s => key(s.title, s.year) === key(f.title, f.year))
                return (
                  <li key={f.title + f.year} className="rounded-lg bg-card p-2 ring-1 ring-foreground/10">
                    <MiniFilm title={f.title} year={f.year} note={`${name} gave it ${f.rating}${f.also.length ? ` · on ${f.also.join(", ")}'s watchlist` : ""}`}
                      action={<Button variant={done ? "ghost" : "outline"} disabled={done} className="h-9 shrink-0 self-start px-3 text-xs" onClick={() => suggest(f.title, f.year)}>{done ? "Suggested" : "Suggest"}</Button>} />
                  </li>
                )
              })}
            </ul>
            {films.length > SHOWN && <Button variant="ghost" className="mt-1 h-11 px-3 text-sm" onClick={() => setMore(m => ({ ...m, [name]: !open }))}>{open ? "Show fewer" : `Show ${films.length - SHOWN} more`}</Button>}
          </div>
        )
      })}
    </div>
  )
}
