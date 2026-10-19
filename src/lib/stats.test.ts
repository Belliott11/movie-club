import { expect, test } from "vitest"
import { groupAvg, outsideAvg, pickOrder } from "./stats"
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
