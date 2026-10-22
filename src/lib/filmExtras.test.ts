import { expect, test } from "vitest"
import { extrasFrom, oscarsFrom } from "./filmExtras"

const film = (kw: string[], extra: object = {}, crew: object[] = [{ job: "Director", gender: 2 }]) => ({ id: 1, keywords: { keywords: kw.map(name => ({ name })) }, credits: { crew }, ...extra })

test("tags come from the film's keywords, a collection or a sequel keyword makes it a franchise, and no keywords means no claims", () => {
  const e = extrasFrom(film(["Black and White", "silent film", "based on true story"]))
  expect(e).toMatchObject({ bw: true, silent: true, trueStory: true, franchise: false })
  expect(extrasFrom(film(["drama"])).bw).toBe(false)
  expect(extrasFrom(film(["sequel"])).franchise).toBe(true)
  expect(extrasFrom(film(["drama"], { belongs_to_collection: { id: 9 } })).franchise).toBe(true)
  const none = extrasFrom(film([]))
  expect([none.bw, none.silent, none.trueStory, none.franchise]).toEqual([undefined, undefined, undefined, undefined])
})

test("directors are listed by name, up to two", () => {
  expect(extrasFrom(film([], {}, [{ job: "Director", name: "A", gender: 2 }, { job: "Director", name: "B", gender: 1 }, { job: "Director", name: "C", gender: 2 }])).directors).toEqual(["A", "B"])
  expect(extrasFrom(film([], {}, [])).directors).toBeUndefined()
})

test("a woman director is read from the crew's gender, and only a known budget counts", () => {
  expect(extrasFrom(film([], {}, [{ job: "Director", gender: 1 }])).womanDirector).toBe(true)
  expect(extrasFrom(film([], {}, [{ job: "Director", gender: 2 }, { job: "Writer", gender: 1 }])).womanDirector).toBe(false)
  expect(extrasFrom(film([], {}, [{ job: "Writer", gender: 1 }])).womanDirector).toBeUndefined() // no director listed
  expect(extrasFrom(film([], { budget: 3_000_000 })).budget).toBe(3_000_000)
  expect(extrasFrom(film([], { budget: 0 })).budget).toBeUndefined() // TMDB uses 0 for "unknown"
})

test("Oscars are read from OMDb's awards line: wins count, nominations and other prizes don't", () => {
  expect(oscarsFrom("Won 3 Oscars. 40 wins & 60 nominations total")).toBe(3)
  expect(oscarsFrom("Won 1 Oscar. Another 20 wins")).toBe(1)
  expect(oscarsFrom("Nominated for 2 Oscars. 5 wins & 9 nominations total")).toBe(0)
  expect(oscarsFrom("12 wins & 10 nominations")).toBe(0)
  expect(oscarsFrom("N/A")).toBe(0)
  expect(oscarsFrom(undefined)).toBe(0)
})
