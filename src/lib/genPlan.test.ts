import { expect, test } from "vitest"
import { affinityFrom, filmAffinity, generatePlan, type Cand } from "./genPlan"
import type { LbEntry } from "./letterboxd"

const c = (title: string, year: number, o: Partial<Cand> = {}): Cand => ({ title, year, genres: [], ...o })
const name = (code: string) => ({ JP: "Japan", FR: "France" })[code] ?? code
const flat: ReturnType<typeof affinityFrom> = { overall: 3, genre: new Map(), country: new Map(), decade: new Map() }

test("movement films group by movement, countries need three, genres need four, the rest are wildcards", () => {
  const cands = [
    c("Breathless", 1960, { country: "FR" }), c("Jules and Jim", 1962, { country: "FR" }), // French New Wave
    c("Rashomon", 1950, { country: "JP" }), c("Ikiru", 1952, { country: "JP" }), c("Ran", 1985, { country: "JP" }), // not a movement pair: Ran isn't listed, others are Japanese golden age
    c("Spirited Away", 2001, { country: "JP" }), c("Akira", 1988, { country: "JP" }), c("Perfect Blue", 1997, { country: "JP" }),
    c("A", 2005, { genres: ["Horror"] }), c("B", 2006, { genres: ["Horror"] }), c("C", 2007, { genres: ["Horror"] }), c("D", 2008, { genres: ["Horror"] }),
    c("Lonely", 1931),
  ]
  const p = generatePlan(cands, flat, name)
  const titles = p.groups.map(g => g.title)
  expect(titles).toContain("Movement: French New Wave")
  expect(titles).toContain("Movement: Japanese golden age")
  expect(titles).toContain("Japan") // three more Japanese films outside the movement
  expect(titles).toContain("Horror")
  expect(titles).toContain("Wildcards")
  expect(p.groups.flatMap(g => g.films).length).toBe(cands.length) // every film lands in exactly one group
  expect(new Set(p.groups.flatMap(g => g.films.map(f => f.title))).size).toBe(cands.length)
})

test("groups the person rates highest come first, and within a group the best-reviewed film leads", () => {
  const hist: LbEntry[] = Array.from({ length: 12 }, (_, i) => [`H${i}`, 1990, i < 6 ? 5 : 1])
  const aff = affinityFrom(hist, e => (Number(e[0].slice(1)) < 6 ? "JP" : "FR"), () => [])
  expect(aff.country.get("JP")).toBeGreaterThan(aff.country.get("FR")!)
  const cands = [c("F1", 2000, { country: "FR", vote: 9 }), c("F2", 2001, { country: "FR", vote: 8 }), c("F3", 2002, { country: "FR", vote: 7 }),
    c("J1", 2000, { country: "JP", vote: 6 }), c("J2", 2001, { country: "JP", vote: 8 }), c("J3", 2002, { country: "JP", vote: 7 })]
  const p = generatePlan(cands, aff, name)
  expect(p.groups[0].title).toBe("Japan")
  expect(p.groups[0].films.map(f => f.title)).toEqual(["J2", "J3", "J1"])
  expect(filmAffinity(cands[3], aff)).toBeGreaterThan(filmAffinity(cands[0], aff))
})
