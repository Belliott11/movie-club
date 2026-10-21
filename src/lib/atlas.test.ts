import { expect, test } from "vitest"
import { blindspots, movementBlindspots, movementProgress, tallyCountries } from "./atlas"
import type { LbEntry } from "./letterboxd"

const h: LbEntry[] = [["Rashomon", 1950, 5], ["Ikiru", 1952, 4], ["Heat", 1995, null], ["Mystery", 2000, 3]]
const codes: Record<string, string> = { Rashomon: "JP", Ikiru: "JP", Heat: "US" }

test("countries are tallied with counts and average, unknown films skipped", () => {
  const t = tallyCountries(h, e => codes[e[0]])
  expect(t).toEqual([{ code: "JP", n: 2, avg: 4.5 }, { code: "US", n: 1, avg: null }])
})

test("blindspots list the nations seen least, never-seen first", () => {
  const b = blindspots([{ code: "JP", n: 2 }, { code: "FR", n: 5 }], 3)
  expect(b.map(x => x.n)).toEqual([0, 0, 0])
  expect(b.some(x => x.code === "JP" || x.code === "FR")).toBe(false)
})

test("movement progress counts watched landmark films, and finished movements drop out of blindspots", () => {
  const p = movementProgress(h, [["Rashomon", 1950], ["Ikiru", 1952], ["Tokyo Story", 1953]])
  expect(p).toMatchObject({ seen: 2, total: 3 })
  expect(p.missing).toEqual([["Tokyo Story", 1953]])
  const bs = movementBlindspots(h)
  expect(bs.find(m => m.name === "Japanese golden age")?.seen).toBe(2)
  expect(bs[0].seen / bs[0].total).toBeLessThanOrEqual(bs[bs.length - 1].seen / bs[bs.length - 1].total)
})

test("films filed under the Soviet Union count toward Russia", () => {
  expect(tallyCountries(h, () => "SU")).toEqual([{ code: "RU", n: 4, avg: 4 }])
})
