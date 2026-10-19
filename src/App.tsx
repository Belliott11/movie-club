import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StoreProvider, useStore } from "@/lib/store"
import { go, useHash } from "@/lib/useHash"
import { pickOrder } from "@/lib/stats"
import { AddPerson } from "@/components/AddPerson"
import { fieldCls } from "@/components/field"
import { useState } from "react"
import Films from "@/pages/Films"
import FilmPage from "@/pages/FilmPage"
import Next from "@/pages/Next"
import Stats from "@/pages/Stats"
import Suggest from "@/pages/Suggest"
import Watch from "@/pages/Watch"

const TABS = [["films", "Films"], ["next", "Next up"], ["suggest", "Suggestions"], ["watch", "Watchlists"], ["stats", "Stats"]] as const

function Shell() {
  const { ready, error, movies, members, me, setMe, attending } = useStore()
  const [adding, setAdding] = useState(false)
  const [tab = "films", sub] = useHash()
  const up = pickOrder(movies, attending)[0]?.n

  return (
    <div className="mx-auto max-w-3xl px-4 pt-5 pb-28 md:pb-12">
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
      {adding && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-card p-3">
          <span className="text-sm text-muted-foreground">Who's joining?</span>
          <AddPerson autoFocus label="Add and sign in as them" onAdded={n => { setMe(n); setAdding(false) }} />
        </div>
      )}

      <Tabs value={TABS.some(t => t[0] === tab) ? tab : "films"} onValueChange={v => go(v as string)}>
        <TabsList className="fixed inset-x-2 bottom-2 z-20 mb-0 rounded-2xl bg-card/95 p-1 shadow-xl ring-1 ring-border backdrop-blur md:static md:mb-5 md:bg-muted md:shadow-none md:ring-0">
          {TABS.map(([v, l]) => <TabsTrigger key={v} value={v} className="min-h-11 px-1 text-[13px] sm:text-sm">{l}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <main className="rise" key={tab + (sub ?? "")}>
        {error ? <p role="alert">Couldn't load the club's data: {error}</p> : !ready ? <p role="status" className="text-muted-foreground">Loading the club…</p> : (
          tab === "next" ? <Next /> : tab === "suggest" ? <Suggest /> : tab === "watch" ? <Watch /> : tab === "stats" ? <Stats /> : sub ? <FilmPage id={sub} /> : <Films />
        )}
      </main>
      <footer className="mt-10 text-xs text-muted-foreground">
        Film data and images from <a className="underline" href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a>. This site uses the TMDB API but is not endorsed or certified by TMDB.
      </footer>
    </div>
  )
}

export default function App() {
  return <StoreProvider><Shell /></StoreProvider>
}
