import { useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { IMG } from "@/lib/api"

/** Fullscreen viewer for a set of TMDB images. Arrow keys and the buttons move through them; Escape, the X or a tap outside closes it. */
export function Lightbox({ paths, start, kind, label, onClose, extra }: { paths: string[]; start: number; kind: "still" | "poster"; label: string; onClose: () => void; extra?: (path: string) => ReactNode }) {
  const [i, setI] = useState(start)
  const closeRef = useRef<HTMLButtonElement>(null)
  const go = (d: number) => setI(x => (x + d + paths.length) % paths.length)
  useEffect(() => {
    closeRef.current?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowRight") go(1)
      else if (e.key === "ArrowLeft") go(-1)
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const btn = "flex size-12 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
  return (
    <div role="dialog" aria-modal="true" aria-label={`${label}: ${kind} ${i + 1} of ${paths.length}`} className="fixed inset-0 z-[95] flex flex-col items-center justify-center gap-3 bg-black/92 p-4" onClick={onClose}>
      <button ref={closeRef} type="button" aria-label="Close" onClick={onClose} className={`${btn} absolute top-3 right-3`}><X /></button>
      <img src={`${IMG}${kind === "still" ? "w1280" : "w780"}${paths[i]}`} alt="" className="max-h-[78vh] max-w-full rounded-lg object-contain shadow-2xl" onClick={e => e.stopPropagation()} />
      <div className="flex items-center gap-4 text-white" onClick={e => e.stopPropagation()}>
        {paths.length > 1 && <button type="button" aria-label="Previous" onClick={() => go(-1)} className={btn}><ChevronLeft /></button>}
        <span className="min-w-14 text-center text-sm text-white/70">{i + 1} / {paths.length}</span>
        {paths.length > 1 && <button type="button" aria-label="Next" onClick={() => go(1)} className={btn}><ChevronRight /></button>}
      </div>
      {extra && <div onClick={e => e.stopPropagation()}>{extra(paths[i])}</div>}
    </div>
  )
}
