import type { ReactNode } from "react"
import { usePref } from "@/lib/prefs"

const keyOf = (id: string) => `collapse:${id}`

/** Opens or closes every panel in `ids` at once. Each person's choices are remembered on their own device. */
export function setAllPanels(ids: string[], open: boolean) {
  for (const id of ids) try { localStorage.setItem(keyOf(id), JSON.stringify(open)) } catch { /* private mode: it just won't stick */ }
  dispatchEvent(new Event("pref-changed"))
}

/** Where a panel's numbers come from. Letterboxd is filled in so it can't be mistaken for the club's own data. */
export type Source = "club" | "tmdb" | "letterboxd" | "mixed" | "outside"
const SOURCES: Record<Source, { label: string; tone: string }> = {
  club: { label: "Club ratings", tone: "border-foreground/35 text-muted-foreground" },
  tmdb: { label: "Club films + TMDB", tone: "border-foreground/35 text-muted-foreground" },
  outside: { label: "Club vs outside sites", tone: "border-foreground/35 text-muted-foreground" },
  letterboxd: { label: "Letterboxd", tone: "border-world bg-world text-primary-foreground" },
  mixed: { label: "Letterboxd + club films", tone: "border-world bg-world text-primary-foreground" },
}

/** A page section whose heading opens and closes it. The choice is remembered per device; closed panels aren't drawn at all. */
export function Collapse({ id, title, source, defaultOpen = true, children }: { id: string; title: string; source?: Source; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = usePref<boolean>(keyOf(id), defaultOpen)
  const tag = source ? SOURCES[source] : null
  return (
    <section className="border-t-2 border-foreground">
      <h3 className="text-2xl leading-none">
        <button type="button" aria-expanded={open} aria-controls={`panel-${id}`} onClick={() => setOpen(!open)} className="flex min-h-12 w-full items-center gap-3 text-left">
          <span>{title}</span>
          {tag && <span className={`shrink-0 border px-1.5 py-1 font-label text-[11px] leading-none ${tag.tone}`}><span className="sr-only">Source: </span>{tag.label}</span>}
          <span aria-hidden className="font-label ml-auto w-5 shrink-0 text-center text-xl text-muted-foreground">{open ? "−" : "+"}</span>
        </button>
      </h3>
      {open && <div id={`panel-${id}`} className="pt-1 pb-2">{children}</div>}
    </section>
  )
}
