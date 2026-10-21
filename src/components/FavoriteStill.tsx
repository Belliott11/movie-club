import { IMG } from "@/lib/api"
import { movieHref } from "@/lib/movieLink"
import { useFilmInfo } from "@/lib/useFilmInfo"

/** One of a person's favorite films as a 16:9 still with its title and their rating laid over the bottom. */
export function FavoriteStill({ title, year, rating }: { title: string; year: number; rating: number }) {
  const info = useFilmInfo(title, year)
  return (
    <figure className="grain relative aspect-video overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10">
      {info?.backdrop_path && <img src={`${IMG}w500${info.backdrop_path}`} alt={`A still from ${title}`} loading="lazy" className="absolute inset-0 size-full object-cover" />}
      <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent" />
      <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2.5 text-white">
        <span className="min-w-0 text-sm leading-tight font-semibold"><a href={movieHref(title, year)} className="after:absolute after:inset-0 hover:underline">{title}</a> <span className="font-normal text-white/70">{year}</span></span>
        <span className="font-display text-lg leading-none font-extrabold text-gold">{rating}</span>
      </figcaption>
    </figure>
  )
}
