import { IMG } from "@/lib/api"
import { key } from "@/lib/stats"
import { useStore } from "@/lib/store"

/** A film's poster from the per-browser cache, with a quiet placeholder until it loads. `badge` sits on the poster's corner. */
export function PosterThumb({ title, year, badge, className = "w-14", gold = false }: { title: string; year: number; badge?: string | number | null; className?: string; gold?: boolean }) {
  const { mini } = useStore()
  const p = mini[key(title, year)]?.p
  return (
    <span className={`relative inline-block shrink-0 ${className}`}>
      {p ? <img src={`${IMG}w185${p}`} alt="" loading="lazy" className="aspect-[2/3] w-full rounded-md object-cover" /> : <span className="block aspect-[2/3] w-full rounded-md bg-muted" />}
      {badge != null && (
        <span className={`absolute -right-1 -bottom-1 min-w-7 rounded-full px-1.5 py-0.5 text-center font-display text-sm leading-none font-bold shadow ring-2 ring-card ${gold ? "bg-gold text-background" : "bg-foreground text-background"}`}>{badge}</span>
      )}
    </span>
  )
}
