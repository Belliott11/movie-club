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

const tiered = `WATCH PLAN BY TIER
Work through Tier 1 first, then Tier 2.
CURRENTLY WATCHING, a cap of three groups at a time: Deep dive: Kurosawa, Crime and noir, War. Finish one before opening the next.
Tags show the canon lists a film is on. An asterisk after a title means it is not on your watchlist.

TIER 1: CORE (6 films, 3 groups)
The films most worth seeing first.

GROUP 1: DEEP DIVE: KUROSAWA (2 films)
1. Stray Dog (1949)
2. Sanjuro (1962) [LB500 #488]

GROUP 2: CRIME AND NOIR (1 films)
1. Touch of Evil (1958) [S&S #108, TSPDT #42, LB500 #407]

GROUP 3: CANON: HOLLYWOOD GOLDEN AGE (2 films)
1. Intolerance (1916)* [S&S #225, TSPDT #129]
2. Duck Soup (1933)* [S&S #211]

TIER 2: MAIN (2 films, 2 groups)
The rest of your own watchlist.

GROUP 4: CRIME AND NOIR (1 films)
1. White Heat (1949)

GROUP 5: WAR (1 films)
1. Good Morning, Vietnam (1987)
`

test("a tiered plan keeps its groups, tiers, starred films and the groups to watch now", () => {
  const p = parsePlan(tiered)
  expect(p.groups.map(g => [g.n, g.films.length, g.tier?.n])).toEqual([[1, 2, 1], [2, 1, 1], [3, 2, 1], [4, 1, 2], [5, 1, 2]])
  expect(p.groups[0].tier?.name).toBe("Core")
  expect(p.groups[2].films[0]).toMatchObject({ title: "Intolerance", year: 1916, added: true }) // the asterisk is not part of the title
  expect(p.groups[0].films[0]).toMatchObject({ title: "Stray Dog", year: 1949 })
  expect(p.watching).toEqual([1, 2, 5]) // the first group with each name; War is group 5 here
})
