import { useEffect, useState } from "react"
import { Collapse } from "@/components/Collapse"
import { FilmSearch } from "@/components/FilmSearch"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"

type Slot = { t: string; y: number }

/** Pick your four favorite films, in order. They replace the Letterboxd top-rated list on your page and seed your suggestions. */
export function FavoritesEditor({ name }: { name: string }) {
  const { favs, setFavs } = useStore()
  const saved = favs[name] ?? []
  const blank = (): Slot[] => Array.from({ length: 4 }, (_, i) => saved[i] ?? { t: "", y: 0 })
  const [slots, setSlots] = useState<Slot[]>(blank)
  useEffect(() => { setSlots(blank()) }, [JSON.stringify(saved)]) // eslint-disable-line react-hooks/exhaustive-deps
  const filled = slots.filter(s => s.t.trim())
  return (
    <Collapse id="mp-favedit" title="My four favorites" defaultOpen={false}>
      <form className="flex flex-col gap-2" onSubmit={e => { e.preventDefault(); setFavs(name, filled.map(s => ({ t: s.t.trim(), y: s.y }))) }}>
        {slots.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-center font-display text-lg font-bold text-muted-foreground">{i + 1}</span>
            <FilmSearch aria-label={`Favorite number ${i + 1}`} placeholder="Start typing a film" value={s.t} onChange={t => setSlots(a => a.map((x, j) => (j === i ? { t, y: t === x.t ? x.y : 0 } : x)))} onPick={h => setSlots(a => a.map((x, j) => (j === i ? { t: h.title, y: h.year ?? 0 } : x)))} />
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="h-11 px-4" disabled={!filled.length}>Save my favorites</Button>
          {saved.length > 0 && <Button type="button" variant="ghost" className="h-11 px-4" onClick={() => setFavs(name, [])}>Go back to my top-rated</Button>}
        </div>
      </form>
    </Collapse>
  )
}
