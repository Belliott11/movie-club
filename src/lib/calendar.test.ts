import { expect, test } from "vitest"
import { fromIso, monthGrid, niceDate, toIso } from "./calendar"

test("a month lays out in weeks starting on Sunday, with blanks around it", () => {
  const g = monthGrid(2026, 9) // October 2026 starts on a Thursday and has 31 days
  expect(g[0]).toEqual([null, null, null, null, 1, 2, 3])
  expect(g.flat().filter(Boolean)).toHaveLength(31)
  expect(g.every(r => r.length === 7)).toBe(true)
  expect(g.at(-1)!.filter(Boolean).at(-1)).toBe(31)
  expect(monthGrid(2026, 1).flat().filter(Boolean)).toHaveLength(28)
  expect(monthGrid(2028, 1).flat().filter(Boolean)).toHaveLength(29) // a leap year
})

test("dates convert to and from YYYY-MM-DD without shifting a day", () => {
  expect(toIso(2026, 0, 5)).toBe("2026-01-05")
  expect(fromIso("2026-10-14")).toEqual({ y: 2026, m: 9, d: 14 })
  expect(fromIso("")).toBeNull()
  expect(niceDate("2026-10-14")).toBe("Oct 14, 2026")
})
