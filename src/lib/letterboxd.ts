import { parseCsv } from "./csv"
import { key } from "./stats"

/** One film from someone's Letterboxd history: [title, year, rating or null when watched without rating, the day it was logged (YYYY-MM-DD) when the export has one]. */
export type LbEntry = [string, number, number | null, string?]
export type LbHistory = Record<string, LbEntry[]>

const decode = (b: Uint8Array) => new TextDecoder("utf-8").decode(b)
const base = (p: string) => (p.split("/").pop() || "").toLowerCase()
const COUNTED = new Set(["ratings.csv", "watched.csv", "diary.csv"]) // what counts as "seen"; the watchlist is not
const WANTED = new Set([...COUNTED, "watchlist.csv"]) // what we read out of the zip

async function inflate(data: Uint8Array) {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** Reads the CSV files out of Letterboxd's "Export your data" zip, in the browser. */
export async function readZip(buf: ArrayBuffer): Promise<{ name: string; text: string }[]> {
  const v = new DataView(buf), u8 = new Uint8Array(buf)
  let e = buf.byteLength - 22
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--
  if (e < 0) throw new Error("That doesn't look like a zip file.")
  const count = v.getUint16(e + 10, true)
  let p = v.getUint32(e + 16, true)
  const out: { name: string; text: string }[] = []
  for (let i = 0; i < count && v.getUint32(p, true) === 0x02014b50; i++) {
    const method = v.getUint16(p + 10, true), size = v.getUint32(p + 20, true)
    const nlen = v.getUint16(p + 28, true), xlen = v.getUint16(p + 30, true), clen = v.getUint16(p + 32, true)
    const local = v.getUint32(p + 42, true)
    const name = decode(u8.subarray(p + 46, p + 46 + nlen))
    p += 46 + nlen + xlen + clen
    if (!WANTED.has(base(name))) continue
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true)
    const data = u8.subarray(start, start + size)
    if (method === 0) out.push({ name, text: decode(data) })
    else if (method === 8) out.push({ name, text: decode(await inflate(data)) })
  }
  return out
}

/** Merges ratings.csv, watched.csv and diary.csv into one entry per film. A rating from ratings.csv wins over the diary's. */
export function parseExports(files: { name: string; text: string }[]): LbEntry[] {
  const films = new Map<string, LbEntry>()
  const order = ["watched.csv", "diary.csv", "ratings.csv"] // later files overwrite ratings from earlier ones
  const sorted = files.filter(f => COUNTED.has(base(f.name))).sort((a, b) => order.indexOf(base(a.name)) - order.indexOf(base(b.name)))
  for (const f of sorted) {
    const rows = parseCsv(f.text), h = (rows[0] || []).map(x => x.trim())
    const ni = h.indexOf("Name"), yi = h.indexOf("Year"), ri = h.indexOf("Rating"), wi = h.indexOf("Watched Date"), di = h.indexOf("Date")
    if (ni < 0 || yi < 0) continue
    for (const r of rows.slice(1)) {
      const title = r[ni]?.trim(), year = +r[yi]
      if (!title || !year) continue
      const rating = ri >= 0 && r[ri] ? +r[ri] : null
      const k = key(title, year), had = films.get(k)
      // the day it was logged: the diary's watched date when there is one, otherwise the date on that row
      const day = [wi >= 0 ? r[wi] : "", di >= 0 ? r[di] : ""].map(x => (x ?? "").trim()).find(x => /^\d{4}-\d{2}-\d{2}$/.test(x)) ?? had?.[3]
      const rated = rating && rating >= 0.5 && rating <= 5 ? rating : had?.[2] ?? null
      films.set(k, day ? [title, year, rated, day] : [title, year, rated])
    }
  }
  return [...films.values()]
}

/** Finds a film in someone's history: exact title and year, else the same title a year either side (release years differ by region). */
export function findEntry(h: LbEntry[] | undefined, title: string, year: number | null): LbEntry | undefined {
  if (!h?.length) return undefined
  const ix = indexOf(h)
  const exact = ix.exact.get(key(title, year))
  if (exact || !year) return exact
  return ix.byTitle.get(key(title, 0).split("|")[0])?.find(e => Math.abs(e[1] - year) <= 1)
}

type Index = { exact: Map<string, LbEntry>; byTitle: Map<string, LbEntry[]> }
const indexes = new WeakMap<LbEntry[], Index>() // one per history array, rebuilt only when the array itself is replaced
function indexOf(h: LbEntry[]): Index {
  let ix = indexes.get(h)
  if (!ix) {
    ix = { exact: new Map(), byTitle: new Map() }
    for (const e of h) {
      const k = key(e[0], e[1])
      if (!ix.exact.has(k)) ix.exact.set(k, e) // the first entry wins, as it always did
      const t = key(e[0], 0).split("|")[0]
      ix.byTitle.set(t, [...(ix.byTitle.get(t) ?? []), e])
    }
    indexes.set(h, ix)
  }
  return ix
}

export const seenBy = (lb: LbHistory, title: string, year: number | null) => Object.keys(lb).filter(m => findEntry(lb[m], title, year))
