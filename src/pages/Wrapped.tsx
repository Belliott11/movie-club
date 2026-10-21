import { useEffect, useMemo, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { PosterThumb } from "@/components/PosterThumb"
import { Button, buttonVariants } from "@/components/ui/button"
import { wrappedSlides, wrappedText } from "@/lib/wrapped"
import { useStore } from "@/lib/store"
import { useFilmTags } from "@/lib/useFilmTags"

/** The club's story so far, one card at a time. Arrow keys and the buttons move through it; the last card copies it for the group chat. */
export default function Wrapped() {
  const { movies, members, countries: fixed, loadSeal } = useStore()
  useEffect(() => { loadSeal() }, [loadSeal])
  const rated = useMemo(() => movies.filter(m => Object.keys(m.ratings).length), [movies])
  const tags = useFilmTags(rated)
  const places = useMemo(() => [...new Set(rated.flatMap(m => (fixed[String(m.id)] ? [fixed[String(m.id)]] : tags[String(m.id)]?.countries ?? [])))], [rated, tags, fixed])
  const slides = useMemo(() => wrappedSlides(movies, members, places), [movies, members, places])
  const [i, setI] = useState(0)
  const [copied, setCopied] = useState(false)
  const last = slides.length // one extra card after the slides: the wrap-up
  const go = (d: number) => setI(x => Math.max(0, Math.min(last, x + d)))
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1) }
    addEventListener("keydown", f)
    return () => removeEventListener("keydown", f)
  }, [slides.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const back = <a href="#/stats" className={buttonVariants({ variant: "ghost", className: "-ml-2 h-10 w-fit gap-1 px-2" })}><ArrowLeft /> Stats</a>
  if (!slides.length) return <>{back}<p className="mt-3 text-muted-foreground">Wrapped appears after the first screening: rate a film and the credits start rolling.</p></>
  const s = slides[Math.min(i, slides.length - 1)]
  const share = async () => {
    const txt = wrappedText(slides)
    try { await navigator.clipboard.writeText(txt); setCopied(true) } catch { prompt("Copy this:", txt) }
  }

  return (
    <div className="flex flex-col gap-4">
      {back}
      <div role="progressbar" aria-valuemin={1} aria-valuemax={last + 1} aria-valuenow={i + 1} aria-label="Slide" className="flex gap-1">
        {Array.from({ length: last + 1 }, (_, n) => <span key={n} className={`h-1 flex-1 rounded-full ${n <= i ? "bg-us" : "bg-muted"}`} />)}
      </div>
      <section key={i} aria-live="polite" className="rise flex min-h-[26rem] flex-col justify-between gap-6 rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
        {i < last ? (
          <>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{s.kicker}</p>
              <h2 className="font-display text-5xl leading-[0.95] font-extrabold tracking-tight break-words">{s.big}</h2>
              <p className="max-w-[34ch] text-lg leading-snug">{s.text}</p>
            </div>
            {s.film && (
              <a href={`#/films/${encodeURIComponent(String(s.film.id))}`} className="w-32 self-end" aria-label={`About ${s.film.title}`}>
                <PosterThumb title={s.film.title} year={s.film.year} className="w-full" />
              </a>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">That's the club so far</p>
              <h2 className="font-display text-4xl leading-none font-extrabold">Send it to the group chat</h2>
              <p className="text-lg leading-snug">One message with all of it, ready to paste.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="h-11 px-5" onClick={share}>{copied ? "Copied" : "Copy it"}</Button>
              <Button variant="ghost" className="h-11 px-4" onClick={() => setI(0)}>Start over</Button>
            </div>
          </>
        )}
      </section>
      <div className="flex justify-between gap-2">
        <Button variant="outline" className="h-11 px-5" onClick={() => go(-1)} disabled={i === 0}>Back</Button>
        <Button className="h-11 px-5" onClick={() => go(1)} disabled={i === last}>Next</Button>
      </div>
    </div>
  )
}
