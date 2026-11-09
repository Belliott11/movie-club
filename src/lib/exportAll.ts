import { outsideScore, type CatalogEntry } from "./catalog"
import { ratingsCsv, rows } from "./exporters"
import type { LbHistory } from "./letterboxd"
import { fmt, groupAvg, outsideAvg } from "./stats"
import type { Movie, Suggestion, WatchItem } from "./types"

export type ExportInput = {
  movies: Movie[]; members: string[]; watchlist: WatchItem[]; suggestions: Suggestion[]; lb: LbHistory
  takes: Record<string, string>; pickCards: Record<string, string>; cardTitles: Record<string, string>
  noLb: string[]; catalog: CatalogEntry[]; backup?: unknown
}

const README = `Movie Club data export

All files are plain CSV (open them in Excel, Google Sheets, R, pandas...). Ratings are out of 5, in half steps, unless a column says otherwise.

films.csv          One row per film the club has watched or lined up: number, title, year, who picked it, the day, the card it answered, the club average,
                   outside scores (IMDb /10, Rotten Tomatoes /100, Metacritic /100, Letterboxd /5) and their average out of 5.
ratings.csv        One row per rating: film, person, stars. The long form of ratings-wide.csv, easiest for grouping and pivoting.
ratings-wide.csv   One row per film with a column for each person.
takes.csv          The one-line takes people wrote about a film.
watchlists.csv     Every film on every person's watchlist.
suggestions.csv    The club's suggestion list, with who suggested it and who voted.
letterboxd.csv     Everyone's imported Letterboxd history: film, rating (blank when watched without rating), the last day it was watched, and every diary day.
catalog.csv        Facts about each watchlist film from TMDB, OMDb and Wikidata: runtime, language, countries, genres, directors, outside scores, Oscars, tags.
people.csv         One row per person: films rated, average given, Letterboxd films, and whether they use Letterboxd.
backup.json        Everything in the shared database, as the site stores it (for restoring or for programmers).

Not included: sealed scores that haven't been revealed, and anyone's private watch plan, since those are locked with their own keys.
`

/** The club's data as a set of tidy files for analysis. Pure: it only reshapes what it's given. */
export function exportFiles(d: ExportInput): { name: string; text: string }[] {
  const films = [...d.movies].sort((a, b) => a.seq - b.seq)
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
  const f3 = (v: number | null | undefined) => (v == null || isNaN(v) ? "" : fmt(v, 3))
  const out: { name: string; text: string }[] = [{ name: "README.txt", text: README }]

  out.push({ name: "films.csv", text: rows([
    ["number", "title", "year", "picked_by", "watched_on", "card", "ratings_count", "club_average", "imdb_10", "rotten_tomatoes_100", "metacritic_100", "letterboxd_5", "outside_average_5"],
    ...films.map(m => [m.seq, m.title, m.year, m.pick, m.watched_on ?? "", d.cardTitles[d.pickCards[String(m.seq)]] ?? "", Object.keys(m.ratings).length, f3(groupAvg(m)), m.imdb, m.rt, m.mc, m.lb, f3(outsideAvg(m))]),
  ]) })
  out.push({ name: "ratings.csv", text: rows([["film_number", "title", "year", "person", "stars"], ...films.flatMap(m => Object.entries(m.ratings).map(([who, v]) => [m.seq, m.title, m.year, who, v]))]) })
  out.push({ name: "ratings-wide.csv", text: ratingsCsv(films, d.members) })
  out.push({ name: "takes.csv", text: rows([["film_number", "title", "person", "take"], ...Object.entries(d.takes).flatMap(([k, text]) => {
    const [id, who] = [k.slice(0, k.indexOf("|")), k.slice(k.indexOf("|") + 1)]
    const m = films.find(x => String(x.id) === id)
    return m && text ? [[m.seq, m.title, who, text]] : []
  })]) })
  out.push({ name: "watchlists.csv", text: rows([["person", "title", "year"], ...[...d.watchlist].sort((a, b) => a.member.localeCompare(b.member) || a.title.localeCompare(b.title)).map(w => [w.member, w.title, w.year])]) })
  out.push({ name: "suggestions.csv", text: rows([["title", "year", "suggested_by", "votes", "voters"], ...d.suggestions.map(s => [s.title, s.year, s.by, s.votes?.length ?? 0, (s.votes ?? []).join("; ")])]) })
  out.push({ name: "letterboxd.csv", text: rows([["person", "title", "year", "rating", "last_watched", "diary_days"], ...Object.entries(d.lb).flatMap(([who, h]) => h.map(e => [who, e[0], e[1], e[2], e[3] ?? "", (e[4] ?? []).join("; ")]))]) })
  out.push({ name: "catalog.csv", text: rows([
    ["title", "year", "tmdb_id", "runtime_min", "language", "countries", "genres", "directors", "woman_director", "imdb_10", "rotten_tomatoes_100", "metacritic_100", "outside_average_5", "oscars", "budget", "based_on_book", "remake", "themes"],
    ...d.catalog.filter(e => e.id).map(e => [e.t, e.y, e.id, e.rt, e.l, (e.cc ?? []).join("; "), (e.g ?? []).join("; "), (e.d ?? []).join("; "), e.wd ? 1 : "", e.ri, e.rr, e.rm, f3(outsideScore(e)), e.o, e.b, e.bk || e.wb ? 1 : "", e.rm2 || e.wr ? 1 : "", (e.th ?? []).join("; ")]),
  ]) })
  out.push({ name: "people.csv", text: rows([
    ["person", "films_rated", "average_given", "letterboxd_films", "uses_letterboxd"],
    ...d.members.map(n => { const given = films.map(m => m.ratings[n]).filter((v): v is number => v != null); return [n, given.length, f3(avg(given)), d.lb[n]?.length ?? 0, d.noLb.includes(n) ? "no" : "yes"] }),
  ]) })
  if (d.backup) out.push({ name: "backup.json", text: JSON.stringify({ exported: new Date().toISOString(), data: d.backup }, null, 1) })
  return out
}
