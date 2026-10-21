import { useEffect, useState } from "react"

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches

/**
 * A number that counts up from zero the first time it appears. Ends on exactly `format(value)`, so what you read
 * is always the real figure. Shows the final number straight away under reduced motion.
 */
export function CountUp({ value, format = (n: number) => String(Math.round(n)), duration = 1000 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const [shown, setShown] = useState<number | null>(reduced() ? value : null)
  useEffect(() => {
    if (reduced()) { setShown(value); return }
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      setShown(p === 1 ? value : value * (1 - Math.pow(1 - p, 4))) // fast at first, easing into the final figure
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <span className="num">{format(shown ?? 0)}</span>
}
