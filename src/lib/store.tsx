import { createClient } from "@supabase/supabase-js"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { loadMini, omdbFill, saveMini, searchFilm } from "./api"
import { SEED } from "./seed"
import { key, membersOf } from "./stats"
import type { Id, Mini, Movie, Suggestion, WatchItem } from "./types"

const sb = CONFIG.SUPABASE_URL ? createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY) : null
const LS = "movieclub-v1"
const lsGet = <T,>(k: string, d: T): T => {
  try { return JSON.parse(localStorage.getItem(k) || "") ?? d } catch { return d }
}
const lsSet = (k: string, v: unknown) => {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ }
}
const fail = (e: { message: string } | null) => { if (e) alert(e.message) }

type Store = {
  ready: boolean; error: string; movies: Movie[]; watchlist: WatchItem[]; suggestions: Suggestion[]
  mini: Record<string, Mini>; me: string; attending: string[]; members: string[]; shared: boolean
  setMe: (n: string) => void; toggleAttend: (n: string) => void
  /** Adds a person (or finds the existing one, ignoring case) and returns their name. */
  addMember: (name: string) => Promise<string>
  addMovie: (title: string, year: number, pick: string, ratings?: Record<string, number>, tmdbId?: number | null) => Promise<void>
  setRating: (m: Movie, member: string, v: number | null) => Promise<void>
  patchMovie: (m: Movie, f: Partial<Movie>) => Promise<void>
  seed: () => Promise<void>
  importWatchlist: (items: WatchItem[]) => Promise<void>
  suggest: (title: string, year: number | null) => Promise<void>
  vote: (s: Suggestion) => Promise<void>
  removeSuggestion: (s: Suggestion) => Promise<void>
}
const Ctx = createContext<Store>(null!)
export const useStore = () => useContext(Ctx)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [movies, setMovies] = useState<Movie[]>([])
  const [watchlist, setWatchlist] = useState<WatchItem[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [mini, setMini] = useState<Record<string, Mini>>(loadMini)
  const [me, setMeState] = useState(() => localStorage.getItem("me") || "")
  const [attending, setAttending] = useState<string[]>(() => lsGet("attending", []))
  const [extra, setExtra] = useState<string[]>(() => lsGet("extra-members", []))
  const movRef = useRef(movies)
  movRef.current = movies

  useEffect(() => {
    ;(async () => {
      if (!sb) {
        const d = lsGet(LS, { movies: [], watchlist: [], suggestions: [] })
        setMovies(d.movies); setWatchlist(d.watchlist); setSuggestions(d.suggestions)
        return
      }
      const [m, r, w, s] = await Promise.all(["movies", "ratings", "watchlist", "suggestions"].map(t => sb.from(t).select("*")))
      const bad = [m, r, w, s].find(x => x.error)
      if (bad) throw bad.error
      const ms: Movie[] = (m.data as any[]).sort((a, b) => a.seq - b.seq).map(x => ({ ...x, ratings: {} }))
      const byId = new Map(ms.map(x => [x.id, x]))
      for (const x of r.data as any[]) {
        const mv = byId.get(x.movie_id)
        if (mv) mv.ratings[x.member] = +x.value
      }
      setMovies(ms); setWatchlist(w.data as WatchItem[]); setSuggestions(s.data as Suggestion[])
      const mem = await sb.from("members").select("name") // table is optional: older setups do not have it
      if (!mem.error) setExtra(e => [...new Set([...e, ...(mem.data as { name: string }[]).map(x => x.name)])])
    })().then(() => setReady(true), e => setError(e.message))
  }, [])

  // local-only mode keeps everything in this browser
  useEffect(() => {
    if (ready && !sb) lsSet(LS, { movies, watchlist, suggestions })
  }, [ready, movies, watchlist, suggestions])

  const patchMovie = useCallback(async (m: Movie, f: Partial<Movie>) => {
    setMovies(ms => ms.map(x => (x.id === m.id ? { ...x, ...f } : x)))
    if (sb) fail((await sb.from("movies").update(f).eq("id", m.id)).error)
  }, [])

  // once data is in: poster + TMDB id first, then blank outside ratings
  useEffect(() => {
    if (!ready || !CONFIG.TMDB_KEY) return
    let dead = false
    ;(async () => {
      const cache = loadMini()
      let changed = false
      for (const m of movRef.current) {
        const k = key(m.title, m.year)
        if (cache[k] && m.tmdb_id) continue
        const r = await searchFilm(m.title, m.year)
        if (dead) return
        cache[k] = r ? { p: r.poster_path, v: r.vote_average } : { p: null, v: null }
        if (r && !m.tmdb_id) { m.tmdb_id = r.id; patchMovie(m, { tmdb_id: r.id }) }
        changed = true
        setMini({ ...cache })
      }
      if (changed) saveMini(cache)
      for (const m of movRef.current) {
        const f = await omdbFill(m)
        if (dead) return
        if (f) await patchMovie(m, f)
      }
    })()
    return () => { dead = true }
  }, [ready, patchMovie])

  const addMovie: Store["addMovie"] = useCallback(async (title, year, pick, ratings = {}, tmdbId = null) => {
    const seq = Math.max(0, ...movRef.current.map(x => x.seq)) + 1
    let id: Id = Date.now() + Math.random()
    if (sb) {
      const { data, error } = await sb.from("movies").insert({ seq, title, year, pick, tmdb_id: tmdbId }).select().single()
      if (error) return alert(error.message)
      id = data.id
      const rows = Object.entries(ratings).map(([member, value]) => ({ movie_id: id, member, value }))
      if (rows.length) fail((await sb.from("ratings").insert(rows)).error)
    }
    setMovies(ms => [...ms, { id, seq, title, year, pick, ratings, tmdb_id: tmdbId }])
  }, [])

  const setRating: Store["setRating"] = useCallback(async (m, member, v) => {
    setMovies(ms => ms.map(x => {
      if (x.id !== m.id) return x
      const r = { ...x.ratings }
      if (v == null) delete r[member]
      else r[member] = v
      return { ...x, ratings: r }
    }))
    if (!sb) return
    fail((v == null ? await sb.from("ratings").delete().match({ movie_id: m.id, member }) : await sb.from("ratings").upsert({ movie_id: m.id, member, value: v })).error)
  }, [])

  const seed = useCallback(async () => {
    const have = new Set(movRef.current.map(m => key(m.title, m.year)))
    for (const [t, y, p, r] of SEED) if (!have.has(key(t, y))) await addMovie(t, y, p, r)
  }, [addMovie])

  const importWatchlist = useCallback(async (items: WatchItem[]) => {
    const who = items[0]?.member
    setWatchlist(w => w.filter(x => x.member !== who).concat(items))
    if (!sb || !who) return
    fail((await sb.from("watchlist").delete().eq("member", who)).error)
    for (let i = 0; i < items.length; i += 500) fail((await sb.from("watchlist").insert(items.slice(i, i + 500))).error)
  }, [])

  const suggest = useCallback(async (title: string, year: number | null) => {
    if (!me) return alert("Pick your name first.")
    const s: Suggestion = { id: Date.now() + Math.random(), title, year, by: me, votes: [me] }
    if (sb) {
      const { data, error } = await sb.from("suggestions").insert({ title, year, by: me, votes: [me] }).select().single()
      if (error) return alert(error.message)
      s.id = data.id
    }
    setSuggestions(x => [...x, s])
  }, [me])

  const vote = useCallback(async (s: Suggestion) => {
    if (!me) return alert("Pick your name first.")
    const votes = s.votes?.includes(me) ? s.votes.filter(v => v !== me) : [...(s.votes || []), me]
    setSuggestions(x => x.map(y => (y.id === s.id ? { ...y, votes } : y)))
    if (sb) fail((await sb.from("suggestions").update({ votes }).eq("id", s.id)).error)
  }, [me])

  const removeSuggestion = useCallback(async (s: Suggestion) => {
    setSuggestions(x => x.filter(y => y.id !== s.id))
    if (sb) fail((await sb.from("suggestions").delete().eq("id", s.id)).error)
  }, [])

  const addMember = useCallback(async (raw: string) => {
    const name = raw.trim().replace(/\s+/g, " ")
    if (!name) return ""
    const known = membersOf(movRef.current, [], extra).find(x => x.toLowerCase() === name.toLowerCase())
    if (known) return known
    setExtra(e => { const b = [...e, name]; lsSet("extra-members", b); return b })
    if (sb) {
      const { error } = await sb.from("members").insert({ name })
      if (error) alert(`Added ${name} on this device only. To share new people with everyone, run the members table SQL from schema.sql in Supabase.`)
    }
    return name
  }, [extra])

  const setMe = (n: string) => { setMeState(n); localStorage.setItem("me", n) }
  const toggleAttend = (n: string) =>
    setAttending(a => {
      const b = a.includes(n) ? a.filter(x => x !== n) : [...a, n]
      lsSet("attending", b)
      return b
    })
  const members = useMemo(() => membersOf(movies, watchlist, me ? [...extra, me] : extra), [movies, watchlist, me, extra])

  const value: Store = { ready, error, movies, watchlist, suggestions, mini, me, attending, members, shared: !!sb, setMe, toggleAttend, addMember, addMovie, setRating, patchMovie, seed, importWatchlist, suggest, vote, removeSuggestion }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
