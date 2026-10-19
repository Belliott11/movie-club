import { fmt, groupAvg, outsideAvg } from "./stats"
import type { Movie } from "./types"

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const rows = (r: unknown[][]) => r.map(x => x.map(cell).join(",")).join("\r\n") + "\r\n"

/** One row per film: details, each person's rating, the club average and the outside scores. */
export function ratingsCsv(ms: Movie[], members: string[]) {
  return rows([
    ["Title", "Year", "Picked by", ...members, "Club average", "IMDb /10", "Rotten Tomatoes /100", "Metacritic /100", "Letterboxd /5", "Outside average /5"],
    ...[...ms].sort((a, b) => a.seq - b.seq).map(m => [
      m.title, m.year, m.pick, ...members.map(n => m.ratings[n] ?? ""),
      fmt(groupAvg(m), 3), m.imdb, m.rt, m.mc, m.lb, fmt(outsideAvg(m), 3),
    ].map(v => (v === "–" ? "" : v))),
  ])
}

/** Letterboxd's list import reads these columns. */
export const letterboxdCsv = (ms: Movie[]) =>
  rows([["tmdbID", "Title", "Year"], ...[...ms].sort((a, b) => a.seq - b.seq).map(m => [m.tmdb_id ?? "", m.title, m.year])])

export function download(name: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }))
  const a = Object.assign(document.createElement("a"), { href: url, download: name })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
