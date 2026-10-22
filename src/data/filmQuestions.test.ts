import { expect, test } from "vitest"
import { curatedQuestions } from "./filmQuestions"

test("the current film has its own questions, each a question or a prompt, none repeated", () => {
  const q = curatedQuestions("The Beyond", 1981)
  expect(q).toBeDefined()
  expect(q!.length).toBeGreaterThanOrEqual(6)
  for (const x of q!) expect(/[?.]$/.test(x), x).toBe(true)
  expect(new Set(q).size).toBe(q!.length)
})

test("a year off by one still finds the film, and a film nobody has written for finds nothing", () => {
  expect(curatedQuestions("The Beyond", 1982)).toBeDefined()
  expect(curatedQuestions("Jaws", 1975)).toBeUndefined()
})
