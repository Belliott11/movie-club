const pos = (v: number) => `${(v / 5) * 100}%`

/** 0-5 ruler: red dot is the club's average, teal dot is everyone else's, the band between is the gap. */
export function Scale({ us, world }: { us: number | null; world: number | null }) {
  return (
    <div aria-hidden className="relative mt-2 h-6">
      <div className="absolute inset-x-0 top-[11px] h-0.5 bg-border" />
      {[1, 2, 3, 4].map(i => (
        <span key={i} className="absolute top-2 h-2.5 w-0.5 bg-border" style={{ left: pos(i) }} />
      ))}
      {us != null && world != null && (
        <span
          className={`grow absolute top-2.5 h-1.5 rounded-full opacity-40 ${us <= world ? "bg-gradient-to-r" : "bg-gradient-to-l"} from-us to-world`}
          style={{ left: pos(Math.min(us, world)), width: `${(Math.abs(us - world) / 5) * 100}%` }}
        />
      )}
      {world != null && <span className="pop absolute top-1 -ml-2 size-4 rounded-full border-[3px] border-card bg-world" style={{ left: pos(world), "--d": "350ms" } as React.CSSProperties} />}
      {us != null && <span className="pop absolute top-0.5 z-10 -ml-2.5 size-5 rounded-full border-[3px] border-card bg-us" style={{ left: pos(us), "--d": "200ms" } as React.CSSProperties} />}
    </div>
  )
}
