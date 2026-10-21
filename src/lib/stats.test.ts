import { expect, test } from "vitest"
import { groupAvg, key, outsideAvg, pickOrder, ratingRange } from "./stats"
import type { Movie } from "./types"

const mk = (seq: number, pick: string, ratings: Record<string, number>): Movie => ({ id: seq, seq, title: "t" + seq, year: 2000, pick, ratings })

test("group average uses only present ratings", () => {
  expect(groupAvg(mk(1, "A", { A: 2.5, B: 3, C: 4, D: 1 }))).toBe(2.625)
})
test("outside average normalizes every source to 5", () => {
  expect(outsideAvg({ ...mk(1, "A", {}), imdb: 8, rt: 80, mc: 60 })).toBeCloseTo((4 + 4 + 3) / 3)
  expect(outsideAvg(mk(1, "A", {}))).toBeNull()
})
test("pick order: longest since last pick first, never-picked before everyone", () => {
  const ms = [mk(1, "A", {}), mk(2, "B", {}), mk(3, "A", {})]
  expect(pickOrder(ms, ["A", "B", "C"]).map(x => x.n)).toEqual(["C", "B", "A"])
})

import { filterFilms, defaultFilter } from "./stats"

test("film search ignores case and punctuation; filters and sorts", () => {
  const a = { ...mk(1, "Ben", { A: 4 }), title: "Pan's Labyrinth", year: 2006 }
  const b = { ...mk(2, "Reilly", { A: 2 }), title: "Jaws", year: 1975 }
  const c = { ...mk(3, "Ben", { A: 5 }), title: "City of God", year: 2002 }
  const all = [a, b, c]
  expect(filterFilms(all, { ...defaultFilter, q: "pans lab" }).map(m => m.title)).toEqual(["Pan's Labyrinth"])
  expect(filterFilms(all, { ...defaultFilter, picker: "Ben", sort: "highest" }).map(m => m.title)).toEqual(["City of God", "Pan's Labyrinth"])
  expect(filterFilms(all, { ...defaultFilter, decade: "1970" }).map(m => m.title)).toEqual(["Jaws"])
  expect(filterFilms(all, { ...defaultFilter, sort: "lowest" }).map(m => m.title)).toEqual(["Jaws", "Pan's Labyrinth", "City of God"])
  expect(filterFilms(all, { ...defaultFilter, sort: "newest" }).map(m => m.seq)).toEqual([3, 2, 1])
})

import { recapLines } from "./stats"
test("recap mentions the picker, outside gap, split and rank", () => {
  const a = { ...mk(1, "Ben", { Ben: 5, Reilly: 2 }), title: "A", imdb: 8 }
  const b = mk(2, "Reilly", { Ben: 3 })
  const lines = recapLines(a, [a, b])
  expect(lines[0]).toContain("Ben picked it")
  expect(lines.join(" ")).toContain("Everyone else gave 4")
  expect(lines.join(" ")).toContain("Ben liked it most (5) and Reilly least (2). A real split.")
  expect(lines.at(-1)).toBe("It ranks #1 of 2 films the club has watched.")
})

import { histogram, tasteOverlap, tilt, trend } from "./stats"
test("taste overlap ranks the closest pair first and needs enough shared films", () => {
  const ms = [1, 2, 3, 4, 5].map(i => mk(i, "A", { A: 4, B: 4, C: 1 }))
  const o = tasteOverlap(ms, ["A", "B", "C"])
  expect(o[0]).toMatchObject({ a: "A", b: "B", diff: 0, n: 5 })
  expect(tasteOverlap(ms.slice(0, 3), ["A", "B"])).toEqual([])
})
test("tilt, histogram and trend", () => {
  const ms = [mk(1, "A", { A: 4, B: 2 }), mk(2, "A", { A: 3 })]
  expect(tilt(ms, "A")).toBe(2)
  expect(histogram(ms, "A").filter(h => h.n).map(h => h.v)).toEqual([3, 4])
  expect(trend(ms).map(t => t.avg)).toEqual([3, 3])
})

import { letterboxdCsv, ratingsCsv } from "./exporters"
test("csv export quotes commas and quotes, one column per person", () => {
  const m = { ...mk(1, "Ben", { Ben: 4, Reilly: 2 }), title: 'He said, "go"', year: 1999, tmdb_id: 7 }
  const csv = ratingsCsv([m], ["Ben", "Reilly", "Zed"]).split("\r\n")
  expect(csv[0]).toContain("Title,Year,Picked by,Ben,Reilly,Zed,Club average")
  expect(csv[1].startsWith('"He said, ""go""",1999,Ben,4,2,,3')).toBe(true)
  expect(letterboxdCsv([m]).split("\r\n")[1]).toBe('7,"He said, ""go""",1999')
})

import { sortRows } from "./sortRows"
test("sortRows handles numbers, text and keeps blanks last both ways", () => {
  const r = [{ n: "b", v: 2 }, { n: "A", v: null }, { n: "c", v: 10 }]
  expect(sortRows(r, x => x.v, "asc").map(x => x.n)).toEqual(["b", "c", "A"])
  expect(sortRows(r, x => x.v, "desc").map(x => x.n)).toEqual(["c", "b", "A"])
  expect(sortRows(r, x => x.n, "asc").map(x => x.n)).toEqual(["A", "b", "c"])
})

import { deviations, median, overview } from "./stats"
test("median, overview and deviations", () => {
  expect(median([3, 1, 2])).toBe(2)
  expect(median([1, 2, 3, 4])).toBe(2.5)
  expect(median([])).toBeNull()
  const ms = [mk(1, "A", { A: 5, B: 3 }), mk(2, "A", { A: 2, B: 3, C: 4 }), mk(3, "A", {})]
  expect(overview(ms)).toMatchObject({ films: 2, ratings: 5, average: 17 / 5 })
  const d = deviations(ms, "A")
  expect(d.map(x => x.diff)).toEqual([2, -1.5]) // biggest difference first
})

import { awardWinners } from "./stats"
test("award winners: harshest, most generous, contrarian need enough films; best pick needs a rated pick", () => {
  const ms = [1, 2, 3, 4, 5].map(i => mk(i, i === 1 ? "B" : "A", { A: 2, B: 4, C: 5 }))
  const w = awardWinners(ms, ["A", "B", "C"])
  expect(w.harsh?.n).toBe("A")
  expect(w.kind?.n).toBe("C")
  expect(w.picker?.n).toBeDefined()
  expect(awardWinners(ms.slice(0, 2), ["A", "B", "C"]).harsh).toBeUndefined()
})

test("a rating range needs two ratings and narrows as ratings pile up", () => {
  expect(ratingRange([4])).toBeNull()
  const few = ratingRange([2, 4])!, many = ratingRange([2, 4, 2, 4, 2, 4, 2, 4])!
  expect(many.hi - many.lo).toBeLessThan(few.hi - few.lo)
  expect(few.lo).toBeGreaterThanOrEqual(0.5)
  expect(few.hi).toBeLessThanOrEqual(5)
})

test("titles match with or without accents", () => {
  expect(key("Cléo from 5 to 7", 1962)).toBe(key("Cleo from 5 to 7", 1962))
  expect(key("Amélie", 2001)).toBe("amelie|2001")
})
