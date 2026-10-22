import { expect, test } from "vitest"
import { pickStyles, styleLabel } from "./pickRisk"
import type { Movie } from "./types"

const m = (id: number, title: string, pick: string, ratings: Record<string, number>): Movie => ({ id, seq: id, title, year: 2000, pick, ratings })
const movies = [
  m(1, "Safe 1", "Sam", { A: 4, B: 4, C: 4 }), m(2, "Safe 2", "Sam", { A: 4, B: 3.5, C: 4 }),
  m(3, "Wild 1", "Gia", { A: 5, B: 1, C: 5 }), m(4, "Wild 2", "Gia", { A: 1, B: 5, C: 2 }),
  m(5, "Dud", "Dan", { A: 2, B: 2, C: 2 }),
  m(6, "Too few", "Tim", { A: 5, B: 1 }),
]

test("pickers are ranked by how much they split the room and how often they beat the club average", () => {
  const { styles, clubAverage } = pickStyles(movies)
  const by = Object.fromEntries(styles.map(s => [s.n, s]))
  expect(styles.map(s => s.n).sort()).toEqual(["Dan", "Gia", "Sam"]) // Tim's one film has two raters, so it doesn't count
  expect(by.Gia.risk).toBeGreaterThan(by.Sam.risk)
  expect(by.Dan.risk).toBe(0)
  expect(by.Sam.hitRate).toBe(1)
  expect(by.Dan.hitRate).toBe(0)
  expect(by.Gia.boldest.title).toBe("Wild 1")
  expect(by.Sam.best.title).toBe("Safe 1")
  expect(clubAverage).toBeGreaterThan(2)
})

test("labels read from where someone sits among the others", () => {
  const { styles } = pickStyles(movies)
  const label = (n: string) => styleLabel(styles.find(s => s.n === n)!, styles)
  expect(label("Sam")).toBe("Safe hands")
  expect(label("Dan")).toBe("Slow burner")
  expect(label("Gia")).toMatch(/Gambler/)
})
