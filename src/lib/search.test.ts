import { expect, test } from "vitest"
import { searchLocal } from "./search"
import type { Movie } from "./types"

const m = (id: number, title: string, year: number): Movie => ({ id, seq: id, title, year, pick: "A", ratings: {} })
const movies = [m(1, "City of God", 2002), m(2, "Amélie", 2001)]
const wl = [{ member: "Ben", title: "Cléo from 5 to 7", year: 1962 }, { member: "Ben", title: "City of God", year: 2002 }]
const sug = [{ id: 1, title: "Citizen Kane", year: 1941, by: "Ben", votes: [] }]

test("words match from the start of words, accents are ignored, and club films come first", () => {
  const r = searchLocal("cit", movies, ["Ciaran"], wl, sug)
  expect(r.map(x => x.label)).toEqual(["City of God", "Citizen Kane"]) // the watchlist copy of City of God is not repeated
  expect(searchLocal("cit god", movies, [], [], [])[0].label).toBe("City of God")
  expect(searchLocal("amelie", movies, [], [], [])[0]).toMatchObject({ kind: "film", href: "#/films/2" })
  expect(searchLocal("cleo", movies, [], wl, [])[0]).toMatchObject({ kind: "title", href: "#/movie/Cl%C3%A9o%20from%205%20to%207/1962" })
})

test("people are found by name, short queries find nothing, and the list is capped", () => {
  expect(searchLocal("ben", movies, ["Ben", "Adam"], [], [])).toEqual([{ kind: "person", label: "Ben", sub: "Person", href: "#/people/Ben" }])
  expect(searchLocal("c", movies, [], wl, sug)).toEqual([])
  const many = Array.from({ length: 20 }, (_, i) => m(i, `Film ${i}`, 2000))
  expect(searchLocal("film", many, [], [], [], 5)).toHaveLength(5)
})
