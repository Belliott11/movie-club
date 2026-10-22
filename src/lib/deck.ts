import { MOVEMENTS } from "./atlas"
import { key } from "./stats"

/** A watchlist film with whatever is known about it. Missing facts mean a card that needs them can't say whether the film fits. */
export type Cand = { title: string; year: number; runtime?: number | null; lang?: string; country?: string; genres?: string[]; wantedBy: number; seenBy: number }
/** What the club has already done, so cards can ask for something new. */
export type Ctx = { thisYear: number; countries: Set<string>; decades: Set<number>; movementKeys: Set<string> }

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
  { id: "unseen", title: "Fresh eyes", rule: "Nobody in the club has seen it.", fits: f => f.seenBy === 0 },
  { id: "lonely", title: "A lonely pick", rule: "Only one person has it on their watchlist. Rescue it.", fits: f => f.wantedBy === 1 },
  { id: "movement", title: "Start a movement", rule: "A landmark film from a movement the club hasn't touched.", fits: (f, c) => c.movementKeys.has(key(f.title, 0).split("|")[0]) },
  { id: "doc", title: "Real life", rule: "A documentary.", fits: f => known(f.genres, g => g.includes("Documentary")) },
  { id: "animation", title: "Drawn, not filmed", rule: "An animated film.", fits: f => known(f.genres, g => g.includes("Animation")) },
  { id: "word", title: "One word", rule: "The title is a single word.", fits: f => f.title.trim().split(/\s+/).length === 1 },
  { id: "decade", title: "A skipped decade", rule: "From a decade the club hasn't picked from yet.", fits: (f, c) => !c.decades.has(Math.floor(f.year / 10) * 10) },
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
