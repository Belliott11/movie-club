import { expect, test } from "vitest"
import { headToHead } from "./compare"
import type { LbHistory } from "./letterboxd"

const mk = (n: number): [string, number, number | null][] => Array.from({ length: n }, (_, i) => [`Shared ${i}`, 2000, i % 5 === 0 ? 5 : 3])
const lb: LbHistory = {
  A: [...mk(6), ["Only A loves", 1990, 5], ["Meh for A", 1991, 2], ["Split", 2010, 5]],
  B: [...mk(6).map(([t, y]) => [t, y, 3] as [string, number, number]), ["Only B loves", 1980, 4.5], ["Split", 2010, 1]],
}

test("head to head counts shared films, rates the match, and lists what each loves that the other hasn't seen", () => {
  const h = headToHead(lb, "A", "B")
  expect(h.watchedBoth).toBe(7)
  expect(h.ratedBoth).toBe(7)
  expect(h.gap).not.toBeNull()
  expect(h.match).toBeGreaterThan(0)
  expect(h.match).toBeLessThan(100)
  expect(h.splits[0].film.title).toBe("Split") // 5 against 1 is the widest gap
  expect(h.aLoves.map(x => x.film.title)).toEqual(["Only A loves"])
  expect(h.bLoves.map(x => x.film.title)).toEqual(["Only B loves"])
})

test("too few shared ratings gives no match score, and identical tastes are 100", () => {
  expect(headToHead({ A: [["X", 2000, 4]], B: [["X", 2000, 5]] }, "A", "B").match).toBeNull()
  const same = Array.from({ length: 6 }, (_, i): [string, number, number] => [`F${i}`, 2000, 4])
  expect(headToHead({ A: same, B: same }, "A", "B").match).toBe(100)
})
