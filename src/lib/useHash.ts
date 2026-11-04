import { useEffect, useState } from "react"

// names people are likely to type, mapped to the real tabs
const ALIAS: Record<string, string> = { suggestions: "suggest", suggestion: "suggest", watchlists: "watch", watchlist: "watch", film: "films", movies: "films", stat: "stats", "next-up": "next", profile: "me" }
const read = () => {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent)
  if (parts[0] && ALIAS[parts[0].toLowerCase()]) parts[0] = ALIAS[parts[0].toLowerCase()]
  return parts
}

/** Hash router: "#/films/12" -> ["films", "12"]. Browser back and forward just work. */
export function useHash() {
  const [parts, setParts] = useState(read)
  useEffect(() => {
    const f = () => { setParts(read()); window.scrollTo(0, 0) }
    window.addEventListener("hashchange", f)
    return () => window.removeEventListener("hashchange", f)
  }, [])
  return parts
}
export const go = (...p: (string | number)[]) => { location.hash = "/" + p.map(x => encodeURIComponent(String(x))).join("/") }
