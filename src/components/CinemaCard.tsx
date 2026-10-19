import type { ReactNode } from "react"

/**
 * The dark "screening" card: black, centered display title, light text. Everything inside uses the dark palette,
 * so charts built from theme tokens read white-on-black here in both light and dark mode.
 */
export function CinemaCard({ title, caption, children }: { title: string; caption?: ReactNode; children: ReactNode }) {
  return (
    <section className="dark rise rounded-2xl bg-black px-4 py-7 text-foreground sm:px-6">
      <h3 className="text-center font-display text-2xl font-bold tracking-tight">{title}</h3>
      {caption && <p className="mx-auto mt-1 max-w-prose text-center text-sm text-muted-foreground">{caption}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}
