import { useEffect, useRef, useState } from "react"

const THRESHOLD = 72
const MAX = 110

/**
 * Pull down from the top of the page on a touch screen to run onRefresh.
 * Off while a form field is focused or when the touch starts on [data-no-pull], inputs or selects.
 * Returns how far the page is pulled (0-110) and whether a refresh is running.
 */
export function usePull(onRefresh: () => Promise<void>) {
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const state = useRef({ y0: 0, x0: 0, active: false, dist: 0 })
  const run = useRef(onRefresh)
  run.current = onRefresh

  useEffect(() => {
    const s = state.current
    const start = (e: TouchEvent) => {
      const el = e.target as HTMLElement
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName || "")
      s.active = window.scrollY <= 0 && !typing && e.touches.length === 1 && !el.closest("[data-no-pull],input,select,textarea,[role=listbox]")
      s.y0 = e.touches[0].clientY; s.x0 = e.touches[0].clientX; s.dist = 0
    }
    const move = (e: TouchEvent) => {
      if (!s.active) return
      const dy = e.touches[0].clientY - s.y0, dx = e.touches[0].clientX - s.x0
      if (dy <= 0 || Math.abs(dx) > dy) { s.dist = 0; setPull(0); return }
      s.dist = Math.min(MAX, dy * 0.5) // resistance, so it feels like a pull
      setPull(s.dist)
    }
    const end = async () => {
      if (!s.active) return
      const hit = s.dist >= THRESHOLD
      s.active = false; s.dist = 0
      if (!hit) { setPull(0); return }
      setBusy(true); setPull(THRESHOLD * 0.7)
      try { await run.current() } finally { setBusy(false); setPull(0) }
    }
    document.addEventListener("touchstart", start, { passive: true })
    document.addEventListener("touchmove", move, { passive: true })
    document.addEventListener("touchend", end, { passive: true })
    document.addEventListener("touchcancel", end, { passive: true })
    return () => {
      document.removeEventListener("touchstart", start); document.removeEventListener("touchmove", move)
      document.removeEventListener("touchend", end); document.removeEventListener("touchcancel", end)
    }
  }, [])

  return { pull, busy, ready: pull >= THRESHOLD }
}
