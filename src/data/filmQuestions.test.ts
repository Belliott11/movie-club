import { expect, test } from "vitest"
import { curatedQuestions } from "./filmQuestions"

const CLUB = [["Princess Mononoke", 1997], ["Apocalypse Now", 1979], ["Munich", 2005], ["The Hunt", 2012], ["Jaws", 1975], ["Inception", 2010], ["City of God", 2002], ["Lost Highway", 1997],
  ["A Clockwork Orange", 1971], ["The Conversation", 1974], ["Clue", 1985], ["Harold & Kumar Go to White Castle", 2004], ["RRR", 2022], ["Perfect Days", 2023], ["Z", 1969],
  ["Vitalina Varela", 2019], ["Heroic Times", 1983], ["Pan's Labyrinth", 2006], ["Dogville", 2003], ["First Blood", 1982], ["On Her Majesty's Secret Service", 1969], ["The Beyond", 1981]] as const

test("every film the club has watched has its own questions, and none repeat", () => {
  const seen = new Set<string>()
  for (const [t, y] of CLUB) {
    const q = curatedQuestions(t, y)
    expect(q, t).toBeDefined()
    expect(q!.length, t).toBeGreaterThanOrEqual(6)
    for (const x of q!) { expect(/[?.]$/.test(x), `${t}: ${x}`).toBe(true); expect(seen.has(x), x).toBe(false); seen.add(x) }
  }
})

test("a year off by one still finds the film, and an unknown film finds nothing", () => {
  expect(curatedQuestions("Jaws", 1976)).toBeDefined()
  expect(curatedQuestions("Some Film Nobody Wrote For", 2001)).toBeUndefined()
})
