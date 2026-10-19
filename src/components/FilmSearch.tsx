import { useEffect, useId, useRef, useState } from "react"
import { hasTmdb, IMG, tmdb } from "@/lib/api"
import { Input } from "@/components/ui/input"

export type FilmHit = { id: number; title: string; year: number | null; poster: string | null }

/** Title field that suggests films from TMDB as you type. Falls back to a plain input without a TMDB key. */
export function FilmSearch({ value, onChange, onPick, ...rest }: {
  value: string
  onChange: (text: string) => void
  onPick: (hit: FilmHit) => void
} & Omit<React.ComponentProps<"input">, "value" | "onChange">) {
  const [hits, setHits] = useState<FilmHit[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const picked = useRef("")
  const listId = useId()

  useEffect(() => {
    const q = value.trim()
    if (!hasTmdb() || q.length < 2 || q === picked.current) { setHits([]); return }
    let dead = false
    const t = setTimeout(async () => {
      // "heat 1995" or "heat (1995)": the trailing year narrows the search instead of being part of the title
      const ym = q.match(/^(.+?)[\s(]+((?:19|20)\d\d)\)?$/)
      const r = await tmdb<{ results?: any[] }>("/search/movie", `&query=${encodeURIComponent(ym ? ym[1] : q)}${ym ? `&year=${ym[2]}` : ""}`)
      if (dead) return
      setHits((r?.results || []).slice(0, 6).map(x => ({ id: x.id, title: x.title, year: +(x.release_date || "").slice(0, 4) || null, poster: x.poster_path })))
      setActive(-1)
    }, 250)
    return () => { dead = true; clearTimeout(t) }
  }, [value])

  const pick = (h: FilmHit) => {
    picked.current = h.title
    onPick(h)
    setOpen(false)
    setHits([])
  }

  return (
    <div className="relative min-w-48 flex-1">
      <Input
        {...rest}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        className="h-10 w-full"
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => {
          if (!open || !hits.length) return
          if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => (a + 1) % hits.length) }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => (a <= 0 ? hits.length - 1 : a - 1)) }
          else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(hits[active]) }
          else if (e.key === "Escape") setOpen(false)
        }}
      />
      {open && hits.length > 0 && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-auto rounded-xl bg-card p-1 shadow-xl ring-1 ring-border">
          {hits.map((h, i) => (
            <li
              key={h.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={e => { e.preventDefault(); pick(h) }}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 ${i === active ? "bg-muted" : "hover:bg-muted"}`}
            >
              {h.poster ? <img src={`${IMG}w92${h.poster}`} alt="" className="aspect-[2/3] w-8 rounded object-cover" /> : <span className="aspect-[2/3] w-8 rounded bg-muted" />}
              <span>{h.title} <small className="text-muted-foreground">{h.year ?? ""}</small></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
