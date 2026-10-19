import { expect, test } from "vitest"
import type { LbHistory } from "./letterboxd"
import { crowdPicks, needsImport, rankForGroup } from "./picks"
import type { Movie } from "./types"

const club: Movie[] = [{ id: 1, seq: 1, title: "Jaws", year: 1975, pick: "A", ratings: { Ben: 4, Ann: 3, Cy: 5 } }]
const lb: LbHistory = {
  Ben: [["Heat", 1995, 5], ["Alien", 1979, 4.5], ["Jaws", 1975, 4], ["Cats", 2019, 1]],
  Ann: [["Heat", 1995, 4.5], ["Alien", 1980, 5], ["Cats", 2019, 1.5]],
  Cy: [["Heat", 1995, 3], ["Alien", 1979, null]],
}

test("crowd picks need enough fans, skip club films, and merge years a year apart", () => {
  const picks = crowdPicks(lb, club)
  expect(picks.map(p => p.title).sort()).toEqual(["Alien", "Heat"])
  expect(picks.some(p => p.title === "Jaws")).toBe(false) // the club already watched it
  expect(picks.some(p => p.title === "Cats")).toBe(false) // nobody loved it
  const alien = picks.find(p => p.title === "Alien")!
  expect(alien.ratings.map(r => r.name)).toEqual(["Ann", "Ben"]) // 1979 and 1980 are the same film
  expect(alien.seenBy.sort()).toEqual(["Ann", "Ben", "Cy"]) // Cy watched it without rating it
  expect(crowdPicks(lb, club, { minRaters: 3 })).toEqual([])
})

test("group ranking drops films the room has seen", () => {
  const watchlist = [{ member: "Cy", title: "Alien", year: 1979 }, { member: "Cy", title: "Heat", year: 1995 }, { member: "Ann", title: "Heat", year: 1995 }]
  // Cy and Ann have both seen Alien and Heat, so there is nothing new for them
  expect(rankForGroup(["Cy", "Ann"], lb, watchlist, club)).toEqual([])
})

test("group ranking rewards watchlists and fans who are not in the room, and explains itself", () => {
  const r = rankForGroup(["Zed"], lb, [{ member: "Zed", title: "Alien", year: 1979 }], club)
  expect(r[0].title).toBe("Alien")
  expect(r[0].score).toBe(4) // watchlist +2, Ann and Ben loved it and are not here +2
  expect(r[0].reasons[0]).toBe("Zed has it on their watchlist")
  expect(r[0].reasons.at(-1)).toBe("none of you have seen it")
  // seen by one of two attendees: penalized but kept (half or fewer have seen it)
  const half = rankForGroup(["Ben", "Zed"], lb, [{ member: "Zed", title: "Alien", year: 1979 }], club)
  expect(half[0].reasons.at(-1)).toBe("Ben has already seen it")
  expect(half[0].score).toBe(2 + 1 - 2) // Zed's watchlist, Ann is a fan not in the room, Ben has seen it
})

test("members who rate films but have not imported are listed", () => {
  const ms: Movie[] = [1, 2, 3].map(i => ({ id: i, seq: i, title: "t" + i, year: 2000, pick: "A", ratings: { Ben: 3, Zed: 4 } }))
  expect(needsImport(ms, { Ben: [["x", 1, 3]] }, ["Ben", "Zed", "Quiet"])).toEqual(["Zed"])
})
