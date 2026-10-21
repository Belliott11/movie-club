import type { ReactNode } from "react"
import { IMG } from "@/lib/api"
import { movieHref } from "@/lib/movieLink"
import { useFilmInfo } from "@/lib/useFilmInfo"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

/** A film the club could watch next: poster, why it is suggested, and a Suggest button. */
export function PickCard({ title, year, lines, done, onSuggest, extra }: { title: string; year: number; lines: string[]; done: boolean; onSuggest: () => void; extra?: ReactNode }) {
  const info = useFilmInfo(title, year)
  return (
    <Card className="rise flex-row gap-3 px-3">
      <a href={movieHref(title, year)} aria-label={`About ${title}`} className="shrink-0 self-start">{info?.poster_path ? <img src={`${IMG}w154${info.poster_path}`} alt="" loading="lazy" className="aspect-[2/3] w-16 rounded-md object-cover" /> : <span className="block aspect-[2/3] w-16 rounded-md bg-muted" />}</a>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h4 className="font-display text-lg leading-tight font-bold"><a href={movieHref(title, year)} className="hover:underline">{title}</a> <small className="font-sans text-sm font-medium text-muted-foreground">{year || ""}</small></h4>
        <ul className="text-sm leading-snug text-muted-foreground">{lines.map(l => <li key={l}>{l}</li>)}</ul>
        {extra}
        <Button variant={done ? "ghost" : "outline"} disabled={done} className="mt-1 h-10 w-fit px-3" onClick={onSuggest}>{done ? "Suggested" : "Suggest"}</Button>
      </div>
    </Card>
  )
}
