import { fmt } from "@/lib/stats"

/** Bars for how many ratings sit at each half-star step. Screen readers get the same numbers as a list. */
export function Histogram({ bins, label }: { bins: { v: number; n: number }[]; label: string }) {
  const max = Math.max(1, ...bins.map(b => b.n))
  return (
    <figure data-no-swipe>
      <div role="img" aria-label={label} className="flex h-28 items-end gap-1">
        {bins.map(b => (
          <div key={b.v} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[11px] leading-none text-muted-foreground">{b.n || ""}</span>
            <span className="w-full rounded-t bg-us" style={{ height: `${(b.n / max) * 100}%`, minHeight: b.n ? 3 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1" aria-hidden>
        {bins.map(b => <span key={b.v} className="flex-1 text-center text-[11px] text-muted-foreground">{b.v % 1 ? "" : b.v}</span>)}
      </div>
      <ul className="sr-only">{bins.map(b => <li key={b.v}>{b.v} stars: {b.n}</li>)}</ul>
    </figure>
  )
}

/** The group's average for each film in the order watched, with the best and worst marked. */
export function TrendChart({ points }: { points: { id: string | number; title: string; avg: number }[] }) {
  if (points.length < 2) return null
  const W = 640, H = 170, P = { l: 28, r: 10, t: 12, b: 18 }
  const x = (i: number) => P.l + (i / (points.length - 1)) * (W - P.l - P.r)
  const y = (v: number) => P.t + (1 - v / 5) * (H - P.t - P.b)
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.avg).toFixed(1)}`).join(" ")
  const hi = points.reduce((a, b) => (b.avg > a.avg ? b : a)), lo = points.reduce((a, b) => (b.avg < a.avg ? b : a))
  return (
    <figure data-no-swipe>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Group average per film, oldest to newest. Highest ${hi.title} ${fmt(hi.avg)}, lowest ${lo.title} ${fmt(lo.avg)}.`} className="h-auto w-full">
        {[1, 2, 3, 4, 5].map(v => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} />
            <text x={P.l - 6} y={y(v) + 4} textAnchor="end" className="fill-muted-foreground" fontSize={11}>{v}</text>
          </g>
        ))}
        <path d={d} fill="none" className="stroke-us" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => <circle key={p.id} cx={x(i)} cy={y(p.avg)} r={p === hi ? 5.5 : 3.5} className={p === hi ? "fill-gold" : "fill-us"} />)}
        <text x={x(points.indexOf(hi))} y={y(hi.avg) - 9} textAnchor="middle" className="fill-foreground" fontSize={11} fontWeight={600}>{hi.title}</text>
      </svg>
      <details className="mt-1 text-sm text-muted-foreground">
        <summary className="min-h-11 cursor-pointer py-2">Show the numbers</summary>
        <ol className="list-decimal pl-5">{points.map(p => <li key={p.id}>{p.title} {fmt(p.avg)}</li>)}</ol>
      </details>
    </figure>
  )
}
