import { createClient } from "@supabase/supabase-js"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { loadMini, omdbFill, saveMini, searchFilm } from "./api"
import { isUnused, mergeMovies, mergeSuggestions, mergeWatch } from "./people"
import { SEED } from "./seed"
import { key, membersOf } from "./stats"
import type { Id, Mini, Movie, Suggestion, WatchItem } from "./types"

// Optional edit lock: when schema-lock.sql is applied, writes need the club code sent as a header.
const CODE_KEY = "club-code"
export const getClubCode = () => localStorage.getItem(CODE_KEY) || ""
export const setClubCode = (c: string) => { if (c) localStorage.setItem(CODE_KEY, c); else localStorage.removeItem(CODE_KEY); location.reload() }
const sb = CONFIG.SUPABASE_URL
  ? createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY, { global: { headers: getClubCode() ? { "x-club-code": getClubCode() } : {} } })
  : null

const LS = "movieclub-v1"
const SNAP = "snapshot-v1"
const lsGet = <T,>(k: string, d: T): T => {
  try { return JSON.parse(localStorage.getItem(k) || "") ?? d } catch { return d }
}
const lsSet = (k: string, v: unknown) => {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ }
}
const fail = (e: { message: string; code?: string } | null) => {
  if (!e) return
  if (e.code === "42501" || /row-level security/i.test(e.message)) alert("Editing is locked. Enter the club code at the bottom of the page, then try again.")
  else alert(e.message)
}

export type Toast = { id: number; msg: string; undo?: () => void }
export type Takes = Record<string, string> // "movieId|member" -> one-line take

type Store = {
  ready: boolean; error: string; offline: boolean
  movies: Movie[]; watchlist: WatchItem[]; suggestions: Suggestion[]; takes: Takes
  mini: Record<string, Mini>; me: string; attending: string[]; members: string[]; shared: boolean
  toast: Toast | null; dismissToast: () => void
  refresh: () => Promise<void>
  setMe: (n: string) => void; toggleAttend: (n: string) => void
  /** Adds a person (or finds the existing one, ignoring case) and returns their name. */
  addMember: (name: string) => Promise<string>
  /** Renames a person, or merges them into an existing one. Ratings, picks, watchlists and votes all move. */
  renameMember: (from: string, to: string) => Promise<void>
  removeMember: (name: string) => Promise<void>
  addMovie: (title: string, year: number, pick: string, ratings?: Record<string, number>, tmdbId?: number | null) => Promise<void>
  setRating: (m: Movie, member: string, v: number | null) => Promise<void>
  setTake: (m: Movie, member: string, text: string) => Promise<void>
  patchMovie: (m: Movie, f: Partial<Movie>) => Promise<void>
  deleteMovie: (m: Movie) => Promise<void>
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
  const [offline, setOffline] = useState(false)
  const [movies, setMovies] = useState<Movie[]>([])
  const [watchlist, setWatchlist] = useState<WatchItem[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [takes, setTakes] = useState<Takes>(() => lsGet("takes-local", {}))
  const [mini, setMini] = useState<Record<string, Mini>>(loadMini)
  const [me, setMeState] = useState(() => localStorage.getItem("me") || "")
  const [attending, setAttending] = useState<string[]>(() => lsGet("attending", []))
  const [extra, setExtra] = useState<string[]>(() => lsGet("extra-members", []))
  const [toast, setToast] = useState<Toast | null>(null)
  const movRef = useRef(movies)
  movRef.current = movies
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const notify = useCallback((msg: string, undo?: () => void) => {
    clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), msg, undo })
    toastTimer.current = setTimeout(() => setToast(null), 7000)
  }, [])
  const dismissToast = useCallback(() => { clearTimeout(toastTimer.current); setToast(null) }, [])

  const load = useCallback(async () => {
    if (!sb) {
      const d = lsGet(LS, { movies: [], watchlist: [], suggestions: [] })
      setMovies(d.movies); setWatchlist(d.watchlist); setSuggestions(d.suggestions)
      return
    }
    try {
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
      // members and takes tables are optional: older setups do not have them
      const mem = await sb.from("members").select("name")
      if (!mem.error) setExtra(e => [...new Set([...e, ...(mem.data as { name: string }[]).map(x => x.name)])])
      const tk = await sb.from("takes").select("*")
      if (!tk.error) setTakes(t => ({ ...t, ...Object.fromEntries((tk.data as any[]).map(x => [`${x.movie_id}|${x.member}`, x.text as string])) }))
      setOffline(false)
      lsSet(SNAP, { movies: ms, watchlist: w.data, suggestions: s.data })
    } catch (e) {
      const snap = lsGet<any>(SNAP, null)
      if (!snap) throw e
      // no connection: show the last data this phone saw
      setMovies(snap.movies); setWatchlist(snap.watchlist); setSuggestions(snap.suggestions); setOffline(true)
    }
  }, [])
  useEffect(() => { load().then(() => setReady(true), e => setError(e.message)) }, [load])
  /** Re-reads the shared data (pull to refresh). Local-only mode already has everything in memory. */
  const refresh = useCallback(async () => {
    try { await load() } catch (e) { alert(`Couldn't refresh: ${(e as Error).message}`) }
  }, [load])

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
    if (!ready || offline || !CONFIG.TMDB_KEY) return
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
  }, [ready, offline, patchMovie])

  /** Inserts a whole film (used by add, and by undoing a delete). */
  const insertMovie = useCallback(async (m: Omit<Movie, "id">): Promise<Movie | null> => {
    let id: Id = Date.now() + Math.random()
    if (sb) {
      const { ratings, ...row } = m
      const { data, error } = await sb.from("movies").insert(row).select().single()
      if (error) { fail(error); return null }
      id = data.id
      const rows = Object.entries(ratings).map(([member, value]) => ({ movie_id: id, member, value }))
      if (rows.length) fail((await sb.from("ratings").insert(rows)).error)
    }
    const full = { ...m, id }
    setMovies(ms => [...ms, full].sort((a, b) => a.seq - b.seq))
    return full
  }, [])

  const addMovie: Store["addMovie"] = useCallback(async (title, year, pick, ratings = {}, tmdbId = null) => {
    const seq = Math.max(0, ...movRef.current.map(x => x.seq)) + 1
    await insertMovie({ seq, title, year, pick, ratings, tmdb_id: tmdbId })
  }, [insertMovie])

  const deleteMovie = useCallback(async (m: Movie) => {
    setMovies(ms => ms.filter(x => x.id !== m.id))
    if (sb) fail((await sb.from("movies").delete().eq("id", m.id)).error) // ratings go with it (on delete cascade)
    const { id: _gone, ...rest } = m
    notify(`Deleted ${m.title}`, () => { insertMovie(rest) })
  }, [insertMovie, notify])

  const writeRating = useCallback(async (m: Movie, member: string, v: number | null) => {
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

  const setRating: Store["setRating"] = useCallback(async (m, member, v) => {
    const prev = movRef.current.find(x => x.id === m.id)?.ratings[member] ?? null
    await writeRating(m, member, v)
    notify(`${member}: ${v == null ? "rating cleared" : `${v} stars`} for ${m.title}`, () => { writeRating(m, member, prev) })
  }, [writeRating, notify])

  const setTake: Store["setTake"] = useCallback(async (m, member, text) => {
    const k = `${m.id}|${member}`, t = text.trim()
    setTakes(all => {
      const next = { ...all }
      if (t) next[k] = t
      else delete next[k]
      lsSet("takes-local", next)
      return next
    })
    if (!sb) return
    const { error } = t ? await sb.from("takes").upsert({ movie_id: m.id, member, text: t }) : await sb.from("takes").delete().match({ movie_id: m.id, member })
    if (error) alert("Saved on this device only. To share takes with everyone, run the takes table SQL from schema.sql in Supabase.")
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
      if (error) return fail(error)
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

  const renameMember = useCallback(async (fromRaw: string, toRaw: string) => {
    const from = fromRaw, to = toRaw.trim().replace(/\s+/g, " ")
    if (!to || to === from) return
    const existing = membersOf(movRef.current, watchlist, extra).find(x => x.toLowerCase() === to.toLowerCase() && x !== from)
    const target = existing || to
    const before = movRef.current
    if (sb) {
      // ratings: move or, when the target already rated that film, drop the old one
      for (const m of before) {
        if (m.ratings[from] == null) continue
        fail((m.ratings[target] != null
          ? await sb.from("ratings").delete().match({ movie_id: m.id, member: from })
          : await sb.from("ratings").update({ member: target }).match({ movie_id: m.id, member: from })).error)
      }
      fail((await sb.from("movies").update({ pick: target }).eq("pick", from)).error)
      const dupes = watchlist.filter(w => w.member === from && watchlist.some(x => x.member === target && x.title === w.title && x.year === w.year))
      for (const w of dupes) await sb.from("watchlist").delete().match({ member: from, title: w.title, year: w.year })
      fail((await sb.from("watchlist").update({ member: target }).eq("member", from)).error)
      for (const s of suggestions) {
        if (s.by !== from && !(s.votes || []).includes(from)) continue
        const merged = mergeSuggestions([s], from, target)[0]
        fail((await sb.from("suggestions").update({ by: merged.by, votes: merged.votes }).eq("id", s.id)).error)
      }
      await sb.from("members").delete().eq("name", from)
      await sb.from("members").insert({ name: target })
      for (const [k, text] of Object.entries(takes)) {
        const [mid, who] = k.split("|")
        if (who !== from) continue
        if (takes[`${mid}|${target}`]) await sb.from("takes").delete().match({ movie_id: mid, member: from })
        else await sb.from("takes").update({ member: target }).match({ movie_id: mid, member: from })
        void text
      }
    }
    setMovies(ms => mergeMovies(ms, from, target))
    setWatchlist(w => mergeWatch(w, from, target))
    setSuggestions(s => mergeSuggestions(s, from, target))
    setTakes(t => {
      const next: Takes = {}
      for (const [k, v] of Object.entries(t)) {
        const [mid, who] = k.split("|")
        const nk = who === from ? `${mid}|${target}` : k
        if (!(nk in next) || who !== from) next[nk] = v
      }
      lsSet("takes-local", next)
      return next
    })
    setExtra(e => { const b = [...new Set(e.filter(x => x !== from).concat(target))]; lsSet("extra-members", b); return b })
    setAttending(a => { const b = [...new Set(a.map(x => (x === from ? target : x)))]; lsSet("attending", b); return b })
    if (me === from) { setMeState(target); localStorage.setItem("me", target) }
    notify(existing ? `Merged ${from} into ${target}` : `Renamed ${from} to ${target}`)
  }, [watchlist, suggestions, takes, extra, me, notify])

  const removeMember = useCallback(async (name: string) => {
    if (!isUnused(name, movRef.current, watchlist, suggestions)) return alert(`${name} has ratings, picks or a watchlist. Merge them into someone else instead.`)
    setExtra(e => { const b = e.filter(x => x !== name); lsSet("extra-members", b); return b })
    setAttending(a => { const b = a.filter(x => x !== name); lsSet("attending", b); return b })
    if (sb) await sb.from("members").delete().eq("name", name)
    if (me === name) { setMeState(""); localStorage.removeItem("me") }
  }, [watchlist, suggestions, me])

  const setMe = (n: string) => { setMeState(n); localStorage.setItem("me", n) }
  const toggleAttend = (n: string) =>
    setAttending(a => {
      const b = a.includes(n) ? a.filter(x => x !== n) : [...a, n]
      lsSet("attending", b)
      return b
    })
  const members = useMemo(() => membersOf(movies, watchlist, me ? [...extra, me] : extra), [movies, watchlist, me, extra])

  const value: Store = {
    ready, error, offline, movies, watchlist, suggestions, takes, mini, me, attending, members, shared: !!sb, toast, dismissToast,
    refresh, setMe, toggleAttend, addMember, renameMember, removeMember, addMovie, setRating, setTake, patchMovie, deleteMovie, seed,
    importWatchlist, suggest, vote, removeSuggestion,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
