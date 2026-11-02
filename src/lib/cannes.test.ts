import { expect, test } from "vitest"
import { CARDS } from "./deck"
import { CANNES, wonCannes } from "./cannes"

test("knows the Palme d'Or winners, a year either side, and not the losers", () => {
  expect(wonCannes("Parasite", 2019)).toBe(true)
  expect(wonCannes("Taxi Driver", 1976)).toBe(true)
  expect(wonCannes("The Piano", 1993)).toBe(true)
  expect(wonCannes("Kagemusha", 1981)).toBe(true) // release years differ by region
  expect(wonCannes("Pulp Fiction", 1994)).toBe(true)
  expect(wonCannes("Raging Bull", 1980)).toBe(false)
  expect(wonCannes("Parasite", 2005)).toBe(false) // same title, a different film
  expect(new Set(CANNES.map(([t, y]) => `${t}|${y}`)).size).toBe(CANNES.length)
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
