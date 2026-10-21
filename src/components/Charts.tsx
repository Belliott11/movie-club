import { useId, useState, type CSSProperties, type PointerEvent } from "react"
import { fmt } from "@/lib/stats"

/**
 * Bars for how many ratings sit at each half-star step, shaded from magenta (low) to cyan (high). They grow up from the baseline in turn.
 * `average` and `median` are noted underneath. Screen readers get the same numbers as a list.
 */
export function Histogram({ bins, label, average, median }: { bins: { v: number; n: number }[]; label: string; average?: number | null; median?: number | null }) {
  const max = Math.max(1, ...bins.map(b => b.n))
  const at = (v: number) => `${((v * 2 - 1 + 0.5) / 10) * 100}%` // centre of that half-star's column
  return (
    <figure data-no-swipe>
      <div role="img" aria-label={label} className="flex h-32 items-end gap-1">
        {bins.map((b, i) => (
          <div key={b.v} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="fade-in text-[11px] leading-none text-muted-foreground" style={{ "--d": `${300 + i * 50}ms` } as CSSProperties}>{b.n || ""}</span>
            <span
              className="grow-y w-full rounded-t"
              style={{
                height: `${(b.n / max) * 80}%`, minHeight: b.n ? 4 : 0, "--d": `${i * 50}ms`,
                background: `color-mix(in oklab, var(--world) ${((b.v - 0.5) / 4.5) * 100}%, var(--us))`,
              } as CSSProperties}
            />
          </div>
        ))}
      </div>
      <div className="relative mt-1 h-9" aria-hidden>
        <div className="flex gap-1">
          {bins.map(b => <span key={b.v} className="flex-1 text-center text-[11px] text-muted-foreground">{b.v % 1 ? "" : b.v}</span>)}
        </div>
        {average != null && (
          <span className="fade-in absolute top-4 -translate-x-1/2 text-xs font-semibold" style={{ left: at(average), "--d": "700ms" } as CSSProperties}>
            <span className="mx-auto block h-1.5 w-px bg-foreground" />avg {fmt(average, 1)}
          </span>
        )}
      </div>
      {median != null && <figcaption className="text-xs text-muted-foreground">Middle rating {fmt(median, 1)}</figcaption>}
      <ul className="sr-only">{bins.map(b => <li key={b.v}>{b.v} stars: {b.n}</li>)}</ul>
    </figure>
  )
}

/**
 * The group's average for each film in the order watched. The line draws itself on, the points pop in after it, and you can
 * press or drag along the chart to read any film. The dashed line is the club's overall average.
 */
export function TrendChart({ points, average }: { points: { id: string | number; title: string; avg: number }[]; average?: number | null }) {
  const gid = useId()
  const [active, setActive] = useState<number | null>(null)
  if (points.length < 2) return null
  const n = points.length
  const W = 420, H = 210, P = { l: 24, r: 10, t: 24, b: 16 }
  const x = (i: number) => P.l + (i / (n - 1)) * (W - P.l - P.r)
  const y = (v: number) => P.t + (1 - v / 5) * (H - P.t - P.b)
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.avg).toFixed(1)}`).join(" ")
  const area = `${line} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`
  const mean = average ?? points.reduce((t, p) => t + p.avg, 0) / n
  const hi = points.reduce((a, b) => (b.avg > a.avg ? b : a)), lo = points.reduce((a, b) => (b.avg < a.avg ? b : a))
  const locate = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    setActive(Math.min(n - 1, Math.max(0, Math.round(((px - P.l) / (W - P.l - P.r)) * (n - 1)))))
  }
  const shown = active ?? points.indexOf(hi)
  return (
    <figure data-no-swipe>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Group average per film, oldest to newest. Highest ${hi.title} ${fmt(hi.avg)}, lowest ${lo.title} ${fmt(lo.avg)}. Club average ${fmt(mean)}.`}
        className="h-auto w-full touch-pan-y"
        onPointerMove={locate}
        onPointerDown={locate}
        onPointerLeave={e => e.pointerType === "mouse" && setActive(null)}
      >
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--us)", stopOpacity: 0.34 }} />
            <stop offset="100%" style={{ stopColor: "var(--us)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        {[1, 2, 3, 4, 5].map(v => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} />
            <text x={P.l - 6} y={y(v) + 4} textAnchor="end" className="fill-muted-foreground" fontSize={11}>{v}</text>
          </g>
        ))}
        <line x1={P.l} x2={W - P.r} y1={y(mean)} y2={y(mean)} className="stroke-world" strokeWidth={1.5} strokeDasharray="5 5" />
        <path d={area} fill={`url(#${gid})`} className="fade-in" style={{ "--d": "0.9s" } as CSSProperties} />
        <path d={line} pathLength={1} fill="none" className="draw stroke-us" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {active != null && <line x1={x(active)} x2={x(active)} y1={P.t - 6} y2={y(0)} className="stroke-foreground" strokeWidth={1} opacity={0.35} />}
        {points.map((p, i) => (
          <circle
            key={p.id}
            cx={x(i)} cy={y(p.avg)}
            r={i === active ? 6.5 : p === hi ? 6 : p === lo ? 5 : 3.5}
            className={`pop ${p === hi ? "fill-sun" : p === lo ? "fill-world" : "fill-us"}`}
            style={{ "--d": `${500 + i * 35}ms`, transformBox: "fill-box", transformOrigin: "center" } as CSSProperties}
          />
        ))}
      </svg>
      <figcaption className="flex min-h-11 items-baseline justify-between gap-3 text-sm" aria-live="polite">
        <span><b>{points[shown].title}</b>{active == null && " is the highest"}</span>
        <span className="font-display text-xl font-bold">{fmt(points[shown].avg)}</span>
      </figcaption>
      <p className="text-xs text-muted-foreground"><span className="mr-1 inline-block h-0 w-5 border-t-2 border-dashed border-world align-middle" />Club average {fmt(mean)}. Press and drag along the chart to read each film.</p>
      <details className="text-sm text-muted-foreground">
        <summary className="min-h-11 cursor-pointer py-2">Show the numbers</summary>
        <ol className="list-decimal pl-5">{points.map(p => <li key={p.id}>{p.title} {fmt(p.avg)}</li>)}</ol>
      </details>
    </figure>
  )
}
