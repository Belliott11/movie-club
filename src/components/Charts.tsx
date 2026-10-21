import { useId, useState, type CSSProperties, type PointerEvent } from "react"
import { fmt } from "@/lib/stats"

/**
 * Bars for how many ratings sit at each half-star step, shaded from red (low) through amber to teal (high). They grow up from the baseline in turn.
 * `average` and `median` are noted underneath. Screen readers get the same numbers as a list.
 */
/** Low scores run red, the middle amber, high scores teal. */
export const scale = (t: number) => t < 0.5
  ? `color-mix(in oklab, var(--sun) ${t * 200}%, var(--us))`
  : `color-mix(in oklab, var(--world) ${(t - 0.5) * 200}%, var(--sun))`

export function Histogram({ bins, label, average, median }: { bins: { v: number; n: number }[]; label: string; average?: number | null; median?: number | null }) {
  const max = Math.max(1, ...bins.map(b => b.n))
  const at = (v: number) => `${((v * 2 - 1 + 0.5) / 10) * 100}%` // centre of that half-star's column
  const top = Math.max(2, max) // the tallest bar fills the plot, gridlines sit at quarter steps of it
  return (
    <figure data-no-swipe>
      <div className="relative pt-7">
        <div role="img" aria-label={label} className="relative flex h-32 items-end gap-1.5 border-b border-foreground/40">
          {[0.5, 1].map(f => <span key={f} aria-hidden className="absolute inset-x-0 border-t border-dashed border-border" style={{ bottom: `${f * 100}%` }} />)}
          {bins.map((b, i) => (
            <div key={b.v} className="relative z-10 flex h-full flex-1 flex-col items-center justify-end">
              <span className="fade-in mb-1 text-xs leading-none font-semibold" style={{ "--d": `${300 + i * 50}ms` } as CSSProperties}>{b.n || ""}</span>
              <span
                className="grow-y w-full rounded-t-md"
                style={{
                  height: `${(b.n / top) * 88}%`, minHeight: b.n ? 6 : 0, "--d": `${i * 50}ms`,
                  background: scale((b.v - 0.5) / 4.5), boxShadow: "inset 0 -10px 14px -10px rgb(0 0 0 / 0.25)",
                } as CSSProperties}
              />
            </div>
          ))}
          {average != null && (
            <span aria-hidden className="fade-in absolute -top-7 bottom-0 z-20 w-px -translate-x-1/2 bg-foreground" style={{ left: at(average), "--d": "700ms" } as CSSProperties}>
              <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-background">avg {fmt(average, 1)}</span>
            </span>
          )}
        </div>
        <div className="mt-1 flex gap-1.5" aria-hidden>
          {bins.map(b => <span key={b.v} className="flex-1 text-center text-[11px] text-muted-foreground">{b.v % 1 ? "" : b.v}</span>)}
        </div>
      </div>
      {median != null && <figcaption className="mt-1 text-xs text-muted-foreground">Middle rating {fmt(median, 1)}</figcaption>}
      <ul className="sr-only">{bins.map(b => <li key={b.v}>{b.v} stars: {b.n}</li>)}</ul>
    </figure>
  )
}

/**
 * The group's average for each film in the order watched. The line draws itself on, the points pop in after it, and you can
 * press or drag along the chart to read any film. The axis zooms to the ratings that occur. The dashed line is the club's overall average.
 */
export function TrendChart({ points, average }: { points: { id: string | number; title: string; avg: number }[]; average?: number | null }) {
  const gid = useId()
  const [active, setActive] = useState<number | null>(null)
  if (points.length < 2) return null
  const n = points.length
  const W = 420, H = 250, P = { l: 24, r: 14, t: 30, b: 26 }
  // zoom the scale to where the ratings actually live, so ups and downs are visible
  const dMin = Math.max(0, Math.floor(Math.min(...points.map(p => p.avg)) - 0.5)), dMax = Math.min(5, Math.ceil(Math.max(...points.map(p => p.avg)) + 0.5))
  const ticks = Array.from({ length: dMax - dMin + 1 }, (_, i) => dMin + i)
  const step = Math.ceil(n / 6)
  const x = (i: number) => P.l + (i / (n - 1)) * (W - P.l - P.r)
  const y = (v: number) => P.t + (1 - (v - dMin) / (dMax - dMin)) * (H - P.t - P.b)
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.avg).toFixed(1)}`).join(" ")
  const area = `${line} L${x(n - 1).toFixed(1)},${y(dMin)} L${x(0).toFixed(1)},${y(dMin)} Z`
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
        {ticks.map(v => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} />
            <text x={P.l - 6} y={y(v) + 4} textAnchor="end" className="fill-muted-foreground" fontSize={11}>{v}</text>
          </g>
        ))}
        <line x1={P.l} x2={W - P.r} y1={y(mean)} y2={y(mean)} className="stroke-world" strokeWidth={1.5} strokeDasharray="5 5" />
        <path d={area} fill={`url(#${gid})`} className="fade-in" style={{ "--d": "0.9s" } as CSSProperties} />
        <path d={line} pathLength={1} fill="none" className="draw stroke-us" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {active != null && <line x1={x(active)} x2={x(active)} y1={P.t - 6} y2={y(dMin)} className="stroke-foreground" strokeWidth={1} opacity={0.35} />}
        {points.map((_, i) => (i % step === 0 || i === n - 1) && (
          <text key={`t${i}`} x={x(i)} y={H - 8} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>{i + 1}</text>
        ))}
        <text x={W - P.r} y={y(mean) - 5} textAnchor="end" className="fill-world font-semibold" fontSize={10}>club avg {fmt(mean, 1)}</text>
        {[hi, lo].map((p, k) => {
          const i = points.indexOf(p), left = i > n / 2
          return <text key={k} x={x(i) + (left ? -9 : 9)} y={y(p.avg) + (k ? 15 : -9)} textAnchor={left ? "end" : "start"} className="fill-foreground font-semibold" fontSize={10}>{p.title.length > 18 ? `${p.title.slice(0, 17)}…` : p.title} {fmt(p.avg, 1)}</text>
        })}
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
