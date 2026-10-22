import { MOVEMENTS } from "./atlas"
import type { Continent, Region } from "./continents"
import { isFamousDirector } from "./famousDirectors"
import { key } from "./stats"

/** A watchlist film with whatever is known about it. Missing facts mean a card that needs them can't say whether the film fits. */
export type Cand = { title: string; year: number; runtime?: number | null; lang?: string; country?: string; continent?: Continent; region?: Region; genres?: string[]; wantedBy: number
  directors?: string[]; bw?: boolean; silent?: boolean; trueStory?: boolean; franchise?: boolean; budget?: number; womanDirector?: boolean; oscars?: number }
/** What the club has already done, so cards can ask for something new. */
export type Ctx = { thisYear: number; countries: Set<string>; continents: Set<Continent>; regions: Set<Region>; movementKeys: Set<string> }

export type Card = { id: string; title: string; rule: string; fits: (f: Cand, c: Ctx) => boolean | undefined }

const known = <T,>(v: T | undefined | null, f: (v: T) => boolean) => (v == null ? undefined : f(v))

/** The deck: each card is a constraint on the next pick, and says whether a given film meets it (undefined = can't tell yet). */
export const CARDS: Card[] = [
  { id: "old", title: "Before 1970", rule: "Nothing made in the last fifty-odd years.", fits: f => f.year < 1970 },
  { id: "recent", title: "Brand new", rule: "Released in the last five years.", fits: (f, c) => f.year >= c.thisYear - 5 },
  { id: "foreign", title: "Not in English", rule: "The original language can be anything but English.", fits: f => known(f.lang, l => l !== "en") },
  { id: "short", title: "Under 90 minutes", rule: "A film you could watch before the second pizza arrives.", fits: f => known(f.runtime, r => r > 0 && r < 90) },
  { id: "haul", title: "The long haul", rule: "Two and a half hours or more. Bring snacks.", fits: f => known(f.runtime, r => r >= 150) },
  { id: "newCountry", title: "A new country", rule: "From a country the club has never watched a film from.", fits: (f, c) => known(f.country, k => !c.countries.has(k)) },
  { id: "newContinent", title: "A new continent", rule: "From a continent the club hasn't watched anything from yet.", fits: (f, c) => known(f.continent, k => !c.continents.has(k)) },
  { id: "newRegion", title: "A new region", rule: "From a part of the world the club hasn't watched anything from: East Asia, the Nordics, Latin America and so on.", fits: (f, c) => known(f.region, r => !c.regions.has(r)) },
  { id: "eastAsia", title: "East Asia", rule: "Japan, Korea, China, Taiwan or Hong Kong.", fits: f => known(f.region, r => r === "East Asia") },
  { id: "southAsia", title: "South Asia", rule: "India, Pakistan, Bangladesh, Sri Lanka or Nepal.", fits: f => known(f.region, r => r === "South Asia") },
  { id: "seAsia", title: "Southeast Asia", rule: "Thailand, Vietnam, the Philippines, Indonesia and neighbors.", fits: f => known(f.region, r => r === "Southeast Asia") },
  { id: "middleEast", title: "Middle East and beyond", rule: "Iran, Turkey, Israel, the Arab world or Central Asia.", fits: f => known(f.region, r => r === "Middle East and Central Asia") },
  { id: "nordic", title: "The Nordics", rule: "Denmark, Sweden, Norway, Finland or Iceland.", fits: f => known(f.region, r => r === "Nordic countries") },
  { id: "southernEurope", title: "Southern Europe", rule: "Spain, Portugal, Italy or Greece.", fits: f => known(f.region, r => r === "Southern Europe") },
  { id: "easternEurope", title: "Eastern Europe", rule: "Russia, Poland, Hungary, the Balkans and neighbors.", fits: f => known(f.region, r => r === "Eastern Europe and the Balkans") },
  { id: "latam", title: "Latin America", rule: "Mexico, Central or South America, or the Caribbean.", fits: f => known(f.region, r => r === "Latin America and the Caribbean") },
  { id: "asia", title: "Made in Asia", rule: "A film from anywhere in Asia.", fits: f => known(f.continent, k => k === "Asia") },
  { id: "africa", title: "Made in Africa", rule: "A film from anywhere in Africa.", fits: f => known(f.continent, k => k === "Africa") },
  { id: "southAmerica", title: "Made in South America", rule: "A film from anywhere in South America.", fits: f => known(f.continent, k => k === "South America") },
  { id: "oceania", title: "Made in Oceania", rule: "A film from Australia, New Zealand or the Pacific.", fits: f => known(f.continent, k => k === "Oceania") },
  { id: "movement", title: "Start a movement", rule: "A landmark film from a movement the club hasn't touched.", fits: (f, c) => c.movementKeys.has(key(f.title, 0).split("|")[0]) },
  { id: "doc", title: "Real life", rule: "A documentary.", fits: f => known(f.genres, g => g.includes("Documentary")) },
  { id: "animation", title: "Drawn, not filmed", rule: "An animated film.", fits: f => known(f.genres, g => g.includes("Animation")) },
  { id: "western", title: "Out west", rule: "A western.", fits: f => known(f.genres, g => g.includes("Western")) },
  { id: "horror", title: "Lights off", rule: "A horror film.", fits: f => known(f.genres, g => g.includes("Horror")) },
  { id: "romance", title: "Love story", rule: "A romance.", fits: f => known(f.genres, g => g.includes("Romance")) },
  { id: "war", title: "Wartime", rule: "A war film.", fits: f => known(f.genres, g => g.includes("War")) },
  { id: "scifi", title: "Out there", rule: "Science fiction.", fits: f => known(f.genres, g => g.includes("Science Fiction")) },
  { id: "bw", title: "Black and white", rule: "No color allowed.", fits: f => f.bw },
  { id: "silent", title: "Silent film", rule: "Title cards and music, no spoken dialogue.", fits: f => f.silent },
  { id: "trueStory", title: "Based on a true story", rule: "It really happened, more or less.", fits: f => f.trueStory },
  { id: "franchise", title: "Part of a franchise", rule: "A sequel, a prequel, or one of a series.", fits: f => f.franchise },
  { id: "lowBudget", title: "Low budget", rule: "Made for under five million dollars.", fits: f => known(f.budget, b => b < 5_000_000) },
  { id: "womanDirector", title: "Directed by a woman", rule: "A woman is the director.", fits: f => f.womanDirector },
  { id: "famous", title: "A big-name director", rule: "Tarantino, Scorsese, Kubrick, Varda, Kurosawa: someone whose name sells the film.", fits: f => known(f.directors, d => d.some(isFamousDirector)) },
  { id: "oscar", title: "Oscar winner", rule: "It won at least one Academy Award.", fits: f => known(f.oscars, n => n > 0) },
  { id: "word", title: "One word", rule: "The title is a single word.", fits: f => f.title.trim().split(/\s+/).length === 1 },
]

/** Keys of landmark films in movements nobody in the club has watched anything from. */
export function untouchedMovementKeys(playedKeys: Set<string>): Set<string> {
  const out = new Set<string>()
  for (const m of MOVEMENTS) {
    if (m.films.some(([t, , alt]) => playedKeys.has(key(t, 0).split("|")[0]) || (alt && playedKeys.has(key(alt, 0).split("|")[0])))) continue
    for (const [t, , alt] of m.films) for (const n of [t, alt]) if (n) out.add(key(n, 0).split("|")[0])
  }
  return out
}

/** Deals a card at random, never one in `not`. `rand` is injectable so the draw can be tested. */
export function deal(not: string[] = [], rand: () => number = Math.random): Card {
  const left = CARDS.filter(c => !not.includes(c.id))
  return (left.length ? left : CARDS)[Math.floor(rand() * (left.length || CARDS.length))]
}

/** Watchlist films that definitely meet the card, best candidates first (wanted by the most people). */
export function fitting(card: Card, cands: Cand[], ctx: Ctx, limit = 6): Cand[] {
  return cands.filter(c => card.fits(c, ctx) === true).sort((a, b) => b.wantedBy - a.wantedBy || a.title.localeCompare(b.title)).slice(0, limit)
}
