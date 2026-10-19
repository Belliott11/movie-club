import { useEffect } from "react"

/**
 * Horizontal swipe on touch screens. Calls left() when the finger moves left (next tab), right() for previous.
 * Add data-no-swipe to anything that scrolls or drags sideways (charts, tables, sliders); form fields are skipped too.
 */
export function useSwipe(left: () => void, right: () => void) {
  useEffect(() => {
    let x0 = 0, y0 = 0, t0 = 0, skip = true
    const start = (e: TouchEvent) => {
      const t = e.touches[0]
      x0 = t.clientX; y0 = t.clientY; t0 = Date.now()
      skip = e.touches.length > 1 || !!(e.target as HTMLElement).closest("[data-no-swipe],input,select,textarea,[role=listbox],[role=tablist]")
    }
    const end = (e: TouchEvent) => {
      if (skip) return
      const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0
      if (Date.now() - t0 > 600 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return
      dx < 0 ? left() : right()
    }
    document.addEventListener("touchstart", start, { passive: true })
    document.addEventListener("touchend", end, { passive: true })
    return () => { document.removeEventListener("touchstart", start); document.removeEventListener("touchend", end) }
  }, [left, right])
}
