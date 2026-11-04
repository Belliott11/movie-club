import { useEffect, useState } from "react"

/** What shows while a tab's code loads: nothing for a moment (most loads are quicker than that), then a quiet "Loading". The countdown is kept for the first load of the club's data. */
export function Pending() {
  const [late, setLate] = useState(false)
  useEffect(() => { const t = setTimeout(() => setLate(true), 400); return () => clearTimeout(t) }, [])
  return <div role="status" aria-busy className="min-h-[40vh] py-10 text-center text-sm text-muted-foreground">{late ? "Loading…" : ""}</div>
}
