import { expect, test } from "vitest"
import { clubQuestions, GENERAL, questionsFor, THEMES, themesFor } from "./discussion"
import type { Movie } from "./types"

test("every theme has three questions and nothing is duplicated", () => {
  expect(new Set(THEMES.map(t => t.id)).size).toBe(THEMES.length)
  for (const t of THEMES) expect(t.questions.every(q => q.endsWith("?") || q.endsWith("."))).toBe(true)
  const all = [...THEMES.flatMap(t => t.questions), ...GENERAL]
  expect(new Set(all).size).toBe(all.length)
})

test("a film points at the themes its keywords, genres and synopsis mention, strongest first", () => {
  const t = themesFor({ keywords: ["revenge", "gangster", "betrayal"], genres: ["Crime", "Drama"], overview: "A mobster seeks revenge after a betrayal." })
  expect(t[0].id).toBe("revenge") // keyword plus synopsis beats the rest
  expect(t.length).toBeLessThanOrEqual(3)
  expect(themesFor({ keywords: [], genres: [], overview: "" })).toEqual([])
  expect(themesFor({ keywords: ["party"], genres: [], overview: "A big party." })).toEqual([]) // "art" must not match inside "party"
})

test("questions: two per theme, two general, and the club's own, with shuffle giving a different set", () => {
  const f = { keywords: ["war", "friendship"], genres: ["War"], overview: "" }
  const a = questionsFor(f, ["Club one."], 0), b = questionsFor(f, ["Club one."], 1)
  expect(a.questions.length).toBe(a.themes.length * 2 + 2 + 1)
  expect(a.questions.at(-1)).toEqual({ text: "Club one.", about: "This club" })
  expect(b.questions.map(q => q.text)).not.toEqual(a.questions.map(q => q.text))
  expect(a.themes.map(t => t.id)).toEqual(b.themes.map(t => t.id)) // same themes, fresh questions
})

test("club questions come from a split, a gap with the outside world, and who picked it", () => {
  const m = { id: 1, seq: 1, title: "X", year: 2000, pick: "Ann", imdb: 9, ratings: { Ann: 5, Bo: 1, Cy: 3 } } as Movie
  const q = clubQuestions(m)
  expect(q[0]).toContain("Ann gave this 5 and Bo gave it 1")
  expect(q.some(x => x.includes("Outside ratings average"))).toBe(true)
  expect(q.at(-1)).toContain("Ann picked this one")
  expect(clubQuestions({ ...m, pick: "", imdb: null, ratings: { Ann: 3 } })).toEqual([])
})
