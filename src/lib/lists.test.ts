import { expect, test } from "vitest"
import { listCard, type TopList } from "./lists"

const list: TopList = { id: "x", name: "A Top List", short: "Top List", films: [["Citizen Kane", 1941], ["Tokyo Story", 1953], ["Amélie", 2001]] }
const ctx = { thisYear: 2026, countries: new Set<string>(), continents: new Set<never>(), regions: new Set<never>(), movementKeys: new Set<string>() }

test("a list card fits films on the list, with a year either side and accents ignored, and nothing else", () => {
  const c = listCard(list)
  expect(c.id).toBe("list-x")
  expect(c.title).toBe("On Top List")
  expect(c.fits({ title: "Citizen Kane", year: 1941, wantedBy: 1 }, ctx)).toBe(true)
  expect(c.fits({ title: "Tokyo Story", year: 1954, wantedBy: 1 }, ctx)).toBe(true) // release years differ by region
  expect(c.fits({ title: "Amelie", year: 2001, wantedBy: 1 }, ctx)).toBe(true)
  expect(c.fits({ title: "Citizen Kane", year: 1990, wantedBy: 1 }, ctx)).toBe(false) // a different film with the same title
  expect(c.fits({ title: "Vertigo", year: 1958, wantedBy: 1 }, ctx)).toBe(false)
  expect(c.list?.length).toBe(3)
})
