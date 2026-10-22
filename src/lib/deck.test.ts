import { expect, test } from "vitest"
import { CARDS, deal, fitting, untouchedMovementKeys, type Cand, type Ctx } from "./deck"

const ctx: Ctx = { thisYear: 2026, countries: new Set(["US", "JP"]), continents: new Set(["North America", "Asia"]), regions: new Set(["East Asia", "US and Canada"]), movementKeys: new Set(["breathless"]) }
const c = (title: string, year: number, o: Partial<Cand> = {}): Cand => ({ title, year, wantedBy: 1, ...o })
const card = (id: string) => CARDS.find(x => x.id === id)!

test("every card has a unique id and a rule, and says undefined (not false) when the facts aren't known yet", () => {
  expect(new Set(CARDS.map(x => x.id)).size).toBe(CARDS.length)
  expect(CARDS.every(x => x.title && x.rule)).toBe(true)
  for (const id of ["foreign", "short", "haul", "newCountry", "doc", "animation", "western", "horror", "romance", "war", "scifi", "newContinent", "asia", "africa", "southAmerica", "oceania", "newRegion", "eastAsia", "southAsia", "seAsia", "middleEast", "nordic", "southernEurope", "easternEurope", "latam", "bw", "silent", "trueStory", "franchise", "lowBudget", "womanDirector", "oscar", "famous"]) expect(card(id).fits(c("X", 2000), ctx), id).toBeUndefined()
})

test("cards judge a film by its year, length, language, country, genres and title", () => {
  expect(card("old").fits(c("A", 1969), ctx)).toBe(true)
  expect(card("old").fits(c("A", 1970), ctx)).toBe(false)
  expect(card("recent").fits(c("A", 2022), ctx)).toBe(true)
  expect(card("foreign").fits(c("A", 2000, { lang: "ja" }), ctx)).toBe(true)
  expect(card("foreign").fits(c("A", 2000, { lang: "en" }), ctx)).toBe(false)
  expect(card("short").fits(c("A", 2000, { runtime: 89 }), ctx)).toBe(true)
  expect(card("short").fits(c("A", 2000, { runtime: 0 }), ctx)).toBe(false) // a missing runtime isn't "short"
  expect(card("haul").fits(c("A", 2000, { runtime: 150 }), ctx)).toBe(true)
  expect(card("newCountry").fits(c("A", 2000, { country: "BR" }), ctx)).toBe(true)
  expect(card("newCountry").fits(c("A", 2000, { country: "JP" }), ctx)).toBe(false)
  expect(card("asia").fits(c("A", 2000, { continent: "Asia" }), ctx)).toBe(true)
  expect(card("africa").fits(c("A", 2000, { continent: "Asia" }), ctx)).toBe(false)
  expect(card("southAmerica").fits(c("A", 2000, { continent: "South America" }), ctx)).toBe(true)
  expect(card("newContinent").fits(c("A", 2000, { continent: "Africa" }), ctx)).toBe(true)
  expect(card("newContinent").fits(c("A", 2000, { continent: "Asia" }), ctx)).toBe(false)
  expect(card("eastAsia").fits(c("A", 2000, { region: "East Asia" }), ctx)).toBe(true)
  expect(card("nordic").fits(c("A", 2000, { region: "East Asia" }), ctx)).toBe(false)
  expect(card("newRegion").fits(c("A", 2000, { region: "Nordic countries" }), ctx)).toBe(true)
  expect(card("newRegion").fits(c("A", 2000, { region: "East Asia" }), ctx)).toBe(false)
  expect(card("bw").fits(c("A", 1950, { bw: true }), ctx)).toBe(true)
  expect(card("bw").fits(c("A", 1950, { bw: false }), ctx)).toBe(false)
  expect(card("silent").fits(c("A", 1925, { silent: true }), ctx)).toBe(true)
  expect(card("trueStory").fits(c("A", 2000, { trueStory: true }), ctx)).toBe(true)
  expect(card("franchise").fits(c("A", 2000, { franchise: false }), ctx)).toBe(false)
  expect(card("lowBudget").fits(c("A", 2000, { budget: 4_000_000 }), ctx)).toBe(true)
  expect(card("lowBudget").fits(c("A", 2000, { budget: 40_000_000 }), ctx)).toBe(false)
  expect(card("womanDirector").fits(c("A", 2000, { womanDirector: true }), ctx)).toBe(true)
  expect(card("famous").fits(c("A", 1994, { directors: ["Quentin Tarantino"] }), ctx)).toBe(true)
  expect(card("famous").fits(c("A", 1994, { directors: ["Chloe Zhao"] }), ctx)).toBe(true) // accents don't matter
  expect(card("famous").fits(c("A", 2012, { directors: ["Some Unknown Person"] }), ctx)).toBe(false)
  expect(card("oscar").fits(c("A", 2000, { oscars: 2 }), ctx)).toBe(true)
  expect(card("oscar").fits(c("A", 2000, { oscars: 0 }), ctx)).toBe(false)
  expect(card("movement").fits(c("Breathless", 1960), ctx)).toBe(true)
  expect(card("doc").fits(c("A", 2000, { genres: ["Documentary"] }), ctx)).toBe(true)
  expect(card("word").fits(c("Alien", 1979), ctx)).toBe(true)
  expect(card("word").fits(c("The Thing", 1982), ctx)).toBe(false)
  expect(card("western").fits(c("A", 1960, { genres: ["Western", "Drama"] }), ctx)).toBe(true)
  expect(card("horror").fits(c("A", 1960, { genres: ["Drama"] }), ctx)).toBe(false)
  expect(card("scifi").fits(c("A", 1960, { genres: ["Science Fiction"] }), ctx)).toBe(true)
})

test("dealing never repeats a card you've already drawn and works through the whole deck", () => {
  expect(deal([], () => 0).id).toBe(CARDS[0].id)
  expect(deal([CARDS[0].id], () => 0).id).toBe(CARDS[1].id)
  expect(deal(CARDS.map(x => x.id), () => 0).id).toBe(CARDS[0].id) // nothing left: start over
  const seen = new Set<string>()
  const drawn: string[] = []
  for (let i = 0; i < CARDS.length; i++) { const x = deal(drawn); drawn.push(x.id); seen.add(x.id) }
  expect(seen.size).toBe(CARDS.length)
})

test("fitting lists only films that definitely meet the card, most wanted first", () => {
  const films = [c("B", 1950, { wantedBy: 1 }), c("A", 1940, { wantedBy: 3 }), c("C", 1990), c("D", 1955, { wantedBy: 3 })]
  expect(fitting(card("old"), films, ctx).map(f => f.title)).toEqual(["A", "D", "B"])
  expect(fitting(card("old"), films, ctx, 2)).toHaveLength(2)
  expect(fitting(card("doc"), films, ctx)).toEqual([]) // genres unknown, so nothing is claimed
})

test("untouched movements: landmark films from movements the club hasn't played", () => {
  const keys = untouchedMovementKeys(new Set(["breathless"])) // played something from the French New Wave
  expect(keys.has("breathless")).toBe(false)
  expect(keys.has("themarriageofmariabraun")).toBe(true) // New German Cinema is still untouched
})
