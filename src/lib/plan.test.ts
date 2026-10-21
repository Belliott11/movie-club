import { expect, test } from "vitest"
import { filmKey, groupProgress, parsePlan, seenMatcher, upNext } from "./plan"

const sample = `WATCHLIST PLAN BY GROUP, some intro
Long hauls to save for weekends or split over two nights: Shoah, Dekalog, Jeanne Dielman.
Movie club candidates already on your watchlist, best saved for the group: Magnolia, Face/Off, Emilia Pérez.

GROUP 1: HALLOWEEN RUN (3 films)
Horror and creepy classics while it is still October.
1. The Thing [canon: TSPDT #208, S&S #118, LB500 #111]
2. Psycho [canon: AFI, TSPDT #24]
3. Black Swan

GROUP 2: MOVEMENT: PRE-CODE HOLLYWOOD (2 films)
Hollywood before the 1934 Production Code.
4. Little Caesar (1931) [added, not on your watchlist]
5. I Am a Fugitive from a Chain Gang

DOUBLE FEATURES (already in the plan, but worth pulling together)
Directors with two films on your list.
Zhang Yimou: Raise the Red Lantern (1991), To Live (1994)
`

test("reads groups, films, years, tags, the club shortlist and the long films", () => {
  const p = parsePlan(sample)
  expect(p.groups.map(g => [g.n, g.title, g.films.length])).toEqual([[1, "HALLOWEEN RUN", 3], [2, "MOVEMENT: PRE-CODE HOLLYWOOD", 2]])
  expect(p.groups[0].blurb).toMatch(/Horror/)
  expect(p.groups[0].films[0]).toMatchObject({ title: "The Thing", canon: "TSPDT #208, S&S #118, LB500 #111" })
  expect(p.groups[1].films[0]).toMatchObject({ title: "Little Caesar", year: 1931, added: true })
  expect(p.club).toEqual(["Magnolia", "Face/Off", "Emilia Pérez"])
  expect(p.long).toEqual(["Shoah", "Dekalog", "Jeanne Dielman"])
  expect(p.groups.flatMap(g => g.films).length).toBe(5) // the double features are not films in a group
})

test("seen films come from the Letterboxd history, with or without a year, and drive progress and the next films", () => {
  const p = parsePlan(sample)
  const seen = seenMatcher([["The Thing", 1982, 5], ["Little Caesar", 1931, null]])
  expect(groupProgress(p.groups[0], seen)).toEqual({ done: 1, total: 3, complete: false })
  expect(groupProgress(p.groups[1], seen).done).toBe(1)
  const next = upNext(p, seen, 2)!
  expect(next.group.n).toBe(1)
  expect(next.films.map(f => f.title)).toEqual(["Psycho", "Black Swan"])
})

test("a correction beats Letterboxd either way", () => {
  const h: [string, number, number | null][] = [["The Thing", 1982, 5]]
  const seen = seenMatcher(h, { [filmKey({ title: "The Thing" })]: false, [filmKey({ title: "Psycho" })]: true })
  expect(seen({ title: "The Thing" })).toBe(false)
  expect(seen({ title: "Psycho" })).toBe(true)
  expect(seen({ title: "Alien" })).toBe(false)
})
