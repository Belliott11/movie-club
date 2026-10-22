import { lazy, Suspense } from "react"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { Clapperboard } from "@/components/Clapperboard"
import { Hero } from "@/components/Hero"
import { Leader } from "@/components/Leader"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getClubCode, setClubCode, StoreProvider, useStore } from "@/lib/store"
import { go, useHash } from "@/lib/useHash"
import { usePull } from "@/lib/usePull"
import { useSwipe } from "@/lib/useSwipe"
import { ChartColumn, Film, Lightbulb, RefreshCw, Search, User, Users, Bookmark } from "lucide-react"
import { SearchOverlay } from "@/components/SearchOverlay"
import { ThemeMenu } from "@/components/ThemeMenu"
import { pickHeroFilm } from "@/lib/hero"
import { favoritesOf } from "@/lib/lbstats"
import { useStills } from "@/lib/useStills"
import { useFilmInfo } from "@/lib/useFilmInfo"
import { key, pickOrder } from "@/lib/stats"
import { AddPerson } from "@/components/AddPerson"
import { fieldCls } from "@/components/field"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import Films from "@/pages/Films"

// every page but the first one loads when it is opened, so the site starts with a much smaller download
// If a tab's code is gone because the site was just updated, reload once to pick up the new version (once, so it can't loop).
const lazyPage = (f: () => Promise<{ default: React.ComponentType<any> }>) =>
  lazy(() => f().catch(err => {
    if (sessionStorage.getItem("chunk-reload")) throw err
    sessionStorage.setItem("chunk-reload", "1")
    location.reload()
    return new Promise<never>(() => {})
  }))
const loaders = {
  MemberPage: () => import("@/pages/MemberPage"),
  MoviePage: () => import("@/pages/MoviePage"),
  Wrapped: () => import("@/pages/Wrapped"),
  FilmPage: () => import("@/pages/FilmPage"),
  Next: () => import("@/pages/Next"),
  Stats: () => import("@/pages/Stats"),
  Suggest: () => import("@/pages/Suggest"),
  Watch: () => import("@/pages/Watch"),
}
const Wrapped = lazyPage(loaders.Wrapped)
const MoviePage = lazyPage(loaders.MoviePage)
const MemberPage = lazyPage(loaders.MemberPage)
const FilmPage = lazyPage(loaders.FilmPage)
const Next = lazyPage(loaders.Next)
const Stats = lazyPage(loaders.Stats)
const Suggest = lazyPage(loaders.Suggest)
const Watch = lazyPage(loaders.Watch)

const ICONS = { films: Film, next: Users, suggest: Lightbulb, watch: Bookmark, stats: ChartColumn, me: User } as const
const TABS = [["films", "Films"], ["next", "Next up"], ["suggest", "Suggestions"], ["watch", "Watchlists"], ["stats", "Stats"], ["me", "Me"]] as const

/** Only needed when the club has turned on the edit lock (schema-lock.sql). */
function ClubCode() {
  const [open, setOpen] = useState(false)
  const has = !!getClubCode()
  if (!open) return <button type="button" className="min-h-11 w-fit text-left underline" onClick={() => setOpen(true)}>{has ? "Club code is set on this device" : "Edit lock: enter the club code"}</button>
  return (
    <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); setClubCode(String(new FormData(e.currentTarget).get("code") || "").trim()) }}>
      <input name="code" type="password" autoComplete="off" placeholder="Club code" defaultValue={getClubCode()} aria-label="Club code" className={fieldCls} />
      <button className="min-h-11 rounded-lg bg-primary px-3 text-primary-foreground">Save</button>
      {has && <button type="button" className="min-h-11 px-3 underline" onClick={() => setClubCode("")}>Clear</button>}
    </form>
  )
}

function Shell() {
  const { ready, error, offline, movies, members, me, setMe, attending, refresh, toast, dismissToast, mini, lb, loadLb } = useStore()
  const { pull, busy, ready: willRefresh } = usePull(refresh)
  const [adding, setAdding] = useState(false)
  // easter egg: five quick taps on the title bring up a clapperboard
  const [slate, setSlate] = useState(false)
  const taps = useRef({ n: 0, t: 0 })
  const tapTitle = () => {
    const now = Date.now(), k = taps.current
    k.n = now - k.t < 1500 ? k.n + 1 : 1
    k.t = now
    if (k.n >= 5) { k.n = 0; setSlate(true) }
  }
  const [tab = "films", sub0, ...rest] = useHash()
  // the Me tab is your own profile page: it behaves like #/people/<you>
  const sub = tab === "me" ? me || undefined : sub0
  const page = tab === "me" ? "people" : tab
  const up = pickOrder(movies, attending)[0]?.n
  const stillOf = (m: { title: string; year: number }) => mini[key(m.title, m.year)]?.b
  // every time a tab is opened the header moves on to another still
  const [spin, setSpin] = useState(0)
  // once the first page is up, quietly download the rest of the tabs
  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => Object.values(loaders).forEach(load => load().catch(() => {})), 1200)
    return () => clearTimeout(t)
  }, [ready])
  useEffect(() => { const t = setTimeout(() => sessionStorage.removeItem("chunk-reload"), 15000); return () => clearTimeout(t) }, [])
  const [searching, setSearching] = useState(false)
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName)) { e.preventDefault(); setSearching(true) } }
    addEventListener("keydown", f)
    return () => removeEventListener("keydown", f)
  }, [])
  const firstTab = useRef(true)
  useEffect(() => { if (firstTab.current) { firstTab.current = false; return } setSpin(s => s + 1) }, [tab])
  const heroFilm = pickHeroFilm(movies, m => !!stillOf(m), [page, sub ?? ""].filter(Boolean), new Date(), spin)
  // a person's page opens on their own favorite from Letterboxd when they have imported, otherwise on their favorite club film
  useEffect(() => { if (page === "people") loadLb() }, [page, loadLb])
  const lbFav = useMemo(() => (page === "people" && sub ? favoritesOf(lb, sub, 1)[0] : undefined), [page, sub, lb])
  const favInfo = useFilmInfo(lbFav?.title ?? "", lbFav?.year ?? null)
  const subject = lbFav
    ? { title: lbFav.title, year: lbFav.year, tmdbId: favInfo?.id as number | undefined, fallback: favInfo?.backdrop_path as string | undefined, note: `${sub}'s favorite on Letterboxd` }
    : heroFilm ? { title: heroFilm.title, year: heroFilm.year, tmdbId: heroFilm.tmdb_id, fallback: stillOf(heroFilm) } : undefined
  const { still: heroStill, count: stillCount, next: nextStill } = useStills(subject, spin)
  const active = tab === "people" ? (sub === me ? "me" : "stats") : tab // member pages live under Stats, yours under Me
  // the pill behind the active tab slides to it
  const barRef = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  useLayoutEffect(() => {
    const place = () => {
      const el = barRef.current?.querySelector<HTMLElement>("[data-active]")
      if (el) setPill({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight })
    }
    place()
    window.addEventListener("resize", place)
    return () => window.removeEventListener("resize", place)
  }, [active, ready])
  const idx = Math.max(0, TABS.findIndex(t => t[0] === active))
  useSwipe(
    () => { if (idx < TABS.length - 1) go(TABS[idx + 1][0]) },
    () => { if (idx > 0) go(TABS[idx - 1][0]) },
  )

  return (
    <>
      {(pull > 4 || busy) && (
        <div role="status" className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center" style={{ transform: `translateY(${Math.max(pull, 0) - 44}px)` }}>
          <span className="flex size-10 items-center justify-center rounded-full bg-card shadow-lg ring-1 ring-border">
            <RefreshCw className={`size-5 ${busy ? "animate-spin" : ""} ${willRefresh ? "text-us" : "text-muted-foreground"}`} style={busy ? undefined : { transform: `rotate(${pull * 3}deg)` }} />
            <span className="sr-only">{busy ? "Refreshing" : willRefresh ? "Release to refresh" : "Pull to refresh"}</span>
          </span>
        </div>
      )}
      {slate && (
        <Clapperboard
          onClose={() => setSlate(false)}
          fields={[
            ["Production", "Movie Club"],
            ["Scene", String(movies.length)],
            ["Take", String(movies.reduce((n, m) => n + Object.keys(m.ratings).length, 0))],
            ["Director", up || "Whoever's turn it is"],
            ["Date", new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })],
          ]}
        />
      )}
      {toast && (
        <div role="status" key={toast.id} className="spring-in fixed right-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] left-16 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-foreground px-4 py-2.5 text-sm text-background shadow-xl md:inset-x-3 md:bottom-6">
          <span className="min-w-0 flex-1">{toast.msg}</span>
          {toast.undo && <button type="button" className="min-h-11 rounded-md px-3 font-semibold underline" onClick={() => { toast.undo?.(); dismissToast() }}>Undo</button>}
        </div>
      )}
    <div className="mx-auto w-full max-w-3xl overflow-x-clip pt-5 pr-3 pb-12 pl-[3.75rem] md:px-4">
      <Hero
        film={subject}
        still={heroStill}
        onNext={nextStill}
        canShuffle={stillCount > 1}
        title={
          <header>
            <h1 onClick={tapTitle} className="text-5xl leading-[0.95] font-extrabold tracking-tight select-none sm:text-6xl">Movie Club</h1>
            {movies.length > 0 && <p className="mt-2 text-sm opacity-85">{movies.length} films watched · {up ? `${up} picks next` : "switch on who's here on Next up"}</p>}
          </header>
        }
        controls={
          <div className="flex flex-wrap items-end gap-3">
            <button type="button" aria-label="Search films and people" onClick={() => setSearching(true)} className="flex size-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"><Search className="size-5" aria-hidden /></button>
            <ThemeMenu />
            <label className="flex w-fit flex-col gap-0.5 text-xs text-muted-foreground">
              You are
              <select className={fieldCls} value={me} onChange={e => { if (e.target.value === "__new") setAdding(true); else { setAdding(false); setMe(e.target.value) } }}>
                <option value="">Who are you?</option>
                {members.map(n => <option key={n}>{n}</option>)}
                <option value="__new">+ New person…</option>
              </select>
            </label>
          </div>
        }
      />
      {searching && <SearchOverlay onClose={() => setSearching(false)} />}
      {offline && <p role="status" className="mb-3 rounded-lg bg-card px-3 py-2 text-sm">No connection. Showing the last data saved on this device; edits won't save until you're back online.</p>}
      {adding && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-card p-3">
          <span className="text-sm text-muted-foreground">Who's joining?</span>
          <AddPerson autoFocus label="Add and sign in as them" onAdded={n => { setMe(n); setAdding(false) }} />
        </div>
      )}

      <Tabs value={TABS.some(t => t[0] === active) ? active : "films"} onValueChange={v => go(v as string)}>
        <TabsList ref={barRef} className="fixed top-1/2 left-1.5 z-40 mb-0 h-auto -translate-y-1/2 flex-col gap-1 rounded-2xl bg-card/95 p-1 shadow-xl ring-1 ring-border backdrop-blur md:relative md:top-auto md:left-auto md:mb-5 md:w-full md:translate-y-0 md:flex-row md:gap-0 md:bg-muted md:shadow-none md:ring-0">
          {pill && <span aria-hidden className="absolute rounded-xl bg-primary transition-[left,top,width,height] duration-300 ease-out" style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }} />}
          {TABS.map(([v, l]) => {
            const Icon = ICONS[v]
            return (
              <TabsTrigger key={v} value={v} title={l} className="h-11 w-11 flex-none px-1 text-[13px] md:h-[calc(100%-1px)] md:min-h-11 md:w-auto md:flex-1 md:text-sm">
                <Icon className="size-5 md:hidden" aria-hidden />
                <span className="sr-only md:not-sr-only">{l}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      <main key={tab + (sub ?? "")}>{!sub && TABS.some(t => t[0] === tab) && tab !== "me" && <h2 className="sr-only">{TABS.find(t => t[0] === tab)![1]}</h2>}<ErrorBoundary resetKey={tab + (sub ?? "")}><Suspense fallback={<Leader />}>
        {error ? <p role="alert">Couldn't load the club's data: {error}</p> : !ready ? <Leader /> : (
          tab === "next" ? <Next /> : tab === "suggest" ? <Suggest /> : tab === "watch" ? <Watch /> : tab === "me" ? (me ? <MemberPage name={me} own /> : <p className="text-muted-foreground">Pick your name at the top to see your own page.</p>) : tab === "wrapped" ? <Wrapped /> : tab === "movie" && sub ? <MoviePage title={sub} year={Number(rest[0]) || 0} /> : tab === "people" && sub ? <MemberPage name={sub} /> : tab === "stats" ? <Stats /> : sub ? <FilmPage id={sub} /> : <Films />
        )}
      </Suspense></ErrorBoundary></main>
      <footer className="mt-10 flex flex-col gap-2 text-xs text-muted-foreground">
        <ClubCode />
        <p>Film data and images from <a className="underline" href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a>. This site uses the TMDB API but is not endorsed or certified by TMDB.</p>
        <p>Looking for more stills? <a className="underline" href="https://film-grab.com/" target="_blank" rel="noopener">Film-Grab</a> collects frames from thousands of films.</p>
      </footer>
    </div>
    </>
  )
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>
}
