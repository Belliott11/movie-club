import { searchFilm, tmdb } from "./api"
import { MOVEMENTS, NATIONS, type Film } from "./atlas"
import themes from "../data/themes.json"
import { FESTIVAL_WINNERS } from "./festivals"
import { LOW_BUDGET, OSCAR_WINNERS, WOMAN_DIRECTED } from "./deckClassics"
import { FAMOUS_NAMES } from "./famousDirectors"
import { GENRE_IDS } from "./customCard"
import type { Card, CardDef, Ctx } from "./deck"
import { continentOfCode, regionOfCode } from "./continents"
import { key } from "./stats"

const intl = new Intl.DisplayNames(["en"], { type: "region" })
const nameOf = (code: string) => { try { return code === "US" ? "USA" : intl.of(code) ?? code } catch { return code } }

const GENRES: Record<string, number> = { doc: 99, animation: 16, western: 37, horror: 27, romance: 10749, war: 10752, scifi: 878 }
/** Cards decided by a TMDB keyword; the id is looked up by name since keyword ids aren't something to memorize. */
export const KEYWORD_CARDS: Record<string, string> = { bw: "black and white", silent: "silent film", trueStory: "based on true story", franchise: "sequel", book: "based on novel or book", remake: "remake", musical: "musical", indie: "independent film" }
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

const shuffle = <T,>(xs: T[], rand: () => number) => xs.map(x => [rand(), x] as const).sort((a, b) => a[0] - b[0]).map(x => x[1])
const slim = (x: any): Idea => ({ title: x.title as string, year: +(x.release_date ?? "").slice(0, 4) || 0, id: x.id as number, poster: x.poster_path as string | null, score: x.vote_average as number, votes: x.vote_count as number })

/** A random handful from a hand-made list, looked up on TMDB for their poster and score. */
async function fromTitles(list: Film[], skip: Set<string>, rand: () => number): Promise<Idea[]> {
  const pick = shuffle(list, rand).slice(0, 12)
  const found = await Promise.all(pick.map(async ([t, y]) => { const r = await searchFilm(t, y); return r?.id ? slim(r) : null }))
  return found.filter((x): x is Idea => !!x && !!x.year && !skip.has(key(x.title, x.year))).slice(0, 6)
}

const PERSON = "person-ids-v1"
const readPeople = (): Record<string, number> => { try { return JSON.parse(localStorage.getItem(PERSON) ?? "{}") } catch { return {} } }
async function personId(name: string): Promise<number | null> {
  const known = readPeople()
  if (known[name]) return known[name]
  const r = await tmdb<{ results?: { id: number; name: string; known_for_department: string }[] }>("/search/person", `&query=${encodeURIComponent(name)}`)
  const hit = r?.results?.find(p => p.known_for_department === "Directing") ?? r?.results?.[0]
  if (!hit) return null
  try { localStorage.setItem(PERSON, JSON.stringify({ ...readPeople(), [name]: hit.id })) } catch { /* full: looked up again */ }
  return hit.id
}

/** The best-known films of a few big-name directors picked at random. */
async function famousIdeas(skip: Set<string>, rand: () => number): Promise<Idea[]> {
  const ids = (await Promise.all(shuffle(FAMOUS_NAMES, rand).slice(0, 8).map(personId))).filter((x): x is number => !!x)
  if (!ids.length) return []
  const r = await tmdb<{ results?: any[] }>("/discover/movie", `&with_crew=${ids.join("|")}&sort_by=vote_count.desc&vote_count.gte=500&include_adult=false`)
  return (r?.results ?? []).map(slim).filter(x => x.year && !skip.has(key(x.title, x.year))).slice(0, 6)
}

/** Well-known films whose whole title is one word. TMDB can't search for that, so a few pages of the most-voted films are filtered. */
async function oneWordIdeas(skip: Set<string>, rand: () => number): Promise<Idea[]> {
  const first = 1 + Math.floor(rand() * 3)
  const pages = await Promise.all([first, first + 1, first + 2].map(page => tmdb<{ results?: any[] }>("/discover/movie", `&sort_by=vote_count.desc&vote_count.gte=2000&include_adult=false&page=${page}`)))
  return pages.flatMap(p => p?.results ?? []).map(slim).filter(x => x.year && x.title.trim().split(/\s+/).length === 1 && !skip.has(key(x.title, x.year))).slice(0, 6)
}

/** Landmark films from film movements the club hasn't touched. */
function movementIdeas(ctx: Ctx, skip: Set<string>, rand: () => number): Promise<Idea[]> {
  const films = MOVEMENTS.flatMap(m => m.films).filter(([t]) => ctx.movementKeys.has(key(t, 0).split("|")[0]))
  return fromTitles(films, skip, rand)
}

const kwIds = new Map<string, number | null>()
/** Well-known films on a loose theme: the TMDB keywords behind it, any of which will do. */
async function themeIdeas(themeId: string, skip: Set<string>, rand: () => number): Promise<Idea[]> {
  const names = (themes as { id: string; kw: string[] }[]).find(t => t.id === themeId)?.kw.slice(0, 5) ?? []
  const ids: number[] = []
  for (const name of names) {
    if (!kwIds.has(name)) {
      const r = await tmdb<{ results?: { id: number; name: string }[] }>("/search/keyword", `&query=${encodeURIComponent(name)}`)
      kwIds.set(name, r?.results?.find(k => k.name.toLowerCase() === name)?.id ?? null)
    }
    const id = kwIds.get(name)
    if (id) ids.push(id)
  }
  return ids.length ? discoverIdeas(`&with_keywords=${ids.join("|")}`, skip, rand) : []
}

/** Films from TMDB's discover for a set of filters, most-voted first, loosening the vote floor for niche filters until something turns up. */
async function discoverIdeas(params: string, skip: Set<string>, rand: () => number, keep: (title: string) => boolean = () => true): Promise<Idea[]> {
  for (const floor of [1000, 150, 20]) {
    const page = floor === 1000 ? 1 + Math.floor(rand() * 3) : 1
    const r = await tmdb<{ results?: any[] }>("/discover/movie", `${params}&sort_by=vote_count.desc&vote_count.gte=${floor}&include_adult=false&page=${page}`)
    const ideas = (r?.results ?? []).map(slim).filter(x => x.year && keep(x.title) && !skip.has(key(x.title, x.year))).slice(0, 6)
    if (ideas.length >= 3 || floor === 20) return ideas
  }
  return []
}

/** Films for a card someone made: its options become TMDB filters. Cards about directors or budgets that TMDB can't filter use the hand-made lists. */
async function customIdeas(def: CardDef, skip: Set<string>, rand: () => number): Promise<Idea[]> {
  const f = def.f
  const inYears = ([, y]: Film) => (f.from == null || y >= f.from) && (f.to == null || y <= f.to)
  if (f.tag === "womanDirector") return fromTitles(WOMAN_DIRECTED.filter(inYears), skip, rand)
  if (f.tag === "lowBudget") return fromTitles(LOW_BUDGET.filter(inYears), skip, rand)
  const p: string[] = []
  if (f.from != null) p.push(`primary_release_date.gte=${f.from}-01-01`)
  if (f.to != null) p.push(`primary_release_date.lte=${f.to}-12-31`)
  if (f.minRun != null) p.push(`with_runtime.gte=${f.minRun}`)
  if (f.maxRun != null) p.push(`with_runtime.lte=${f.maxRun}`)
  if (f.minRating != null) p.push(`vote_average.gte=${f.minRating * 2}`)
  if (f.maxRating != null) p.push(`vote_average.lte=${f.maxRating * 2}`)
  if (f.lang) p.push(`with_original_language=${f.lang === "!en" ? LANGS : f.lang}`)
  if (f.genre && GENRE_IDS[f.genre]) p.push(`with_genres=${GENRE_IDS[f.genre]}`)
  if (f.country) p.push(`with_origin_country=${f.country}`)
  if (f.tag) { const id = (await keywordIds())[f.tag]; if (id) p.push(`with_keywords=${id}`) }
  if (f.director) { const id = await personId(f.director); if (id) p.push(`with_crew=${id}`) }
  if (!p.length) return []
  const word = f.word?.toLowerCase()
  return discoverIdeas("&" + p.join("&"), skip, rand, word ? t => t.toLowerCase().includes(word) : undefined)
}

/** Well-known films that meet a card, for when nothing on anyone's watchlist does. Random each time, so it isn't the same list twice. */
export async function cardIdeas(card: Card, ctx: Ctx, skip: Set<string>, rand: () => number = Math.random): Promise<Idea[]> {
  if (card.custom) return customIdeas(card.custom, skip, rand)
  if (card.list) return fromTitles(card.list, skip, rand)
  if (card.id.startsWith("theme-")) return themeIdeas(card.id.slice(6), skip, rand)
  if (card.id === "womanDirector") return fromTitles(WOMAN_DIRECTED, skip, rand)
  if (card.id === "lowBudget") return fromTitles(LOW_BUDGET, skip, rand)
  if (card.id === "oscar") return fromTitles(OSCAR_WINNERS, skip, rand)
  if (card.id === "cannes") return fromTitles(FESTIVAL_WINNERS, skip, rand)
  if (card.id === "famous") return famousIdeas(skip, rand)
  if (card.id === "word") return oneWordIdeas(skip, rand)
  if (card.id === "movement") return movementIdeas(ctx, skip, rand)
  const params = discoverParams(card, ctx, KEYWORD_CARDS[card.id] ? await keywordIds() : {})
  if (!params) return []
  return discoverIdeas(params, skip, rand)
}
