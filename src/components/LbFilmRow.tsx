import type { ReactNode } from "react"
import { IMG } from "@/lib/api"
import { useFilmInfo } from "@/lib/useFilmInfo"

/** A film from the club's Letterboxd data: small poster, title and year, and whatever lines say why it is listed. */
export function LbFilmRow({ title, year, children }: { title: string; year: number; children: ReactNode }) {
  const info = useFilmInfo(title, year)
  return (
    <div className="flex items-start gap-3">
      {info?.poster_path ? <img src={`${IMG}w92${info.poster_path}`} alt="" loading="lazy" className="aspect-[2/3] w-10 shrink-0 rounded object-cover" /> : <span className="aspect-[2/3] w-10 shrink-0 rounded bg-muted" />}
      <div className="min-w-0">
        <p className="leading-tight font-medium">{title} <small className="font-normal text-muted-foreground">{year}</small></p>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  )
}
