import { useEffect, useState } from "react"
import { CountryFilms } from "@/components/CountryFilms"

type Shapes = Record<string, { n: string; d: string }>

/**
 * A world map shaded by how many films someone has watched from each country. Hover a country to read its count, click or tap it to see its best known and highest rated films.
 * The outlines load only when the map is shown (they're about 100 kB). `counts` is films per ISO country code.
 */
export function WorldMap({ counts, label, seen }: { counts: Record<string, number>; label: string; seen?: (title: string, year: number) => boolean }) {
  const [shapes, setShapes] = useState<Shapes | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  useEffect(() => { import("@/data/worldPaths.json").then(m => setShapes(m.default as Shapes)) }, [])
  if (!shapes) return <div className="aspect-[96/50] w-full animate-pulse rounded-xl bg-muted" aria-hidden />
  const max = Math.max(1, ...Object.values(counts))
  const fill = (code: string) => {
    const n = counts[code] ?? 0
    return n ? `color-mix(in oklab, var(--world) ${Math.round(35 + 65 * (Math.log(1 + n) / Math.log(1 + max)))}%, var(--card))` : "color-mix(in oklab, var(--foreground) 24%, var(--background))"
  }
  const shown = active ? `${shapes[active]?.n ?? active}: ${counts[active] ?? 0} ${(counts[active] ?? 0) === 1 ? "film" : "films"}` : "Hover a country, click or tap for its films"
  return (
    <figure data-no-swipe>
      <svg viewBox="0 0 960 500" role="img" aria-label={label} className="block h-auto w-full rounded-xl bg-background ring-1 ring-foreground/10" onPointerLeave={e => e.pointerType === "mouse" && setActive(null)}>
        {Object.entries(shapes).map(([code, s]) => (
          <path
            key={code} d={s.d} fill={fill(code)} stroke={active === code || picked === code ? "var(--foreground)" : "var(--background)"} strokeWidth={active === code || picked === code ? 1.4 : 0.5} strokeLinejoin="round" className="cursor-pointer" tabIndex={0} role="button" aria-label={`${s.n}: ${counts[code] ?? 0} films watched. Show its films`}
            onPointerEnter={() => setActive(code)} onPointerDown={() => setActive(code)} onClick={() => setPicked(code)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPicked(code) } }}
          />
        ))}
      </svg>
      <figcaption className="mt-2 flex min-h-8 items-center justify-between gap-3 text-sm" aria-live="polite">
        <b>{shown}</b>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-hidden>fewer<span className="h-2 w-20 rounded-full" style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--world) 35%, var(--card)), var(--world))" }} />more</span>
      </figcaption>
      {picked && <CountryFilms code={picked} name={shapes[picked]?.n ?? picked} seen={seen} />}
    </figure>
  )
}
