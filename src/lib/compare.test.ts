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

import { rankPairRecs } from "./pairRecs"

test("pair recommendations need both tastes, skip seen films, compilations, TV movies and weak scores", () => {
  const r = (id: number, title: string, extra = {}) => ({ id, title, year: 2000, poster: null, votes: 7.5, ratings: 5000, ...extra })
  const out = rankPairRecs(
    [
      { because: "Both", who: "both", results: [r(1, "Shared pick"), r(3, "Seen"), r(4, "Weak", { votes: 5 }), r(5, "Big Trilogy: 1901-1980"), r(6, "Telefilm", { tv: true }), r(7, "Obscure", { ratings: 20 })] },
      { because: "A fav", who: "a", results: [r(2, "Bridge"), r(8, "Only A")] },
      { because: "B fav", who: "b", results: [r(2, "Bridge"), r(1, "Shared pick")] },
    ],
    t => t === "Seen",
  )
  expect(out.map(x => x.title)).toEqual(["Shared pick", "Bridge"]) // Only A suits just one of them
  expect(out[0].because).toEqual(["Both", "B fav"])
})
