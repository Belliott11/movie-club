import { useEffect, useState } from "react"

/** The 3-2-1 countdown at the head of a reel, shown while the club's data loads. Still (no sweep) under reduced motion. */
const LINES = ["Please silence your phones", "Dimming the lights", "Rolling the trailers", "Finding good seats", "Popping the corn"]

export function Leader({ label }: { label?: string }) {
  const [n, setN] = useState(3)
  const [line] = useState(() => label ?? LINES[Math.floor(Math.random() * LINES.length)])
  useEffect(() => {
    const t = setInterval(() => setN(x => (x <= 1 ? 3 : x - 1)), 800)
    return () => clearInterval(t)
  }, [])
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
      <div className="relative flex size-28 items-center justify-center rounded-full border-4 border-foreground/80">
        <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-foreground/40" />
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-foreground/40" />
        <span aria-hidden className="leader-sweep absolute inset-1 rounded-full" style={{ background: "conic-gradient(from 0deg, transparent 0 75%, color-mix(in oklab, var(--foreground) 22%, transparent) 100%)" }} />
        <span aria-hidden className="relative font-display text-6xl font-extrabold text-foreground">{n}</span>
      </div>
      <span>{line}…</span>
    </div>
  )
}
