import type { ReactNode } from "react"
import { IMG } from "@/lib/api"
import type { Movie } from "@/lib/types"

/**
 * The page opener: a still from one of the club's films in its true 16:9 frame (nothing cropped), with the title laid
 * over the bottom of it, the controls in its top corner, and the film's name underneath.
 * Without a still it is just the title and the controls.
 */
export function Hero({ film, still, title, controls }: { film?: Movie; still?: string | null; title: ReactNode; controls: ReactNode }) {
  if (!film || !still) {
    return <div className="mb-5 flex flex-col gap-3">{title}{controls}</div>
  }
  return (
    <div className="mb-5">
      <figure className="flex max-w-xl flex-col gap-1.5 sm:max-w-[36rem]">
        <div className="grain relative aspect-video overflow-hidden rounded-xl bg-black shadow-lg ring-1 ring-foreground/10">
          <img
            src={`${IMG}w780${still}`}
            srcSet={`${IMG}w780${still} 780w, ${IMG}w1280${still} 1280w`}
            sizes="(min-width: 640px) 576px, 100vw"
            alt={`A still from ${film.title}`}
            fetchPriority="high"
            className="absolute inset-0 size-full object-cover"
          />
          <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-black/30" />
          <div className="absolute inset-x-0 top-0 flex justify-end p-3 text-white [&_label]:text-white/85">{controls}</div>
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">{title}</div>
        </div>
        <figcaption className="text-xs text-muted-foreground">Still from {film.title} ({film.year})</figcaption>
      </figure>
    </div>
  )
}
