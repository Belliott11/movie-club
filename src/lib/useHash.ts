import { useEffect, useState } from "react"

const read = () => location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent)

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
