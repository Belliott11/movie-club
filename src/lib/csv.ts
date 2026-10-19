import type { WatchItem } from "./types"

function parseCsv(t: string) {
  const rows: string[][] = []
  let row: string[] = [], f = "", q = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c
    } else if (c === '"') q = true
    else if (c === ",") { row.push(f); f = "" }
    else if (c === "\n") { row.push(f.replace(/\r$/, "")); rows.push(row); row = []; f = "" }
    else f += c
  }
  if (f || row.length) { row.push(f); rows.push(row) }
  return rows
}

/** Letterboxd export: watchlist.csv with Name and Year columns. */
export function parseWatchlist(text: string, member: string): WatchItem[] {
  const rows = parseCsv(text), h = (rows[0] || []).map(x => x.trim())
  const ni = h.indexOf("Name"), yi = h.indexOf("Year")
  if (ni < 0) throw new Error("Expected a Letterboxd watchlist.csv (Name, Year columns).")
  return rows.slice(1).filter(r => r[ni]).map(r => ({ member, title: r[ni], year: +r[yi] || 0 }))
}
