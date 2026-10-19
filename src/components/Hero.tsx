import type { ReactNode } from "react"
import { IMG } from "@/lib/api"
import type { Movie } from "@/lib/types"

/**
 * The page opener: the title and controls on the left, and on the right the whole 16:9 still from one of the club's films,
 * uncropped, with its caption underneath. On a phone the frame sits under the title. No still means just the title block.
 */
export function Hero({ film, still, children }: { film?: Movie; still?: string | null; children: ReactNode }) {
  return (
    <div className={`mb-5 grid gap-4 ${still ? "sm:grid-cols-[1fr_19rem] sm:items-end" : ""}`}>
      <div className="flex flex-col gap-3">{children}</div>
      {film && still && (
        <figure className="flex flex-col gap-1.5">
          <div className="grain relative overflow-hidden rounded-xl bg-black shadow-lg ring-1 ring-foreground/10">
            <img
              src={`${IMG}w780${still}`}
              srcSet={`${IMG}w300${still} 300w, ${IMG}w780${still} 780w`}
              sizes="(min-width: 640px) 304px, 100vw"
              alt={`A still from ${film.title}`}
              fetchPriority="high"
              className="block aspect-video w-full object-cover"
            />
          </div>
          <figcaption className="text-xs text-muted-foreground">Still from {film.title} ({film.year})</figcaption>
        </figure>
      )}
    </div>
  )
}
