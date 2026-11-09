import { expect, test } from "vitest"
import { exportFiles } from "./exportAll"
import { readZip } from "./letterboxd"
import { makeZip } from "./zip"
import type { Movie } from "./types"

const films: Movie[] = [
  { id: 1, seq: 1, title: "Jaws", year: 1975, pick: "Ann", watched_on: "2026-01-02", ratings: { Ann: 4, Ben: 3.5 }, imdb: 8.1, rt: 97, mc: 87 },
  { id: 2, seq: 2, title: "Heat, the film", year: 1995, pick: "Ben", ratings: { Ann: 5 } },
]
const input = {
  movies: films, members: ["Ann", "Ben", "Cy"], watchlist: [{ member: "Ann", title: "Alien", year: 1979 }], suggestions: [{ id: 1, title: "Alien", year: 1979, by: "Ann", votes: ["Ann", "Ben"] }],
  lb: { Ann: [["Jaws", 1975, 4, "2026-01-02", ["2026-01-02", "2025-05-05"]], ["Heat", 1995, null]] as [string, number, number | null, string?, string[]?][] },
  takes: { "1|Ann": "Bigger boat", "9|Zed": "orphan take" }, pickCards: { "1": "old" }, cardTitles: { old: "Before 1970" }, noLb: ["Cy"], catalog: [{ t: "Alien", y: 1979, id: 348, rt: 117, l: "en", cc: ["US", "GB"], g: ["Horror"], d: ["Ridley Scott"], ri: 8.5, rr: 93, rm: 89, o: 1 }], backup: { movies: [] },
}

test("the export holds every file, with the right rows and quoting", () => {
  const files = Object.fromEntries(exportFiles(input).map(f => [f.name, f.text]))
  expect(Object.keys(files).sort()).toEqual(["README.txt", "backup.json", "catalog.csv", "films.csv", "letterboxd.csv", "people.csv", "ratings-wide.csv", "ratings.csv", "suggestions.csv", "takes.csv", "watchlists.csv"])
  const lines = (n: string) => files[n].trim().split("\r\n")
  expect(lines("films.csv")[1]).toBe("1,Jaws,1975,Ann,2026-01-02,Before 1970,2,3.75,8.1,97,87,,4.417")
  expect(lines("films.csv")[2]).toContain('"Heat, the film"') // a comma in a title is quoted
  expect(lines("ratings.csv")).toHaveLength(1 + 3)
  expect(lines("takes.csv")).toEqual(["film_number,title,person,take", "1,Jaws,Ann,Bigger boat"]) // a take for a film that isn't there is left out
  expect(lines("suggestions.csv")[1]).toBe("Alien,1979,Ann,2,Ann; Ben")
  expect(lines("letterboxd.csv")[1]).toBe("Ann,Jaws,1975,4,2026-01-02,2026-01-02; 2025-05-05")
  expect(lines("letterboxd.csv")[2]).toBe("Ann,Heat,1995,,,") // watched without a rating
  expect(lines("catalog.csv")[1]).toContain("US; GB")
  expect(lines("people.csv")).toEqual(["person,films_rated,average_given,letterboxd_films,uses_letterboxd", "Ann,2,4.5,2,yes", "Ben,1,3.5,0,yes", "Cy,0,,0,no"])
})

test("the zip opens with its files intact", async () => {
  const files = exportFiles(input)
  const blob = makeZip(files)
  // the site's own zip reader opens it and finds the one file whose name it reads (ratings.csv), byte for byte
  const back = await readZip(await blob.arrayBuffer())
  expect(back.map(f => f.name)).toEqual(["ratings.csv"])
  expect(back[0].text).toBe(files.find(f => f.name === "ratings.csv")!.text)
  const raw = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()))
  expect(raw.startsWith("PK")).toBe(true)
  for (const f of files) expect(raw).toContain(f.name)
})
