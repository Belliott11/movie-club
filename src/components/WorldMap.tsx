import { useEffect, useState } from "react"

type Shapes = Record<string, { n: string; d: string }>

/**
 * A world map shaded by how many films someone has watched from each country. Hover or tap a country to read its count.
 * The outlines load only when the map is shown (they're about 100 kB). `counts` is films per ISO country code.
 */
export function WorldMap({ counts, label }: { counts: Record<string, number>; label: string }) {
  const [shapes, setShapes] = useState<Shapes | null>(null)
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => { import("@/data/worldPaths.json").then(m => setShapes(m.default as Shapes)) }, [])
  if (!shapes) return <div className="aspect-[96/50] w-full animate-pulse rounded-xl bg-muted" aria-hidden />
  const max = Math.max(1, ...Object.values(counts))
  const fill = (code: string) => {
    const n = counts[code] ?? 0
    return n ? `color-mix(in oklab, var(--world) ${Math.round(30 + 70 * (Math.log(1 + n) / Math.log(1 + max)))}%, var(--muted))` : "var(--muted)"
  }
  const shown = active ? `${shapes[active]?.n ?? active}: ${counts[active] ?? 0} ${(counts[active] ?? 0) === 1 ? "film" : "films"}` : "Hover or tap a country"
  return (
    <figure data-no-swipe>
      <svg viewBox="0 0 960 500" role="img" aria-label={label} className="block h-auto w-full rounded-xl bg-card ring-1 ring-foreground/10" onPointerLeave={e => e.pointerType === "mouse" && setActive(null)}>
        {Object.entries(shapes).map(([code, s]) => (
          <path
            key={code} d={s.d} fill={fill(code)} stroke={active === code ? "var(--foreground)" : "var(--card)"} strokeWidth={active === code ? 1.4 : 0.5} strokeLinejoin="round"
            onPointerEnter={() => setActive(code)} onPointerDown={() => setActive(code)}
          />
        ))}
      </svg>
      <figcaption className="mt-2 flex min-h-8 items-center justify-between gap-3 text-sm" aria-live="polite">
        <b>{shown}</b>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-hidden>fewer<span className="h-2 w-20 rounded-full" style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--world) 30%, var(--muted)), var(--world))" }} />more</span>
      </figcaption>
    </figure>
  )
}
