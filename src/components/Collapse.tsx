import type { ReactNode } from "react"
import { ChevronDown } from "lucide-react"
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
  club: { label: "Club ratings", tone: "text-muted-foreground ring-1 ring-foreground/20" },
  tmdb: { label: "Club films + TMDB", tone: "text-muted-foreground ring-1 ring-foreground/20" },
  outside: { label: "Club vs outside sites", tone: "text-muted-foreground ring-1 ring-foreground/20" },
  letterboxd: { label: "Letterboxd", tone: "bg-world font-medium text-primary-foreground" },
  mixed: { label: "Letterboxd + club films", tone: "bg-world font-medium text-primary-foreground" },
}

/** A page section whose heading opens and closes it. The choice is remembered per device; closed panels aren't drawn at all. */
export function Collapse({ id, title, source, defaultOpen = true, children }: { id: string; title: string; source?: Source; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = usePref<boolean>(keyOf(id), defaultOpen)
  const tag = source ? SOURCES[source] : null
  return (
    <section>
      <h3 className="text-xl font-bold">
        <button type="button" aria-expanded={open} aria-controls={`panel-${id}`} onClick={() => setOpen(!open)} className="flex min-h-11 w-full items-center gap-2 text-left">
          <span>{title}</span>
          {tag && <span className={`shrink-0 rounded-full px-2 py-0.5 font-sans text-[11px] leading-none ${tag.tone}`}><span className="sr-only">Source: </span>{tag.label}</span>}
          <ChevronDown aria-hidden className={`ml-auto size-5 shrink-0 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} />
        </button>
      </h3>
      {open && <div id={`panel-${id}`} className="pt-1">{children}</div>}
    </section>
  )
}
