import { expect, test } from "vitest"
import { CARDS } from "./deck"
import { discoverParams } from "./deckSuggest"
import type { Ctx } from "./deck"

const card = (id: string) => CARDS.find(c => c.id === id)!
const ctx: Ctx = { thisYear: 2026, countries: new Set(["Japan", "France"]), continents: new Set(["Asia", "Europe"] as const), regions: new Set(["East Asia"] as const), movementKeys: new Set() }

test("simple cards become TMDB filters", () => {
  expect(discoverParams(card("old"), ctx)).toBe("&primary_release_date.lte=1969-12-31")
  expect(discoverParams(card("recent"), ctx)).toBe("&primary_release_date.gte=2021-01-01")
  expect(discoverParams(card("short"), ctx)).toContain("with_runtime.lte=89")
  expect(discoverParams(card("horror"), ctx)).toBe("&with_genres=27")
})

test("keyword cards need the keyword id", () => {
  expect(discoverParams(card("bw"), ctx)).toBeNull()
  expect(discoverParams(card("bw"), ctx, { bw: 209714 })).toBe("&with_keywords=209714")
})

test("place cards are worked out from the card's own rule", () => {
  const codes = (id: string) => discoverParams(card(id), ctx)!.replace("&with_origin_country=", "").split("|")
  expect(codes("newCountry")).not.toContain("JP") // the club has done Japan and France
  expect(codes("newCountry")).not.toContain("FR")
  expect(codes("newCountry")).toContain("IT")
  expect(codes("newContinent")).not.toContain("DE") // Europe is covered
  expect(codes("newContinent")).toContain("BR")
  expect(codes("eastAsia").sort()).toEqual(expect.arrayContaining(["JP", "KR", "CN"]))
  expect(codes("eastAsia")).not.toContain("FR")
})

test("cards TMDB can't express give no filter", () => {
  for (const id of ["lowBudget", "womanDirector", "famous", "oscar", "word", "movement"]) expect(discoverParams(card(id), ctx)).toBeNull()
})

test("franchise uses TMDB's sequel keyword, and the hand-made lists are sound", async () => {
  expect(discoverParams(card("franchise"), ctx, { franchise: 9663 })).toBe("&with_keywords=9663")
  const { WOMAN_DIRECTED, LOW_BUDGET, OSCAR_WINNERS } = await import("./deckClassics")
  for (const list of [WOMAN_DIRECTED, LOW_BUDGET, OSCAR_WINNERS]) {
    expect(list.length).toBeGreaterThan(20)
    expect(new Set(list.map(([t, y]) => `${t}|${y}`)).size).toBe(list.length) // no repeats
    expect(list.every(([t, y]) => t && y > 1900 && y < 2030)).toBe(true)
  }
})
