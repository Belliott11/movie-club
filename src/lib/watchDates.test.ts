import { expect, test } from "vitest"
import { weeklyDates } from "./watchDates"
import type { Movie } from "./types"

const m = (seq: number, watched_on?: string): Movie => ({ id: seq, seq, title: `F${seq}`, year: 2000, pick: "A", ratings: {}, watched_on })

test("films get one date a week from the start, in watched order", () => {
  const r = weeklyDates([m(3), m(1), m(2)], "2026-01-01")
  expect(r.map(x => [x.movie.title, x.date])).toEqual([["F1", "2026-01-01"], ["F2", "2026-01-08"], ["F3", "2026-01-15"]])
})

test("dated films are left alone but keep their place, and the weeks cross months and years", () => {
  const r = weeklyDates([m(1), m(2, "2026-06-30"), m(3), m(4)], "2025-12-25")
  expect(r.map(x => [x.movie.title, x.date])).toEqual([["F1", "2025-12-25"], ["F3", "2026-01-08"], ["F4", "2026-01-15"]])
})
