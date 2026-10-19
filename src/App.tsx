import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getClubCode, setClubCode, StoreProvider, useStore } from "@/lib/store"
import { go, useHash } from "@/lib/useHash"
import { usePull } from "@/lib/usePull"
import { useSwipe } from "@/lib/useSwipe"
import { RefreshCw } from "lucide-react"
import { pickOrder } from "@/lib/stats"
import { AddPerson } from "@/components/AddPerson"
import { fieldCls } from "@/components/field"
import { useState } from "react"
import Films from "@/pages/Films"
import MemberPage from "@/pages/MemberPage"
import FilmPage from "@/pages/FilmPage"
import Next from "@/pages/Next"
import Stats from "@/pages/Stats"
import Suggest from "@/pages/Suggest"
import Watch from "@/pages/Watch"

const TABS = [["films", "Films"], ["next", "Next up"], ["suggest", "Suggestions"], ["watch", "Watchlists"], ["stats", "Stats"]] as const

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
  const { ready, error, offline, movies, members, me, setMe, attending, refresh, toast, dismissToast } = useStore()
  const { pull, busy, ready: willRefresh } = usePull(refresh)
  const [adding, setAdding] = useState(false)
  const [tab = "films", sub] = useHash()
  const up = pickOrder(movies, attending)[0]?.n
  const active = tab === "people" ? "stats" : tab // member pages live under Stats
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
      {toast && (
        <div role="status" className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-foreground px-4 py-2.5 text-sm text-background shadow-xl md:bottom-6">
          <span className="min-w-0 flex-1">{toast.msg}</span>
          {toast.undo && <button type="button" className="min-h-11 rounded-md px-3 font-semibold underline" onClick={() => { toast.undo?.(); dismissToast() }}>Undo</button>}
        </div>
      )}
    <div className="mx-auto w-full max-w-3xl overflow-x-clip px-4 pt-5 pb-28 md:pb-12">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-6xl">Movie Club</h1>
          {movies.length > 0 && <p className="mt-2 text-sm text-muted-foreground">{movies.length} films watched · {up ? `${up} picks next` : "switch on who's here on Next up"}</p>}
        </div>
        <label className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          You are
          <select className={fieldCls} value={me} onChange={e => { if (e.target.value === "__new") setAdding(true); else { setAdding(false); setMe(e.target.value) } }}>
            <option value="">Who are you?</option>
            {members.map(n => <option key={n}>{n}</option>)}
            <option value="__new">+ New person…</option>
          </select>
        </label>
      </header>
      {offline && <p role="status" className="mb-3 rounded-lg bg-card px-3 py-2 text-sm">No connection. Showing the last data saved on this device; edits won't save until you're back online.</p>}
      {adding && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-card p-3">
          <span className="text-sm text-muted-foreground">Who's joining?</span>
          <AddPerson autoFocus label="Add and sign in as them" onAdded={n => { setMe(n); setAdding(false) }} />
        </div>
      )}

      <Tabs value={TABS.some(t => t[0] === active) ? active : "films"} onValueChange={v => go(v as string)}>
        <TabsList className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-40 mb-0 rounded-2xl bg-card/95 p-1 shadow-xl ring-1 ring-border backdrop-blur md:static md:mb-5 md:w-full md:bg-muted md:shadow-none md:ring-0">
          {TABS.map(([v, l]) => <TabsTrigger key={v} value={v} className="min-h-11 px-1 text-[13px] sm:text-sm">{l}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <main className="rise" key={tab + (sub ?? "")}>
        {error ? <p role="alert">Couldn't load the club's data: {error}</p> : !ready ? <p role="status" className="text-muted-foreground">Loading the club…</p> : (
          tab === "next" ? <Next /> : tab === "suggest" ? <Suggest /> : tab === "watch" ? <Watch /> : tab === "people" && sub ? <MemberPage name={sub} /> : tab === "stats" ? <Stats /> : sub ? <FilmPage id={sub} /> : <Films />
        )}
      </main>
      <footer className="mt-10 flex flex-col gap-2 text-xs text-muted-foreground">
        <ClubCode />
        <p>Film data and images from <a className="underline" href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a>. This site uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </footer>
    </div>
    </>
  )
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>
}
