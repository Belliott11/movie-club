import { expect, test } from "vitest"
import { pickHeroFilm } from "./hero"
import type { Movie } from "./types"

const mk = (id: number, ratings: Record<string, number>): Movie => ({ id, seq: id, title: "t" + id, year: 2000, pick: "A", ratings })
const ms = [mk(1, { Ben: 5, Zed: 2 }), mk(2, { Ben: 3, Zed: 5 }), mk(3, { Ben: 4.5 }), mk(4, {})]
const all = () => true

test("each page picks a fitting film", () => {
  expect(pickHeroFilm(ms, all, ["films", "2"])?.id).toBe(2) // that film
  expect(pickHeroFilm(ms, all, ["people", "Zed"])?.id).toBe(2) // their favorite
  expect(pickHeroFilm(ms, all, ["people", "Ben"])?.id).toBe(1)
  expect(pickHeroFilm(ms, all, ["stats"])?.id).toBe(3) // best average (4.5)
  expect([1, 2, 3]).toContain(pickHeroFilm(ms, all, ["films"])?.id) // a film rated 3.5 or higher, never the unrated newest
})
test("films without a still are skipped, rotation is stable within a day, and no stills means no hero", () => {
  expect(pickHeroFilm(ms, m => m.id === 2, ["films"])?.id).toBe(2)
  expect(pickHeroFilm(ms, m => m.id === 4, ["films"])?.id).toBe(4) // nothing rated 3.5+: use whatever has a still
  const d = new Date("2026-03-10T09:00:00")
  expect(pickHeroFilm(ms, all, ["next"], d)?.id).toBe(pickHeroFilm(ms, all, ["suggest"], new Date("2026-03-10T21:00:00"))?.id)
  expect(pickHeroFilm(ms, () => false, ["films"])).toBeUndefined()
  expect([1, 2, 3]).toContain(pickHeroFilm(ms, all, ["films", "999"])?.id) // unknown id falls back to the daily pick
})

test("each spin moves the daily pick on to another film", () => {
  const d = new Date("2026-03-10T09:00:00")
  const seen = new Set([0, 1, 2].map(spin => pickHeroFilm(ms, all, ["films"], d, spin)?.id))
  expect(seen.size).toBe(3)
})
