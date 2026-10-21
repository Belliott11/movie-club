import type { ReactNode } from "react"
import { IMG } from "@/lib/api"
import { movieHref } from "@/lib/movieLink"
import { useFilmInfo } from "@/lib/useFilmInfo"

/** A film from the club's Letterboxd data: small poster, title and year, and whatever lines say why it is listed. */
export function LbFilmRow({ title, year, children }: { title: string; year: number; children: ReactNode }) {
  const info = useFilmInfo(title, year)
  return (
    <div className="flex items-start gap-3">
      <a href={movieHref(title, year)} aria-label={`About ${title}`} className="shrink-0">{info?.poster_path ? <img src={`${IMG}w92${info.poster_path}`} alt="" loading="lazy" className="aspect-[2/3] w-10 rounded object-cover" /> : <span className="block aspect-[2/3] w-10 rounded bg-muted" />}</a>
      <div className="min-w-0">
        <p className="leading-tight font-medium"><a href={movieHref(title, year)} className="hover:underline">{title}</a> <small className="font-normal text-muted-foreground">{year}</small></p>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  )
}
