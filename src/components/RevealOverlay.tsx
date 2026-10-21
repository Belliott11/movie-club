import { useEffect, useState } from "react"
import { Avatar } from "@/components/Avatar"
import { Button } from "@/components/ui/button"
import { CountUp } from "@/components/CountUp"
import { fmt } from "@/lib/stats"

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches

/** The drumroll: scores come out one at a time, lowest first, and the club's average lands last. Everything shows at once under reduced motion. */
export function RevealOverlay({ film, scores, onClose }: { film: string; scores: { member: string; value: number }[]; onClose: () => void }) {
  const [shown, setShown] = useState(reduced() ? scores.length : 0)
  useEffect(() => {
    if (shown >= scores.length) return
    const t = setTimeout(() => setShown(s => s + 1), shown === 0 ? 900 : 1000)
    return () => clearTimeout(t)
  }, [shown, scores.length])
  const done = shown >= scores.length
  const average = scores.length ? scores.reduce((t, s) => t + s.value, 0) / scores.length : 0

  return (
    <div role="dialog" aria-modal="true" aria-label={`The scores for ${film}`} className="fixed inset-0 z-[95] flex flex-col items-center justify-center gap-5 bg-black/90 p-5 text-white">
      <p className="text-sm text-white/65">{done ? "The scores are in" : "Opening the envelopes…"}</p>
      <h2 className="text-center font-display text-3xl font-extrabold tracking-tight">{film}</h2>
      <ul className="flex w-full max-w-sm flex-col gap-2" aria-live="polite">
        {scores.slice(0, shown).map(s => (
          <li key={s.member} className="pop flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2">
            <Avatar name={s.member} />
            <span className="flex-1 text-lg font-medium">{s.member}</span>
            <span className="font-display text-3xl font-extrabold text-sun">{s.value}</span>
          </li>
        ))}
      </ul>
      {done && scores.length > 0 && (
        <p className="spring-in text-center">
          <span className="block text-sm text-white/65">Club average</span>
          <span className="font-display text-6xl font-extrabold"><CountUp value={average} format={v => fmt(v)} duration={1200} /></span>
        </p>
      )}
      {done && scores.length === 0 && <p className="text-white/70">Nobody sealed a score.</p>}
      <Button className="h-11 px-6" onClick={onClose} variant={done ? "default" : "secondary"}>{done ? "Done" : "Skip to the end"}</Button>
    </div>
  )
}
