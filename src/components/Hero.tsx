import type { ReactNode } from "react"
import { Shuffle } from "lucide-react"
import { IMG } from "@/lib/api"

/**
 * The page opener: a still from one of the club's films in its true 16:9 frame, as wide as the tab bar, so nothing is cropped.
 * The title is laid over the bottom of it, the controls sit in its top corner, and the film's name is underneath.
 * With more than one still available, a button cycles through them. Without a still it is just the title and the controls.
 */
export function Hero({ film, still, onNext, canShuffle, title, controls }: {
  film?: { title: string; year: number; note?: string }
  still?: string | null
  onNext?: () => void
  canShuffle?: boolean
  title: ReactNode
  controls: ReactNode
}) {
  if (!film || !still) {
    return <div className="mb-5 flex flex-col gap-3">{title}{controls}</div>
  }
  return (
    <div className="mb-5">
      <figure className="flex flex-col gap-1.5">
        <div className="grain relative aspect-video overflow-hidden rounded-xl bg-black shadow-lg ring-1 ring-foreground/10">
          <img
            key={still}
            src={`${IMG}w780${still}`}
            srcSet={`${IMG}w780${still} 780w, ${IMG}w1280${still} 1280w`}
            sizes="(min-width: 768px) 768px, 100vw"
            alt={`A still from ${film.title}`}
            fetchPriority="high"
            className="push-in absolute inset-0 size-full object-cover"
          />
          <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-black/30" />
          <div className="absolute inset-x-0 top-0 flex justify-end p-3 text-white [&_label]:text-white/85">{controls}</div>
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">{title}</div>
          {canShuffle && onNext && (
            <button
              type="button"
              onClick={onNext}
              aria-label="Show another still"
              className="absolute right-2 bottom-2 flex size-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"
            >
              <Shuffle className="size-4" aria-hidden />
            </button>
          )}
        </div>
        <figcaption className="text-xs text-muted-foreground">Still from {film.title} ({film.year}){film.note ? ` · ${film.note}` : ""}</figcaption>
      </figure>
    </div>
  )
}
