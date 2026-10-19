import { useId } from "react"
import { fmt } from "@/lib/stats"

/**
 * Bars for how many ratings sit at each half-star step, colored from low (red) to high (gold).
 * `average` and `median` draw markers along the bottom. Screen readers get the same numbers as a list.
 */
export function Histogram({ bins, label, average, median }: { bins: { v: number; n: number }[]; label: string; average?: number | null; median?: number | null }) {
  const max = Math.max(1, ...bins.map(b => b.n))
  const at = (v: number) => `${(((v * 2 - 1) + 0.5) / 10) * 100}%` // centre of that half-star's column
  return (
    <figure data-no-swipe>
      <div role="img" aria-label={label} className="flex h-32 items-end gap-1">
        {bins.map(b => (
          <div key={b.v} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[11px] leading-none text-muted-foreground">{b.n || ""}</span>
            <span
              className="rise w-full rounded-t"
              style={{ height: `${(b.n / max) * 80}%`, minHeight: b.n ? 4 : 0, background: `color-mix(in oklab, var(--us) ${100 - ((b.v - 0.5) / 4.5) * 100}%, var(--gold))` }}
            />
          </div>
        ))}
      </div>
      <div className="relative mt-1 h-9" aria-hidden>
        <div className="flex gap-1">
          {bins.map(b => <span key={b.v} className="flex-1 text-center text-[11px] text-muted-foreground">{b.v % 1 ? "" : b.v}</span>)}
        </div>
        {average != null && (
          <span className="absolute top-4 -translate-x-1/2 text-xs font-semibold" style={{ left: at(average) }}>
            <span className="mx-auto block h-1.5 w-px bg-foreground" />avg {fmt(average, 1)}
          </span>
        )}
      </div>
      {median != null && <figcaption className="text-xs text-muted-foreground">Middle rating {fmt(median, 1)}</figcaption>}
      <ul className="sr-only">{bins.map(b => <li key={b.v}>{b.v} stars: {b.n}</li>)}</ul>
    </figure>
  )
}

/** The group's average for each film in the order watched. A dashed line marks 3.5, the "we liked it" bar. */
export function TrendChart({ points }: { points: { id: string | number; title: string; avg: number }[] }) {
  const gid = useId()
  if (points.length < 2) return null
  const W = 420, H = 210, P = { l: 24, r: 10, t: 24, b: 16 }
  const x = (i: number) => P.l + (i / (points.length - 1)) * (W - P.l - P.r)
  const y = (v: number) => P.t + (1 - v / 5) * (H - P.t - P.b)
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.avg).toFixed(1)}`).join(" ")
  const area = `${line} L${x(points.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`
  const hi = points.reduce((a, b) => (b.avg > a.avg ? b : a)), lo = points.reduce((a, b) => (b.avg < a.avg ? b : a))
  const label = (p: typeof hi, dy: number, cls: string) => {
    const i = points.indexOf(p), anchor = i < 2 ? "start" : i > points.length - 3 ? "end" : "middle"
    return <text x={x(i)} y={y(p.avg) + dy} textAnchor={anchor} className={cls} fontSize={11} fontWeight={600}>{p.title} {fmt(p.avg)}</text>
  }
  return (
    <figure data-no-swipe>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Group average per film, oldest to newest. Highest ${hi.title} ${fmt(hi.avg)}, lowest ${lo.title} ${fmt(lo.avg)}.`} className="h-auto w-full">
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--us)", stopOpacity: 0.32 }} />
            <stop offset="100%" style={{ stopColor: "var(--us)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        {[1, 2, 3, 4, 5].map(v => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} />
            <text x={P.l - 6} y={y(v) + 4} textAnchor="end" className="fill-muted-foreground" fontSize={11}>{v}</text>
          </g>
        ))}
        <line x1={P.l} x2={W - P.r} y1={y(3.5)} y2={y(3.5)} className="stroke-pos" strokeWidth={1.5} strokeDasharray="5 5" />
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" className="stroke-us" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => <circle key={p.id} cx={x(i)} cy={y(p.avg)} r={p === hi ? 6 : p === lo ? 5 : 3.5} className={p === hi ? "fill-gold" : p === lo ? "fill-world" : "fill-us"} />)}
        {label(hi, -10, "fill-foreground")}
        {lo !== hi && label(lo, 17, "fill-muted-foreground")}
      </svg>
      <p className="mt-1 text-xs text-muted-foreground"><span className="mr-1 inline-block h-0 w-5 border-t-2 border-dashed border-pos align-middle" />3.5 and up counts as liked</p>
      <details className="text-sm text-muted-foreground">
        <summary className="min-h-11 cursor-pointer py-2">Show the numbers</summary>
        <ol className="list-decimal pl-5">{points.map(p => <li key={p.id}>{p.title} {fmt(p.avg)}</li>)}</ol>
      </details>
    </figure>
  )
}
