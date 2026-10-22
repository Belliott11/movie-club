import { useEffect, useState } from "react"
import { searchFilm, tmdb } from "./api"
import { key } from "./stats"

/** What a few pick cards need that the usual film facts don't carry. Each is undefined when TMDB doesn't say. */
export type Extras = { directors?: string[]; bw?: boolean; silent?: boolean; trueStory?: boolean; franchise?: boolean; budget?: number; womanDirector?: boolean; t: number }

const has = (kw: string[], ...names: string[]) => kw.some(k => names.some(n => k === n || k.includes(n)))

/** Reads those facts out of a TMDB movie record fetched with keywords and credits appended. */
export function extrasFrom(d: any): Extras {
  const kw: string[] = (d?.keywords?.keywords ?? []).map((k: any) => String(k.name).toLowerCase())
  const directors = ((d?.credits?.crew ?? []) as any[]).filter(c => c.job === "Director")
  const known = kw.length > 0 // a film with no keywords at all tells us nothing about its tags
  return {
    directors: directors.length ? [...new Set(directors.map(c => String(c.name)))].slice(0, 2) : undefined,
    bw: known ? has(kw, "black and white") : undefined,
    silent: known ? has(kw, "silent film") : undefined,
    trueStory: known ? has(kw, "based on true story", "based on a true story", "true story") : undefined,
    franchise: d?.belongs_to_collection ? true : known ? has(kw, "sequel", "prequel", "franchise") : undefined,
    budget: d?.budget > 0 ? d.budget : undefined,
    womanDirector: directors.length ? directors.some(c => c.gender === 1) : undefined,
    t: Date.now(),
  }
}

const KEY = "film-extras-v1"
const read = (): Record<string, Extras> => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") } catch { return {} } }
const memory = new Map<number, Promise<Extras | null>>()

/** Keywords, collection, budget and director gender for a TMDB film, remembered on this device for a month. */
export function filmExtras(id: number): Promise<Extras | null> {
  const hit = read()[id]
  if (hit && Date.now() - hit.t < 30 * 864e5) return Promise.resolve(hit)
  if (!memory.has(id)) {
    memory.set(id, tmdb<any>(`/movie/${id}`, "&append_to_response=keywords,credits").then(d => {
      if (!d?.id) { memory.delete(id); return null }
      const x = extrasFrom(d)
      try { localStorage.setItem(KEY, JSON.stringify({ ...read(), [id]: x })) } catch { /* full: looked up again next time */ }
      return x
    }))
  }
  return memory.get(id)!
}

/** Looks something up for a list of films by title and year, a few at a time. Films not loaded yet are simply missing from the result. */
function useLooked<T>(films: { title: string; year: number }[], get: (tmdbId: number) => Promise<T | null>) {
  const [out, setOut] = useState<Record<string, T>>({})
  const sig = films.map(f => key(f.title, f.year)).join("|")
  useEffect(() => {
    let dead = false
    ;(async () => {
      for (let i = 0; i < films.length; i += 6) {
        const part = await Promise.all(films.slice(i, i + 6).map(async f => {
          const hit = await searchFilm(f.title, f.year)
          return [key(f.title, f.year), hit?.id ? await get(hit.id) : null] as const
        }))
        if (dead) return
        setOut(prev => ({ ...prev, ...Object.fromEntries(part.flatMap(p => (p[1] == null ? [] : [[p[0], p[1]] as const]))) }))
      }
    })()
    return () => { dead = true }
  }, [sig]) // eslint-disable-line react-hooks/exhaustive-deps
  return out
}

export const useExtras = (films: { title: string; year: number }[]) => useLooked(films, filmExtras)

/** How many Oscars OMDb says a film won, from its awards line ("Won 3 Oscars. 40 wins & 60 nominations total"). 0 when it names none. */
export function oscarsFrom(awards: string | undefined | null): number {
  const m = /won (\d+) oscars?/i.exec(awards ?? "")
  return m ? +m[1] : 0
}

const OSC = "film-oscars-v1"
const readOsc = (): Record<string, { n: number; t: number }> => { try { return JSON.parse(localStorage.getItem(OSC) ?? "{}") } catch { return {} } }
const oscMemory = new Map<number, Promise<{ n: number } | null>>()

/** Oscars won, via the film's IMDb id and OMDb. Needs the OMDb key; remembered on this device for a month. */
export function filmOscars(id: number): Promise<{ n: number } | null> {
  const hit = readOsc()[id]
  if (hit && Date.now() - hit.t < 30 * 864e5) return Promise.resolve(hit)
  if (!CONFIG.OMDB_KEY) return Promise.resolve(null)
  if (!oscMemory.has(id)) {
    oscMemory.set(id, (async () => {
      const ext = await tmdb<{ imdb_id?: string }>(`/movie/${id}/external_ids`)
      if (!ext?.imdb_id) { oscMemory.delete(id); return null }
      const r = await fetch(`https://www.omdbapi.com/?apikey=${CONFIG.OMDB_KEY}&i=${ext.imdb_id}`).then(x => x.json()).catch(() => null)
      if (!r || r.Response !== "True") { oscMemory.delete(id); return null }
      const x = { n: oscarsFrom(r.Awards), t: Date.now() }
      try { localStorage.setItem(OSC, JSON.stringify({ ...readOsc(), [id]: x })) } catch { /* full: looked up again next time */ }
      return x
    })())
  }
  return oscMemory.get(id)!
}

export const useOscars = (films: { title: string; year: number }[]) => useLooked(films, filmOscars)
