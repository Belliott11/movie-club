import { expect, test } from "vitest"
import { byDecade, byTag, byYear } from "./breakdown"
import type { Movie } from "./types"

const film = (year: number, ...ratings: number[]) => ({ year, ratings: Object.fromEntries(ratings.map((v, i) => [`p${i}`, v])) }) as unknown as Movie

test("decades average the club's film averages and run oldest first", () => {
  const d = byDecade([film(1994, 4, 4), film(1999, 2), film(2011, 5)])
  expect(d.map(x => x.name)).toEqual(["1990s", "2010s"])
  expect(d[0]).toMatchObject({ n: 2, avg: 3 })
})

test("years keep empty years so gaps show", () => {
  expect(byYear([film(2000, 3), film(2003, 3), film(2003, 4)])).toEqual([{ year: 2000, n: 1 }, { year: 2001, n: 0 }, { year: 2002, n: 0 }, { year: 2003, n: 2 }])
})

test("a film counts once per tag, even if the tag repeats", () => {
  const a = film(2000, 4), b = film(2001, 2)
  const g = byTag([a, b], m => (m === a ? ["Drama", "Drama", "Crime"] : ["Drama"]))
  expect(g.find(x => x.name === "Drama")).toMatchObject({ n: 2, avg: 3 })
  expect(g.find(x => x.name === "Crime")?.n).toBe(1)
})

test("tags can be averaged on any rating, such as one person's", () => {
  const a = { year: 2000, ratings: { me: 5, you: 1 } } as unknown as Movie
  expect(byTag([a], () => ["Drama"], m => m.ratings.me)[0].avg).toBe(5)
})
