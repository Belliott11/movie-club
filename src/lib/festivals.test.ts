import { expect, test } from "vitest"
import { CARDS } from "./deck"
import { FESTIVAL_WINNERS, wonFestival } from "./festivals"

test("knows the winners at Cannes, Venice and Berlin, a year either side, and not the losers", () => {
  expect(wonFestival("Parasite", 2019)).toBe(true)
  expect(wonFestival("Taxi Driver", 1976)).toBe(true)
  expect(wonFestival("The Piano", 1993)).toBe(true)
  expect(wonFestival("Kagemusha", 1981)).toBe(true) // release years differ by region
  expect(wonFestival("Pulp Fiction", 1994)).toBe(true)
  expect(wonFestival("Roma", 2018)).toBe(true) // Venice
  expect(wonFestival("Spirited Away", 2001)).toBe(true) // Berlin
  expect(wonFestival("Whiplash", 2014)).toBe(true) // Sundance
  expect(wonFestival("La La Land", 2016)).toBe(true) // Toronto
  expect(wonFestival("Raging Bull", 1980)).toBe(false)
  expect(wonFestival("Parasite", 2005)).toBe(false) // same title, a different film
  expect(new Set(FESTIVAL_WINNERS.map(([t, y]) => `${t}|${y}`)).size).toBe(FESTIVAL_WINNERS.length)
})

test("the new cards read their facts, and say can't-tell when a fact is missing", () => {
  const card = (id: string) => CARDS.find(c => c.id === id)!
  const ctx = { thisYear: 2026, countries: new Set<string>(), continents: new Set<never>(), regions: new Set<never>(), movementKeys: new Set<string>() }
  const f = { title: "Parasite", year: 2019, wantedBy: 1 }
  expect(card("book").fits({ ...f, book: true }, ctx)).toBe(true)
  expect(card("book").fits(f, ctx)).toBeUndefined()
  expect(card("remake").fits({ ...f, remake: false }, ctx)).toBe(false)
  expect(card("musical").fits({ ...f, musical: true }, ctx)).toBe(true)
  expect(card("cannes").fits({ ...f, cannes: true }, ctx)).toBe(true)
})
