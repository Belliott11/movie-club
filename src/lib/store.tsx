import { createClient } from "@supabase/supabase-js"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { loadMini, omdbFill, saveMini, searchFilm } from "./api"
import { findEntry, type LbEntry, type LbHistory } from "./letterboxd"
import { isUnused, mergeMovies, mergeSuggestions, mergeWatch } from "./people"
import { lockKey, newSealKeys, openScore, sealScore, unlockKey } from "./seal"
import { SEED } from "./seed"
import { key, membersOf } from "./stats"
import type { Id, Mini, Movie, RecFlag, Suggestion, WatchItem } from "./types"

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
export type SealState = {
  ready: boolean
  /** false when the shared tables don't exist yet, so sealing works on this device only */
  shared: boolean
  publicKey: string | null
  /** the host's private key locked with their PIN, so any device can unlock it with the PIN */
  lockedKey: string | null
  /** the film whose scores are being sealed right now */
  openMovie: string | null
  /** who has sealed a score, per film. Only names, never scores. */
  sealedBy: Record<string, string[]>
}

type Store = {
  ready: boolean; error: string; offline: boolean
  movies: Movie[]; watchlist: WatchItem[]; suggestions: Suggestion[]; takes: Takes; flags: RecFlag[]
  mini: Record<string, Mini>
  /** Pick which TMDB poster shows for a film on this device; null goes back to the default. */
  setPoster: (m: Movie, path: string | null) => void
  me: string; attending: string[]; members: string[]; shared: boolean
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
  seal: SealState
  /** True on the device that holds the reveal key. */
  isHost: boolean
  loadSeal: (force?: boolean) => void
  /** Country the club has set for a film, by movie id, replacing the one TMDB reports. Loads with loadSeal. */
  countries: Record<string, string>
  setCountry: (m: Movie, country: string) => Promise<void>
  /** Makes this device the host: creates the key pair, shares the public half, and returns the private half to back up. */
  sealSetup: (pin: string) => Promise<void>
  /** Puts a PIN on the key this device already holds (hosts who set up before PINs existed). */
  sealLock: (pin: string) => Promise<void>
  sealUseKey: (pin: string) => Promise<boolean>
  sealOpen: (m: Movie) => Promise<void>
  sealMine: (m: Movie, v: number) => Promise<void>
  /** What this device sealed for a film, so you can see your own pick. */
  sealedValue: (m: Movie) => number | null
  /** Opens every sealed score for the film, records them as ratings, and returns them lowest first. */
  sealReveal: (m: Movie) => Promise<{ member: string; value: number }[]>
  sealCancel: (m: Movie) => Promise<void>
  /** Everyone's imported Letterboxd history. Loaded the first time a page asks for it, since it is the biggest data in the club. */
  lb: LbHistory; loadLb: () => void
  importLb: (entries: LbEntry[]) => Promise<void>
  /** Copies the signed-in person's Letterboxd ratings onto club films they haven't rated here. Returns how many. */
  fillFromLb: () => Promise<number>
  /** Marks a recommendation as seen or not interesting for the signed-in person; null clears it. */
  setFlag: (tmdbId: number, title: string, kind: RecFlag["kind"] | null) => Promise<void>
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
  const [lb, setLb] = useState<LbHistory>(() => lsGet("lb-local", {}))
  const lbRequested = useRef(false)
  const [flags, setFlags] = useState<RecFlag[]>(() => lsGet("rec-flags-local", []))
  const [seal, setSeal] = useState<SealState>({ ready: false, shared: false, publicKey: null, lockedKey: null, openMovie: null, sealedBy: {} })
  const sealRef = useRef(seal)
  sealRef.current = seal
  const sealLoaded = useRef(false)
  const [countries, setCountries] = useState<Record<string, string>>({})
  const [hostKey, setHostKey] = useState<string | null>(() => localStorage.getItem("seal-private-key"))
  const [takes, setTakes] = useState<Takes>(() => lsGet("takes-local", {}))
  const [mini, setMini] = useState<Record<string, Mini>>(loadMini)
  const [posterPref, setPosterPref] = useState<Record<string, string>>(() => lsGet("poster-pref-v1", {}))
  const miniShown = useMemo(() => {
    const out = { ...mini }
    for (const [k, p] of Object.entries(posterPref)) out[k] = { ...(mini[k] ?? { v: null }), p }
    return out
  }, [mini, posterPref])
  const setPoster = useCallback((m: Movie, path: string | null) => {
    setPosterPref(prev => {
      const next = { ...prev }
      if (path) next[key(m.title, m.year)] = path
      else delete next[key(m.title, m.year)]
      lsSet("poster-pref-v1", next)
      return next
    })
  }, [])
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
      const fl = await sb.from("rec_flags").select("*")
      if (!fl.error) setFlags(local => [...(fl.data as RecFlag[]), ...local.filter(l => !(fl.data as RecFlag[]).some(f => f.member === l.member && f.tmdb_id === l.tmdb_id))])
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
        cache[k] = r ? { p: r.poster_path, v: r.vote_average, b: r.backdrop_path } : { p: null, v: null, b: null }
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

  const setFlag: Store["setFlag"] = useCallback(async (tmdbId, title, kind) => {
    if (!me) return alert("Pick your name first.")
    const prev = flags.find(f => f.member === me && f.tmdb_id === tmdbId)?.kind ?? null
    const write = async (k: RecFlag["kind"] | null) => {
      setFlags(all => {
        const next = all.filter(f => !(f.member === me && f.tmdb_id === tmdbId))
        if (k) next.push({ member: me, tmdb_id: tmdbId, kind: k })
        lsSet("rec-flags-local", next)
        return next
      })
      if (!sb) return
      const { error } = k ? await sb.from("rec_flags").upsert({ member: me, tmdb_id: tmdbId, kind: k }) : await sb.from("rec_flags").delete().match({ member: me, tmdb_id: tmdbId })
      if (error) alert("Saved on this device only. To share seen and not-interested picks across your devices, run the rec_flags table SQL from schema.sql in Supabase.")
    }
    await write(kind)
    if (kind) notify(kind === "seen" ? `Marked ${title} as seen` : `Hiding ${title}`, () => { write(prev) })
  }, [me, flags, notify])

  const loadLb = useCallback(() => {
    if (lbRequested.current || !sb) return
    lbRequested.current = true
    sb.from("lb_history").select("member,data").then(({ data, error }) => {
      if (error || !data) return // table is optional
      setLb(local => {
        const next = { ...local, ...Object.fromEntries((data as { member: string; data: LbEntry[] }[]).map(r => [r.member, r.data])) }
        lsSet("lb-local", next) // remembered, so the next visit has it before the download finishes
        return next
      })
    })
  }, [])

  const importLb = useCallback(async (entries: LbEntry[]) => {
    if (!me) return alert("Pick your name first.")
    setLb(all => {
      const next = { ...all, [me]: entries }
      lsSet("lb-local", next)
      return next
    })
    if (!sb) return
    const { error } = await sb.from("lb_history").upsert({ member: me, data: entries, updated_at: new Date().toISOString() })
    if (error) alert("Saved on this device only. To share Letterboxd history with the club, run the lb_history table SQL from schema.sql in Supabase.")
  }, [me])

  const fillFromLb = useCallback(async () => {
    if (!me) { alert("Pick your name first."); return 0 }
    const todo = movRef.current
      .filter(m => m.ratings[me] == null)
      .map(m => ({ m, r: findEntry(lb[me], m.title, m.year)?.[2] ?? null }))
      .filter((x): x is { m: Movie; r: number } => x.r != null)
    for (const { m, r } of todo) await writeRating(m, me, r)
    if (todo.length) notify(`Added ${todo.length} ${todo.length === 1 ? "rating" : "ratings"} from Letterboxd`, () => { todo.forEach(({ m }) => writeRating(m, me, null)) })
    return todo.length
  }, [me, lb, writeRating, notify])

  // ---- sealed scores ----
  type SealLocal = { publicKey: string | null; locked?: string | null; open: string | null; rows: Record<string, Record<string, string>> }
  const readSealLocal = (): SealLocal => lsGet("seal-local-v1", { publicKey: null, open: null, rows: {} })

  const loadSeal = useCallback(async (force = false) => {
    if (sealLoaded.current && !force) return
    sealLoaded.current = true
    if (sb) {
      const s = await sb.from("club_settings").select("key,value")
      if (!s.error) {
        const get = (k: string) => (s.data as { key: string; value: string }[]).find(r => r.key === k)?.value ?? null
        setCountries(Object.fromEntries((s.data as { key: string; value: string }[]).filter(r => r.key.startsWith("country:")).map(r => [r.key.slice(8), r.value])))
        const rows = await sb.from("sealed").select("movie_id,member")
        const by: Record<string, string[]> = {}
        for (const r of (rows.data ?? []) as { movie_id: number; member: string }[]) (by[String(r.movie_id)] ||= []).push(r.member)
        setSeal({ ready: true, shared: true, publicKey: get("seal_public_key"), lockedKey: get("seal_locked_key"), openMovie: get("seal_open"), sealedBy: by })
        return
      }
    }
    setCountries(lsGet("country-local-v1", {}))
    const l = readSealLocal()
    setSeal({ ready: true, shared: false, publicKey: l.publicKey, lockedKey: l.locked ?? null, openMovie: l.open, sealedBy: Object.fromEntries(Object.entries(l.rows).map(([k, v]) => [k, Object.keys(v)])) })
  }, [])

  // one place that writes a setting to the shared table, or to this device when the table isn't there
  const putSetting = async (k: "seal_public_key" | "seal_locked_key" | "seal_open", value: string | null) => {
    if (sealRef.current.shared && sb) {
      fail((value == null ? await sb.from("club_settings").delete().eq("key", k) : await sb.from("club_settings").upsert({ key: k, value })).error)
    } else {
      const l = readSealLocal()
      if (k === "seal_public_key") l.publicKey = value
      else if (k === "seal_locked_key") l.locked = value
      else l.open = value
      lsSet("seal-local-v1", l)
    }
  }

  const setCountry = useCallback(async (m: Movie, country: string) => {
    const c = country.trim(), k = String(m.id)
    setCountries(all => {
      const next = { ...all }
      if (c) next[k] = c
      else delete next[k]
      if (!sealRef.current.shared) lsSet("country-local-v1", next)
      return next
    })
    if (sealRef.current.shared && sb) fail((c ? await sb.from("club_settings").upsert({ key: `country:${k}`, value: c }) : await sb.from("club_settings").delete().eq("key", `country:${k}`)).error)
  }, [])

  const sealSetup = useCallback(async (pin: string) => {
    const { publicKey, privateKey } = await newSealKeys()
    const lockedKey = await lockKey(privateKey, pin)
    await putSetting("seal_public_key", publicKey)
    await putSetting("seal_locked_key", lockedKey)
    localStorage.setItem("seal-private-key", privateKey)
    setHostKey(privateKey)
    setSeal(s => ({ ...s, publicKey, lockedKey }))
  }, [])

  const sealLock = useCallback(async (pin: string) => {
    const priv = localStorage.getItem("seal-private-key")
    if (!priv) return
    const lockedKey = await lockKey(priv, pin)
    await putSetting("seal_locked_key", lockedKey)
    setSeal(s => ({ ...s, lockedKey }))
  }, [])

  /** Unlock the host key on this device with the PIN. */
  const sealUseKey = useCallback(async (pin: string) => {
    const pub = sealRef.current.publicKey, locked = sealRef.current.lockedKey
    if (!pub || !locked) return false
    const key = await unlockKey(locked, pin.trim())
    if (!key || (await openScore(key, await sealScore(pub, 3))) !== 3) return false
    localStorage.setItem("seal-private-key", key)
    setHostKey(key)
    return true
  }, [])

  const sealOpen = useCallback(async (m: Movie) => {
    await putSetting("seal_open", String(m.id))
    setSeal(s => ({ ...s, openMovie: String(m.id) }))
  }, [])

  const sealMine = useCallback(async (m: Movie, v: number) => {
    const pub = sealRef.current.publicKey
    if (!me || !pub) return
    const cipher = await sealScore(pub, v)
    if (sealRef.current.shared && sb) fail((await sb.from("sealed").upsert({ movie_id: m.id, member: me, cipher })).error)
    else {
      const l = readSealLocal()
      ;(l.rows[String(m.id)] ||= {})[me] = cipher
      lsSet("seal-local-v1", l)
    }
    lsSet(`sealed-mine:${me}:${m.id}`, v) // your own pick stays visible to you
    setSeal(s => ({ ...s, sealedBy: { ...s.sealedBy, [String(m.id)]: [...new Set([...(s.sealedBy[String(m.id)] ?? []), me])] } }))
  }, [me])

  const sealedValue = useCallback((m: Movie) => (me ? lsGet<number | null>(`sealed-mine:${me}:${m.id}`, null) : null), [me])

  const sealReveal = useCallback(async (m: Movie) => {
    const priv = localStorage.getItem("seal-private-key")
    if (!priv) return []
    let rows: { member: string; cipher: string }[]
    if (sealRef.current.shared && sb) {
      const r = await sb.from("sealed").select("member,cipher").eq("movie_id", m.id)
      rows = (r.data ?? []) as typeof rows
    } else {
      rows = Object.entries(readSealLocal().rows[String(m.id)] ?? {}).map(([member, cipher]) => ({ member, cipher }))
    }
    const opened: { member: string; value: number }[] = []
    for (const r of rows) {
      const value = await openScore(priv, r.cipher)
      if (value != null) opened.push({ member: r.member, value })
    }
    for (const o of opened) await writeRating(m, o.member, o.value) // the sealed scores become ordinary ratings
    await sealCancelInner(m)
    return opened.sort((a, b) => a.value - b.value || a.member.localeCompare(b.member))
  }, [writeRating])

  const sealCancelInner = async (m: Movie) => {
    if (sealRef.current.shared && sb) await sb.from("sealed").delete().eq("movie_id", m.id)
    else {
      const l = readSealLocal()
      delete l.rows[String(m.id)]
      lsSet("seal-local-v1", l)
    }
    await putSetting("seal_open", null)
    setSeal(s => ({ ...s, openMovie: null, sealedBy: { ...s.sealedBy, [String(m.id)]: [] } }))
  }
  const sealCancel = useCallback(async (m: Movie) => { await sealCancelInner(m) }, [])

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
    ready, error, offline, movies, watchlist, suggestions, takes, seal, isHost: !!hostKey && !!seal.publicKey, loadSeal, countries, setCountry, sealSetup, sealLock, sealUseKey, sealOpen, sealMine, sealedValue, sealReveal, sealCancel, lb, loadLb, importLb, fillFromLb, flags, mini: miniShown, setPoster, me, attending, members, shared: !!sb, toast, dismissToast,
    refresh, setMe, toggleAttend, addMember, renameMember, removeMember, addMovie, setRating, setTake, setFlag, patchMovie, deleteMovie, seed,
    importWatchlist, suggest, vote, removeSuggestion,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
