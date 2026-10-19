const KEY = "theme"
export type Theme = "light" | "dark"

export const isDark = () => document.documentElement.classList.contains("dark")
export const storedTheme = (): Theme | null => {
  try { const t = localStorage.getItem(KEY); return t === "light" || t === "dark" ? t : null } catch { return null }
}

/** Sets and remembers the theme. Until someone picks one, the site follows the device. */
export function setTheme(t: Theme) {
  try { localStorage.setItem(KEY, t) } catch { /* private mode */ }
  document.documentElement.classList.toggle("dark", t === "dark")
}

/** Switches the theme with the house lights going down (or up): the screen dims to near-black, swaps, then fades back. */
export function flipLights(onDone?: (t: Theme) => void) {
  const next: Theme = isDark() ? "light" : "dark"
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setTheme(next); onDone?.(next); return }
  const veil = Object.assign(document.createElement("div"), { ariaHidden: "true" })
  veil.style.cssText = "position:fixed;inset:0;z-index:100;background:#05070d;opacity:0;pointer-events:none;transition:opacity 380ms ease-in"
  document.body.append(veil)
  requestAnimationFrame(() => { veil.style.opacity = "0.92" })
  setTimeout(() => {
    setTheme(next)
    onDone?.(next)
    veil.style.transition = "opacity 520ms ease-out"
    veil.style.opacity = "0"
    setTimeout(() => veil.remove(), 560)
  }, 400)
}
