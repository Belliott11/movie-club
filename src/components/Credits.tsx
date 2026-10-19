import { Avatar } from "@/components/Avatar"
import type { Movie } from "@/lib/types"

/** Rolling-credits style sign-off built from the club's real numbers: who watched, who picked. */
export function Credits({ movies, people }: { movies: Movie[]; people: { n: string; count: number }[] }) {
  const picks = new Map<string, number>()
  movies.forEach(m => picks.set(m.pick, (picks.get(m.pick) || 0) + 1))
  const pickers = [...picks].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const cast = [...people].sort((a, b) => b.count - a.count || a.n.localeCompare(b.n))
  return (
    <section aria-label="Credits" className="flex flex-col items-center gap-6 rounded-2xl bg-black px-5 py-10 text-center text-white/90">
      <div aria-hidden className="sprockets w-full bg-white/80" />
      <p className="font-display text-2xl font-bold tracking-tight">The Movie Club</p>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-white/60">Starring</p>
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-3">
          {cast.map(p => <li key={p.n} className="flex items-center gap-2"><Avatar name={p.n} size="sm" />{p.n}</li>)}
        </ul>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-white/60">Films selected by</p>
        <p>{pickers.map(([n, c]) => `${n} (${c})`).join(" · ")}</p>
      </div>
      <p className="text-sm text-white/60">{movies.length} films and counting</p>
      <div aria-hidden className="sprockets w-full bg-white/80" />
    </section>
  )
}
