import { useEffect } from "react"
import { Card } from "@/components/ui/card"
import { needsImport } from "@/lib/picks"
import { useStore } from "@/lib/store"

/** Reminds people who haven't imported their Letterboxd history that every export makes the picks sharper. */
export function ImportNudge() {
  const { movies, members, lb, loadLb, me } = useStore()
  useEffect(() => { loadLb() }, [loadLb])
  const missing = needsImport(movies, lb, members)
  if (!missing.length) return null
  const mineMissing = !!me && missing.includes(me)
  const others = missing.filter(n => n !== me)
  const who = others.length <= 2 ? others.join(" and ") : `${others.slice(0, 2).join(", ")} and ${others.length - 2} more`
  return (
    <Card className="gap-1 px-4" role="note">
      <p className="text-sm">
        {mineMissing && <>You haven't imported your Letterboxd history yet. </>}
        {others.length > 0 && <>{who} {others.length === 1 ? "hasn't" : "haven't"} imported theirs{mineMissing ? " either" : " yet"}. </>}
        Picks get sharper with every export.
      </p>
      <a href="#/watch" className="inline-flex min-h-11 w-fit items-center text-sm font-medium underline">Import your Letterboxd history</a>
    </Card>
  )
}
