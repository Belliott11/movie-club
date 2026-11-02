import { expect, test } from "vitest"
import { CARDS, deal } from "./deck"
import { afterDeal, canDeal, canRedraw, drawnFor, isStale } from "./deckFlow"

test("a new pick starts with an empty table, and the same pick keeps its cards", () => {
  const row = { turn: 24, drawn: ["old"], by: "Ben" }
  expect(drawnFor(row, 24)).toEqual(["old"])
  expect(drawnFor(row, 25)).toEqual([]) // a film was added: the old cards no longer count
  expect(drawnFor(null, 24)).toEqual([])
})

test("one deal and one redraw per pick, and the redraw is never the same card", () => {
  expect(canRedraw([])).toBe(false)
  expect(canRedraw(["old"])).toBe(true)
  expect(canRedraw(["old", "bw"])).toBe(false)
  for (let i = 0; i < 200; i++) {
    const first = deal([]).id
    const second = deal([first]).id
    expect(second).not.toBe(first)
    expect(afterDeal(afterDeal([], false, first), true, second)).toEqual([first, second])
  }
  expect(afterDeal(["old", "bw"], false, "doc")).toEqual(["doc"]) // a fresh deal starts over
})

test("a deal is refused when the table changed under you", () => {
  expect(isStale(["old"], ["old"])).toBe(false)
  expect(isStale([], ["old"])).toBe(true) // someone dealt while you were about to
  expect(isStale(["old"], ["bw"])).toBe(true)
  expect(isStale(["old"], ["old", "bw"])).toBe(true)
})

test("only the selector deals, or anyone when nobody is designated", () => {
  expect(canDeal(null, "Ben")).toBe(true)
  expect(canDeal("Ben", "Ben")).toBe(true)
  expect(canDeal("Ben", "Reilly")).toBe(false)
})

test("a card can come back on a later pick", () => {
  const seen = new Set<string>()
  for (let i = 0; i < 400; i++) seen.add(deal([], Math.random, [CARDS[0], CARDS[1]]).id)
  expect(seen.size).toBe(2)
})

test("theme cards are loose: they point at films TMDB's keywords tie to the theme, and know when they can't tell", async () => {
  const { CARDS } = await import("./deck")
  const sports = CARDS.find(c => c.id === "theme-sports")!
  const ctx = { thisYear: 2026, countries: new Set<string>(), continents: new Set<never>(), regions: new Set<never>(), movementKeys: new Set<string>() }
  expect(sports.loose).toBe(true)
  expect(sports.fits({ title: "Rocky", year: 1976, wantedBy: 1, themes: ["sports"] }, ctx)).toBe(true)
  expect(sports.fits({ title: "Heat", year: 1995, wantedBy: 1, themes: ["heist"] }, ctx)).toBe(false)
  expect(sports.fits({ title: "X", year: 2000, wantedBy: 1 }, ctx)).toBeUndefined()
  expect(CARDS.filter(c => c.loose).length).toBeGreaterThanOrEqual(12)
})
