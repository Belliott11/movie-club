import { useEffect, useState } from "react"
import { Palette, X } from "lucide-react"
import { applyFonts, DEFAULT_FONTS, FONT_PRESETS, loadAllFonts } from "@/lib/fonts"
import { applyTheme, MODES, THEMES } from "@/lib/theme"
import { usePref } from "@/lib/prefs"

/** A button that opens the palette and light/dark choices. Both are remembered on this device. */
export function ThemeMenu() {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = usePref("theme-v1", "cinema")
  const [mode, setMode] = usePref("mode-v1", "auto")
  const [fonts, setFonts] = usePref("fonts-v1", DEFAULT_FONTS)
  useEffect(() => { applyTheme(theme, mode) }, [theme, mode])
  useEffect(() => { applyFonts(fonts) }, [fonts])
  useEffect(() => { if (open) loadAllFonts() }, [open])
  return (
    <>
      <button type="button" aria-label="Theme" aria-haspopup="dialog" onClick={() => setOpen(true)} className="flex size-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"><Palette className="size-5" aria-hidden /></button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Theme" className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={() => setOpen(false)} onKeyDown={e => { if (e.key === "Escape") setOpen(false) }}>
          <div className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-2xl bg-card p-4 text-card-foreground shadow-xl ring-1 ring-foreground/10" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xl font-bold">Theme</h3>
              <button type="button" autoFocus aria-label="Close" onClick={() => setOpen(false)} className="flex size-11 items-center justify-center rounded-full hover:bg-muted"><X className="size-5" /></button>
            </div>
            <div role="radiogroup" aria-label="Palette" className="grid grid-cols-2 gap-2">
              {THEMES.map(t => (
                <button key={t.id} type="button" role="radio" aria-checked={theme === t.id} onClick={() => setTheme(t.id)} className={`flex min-h-11 items-center gap-2 rounded-xl p-2 text-left ring-1 ${theme === t.id ? "bg-muted ring-2 ring-foreground" : "ring-foreground/15 hover:bg-muted"}`}>
                  <span className="flex h-6 w-14 shrink-0 overflow-hidden rounded-md" style={{ background: t.sw[0] }} aria-hidden>
                    {t.sw.slice(1).map(c => <span key={c} className="mx-auto my-auto size-3.5 rounded-full" style={{ background: c }} />)}
                  </span>
                  <span className="font-medium">{t.label}</span>
                </button>
              ))}
            </div>
            <h4 className="mt-4 mb-1 text-lg font-bold">Heading font</h4>
            <div role="radiogroup" aria-label="Heading font" className="flex flex-col">
              {FONT_PRESETS.map(p => (
                <button key={p.id} type="button" role="radio" aria-checked={fonts === p.id} onClick={() => setFonts(p.id)} className={`flex min-h-12 items-center justify-between gap-3 border-b border-border px-1 py-1.5 text-left ${fonts === p.id ? "bg-muted" : "hover:bg-muted/60"}`}>
                  <span className="text-xl leading-none" style={{ fontFamily: `${p.title}, sans-serif`, fontWeight: p.weight }}>{p.label}</span>
                  <span className="text-right text-[11px] text-muted-foreground">{p.from}</span>
                </button>
              ))}
            </div>
            <div role="radiogroup" aria-label="Light or dark" className="mt-4 flex gap-1 rounded-full bg-muted p-1">
              {MODES.map(([id, label]) => (
                <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => setMode(id)} className={`min-h-9 flex-1 rounded-full px-2 text-sm ${mode === id ? "bg-foreground font-medium text-background" : "text-muted-foreground"}`}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
