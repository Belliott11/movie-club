import { expect, test } from "vitest"
import { isUnused, mergeMovies, mergeSuggestions, mergeWatch } from "./people"
import type { Movie } from "./types"

const mv = (id: number, pick: string, ratings: Record<string, number>): Movie => ({ id, seq: id, title: "t" + id, year: 2000, pick, ratings })

test("merging keeps the target's rating when both rated, and moves picks", () => {
  const out = mergeMovies([mv(1, "Philip", { Philip: 3, Phillip: 4 }), mv(2, "Philip", { Philip: 2 })], "Philip", "Phillip")
  expect(out[0].ratings).toEqual({ Phillip: 4 })
  expect(out[1].ratings).toEqual({ Phillip: 2 })
  expect(out.map(m => m.pick)).toEqual(["Phillip", "Phillip"])
})
test("merging watchlists drops duplicates; suggestions dedupe votes", () => {
  const wl = [{ member: "A", title: "x", year: 1 }, { member: "B", title: "x", year: 1 }, { member: "A", title: "y", year: 2 }]
  expect(mergeWatch(wl, "A", "B").map(w => `${w.member}${w.title}`).sort()).toEqual(["Bx", "By"])
  const s = mergeSuggestions([{ id: 1, title: "z", year: null, by: "A", votes: ["A", "B"] }], "A", "B")
  expect(s[0]).toMatchObject({ by: "B", votes: ["B"] })
})
test("a person nobody refers to is unused", () => {
  expect(isUnused("Zed", [mv(1, "A", { A: 3 })], [], [])).toBe(true)
  expect(isUnused("A", [mv(1, "A", { A: 3 })], [], [])).toBe(false)
})
