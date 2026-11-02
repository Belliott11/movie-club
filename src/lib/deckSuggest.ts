import { tmdb } from "./api"
import { NATIONS } from "./atlas"
import type { Card, Ctx } from "./deck"
import { continentOfCode, regionOfCode } from "./continents"
import { key } from "./stats"

const intl = new Intl.DisplayNames(["en"], { type: "region" })
const nameOf = (code: string) => { try { return code === "US" ? "USA" : intl.of(code) ?? code } catch { return code } }

const GENRES: Record<string, number> = { doc: 99, animation: 16, western: 37, horror: 27, romance: 10749, war: 10752, scifi: 878 }
/** Cards decided by a TMDB keyword; the id is looked up by name since keyword ids aren't something to memorize. */
export const KEYWORD_CARDS: Record<string, string> = { bw: "black and white", silent: "silent film", trueStory: "based on true story" }
const LANGS = "fr|ja|ko|es|it|de|hi|zh|sv|ru|pt|fa|da|pl|tr|ar|th|el|hu|cs"

/**
 * The TMDB discover filters that describe a card, or null when TMDB can't express it (franchise, budget, director, Oscars, a movement).
 * Cards about places are worked out from the card itself: every major film nation is tested against its own rule, so a new card needs no extra code.
 */
export function discoverParams(card: Card, ctx: Ctx, keywords: Record<string, number> = {}): string | null {
  const id = card.id
  if (id === "old") return "&primary_release_date.lte=1969-12-31"
  if (id === "recent") return `&primary_release_date.gte=${ctx.thisYear - 5}-01-01`
  if (id === "foreign") return `&with_original_language=${LANGS}`
  if (id === "short") return "&with_runtime.gte=60&with_runtime.lte=89"
  if (id === "haul") return "&with_runtime.gte=150"
  if (GENRES[id]) return `&with_genres=${GENRES[id]}`
  if (KEYWORD_CARDS[id]) return keywords[id] ? `&with_keywords=${keywords[id]}` : null
  const nations = NATIONS.filter(n => card.fits({ title: "", year: 2000, wantedBy: 0, country: nameOf(n.code), continent: continentOfCode(n.code), region: regionOfCode(n.code) }, ctx) === true)
  // a card that every nation satisfies (or none) says nothing about where to look
  return nations.length && nations.length < NATIONS.length ? `&with_origin_country=${nations.map(n => n.code).join("|")}` : null
}

export type Idea = { title: string; year: number; id: number; poster: string | null; score: number; votes: number }

const kwCache = new Map<string, number | null>()
async function keywordIds(): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  for (const [card, name] of Object.entries(KEYWORD_CARDS)) {
    if (!kwCache.has(name)) {
      const r = await tmdb<{ results?: { id: number; name: string }[] }>("/search/keyword", `&query=${encodeURIComponent(name)}`)
      kwCache.set(name, r?.results?.find(k => k.name.toLowerCase() === name)?.id ?? null)
    }
    const v = kwCache.get(name)
    if (v) out[card] = v
  }
  return out
}

/** Well-known films that meet a card, for when nothing on anyone's watchlist does. A random page of the most-voted ones, so it isn't the same list every time. */
export async function cardIdeas(card: Card, ctx: Ctx, skip: Set<string>, rand: () => number = Math.random): Promise<Idea[]> {
  const params = discoverParams(card, ctx, KEYWORD_CARDS[card.id] ? await keywordIds() : {})
  if (!params) return []
  // niche cards (silent film, a small nation) have few films with many votes, so loosen the floor until something turns up
  for (const floor of [1000, 150, 20]) {
    const page = floor === 1000 ? 1 + Math.floor(rand() * 3) : 1
    const r = await tmdb<{ results?: any[] }>("/discover/movie", `${params}&sort_by=vote_count.desc&vote_count.gte=${floor}&include_adult=false&page=${page}`)
    const ideas = (r?.results ?? [])
      .map(x => ({ title: x.title as string, year: +(x.release_date ?? "").slice(0, 4) || 0, id: x.id as number, poster: x.poster_path as string | null, score: x.vote_average as number, votes: x.vote_count as number }))
      .filter(x => x.year && !skip.has(key(x.title, x.year)))
      .slice(0, 6)
    if (ideas.length >= 3) return ideas
    if (floor === 20) return ideas
  }
  return []
}
