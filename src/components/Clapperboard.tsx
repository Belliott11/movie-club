import { useEffect } from "react"

/** The easter egg: a slate filled in with the club's real numbers. Closes on tap, Escape, or after a few seconds. */
export function Clapperboard({ fields, onClose }: { fields: [string, string][]; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", key)
    return () => { clearTimeout(t); window.removeEventListener("keydown", key) }
  }, [onClose])
  return (
    <div role="dialog" aria-label="Clapperboard" className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xs drop-shadow-2xl">
        <div
          aria-hidden
          className="clapper h-9 origin-bottom-left rounded-t-md border-2 border-white/90"
          style={{ background: "repeating-linear-gradient(115deg, #fff 0 16px, #0b0b0f 16px 32px)" }}
        />
        <div className="rounded-b-md border-2 border-t-0 border-white/90 bg-[#0b0b0f] p-4 text-white">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {fields.map(([l, v]) => (
              <div key={l} className={l === "Production" || l === "Director" ? "col-span-2" : ""}>
                <dt className="text-xs text-white/55">{l}</dt>
                <dd className="font-display text-xl leading-tight font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-center text-xs text-white/45">Quiet on set. Tap to close.</p>
        </div>
      </div>
    </div>
  )
}
