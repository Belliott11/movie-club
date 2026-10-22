import { useCallback, useSyncExternalStore } from "react"

/** A setting kept on this device that every component reading it follows (change it in one place, the others update). */
export function usePref<T>(name: string, fallback: T): [T, (v: T) => void] {
  const subscribe = useCallback((cb: () => void) => {
    addEventListener("pref-changed", cb)
    addEventListener("storage", cb)
    return () => { removeEventListener("pref-changed", cb); removeEventListener("storage", cb) }
  }, [])
  const raw = useSyncExternalStore(subscribe, () => localStorage.getItem(name) ?? "")
  let value = fallback
  try { if (raw) value = JSON.parse(raw) as T } catch { /* keep the default */ }
  const set = useCallback((v: T) => {
    try { localStorage.setItem(name, JSON.stringify(v)) } catch { /* private mode: it just won't stick */ }
    dispatchEvent(new Event("pref-changed"))
  }, [name])
  return [value, set]
}
