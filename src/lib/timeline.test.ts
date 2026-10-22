import { expect, test } from "vitest"
import { busiestMonth, byMonth, longestBreak, longestStreak } from "./timeline"
import type { Movie } from "./types"

const m = (seq: number, watched_on?: string): Movie => ({ id: seq, seq, title: `F${seq}`, year: 2000, pick: "A", ratings: {}, watched_on })
const films = [m(1, "2026-01-04"), m(2, "2026-01-11"), m(3, "2026-01-18"), m(4, "2026-04-05"), m(5, "2026-04-12"), m(6)]

test("months run from the first screening to the last, keeping empty months so gaps show", () => {
  const months = byMonth(films)
  expect(months.map(x => [x.key, x.films.length])).toEqual([["2026-01", 3], ["2026-02", 0], ["2026-03", 0], ["2026-04", 2]])
  expect(months[0].label).toBe("January 2026")
  expect(byMonth([m(1)])).toEqual([]) // no dates, no timeline
})

test("the longest break is found between two films, and the streak counts weekly screenings in a row", () => {
  expect(longestBreak(films)).toMatchObject({ days: 77, from: { title: "F3" }, to: { title: "F4" } })
  expect(longestStreak(films)).toEqual({ films: 3, from: "2026-01-04", to: "2026-01-18" })
  expect(longestStreak(films, 100)!.films).toBe(5)
  expect(longestStreak([m(1)])).toBeNull()
})

test("the busiest month is the one with the most films", () => {
  expect(busiestMonth(films)!.key).toBe("2026-01")
  expect(busiestMonth([])).toBeNull()
})
