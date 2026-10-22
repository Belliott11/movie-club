import { useEffect, useMemo, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { hasTmdb, tmdb } from "@/lib/api"
import { movieHref } from "@/lib/movieLink"
import { searchLocal, type Hit } from "@/lib/search"
import { useStore } from "@/lib/store"

/** One box that finds a film (the club's, a suggestion, or anything on TMDB) or a person, and goes straight there. */
export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const { movies, members, watchlist, suggestions } = useStore()
  const [text, setText] = useState("")
  const [web, setWeb] = useState<Hit[]>([])
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { input.current?.focus() }, [])
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    addEventListener("keydown", f)
    return () => removeEventListener("keydown", f)
  }, [onClose])

  const local = useMemo(() => searchLocal(text, movies, members, watchlist, suggestions), [text, movies, members, watchlist, suggestions])
  useEffect(() => {
    const q = text.trim()
    if (!hasTmdb() || q.length < 2) { setWeb([]); return }
    let dead = false
    const t = setTimeout(async () => {
      const r = await tmdb<{ results?: any[] }>("/search/movie", `&query=${encodeURIComponent(q)}`)
      if (dead) return
      setWeb((r?.results ?? []).slice(0, 6).map(x => {
        const year = +(x.release_date || "").slice(0, 4) || 0
        return { kind: "title" as const, label: x.title as string, sub: `${year || ""} · from TMDB`.replace(/^ · /, ""), href: movieHref(x.title, year) }
      }))
    }, 250)
    return () => { dead = true; clearTimeout(t) }
  }, [text])

  const have = new Set(local.map(h => h.label.toLowerCase()))
  const hits = [...local, ...web.filter(h => !have.has(h.label.toLowerCase()))]
  const open = (h: Hit) => { location.hash = h.href.slice(1); onClose() }

  return (
    <div role="dialog" aria-modal="true" aria-label="Search" className="fixed inset-0 z-[90] flex flex-col gap-3 bg-background/97 p-4 backdrop-blur">
      <div className="mx-auto flex w-full max-w-xl items-center gap-2">
        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <input
          ref={input} value={text} onChange={e => setText(e.target.value)} placeholder="Search films and people" aria-label="Search films and people"
          onKeyDown={e => { if (e.key === "Enter" && hits[0]) open(hits[0]) }}
          className="h-12 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <button type="button" onClick={onClose} aria-label="Close search" className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-muted"><X className="size-5" /></button>
      </div>
      <ul className="mx-auto flex w-full max-w-xl flex-col overflow-y-auto" aria-label="Results">
        {hits.map(h => (
          <li key={h.kind + h.href}>
            <a href={h.href} onClick={() => onClose()} className="flex min-h-12 flex-col justify-center rounded-lg px-3 py-1.5 hover:bg-muted">
              <span className="font-medium">{h.label}</span>
              <span className="text-xs text-muted-foreground">{h.sub}</span>
            </a>
          </li>
        ))}
        {text.trim().length >= 2 && !hits.length && <li className="px-3 py-2 text-muted-foreground">Nothing found for "{text.trim()}".</li>}
        {text.trim().length < 2 && <li className="px-3 py-2 text-muted-foreground">Type a film or a person's name.</li>}
      </ul>
    </div>
  )
}
