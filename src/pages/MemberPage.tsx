import { useEffect } from "react"
import { Collapse } from "@/components/Collapse"
import { ArrowLeft } from "lucide-react"
import { Avatar } from "@/components/Avatar"
import { Compare } from "@/components/Compare"
import { GenreTaste } from "@/components/GenreTaste"
import { FavoriteStill } from "@/components/FavoriteStill"
import { Histogram } from "@/components/Charts"
import { DeviationChart } from "@/components/DeviationChart"
import { AutoPlan } from "@/components/AutoPlan"
import { MyPlan } from "@/components/MyPlan"
import { PersonAtlas } from "@/components/PersonAtlas"
import { TasteDrift } from "@/components/TasteDrift"
import { PosterThumb } from "@/components/PosterThumb"
import { buttonVariants } from "@/components/ui/button"
import { FavoritesEditor } from "@/components/FavoritesEditor"
import { chosenFavorites, clubVsHome, favoritesOf } from "@/lib/lbstats"
import { avg, awardWinners, deviations, fmt, groupAvg, histogram, median, memberStats, tasteOverlap, tilt } from "@/lib/stats"
import { useStore } from "@/lib/store"
import type { Movie } from "@/lib/types"

const filmHref = (m: Movie) => `#/films/${encodeURIComponent(String(m.id))}`
const personHref = (n: string) => `#/people/${encodeURIComponent(n)}`

export default function MemberPage({ name, own = false }: { name: string; own?: boolean }) {
  const { movies, members, lb, loadLb, loadSeal, favs, me: signedIn } = useStore()
  useEffect(() => { loadLb(); loadSeal() }, [loadLb, loadSeal])
  const back = own ? null : (
    <a href="#/stats" className={buttonVariants({ variant: "ghost", className: "-ml-2 h-10 w-fit gap-1 px-2" })}><ArrowLeft /> Stats</a>
  )
  if (!members.includes(name)) return <>{back}<p className="mt-3 text-muted-foreground">Nobody called {name} is in the club.</p></>

  const rated = movies.filter(m => Object.keys(m.ratings).length)
  const mine = movies.filter(m => m.ratings[name] != null)
  const picks = movies.filter(m => m.pick === name)
  const sorted = [...mine].sort((a, b) => b.ratings[name] - a.ratings[name] || a.title.localeCompare(b.title))
  const values = mine.map(m => m.ratings[name])
  const pickAvg = avg(picks.map(groupAvg).filter((x): x is number => x != null))
  const t = tilt(movies, name)
  const attend = rated.length ? mine.length / rated.length : 0
  const partners = tasteOverlap(movies, members).filter(o => o.a === name || o.b === name)
  const other = (o: { a: string; b: string }) => (o.a === name ? o.b : o.a)
  const dev = deviations(movies, name).slice(0, 8)
  const me = memberStats(movies, members).find(p => p.n === name)
  const w = awardWinners(movies, members)
  const picked = chosenFavorites(favs[name], lb, name)
  const lbFavs = picked.length ? picked : favoritesOf(lb, name, 4)
  const home = clubVsHome(movies, lb, name)

  const tags = [
    w.picker?.n === name && "Best pick",
    w.harsh?.n === name && "Harshest critic",
    w.kind?.n === name && "Most generous",
    w.odd?.n === name && "Most contrarian",
    attend === 1 && rated.length > 3 && "Never missed a film",
    t != null && mine.length >= 5 && Math.abs(t) >= 0.3 && `Rates ${fmt(Math.abs(t), 1)} ${t > 0 ? "higher" : "lower"} than everyone else`,
  ].filter(Boolean) as string[]

  return (
    <div className="stagger flex flex-col gap-8">
      {back}
      <header className="flex items-center gap-4">
        <Avatar name={name} size="lg" />
        <div className="min-w-0">
          <h2 className="font-display text-4xl leading-none font-extrabold tracking-tight">{name}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{mine.length} {mine.length === 1 ? "film" : "films"} rated{picks.length > 0 && ` · ${picks.length} ${picks.length === 1 ? "pick" : "picks"}`}</p>
        </div>
      </header>
      {tags.length > 0 && (
        <ul className="-mt-4 flex flex-wrap gap-2">
          {tags.map((tag, i) => <li key={tag} className={`rounded-full px-3 py-1 text-sm font-medium ${i === 0 && tags[0] === "Best pick" ? "bg-sun text-[#1c1915]" : "bg-card ring-1 ring-foreground/10"}`}>{tag}</li>)}
        </ul>
      )}

      {mine.length === 0 ? (
        <p className="text-muted-foreground">{name} hasn't rated a film yet.</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Average given" value={fmt(avg(values))} />
            <Stat label="Attendance" value={`${Math.round(attend * 100)}%`} sub={`${mine.length} of ${rated.length} films`} bar={attend} />
            <Stat label="Their picks average" value={fmt(pickAvg)} sub={picks.length ? `${picks.length} ${picks.length === 1 ? "pick" : "picks"}` : "no picks yet"} />
            <Stat label="Compared with others" value={t == null ? "–" : Math.abs(t) < 0.05 ? "Even" : `${t > 0 ? "+" : "−"}${fmt(Math.abs(t), 1)}`} sub={t == null ? undefined : Math.abs(t) < 0.05 ? "rates like the group" : t > 0 ? "rates higher" : "rates lower"} tone={t == null ? undefined : t > 0.05 ? "pos" : t < -0.05 ? "us" : undefined} />
          </dl>

          <Collapse id="mp-rates" title={`How ${name} rates`}>
            <Histogram bins={histogram(movies, name)} label={`${name}'s ratings by star step`} average={avg(values)} median={median(values)} />
          </Collapse>

          <GenreTaste movies={movies} name={name} />

          {dev.length > 0 && (
            <Collapse id="mp-differs" title={`Where ${name} differs from the group`}>
              <p className="mb-3 text-sm text-muted-foreground">Rating minus everyone else's average on the same film. Teal is higher, red is lower.</p>
              <DeviationChart rows={dev} name={name} />
            </Collapse>
          )}

          <section className="grid grid-cols-[minmax(0,1fr)] gap-6 sm:grid-cols-2">
            <Strip title="Favorites" films={sorted.slice(0, 3)} rating={m => m.ratings[name]} />
            <Strip title="Least favorite" films={[...sorted].reverse().slice(0, 3)} rating={m => m.ratings[name]} />
          </section>
        </>
      )}

      {(lbFavs.length > 0 || home.count >= 3) && (
        <section className="flex flex-col gap-6">
          {lbFavs.length > 0 && (
            <Collapse id="mp-lbfavs" title={picked.length ? `${name}'s four favorites` : "Letterboxd favorites"}>
              <p className="mb-3 text-sm text-muted-foreground">{picked.length ? `Chosen by ${name}, in order, with their Letterboxd rating.` : `${name}'s highest-rated films on Letterboxd.`}</p>
              <ul className="grid grid-cols-2 gap-3">
                {lbFavs.map(f => <li key={f.title + f.year}><FavoriteStill {...f} /></li>)}
              </ul>
            </Collapse>
          )}
          {home.count >= 3 && home.average != null && (
            <Collapse id="mp-home" title="At the club and at home">
              <p className="text-sm">
                Across {home.count} films {name} rated in both places, {name} rates{" "}
                {Math.abs(home.average) < 0.1 ? <><b>about the same</b> at the club as on Letterboxd.</> : <><b>{fmt(Math.abs(home.average), 1)} stars {home.average > 0 ? "higher" : "lower"}</b> at the club than on Letterboxd.</>}
              </p>
              <ul className="mt-2 text-sm text-muted-foreground">
                {home.biggest.map(r => <li key={r.movie.id}>{r.movie.title}: {r.club} at the club, {r.home} at home</li>)}
              </ul>
            </Collapse>
          )}
        </section>
      )}

      {signedIn === name && <FavoritesEditor name={name} />}

      {signedIn === name && <MyPlan name={name} history={lb[name]} />}

      {signedIn === name && <AutoPlan name={name} history={lb[name]} />}

      <Compare name={name} lb={lb} />

      {(lb[name]?.length ?? 0) > 0 && <TasteDrift name={name} history={lb[name]} own={signedIn === name} />}

      {(lb[name]?.length ?? 0) > 0 && <PersonAtlas name={name} history={lb[name]} />}

      {picks.length > 0 && (
        <Collapse id="mp-picks" title="Their picks">
          <p className="mb-3 text-sm text-muted-foreground">The number on each poster is the club's average rating.</p>
          <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4">
            {[...picks].sort((a, b) => (groupAvg(b) ?? -1) - (groupAvg(a) ?? -1)).map((m, i) => (
              <li key={m.id} className="min-w-0">
                <a href={filmHref(m)} className="flex flex-col gap-1.5">
                  <PosterThumb title={m.title} year={m.year} className="w-full" badge={groupAvg(m) == null ? "–" : fmt(groupAvg(m), 1)} gold={i === 0 && groupAvg(m) != null} />
                  <span className="truncate text-sm leading-tight font-medium">{m.title}</span>
                </a>
              </li>
            ))}
          </ul>
          {me?.pickAvg != null && mine.length > 0 && values.length > 0 && <p className="mt-3 text-sm text-muted-foreground">Their picks average {fmt(me.pickAvg)}; the club's overall average is {fmt(avg(rated.map(groupAvg).filter((x): x is number => x != null)))}.</p>}
        </Collapse>
      )}

      {partners.length > 0 && (
        <Collapse id="mp-taste" title="Taste">
          <div className="grid gap-3 sm:grid-cols-2">
            <Partner label="Closest taste" o={partners[0]} name={name} other={other(partners[0])} />
            {partners.length > 1 && <Partner label="Furthest apart" o={partners.at(-1)!} name={name} other={other(partners.at(-1)!)} />}
          </div>
        </Collapse>
      )}
    </div>
  )
}

function Stat({ label, value, sub, bar, tone }: { label: string; value: string; sub?: string; bar?: number; tone?: "pos" | "us" }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`font-display text-3xl leading-none font-extrabold tracking-tight ${tone === "pos" ? "text-world" : tone === "us" ? "text-us" : ""}`}>{value}</dd>
      {bar != null && <span className="mt-1 block h-1.5 rounded-full bg-muted"><span className="grow block h-1.5 rounded-full bg-world" style={{ width: `${bar * 100}%` }} /></span>}
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  )
}

function Strip({ title, films, rating }: { title: string; films: Movie[]; rating: (m: Movie) => number }) {
  return (
    <div>
      <h3 className="mb-3 text-xl font-bold">{title}</h3>
      <ol className="flex gap-3 sm:gap-4">
        {films.map(m => (
          <li key={m.id} className="w-20 min-w-0 shrink">
            <a href={filmHref(m)} className="flex flex-col gap-1.5">
              <PosterThumb title={m.title} year={m.year} className="w-full" badge={rating(m)} gold={title === "Favorites" && rating(m) >= 4.5} />
              <span className="line-clamp-2 text-xs leading-tight font-medium">{m.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Partner({ label, o, name, other }: { label: string; o: { diff: number; n: number }; name: string; other: string }) {
  const closeness = Math.max(0, 1 - o.diff / 1.5)
  return (
    <a href={personHref(other)} className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 hover:bg-muted">
      <span className="flex -space-x-2"><Avatar name={name} className="ring-2 ring-card" /><Avatar name={other} className="ring-2 ring-card" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block font-medium">{other}</span>
        <span className="mt-1 block h-1.5 rounded-full bg-muted"><span className="block h-1.5 rounded-full bg-world" style={{ width: `${closeness * 100}%` }} /></span>
        <span className="text-xs text-muted-foreground">{fmt(o.diff)} stars apart over {o.n} films</span>
      </span>
    </a>
  )
}
