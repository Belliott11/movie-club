/// <reference types="node" />
import { deflateRawSync } from "node:zlib"
import { expect, test } from "vitest"
import { findEntry, parseExports, readZip, seenBy } from "./letterboxd"

const ratings = "Date,Name,Year,Letterboxd URI,Rating\n2024-01-01,Jaws,1975,x,4.5\n2024-01-02,\"Parasite, The\",2019,x,3\n"
const watched = "Date,Name,Year,Letterboxd URI\n2024-01-01,Jaws,1975,x\n2024-01-03,Heat,1995,x\n"
const watchlist = "Date,Name,Year,Letterboxd URI\n2024-01-01,Alien,1979,x\n"

test("exports merge: watched adds unrated films, ratings win, watchlist is ignored", () => {
  const e = parseExports([{ name: "watched.csv", text: watched }, { name: "ratings.csv", text: ratings }, { name: "watchlist.csv", text: watchlist }])
  const by = Object.fromEntries(e.map(x => [x[0], x]))
  expect(by["Jaws"]).toEqual(["Jaws", 1975, 4.5, "2024-01-01"])
  expect(by["Heat"]).toEqual(["Heat", 1995, null, "2024-01-03"])
  expect(by["Parasite, The"][2]).toBe(3)
  expect(by["Alien"]).toBeUndefined()
})

test("matching allows a year either side but not further", () => {
  const h = parseExports([{ name: "ratings.csv", text: ratings }])
  expect(findEntry(h, "jaws", 1975)?.[2]).toBe(4.5)
  expect(findEntry(h, "Jaws", 1976)?.[2]).toBe(4.5)
  expect(findEntry(h, "Jaws", 1980)).toBeUndefined()
  expect(seenBy({ Ben: h, Zed: [] }, "Jaws", 1975)).toEqual(["Ben"])
})

// build a tiny zip by hand: one stored file, one deflated
function zip(files: [string, string, 0 | 8][]) {
  const parts: Buffer[] = [], central: Buffer[] = []
  let offset = 0
  for (const [name, text, method] of files) {
    const raw = Buffer.from(text), data = method === 8 ? deflateRawSync(raw) : raw, nm = Buffer.from(name)
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(method, 8); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nm.length, 26)
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(method, 10); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nm.length, 28); ch.writeUInt32LE(offset, 42)
    parts.push(lh, nm, data); central.push(ch, nm); offset += 30 + nm.length + data.length
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16)
  const all = Buffer.concat([...parts, cd, end])
  return all.buffer.slice(all.byteOffset, all.byteOffset + all.length)
}

test("reads stored and deflated csvs (including the watchlist) from a zip and skips everything else", async () => {
  const buf = zip([["ratings.csv", ratings, 8], ["watched.csv", watched, 0], ["watchlist.csv", watchlist, 8], ["lists/stuff.csv", "x", 0]])
  const files = await readZip(buf as ArrayBuffer)
  expect(files.map(f => f.name).sort()).toEqual(["ratings.csv", "watched.csv", "watchlist.csv"])
  expect(parseExports(files).length).toBe(3) // the watchlist never counts as seen
  await expect(readZip(new ArrayBuffer(10))).rejects.toThrow("zip")
})

test("the diary's watched date beats the date a film was added or rated, and films without any date stay three long", () => {
  const diary = "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n2024-05-01,Heat,1995,x,4,,,2023-12-24\n"
  const e = parseExports([{ name: "watched.csv", text: "Date,Name,Year,Letterboxd URI\n2024-01-03,Heat,1995,x\n" }, { name: "diary.csv", text: diary }])
  expect(e).toEqual([["Heat", 1995, 4, "2023-12-24"]])
  expect(parseExports([{ name: "watched.csv", text: "Name,Year\nAlien,1979\n" }])).toEqual([["Alien", 1979, null]])
})
