import { expect, test } from "vitest"
import { wrappedSlides, wrappedText } from "./wrapped"
import type { Movie } from "./types"

const m = (id: number, title: string, year: number, pick: string, ratings: Record<string, number>, extra: Partial<Movie> = {}): Movie => ({ id, seq: id, title, year, pick, ratings, ...extra })
const movies = [
  m(1, "Alpha", 1960, "Ann", { Ann: 5, Bo: 4, Cy: 5 }),
  m(2, "Beta", 1990, "Bo", { Ann: 2, Bo: 5, Cy: 1 }, { imdb: 8 }),
  m(3, "Gamma", 2010, "Cy", { Ann: 3, Bo: 3, Cy: 2 }),
  m(4, "Delta", 2000, "Ann", { Ann: 4, Bo: 4, Cy: 4 }),
  m(5, "Epsilon", 1985, "Bo", { Ann: 3, Bo: 4, Cy: 3 }),
  m(6, "Zeta", 1975, "Cy", { Ann: 4, Bo: 5, Cy: 4 }),
]

test("tells the club's story: numbers, best, worst, the argument, awards and taste", () => {
  const s = wrappedSlides(movies, ["Ann", "Bo", "Cy"])
  const ids = s.map(x => x.id)
  expect(ids.slice(0, 3)).toEqual(["numbers", "best", "worst"])
  expect(s[0].big).toBe("6 films")
  expect(s[1].big).toBe("Alpha") // 4.67 beats Zeta's 4.33
  expect(s.find(x => x.id === "worst")!.big).toBe("Gamma")
  expect(s.find(x => x.id === "split")!.big).toBe("Beta") // Bo 5 against Cy 1
  expect(s.find(x => x.id === "split")!.text).toContain("Bo gave it 5 and Cy gave it 1")
  expect(s.find(x => x.id === "regulars")!.big).toBe("Ann, Bo, Cy")
  expect(ids).toContain("twins")
  expect(s.find(x => x.id === "years")!.big).toBe("1960 to 2010")
})

test("no ratings means no slides, and the text version has one line per slide", () => {
  expect(wrappedSlides([m(1, "A", 2000, "X", {})], ["X"])).toEqual([])
  const s = wrappedSlides(movies, ["Ann", "Bo", "Cy"], ["USA", "Japan", "France"])
  expect(s.at(-1)!.big).toBe("3 countries")
  expect(wrappedText(s).split("\n")).toHaveLength(s.length + 1)
})

test("with watch dates it adds the busiest month, the longest run and the longest break", () => {
  const dated = [
    m(1, "A", 2000, "X", { X: 4 }, { watched_on: "2026-01-04" }), m(2, "B", 2000, "X", { X: 4 }, { watched_on: "2026-01-11" }),
    m(3, "C", 2000, "X", { X: 4 }, { watched_on: "2026-01-18" }), m(4, "D", 2000, "X", { X: 4 }, { watched_on: "2026-04-05" }),
  ]
  const s = wrappedSlides(dated, ["X"])
  expect(s.find(x => x.id === "busiest")).toMatchObject({ big: "January 2026" })
  expect(s.find(x => x.id === "streak")!.big).toBe("3 screenings in a row")
  expect(s.find(x => x.id === "break")!.big).toBe("11 weeks")
  expect(wrappedSlides(movies, ["Ann", "Bo", "Cy"]).some(x => x.id === "busiest")).toBe(false) // no dates, no time cards
})
