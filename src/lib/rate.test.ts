import { expect, test } from "vitest"
import { filmToRate } from "./rate"
import type { Movie } from "./types"

const film = (seq: number, watched_on: string | null, ratings: Record<string, number> = {}): Movie => ({ id: seq, seq, title: "F" + seq, year: 2000, pick: "A", ratings, watched_on })

test("asks for the newest film on the day it was watched and for a week after", () => {
  const ms = [film(1, "2026-10-01"), film(2, "2026-10-20")]
  expect(filmToRate(ms, "Ben", {}, "2026-10-20")?.seq).toBe(2)
  expect(filmToRate(ms, "Ben", {}, "2026-10-27")?.seq).toBe(2)
  expect(filmToRate(ms, "Ben", {}, "2026-10-28")).toBeNull() // more than a week ago
  expect(filmToRate(ms, "Ben", {}, "2026-10-19")).toBeNull() // not watched yet
})

test("stops asking once you have rated or sealed, and needs a date and a name", () => {
  expect(filmToRate([film(2, "2026-10-20", { Ben: 3 })], "Ben", {}, "2026-10-20")).toBeNull()
  expect(filmToRate([film(2, "2026-10-20")], "Ben", { "2": ["Ben"] }, "2026-10-20")).toBeNull()
  expect(filmToRate([film(2, null)], "Ben", {}, "2026-10-20")).toBeNull()
  expect(filmToRate([film(2, "2026-10-20")], "", {}, "2026-10-20")).toBeNull()
})
