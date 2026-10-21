import { findEntry, type LbEntry } from "./letterboxd"
import { key } from "./stats"

/** Film nations worth seeing something from. Blindspots are the ones with the fewest films watched. */
export const NATIONS: { code: string; name: string }[] = [
  { code: "JP", name: "Japan" }, { code: "FR", name: "France" }, { code: "IT", name: "Italy" }, { code: "DE", name: "Germany" },
  { code: "GB", name: "United Kingdom" }, { code: "KR", name: "South Korea" }, { code: "IN", name: "India" }, { code: "HK", name: "Hong Kong" },
  { code: "CN", name: "China" }, { code: "TW", name: "Taiwan" }, { code: "MX", name: "Mexico" }, { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" }, { code: "DK", name: "Denmark" }, { code: "RU", name: "Russia" }, { code: "PL", name: "Poland" },
  { code: "IR", name: "Iran" }, { code: "BR", name: "Brazil" }, { code: "AR", name: "Argentina" }, { code: "TH", name: "Thailand" },
]

/** Hand-picked landmark films for film movements, titles as Letterboxd spells them. */
export const MOVEMENTS: { name: string; years: string; films: [string, number][] }[] = [
  { name: "French New Wave", years: "1959 to 1966", films: [["The 400 Blows", 1959], ["Hiroshima Mon Amour", 1959], ["Breathless", 1960], ["Shoot the Piano Player", 1960], ["Jules and Jim", 1962], ["Cléo from 5 to 7", 1962], ["Vivre Sa Vie", 1962], ["Contempt", 1963], ["Band of Outsiders", 1964], ["Pierrot le Fou", 1965]] },
  { name: "Italian Neorealism", years: "1945 to 1952", films: [["Rome, Open City", 1945], ["Paisan", 1946], ["Shoeshine", 1946], ["Bicycle Thieves", 1948], ["La Terra Trema", 1948], ["Germany, Year Zero", 1948], ["Bitter Rice", 1949], ["Umberto D.", 1952]] },
  { name: "German Expressionism", years: "1920 to 1931", films: [["The Cabinet of Dr. Caligari", 1920], ["Dr. Mabuse the Gambler", 1922], ["Nosferatu", 1922], ["The Last Laugh", 1924], ["Faust", 1926], ["Metropolis", 1927], ["Pandora's Box", 1929], ["M", 1931]] },
  { name: "New Hollywood", years: "1967 to 1976", films: [["Bonnie and Clyde", 1967], ["The Graduate", 1967], ["Easy Rider", 1969], ["Midnight Cowboy", 1969], ["Five Easy Pieces", 1970], ["The Godfather", 1972], ["Mean Streets", 1973], ["Chinatown", 1974], ["The Conversation", 1974], ["Taxi Driver", 1976]] },
  { name: "Japanese golden age", years: "1949 to 1957", films: [["Late Spring", 1949], ["Rashomon", 1950], ["Ikiru", 1952], ["Ugetsu", 1953], ["Tokyo Story", 1953], ["Seven Samurai", 1954], ["Sansho the Bailiff", 1954], ["Throne of Blood", 1957]] },
  { name: "Soviet montage", years: "1925 to 1930", films: [["Strike", 1925], ["Battleship Potemkin", 1925], ["Mother", 1926], ["October", 1928], ["Man with a Movie Camera", 1929], ["Earth", 1930]] },
  { name: "Giallo", years: "1964 to 1982", films: [["Blood and Black Lace", 1964], ["The Bird with the Crystal Plumage", 1970], ["Four Flies on Grey Velvet", 1971], ["Don't Torture a Duckling", 1972], ["Deep Red", 1975], ["Suspiria", 1977], ["Tenebrae", 1982]] },
  { name: "Spaghetti western", years: "1964 to 1971", films: [["A Fistful of Dollars", 1964], ["For a Few Dollars More", 1965], ["Django", 1966], ["The Good, the Bad and the Ugly", 1966], ["Once Upon a Time in the West", 1968], ["The Great Silence", 1968], ["Duck, You Sucker!", 1971]] },
  { name: "Hong Kong cinema", years: "1985 to 2002", films: [["Police Story", 1985], ["A Better Tomorrow", 1986], ["The Killer", 1989], ["Days of Being Wild", 1990], ["Hard Boiled", 1992], ["Chungking Express", 1994], ["Fallen Angels", 1995], ["In the Mood for Love", 2000], ["Infernal Affairs", 2002]] },
  { name: "Czechoslovak New Wave", years: "1965 to 1970", films: [["The Shop on Main Street", 1965], ["Loves of a Blonde", 1965], ["Closely Watched Trains", 1966], ["Daisies", 1966], ["The Fireman's Ball", 1967], ["Valerie and Her Week of Wonders", 1970]] },
  { name: "Dogme 95", years: "1998 to 2000", films: [["Festen", 1998], ["The Idiots", 1998], ["Mifune's Last Song", 1999], ["Julien Donkey-Boy", 1999], ["Italian for Beginners", 2000]] },
  { name: "Iranian cinema", years: "1969 to 2011", films: [["The Cow", 1969], ["Where Is the Friend's House?", 1987], ["Close-Up", 1990], ["Through the Olive Trees", 1994], ["The White Balloon", 1995], ["Taste of Cherry", 1997], ["A Separation", 2011]] },
]

/** Countries TMDB still lists under their old codes. */
const OLD: Record<string, string> = { SU: "RU", XC: "CZ", YU: "RS", DD: "DE", XG: "DE" }

/** How many films of each country someone has watched, and their average rating for it. `codeOf` says which country a film is from (unknown films are left out). */
export function tallyCountries(history: LbEntry[], codeOf: (e: LbEntry) => string | undefined) {
  const t = new Map<string, { n: number; rated: number[] }>()
  for (const e of history) {
    const c = OLD[codeOf(e) ?? ""] ?? codeOf(e) // former countries count as today's
    if (!c) continue
    const x = t.get(c) ?? { n: 0, rated: [] }
    x.n++
    if (e[2] != null) x.rated.push(e[2])
    t.set(c, x)
  }
  return [...t].map(([code, x]) => ({ code, n: x.n, avg: x.rated.length ? x.rated.reduce((a, b) => a + b, 0) / x.rated.length : null }))
    .sort((a, b) => b.n - a.n || a.code.localeCompare(b.code))
}

/** The nations someone has seen the least of, fewest first (nations they've never seen come first). */
export function blindspots(counts: { code: string; n: number }[], limit = 6) {
  const n = new Map(counts.map(c => [c.code, c.n]))
  return NATIONS.map(x => ({ ...x, n: n.get(x.code) ?? 0 })).sort((a, b) => a.n - b.n).slice(0, limit)
}

/** Which of a movement's films someone has watched. */
export function movementProgress(history: LbEntry[] | undefined, films: [string, number][]) {
  const seen = films.filter(([t, y]) => findEntry(history, t, y))
  return { seen: seen.length, total: films.length, missing: films.filter(f => !seen.includes(f)) }
}

/** Movements ordered by how much is left to watch: least completed first, but only ones that aren't finished. */
export const movementBlindspots = (history: LbEntry[] | undefined) =>
  MOVEMENTS.map(m => ({ ...m, ...movementProgress(history, m.films) })).filter(m => m.seen < m.total).sort((a, b) => a.seen / a.total - b.seen / b.total || b.total - a.total)

export const entryKey = (e: LbEntry) => key(e[0], e[1])
