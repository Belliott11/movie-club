import { useEffect, useState } from "react"
import { searchFilm, tmdb } from "./api"
import { key, fold } from "./stats"

/** What helps decide whether to watch a film tonight: how long it is and where it streams (US). */
export type Facts = { runtime: number | null; stream: string[]; rent: string[]; t: number; lang?: string; country?: string; genres?: string[] }

const KEY = "film-facts-v2"
const DAY = 864e5
const memory = new Map<number, Promise<Facts | null>>()
const stored = (): Record<string, Facts> => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") } catch { return {} } }

/** Runtime and streaming for a TMDB film, in one request, remembered on this device for a week. */
export function filmFacts(id: number): Promise<Facts | null> {
  const hit = stored()[id]
  if (hit && Date.now() - hit.t < 7 * DAY) return Promise.resolve(hit)
  if (!memory.has(id)) {
    memory.set(id, tmdb<any>(`/movie/${id}`, "&append_to_response=watch/providers").then(d => {
      if (!d?.id) { memory.delete(id); return null }
      const us = d["watch/providers"]?.results?.US ?? {}
      const names = (...lists: any[][]) => [...new Set(lists.flatMap(l => (l ?? []).map((p: any) => p.provider_name as string)))]
      const facts: Facts = {
        runtime: d.runtime || null, stream: names(us.flatrate, us.free, us.ads), rent: names(us.rent, us.buy), t: Date.now(),
        lang: d.original_language, country: d.origin_country?.[0] ?? d.production_countries?.[0]?.iso_3166_1, genres: (d.genres ?? []).map((g: any) => g.name as string),
      }
      try { localStorage.setItem(KEY, JSON.stringify({ ...stored(), [id]: facts })) } catch { /* full: looked up again next time */ }
      return facts
    }))
  }
  return memory.get(id)!
}

/** Facts for a list of films by title and year, looked up a few at a time. Films not loaded yet are simply missing from the result. */
export function useFacts(films: { title: string; year: number }[]) {
  const [facts, setFacts] = useState<Record<string, Facts>>({})
  const sig = films.map(f => key(f.title, f.year)).join("|")
  useEffect(() => {
    let dead = false
    ;(async () => {
      for (let i = 0; i < films.length; i += 6) {
        const part = await Promise.all(films.slice(i, i + 6).map(async f => {
          const hit = await searchFilm(f.title, f.year)
          return [key(f.title, f.year), hit?.id ? await filmFacts(hit.id) : null] as const
        }))
        if (dead) return
        setFacts(prev => ({ ...prev, ...Object.fromEntries(part.filter((p): p is [string, Facts] => !!p[1])) }))
      }
    })()
    return () => { dead = true }
  }, [sig]) // eslint-disable-line react-hooks/exhaustive-deps
  return facts
}

// ---- the services the club (or you) can stream from ----
/** Common US services and how TMDB spells them. A film is "on" a service when any of its providers' names matches. */
export const SERVICES: { id: string; label: string; match: (n: string) => boolean }[] = [
  { id: "netflix", label: "Netflix", match: n => n.startsWith("netflix") },
  { id: "max", label: "Max", match: n => n === "max" || n.startsWith("hbomax") || n === "hbo" },
  { id: "hulu", label: "Hulu", match: n => n.startsWith("hulu") },
  { id: "disney", label: "Disney+", match: n => n.startsWith("disney") },
  { id: "prime", label: "Prime Video", match: n => n.includes("primevideo") || n.includes("amazonprime") },
  { id: "apple", label: "Apple TV+", match: n => n.startsWith("appletv") && !n.includes("store") },
  { id: "paramount", label: "Paramount+", match: n => n.startsWith("paramount") },
  { id: "peacock", label: "Peacock", match: n => n.startsWith("peacock") },
  { id: "criterion", label: "Criterion Channel", match: n => n.includes("criterion") },
  { id: "kanopy", label: "Kanopy", match: n => n.startsWith("kanopy") },
  { id: "mubi", label: "MUBI", match: n => n.startsWith("mubi") },
  { id: "shudder", label: "Shudder", match: n => n.startsWith("shudder") },
  { id: "tubi", label: "Tubi", match: n => n.startsWith("tubi") },
  { id: "pluto", label: "Pluto TV", match: n => n.startsWith("pluto") },
  { id: "roku", label: "Roku Channel", match: n => n.includes("roku") },
]
const norm = (s: string) => fold(s).replace(/[^a-z0-9]/g, "")

/** The chosen services this film streams on, by label. */
export const onMyServices = (facts: Facts | undefined, mine: string[]) =>
  !facts ? [] : SERVICES.filter(s => mine.includes(s.id) && facts.stream.some(n => s.match(norm(n)))).map(s => s.label)

export type PickPrefs = { stream: boolean; short: boolean }

/**
 * Whether a film passes the filters. Films whose facts haven't loaded yet pass, so the list doesn't empty while it fills in.
 * "Streamable" means it streams somewhere; with services chosen, it has to stream on one of them.
 */
export function passesFilters(facts: Facts | undefined, prefs: PickPrefs, mine: string[]) {
  if (!facts) return true
  if (prefs.short && facts.runtime && facts.runtime >= 120) return false
  if (prefs.stream && (mine.length ? onMyServices(facts, mine).length === 0 : facts.stream.length === 0)) return false
  return true
}

export const hours = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m` : `${min}m`)
