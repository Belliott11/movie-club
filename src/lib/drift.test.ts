import { expect, test } from "vitest"
import { driftByYear, driftSummary, hasDates } from "./drift"
import type { LbEntry } from "./letterboxd"

const many = (year: string, n: number, rating: number, release: number): LbEntry[] => Array.from({ length: n }, (_, i) => [`F${year}${i}`, release, rating, `${year}-03-0${(i % 9) + 1}`])
const h: LbEntry[] = [...many("2022", 6, 4, 1960), ...many("2023", 6, 3, 1990), ...many("2024", 12, 2, 2018), ...many("2019", 2, 5, 1950), ["Undated", 2000, 5]]

test("history is grouped by the year it was logged, oldest first, skipping thin years and undated films", () => {
  const rows = driftByYear(h)
  expect(rows.map(r => [r.year, r.n, r.avg, r.medianRelease])).toEqual([[2022, 6, 4, 1960], [2023, 6, 3, 1990], [2024, 12, 2, 2018]])
  expect(driftByYear(h, () => [], 1).map(r => r.year)).toContain(2019)
  expect(hasDates(h)).toBe(true)
  expect(hasDates([["A", 2000, 3]])).toBe(false)
  expect(hasDates(undefined)).toBe(false)
})

test("genres are the most-watched of each year, and the summary names what moved", () => {
  const rows = driftByYear(h, e => (e[1] < 1980 ? ["Drama", "War"] : e[1] < 2000 ? ["Crime"] : ["Comedy", "Drama", "Drama"]))
  expect(rows[0].genres).toEqual(["Drama", "War"])
  expect(rows[2].genres).toEqual(["Comedy", "Drama"])
  const s = driftSummary(rows)!
  expect(s).toContain("From 2022 to 2024")
  expect(s).toContain("ratings down from 4.0 to 2.0")
  expect(s).toContain("newer films")
  expect(s).toContain("more films logged (6 in 2022, 12 in 2024)")
  expect(driftSummary(rows.slice(0, 1))).toBeNull()
})
