import { expect, test } from "vitest"
import type { LbHistory } from "./letterboxd"
import { clubVsHome, deepCuts, divisiveOnLb, favoritesOf, groupFavorites, tasteTwins } from "./lbstats"
import type { Movie } from "./types"

// 20 films that Ann and Ben rate alike, and Cy rates the opposite way
const shared = Array.from({ length: 20 }, (_, i) => `Film ${i}`)
const lb: LbHistory = {
  Ann: [...shared.map((t, i): [string, number, number] => [t, 2000, i % 2 ? 5 : 2]), ["Deep Cut", 1999, 5], ["Heat", 1995, 5]],
  Ben: [...shared.map((t, i): [string, number, number] => [t, 2000, i % 2 ? 4.5 : 2.5]), ["Heat", 1995, 4.5]],
  Cy: [...shared.map((t, i): [string, number, number] => [t, 2000, i % 2 ? 1 : 5]), ["Heat", 1995, 4]],
}
const club: Movie[] = [{ id: 1, seq: 1, title: "Heat", year: 1995, pick: "Ann", ratings: { Ann: 4, Ben: 3 } }]

test("taste twins: closest pair first, and pairs need enough shared films", () => {
  const t = tasteTwins(lb)
  expect([t[0].a, t[0].b]).toEqual(["Ann", "Ben"])
  expect(t[0].shared).toBe(21) // 20 plus Heat
  expect(t[0].gap).toBeLessThan(t.at(-1)!.gap)
  expect(tasteTwins(lb, 30)).toEqual([])
})

test("club versus home compares only films rated in both places", () => {
  const r = clubVsHome(club, lb, "Ann")
  expect(r.count).toBe(1)
  expect(r.average).toBe(-1) // 4 at the club, 5 on Letterboxd
  expect(clubVsHome(club, lb, "Zed")).toEqual({ count: 0, average: null, biggest: [] })
})

test("group favorites skip club films; deep cuts are single-viewer 4.5+; divisive needs a wide spread", () => {
  expect(groupFavorites(lb, club).map(f => f.title)).not.toContain("Heat") // the club watched it
  expect(deepCuts(lb, club).map(f => f.title)).toEqual(["Deep Cut"])
  const d = divisiveOnLb(lb)
  expect(d[0].spread).toBeGreaterThanOrEqual(4) // Ann/Ben 5 vs Cy 1 on the odd films
})

test("favorites: highest ratings first, and among equal ratings films more friends have watched come before one nobody else saw", () => {
  const f = favoritesOf(lb, "Ann", 12) // ten odd "Film N" + Heat + Deep Cut are all 5 stars
  expect(f.every(x => x.rating === 5)).toBe(true)
  expect(f.at(-1)!.title).toBe("Deep Cut") // watched by Ann alone
  expect(favoritesOf(lb, "Ann", 2)).toHaveLength(2)
  expect(favoritesOf(lb, "Zed")).toEqual([])
})
