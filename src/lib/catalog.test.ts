import { expect, test } from "vitest"
import { CARDS } from "./deck"
import { candFromEntry, type CatalogEntry } from "./catalog"

const base = { title: "Stray Dog", year: 1949, wantedBy: 2 }
const ctx = { thisYear: 2026, countries: new Set<string>(), continents: new Set<never>(), regions: new Set<never>(), movementKeys: new Set<string>() }
const card = (id: string) => CARDS.find(c => c.id === id)!

test("a catalog entry answers the cards it can, and says can't-tell for the rest", () => {
  const e: CatalogEntry = { t: "Stray Dog", y: 1949, id: 1, v: 900, rt: 122, l: "ja", cc: ["JP"], g: ["Crime", "Drama"], d: ["Akira Kurosawa"], bw: 1, kn: 1, o: 0 }
  const c = candFromEntry(e, base)
  expect(card("old").fits(c, ctx)).toBe(true)
  expect(card("foreign").fits(c, ctx)).toBe(true)
  expect(card("bw").fits(c, ctx)).toBe(true)
  expect(card("silent").fits(c, ctx)).toBe(false) // TMDB had keywords for it and "silent film" wasn't one
  expect(card("womanDirector").fits(c, ctx)).toBe(false)
  expect(card("famous").fits(c, ctx)).toBe(true)
  expect(card("lowBudget").fits(c, ctx)).toBeUndefined() // no budget on record
  expect(card("eastAsia").fits(c, ctx)).toBe(true)
})

test("tags TMDB has no keywords for are unknown, and a film with few votes is not an Oscar winner", () => {
  const c = candFromEntry({ t: "X", y: 2020, id: 2, v: 40 }, { title: "X", year: 2020, wantedBy: 1 })
  expect(card("bw").fits(c, ctx)).toBeUndefined()
  expect(card("franchise").fits(c, ctx)).toBeUndefined()
  expect(card("oscar").fits(c, ctx)).toBe(false)
  const big = candFromEntry({ t: "Y", y: 2000, id: 3, v: 20000 }, { title: "Y", year: 2000, wantedBy: 1 })
  expect(card("oscar").fits(big, ctx)).toBeUndefined() // well voted but OMDb wasn't asked
})
