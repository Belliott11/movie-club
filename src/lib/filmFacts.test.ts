import { expect, test } from "vitest"
import { hours, onMyServices, passesFilters, type Facts } from "./filmFacts"

const f = (runtime: number | null, stream: string[]): Facts => ({ runtime, stream, rent: [], t: 0 })

test("services match the way TMDB spells them, and only the chosen ones count", () => {
  const facts = f(100, ["Netflix", "Amazon Prime Video", "Max", "The Criterion Channel", "Apple TV Store"])
  expect(onMyServices(facts, ["netflix", "criterion"])).toEqual(["Netflix", "Criterion Channel"])
  expect(onMyServices(facts, ["max", "prime"])).toEqual(["Max", "Prime Video"])
  expect(onMyServices(facts, ["apple"])).toEqual([]) // the Apple TV Store rents, it isn't Apple TV+
  expect(onMyServices(undefined, ["netflix"])).toEqual([])
})

test("filters hide long films and unstreamable ones, but never films still loading", () => {
  expect(passesFilters(undefined, { stream: true, short: true }, [])).toBe(true)
  expect(passesFilters(f(150, ["Netflix"]), { stream: false, short: true }, [])).toBe(false)
  expect(passesFilters(f(119, ["Netflix"]), { stream: false, short: true }, [])).toBe(true)
  expect(passesFilters(f(90, []), { stream: true, short: false }, [])).toBe(false) // streams nowhere
  expect(passesFilters(f(90, ["Hulu"]), { stream: true, short: false }, ["netflix"])).toBe(false) // not on a chosen service
  expect(passesFilters(f(90, ["Hulu"]), { stream: true, short: false }, ["hulu"])).toBe(true)
  expect(passesFilters(f(null, ["Hulu"]), { stream: false, short: true }, [])).toBe(true) // unknown runtime isn't "long"
})

test("runtime reads as hours and minutes", () => {
  expect(hours(125)).toBe("2h 05m")
  expect(hours(45)).toBe("45m")
})
