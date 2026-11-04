import { useState } from "react"
import { Button } from "@/components/ui/button"
import { go } from "@/lib/useHash"
import { useStore } from "@/lib/store"

/** One tap, one confirm: puts the film on the main page as this week's pick, linked to the card on the table. Only the person who may pick sees it. */
export function PickFilm({ title, year, tmdbId, cardId }: { title: string; year: number; tmdbId?: number | null; cardId?: string | null }) {
  const { addMovie, canPick, me, movies } = useStore()
  const [sure, setSure] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!canPick || !me) return null
  const n = Math.max(0, ...movies.map(m => m.seq)) + 1
  if (!sure) return <Button className="mt-0.5 h-9 w-full px-1 text-xs" onClick={() => setSure(true)}>Pick this</Button>
  return (
    <div className="mt-1 flex flex-col gap-1">
      <p className="text-xs leading-tight">Film {n}, picked by {me}?</p>
      <Button className="h-9 w-full px-1 text-xs" disabled={busy} onClick={async () => { setBusy(true); await addMovie(title, year, me, {}, tmdbId ?? null, cardId ?? null); go("films") }}>{busy ? "Adding…" : "Yes, add it"}</Button>
      <Button variant="ghost" className="h-9 w-full px-1 text-xs" disabled={busy} onClick={() => setSure(false)}>Cancel</Button>
    </div>
  )
}
