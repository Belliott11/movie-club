import { expect, test } from "vitest"
import { buildCard, customFits, describeDef } from "./customCard"
import type { Cand, CardDef, Ctx } from "./deck"

const ctx: Ctx = { thisYear: 2026, countries: new Set(), continents: new Set(), regions: new Set(), movementKeys: new Set() }
const def = (f: CardDef["f"], extra: Partial<CardDef> = {}): CardDef => ({ id: "c-x", title: "Heist night", rule: "", f, ...extra })
const film = (o: Partial<Cand> = {}): Cand => ({ title: "Rififi", year: 1955, wantedBy: 1, ...o })

test("a film has to meet every option; one miss rules it out, one unknown leaves it unknown", () => {
  const d = def({ from: 1950, to: 1960, genre: "Crime", maxRun: 130 })
  expect(customFits(d, film({ genres: ["Crime", "Drama"], runtime: 118 }))).toBe(true)
  expect(customFits(d, film({ year: 1975, genres: ["Crime"], runtime: 118 }))).toBe(false) // too late, whatever else it is
  expect(customFits(d, film({ genres: ["Comedy"], runtime: 100 }))).toBe(false)
  expect(customFits(d, film({ genres: ["Crime"] }))).toBeUndefined() // no runtime on record
  expect(customFits(d, film({ genres: ["Comedy"] }))).toBe(false) // a miss beats an unknown
})

test("language, country, director, title word and tags", () => {
  expect(customFits(def({ lang: "!en" }), film({ lang: "fr" }))).toBe(true)
  expect(customFits(def({ lang: "!en" }), film({ lang: "en" }))).toBe(false)
  expect(customFits(def({ lang: "fr" }), film({ lang: "ja" }))).toBe(false)
  expect(customFits(def({ country: "FR" }), film({ country: "France" }))).toBe(true)
  expect(customFits(def({ director: "melville" }), film({ directors: ["Jean-Pierre Melville"] }))).toBe(true)
  expect(customFits(def({ word: "fif" }), film())).toBe(true)
  expect(customFits(def({ tag: "bw" }), film({ bw: true }))).toBe(true)
  expect(customFits(def({ tag: "lowBudget" }), film({ budget: 9_000_000 }))).toBe(false)
})

test("a card with no options matches nothing, and writes its own rule when none is given", () => {
  expect(customFits(def({}), film())).toBeUndefined()
  expect(describeDef(def({ from: 1970, to: 1979, lang: "!en", genre: "Horror" }))).toBe("Made 1970 to 1979, not in English, a horror film.")
  expect(describeDef(def({}))).toMatch(/no automatic matching/)
  const c = buildCard(def({ maxRun: 90 }, { rule: "Short and sweet." }))
  expect(c.rule).toBe("Short and sweet.")
  expect(buildCard(def({ maxRun: 90 })).rule).toBe("90 minutes or shorter.")
  expect(c.fits(film({ runtime: 80 }), ctx)).toBe(true)
  expect(c.custom?.title).toBe("Heist night")
})
