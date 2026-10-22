import { findEntry, type LbEntry } from "./letterboxd"
import { key } from "./stats"

/** Film nations worth seeing something from. Blindspots are the ones with the fewest films watched. */
export const NATIONS: { code: string; name: string }[] = [
  { code: "JP", name: "Japan" }, { code: "FR", name: "France" }, { code: "IT", name: "Italy" }, { code: "DE", name: "Germany" },
  { code: "GB", name: "United Kingdom" }, { code: "KR", name: "South Korea" }, { code: "IN", name: "India" }, { code: "HK", name: "Hong Kong" },
  { code: "CN", name: "China" }, { code: "TW", name: "Taiwan" }, { code: "MX", name: "Mexico" }, { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" }, { code: "DK", name: "Denmark" }, { code: "RU", name: "Russia" }, { code: "PL", name: "Poland" },
  { code: "IR", name: "Iran" }, { code: "BR", name: "Brazil" }, { code: "AR", name: "Argentina" }, { code: "TH", name: "Thailand" },
  // smaller or less-watched film nations come after the big twenty, so they only surface once those are covered
  { code: "CA", name: "Canada" }, { code: "AU", name: "Australia" }, { code: "TR", name: "Turkey" }, { code: "GR", name: "Greece" },
  { code: "EG", name: "Egypt" }, { code: "SN", name: "Senegal" }, { code: "RO", name: "Romania" }, { code: "HU", name: "Hungary" },
  { code: "CZ", name: "Czech Republic" }, { code: "BE", name: "Belgium" }, { code: "NO", name: "Norway" }, { code: "FI", name: "Finland" },
  { code: "PT", name: "Portugal" }, { code: "PH", name: "Philippines" }, { code: "IL", name: "Israel" }, { code: "NL", name: "Netherlands" },
  { code: "AT", name: "Austria" }, { code: "NG", name: "Nigeria" },
]

/** A landmark film: title, year, and optionally the other name it goes by (Letterboxd often uses the English title). */
export type Film = [string, number, string?]

/** Hand-picked landmark films for film movements, titles as Letterboxd spells them. */
export const MOVEMENTS: { name: string; years: string; films: Film[] }[] = [
  { name: "French New Wave", years: "1959 to 1966", films: [["The 400 Blows", 1959], ["Hiroshima Mon Amour", 1959], ["Breathless", 1960], ["Shoot the Piano Player", 1960], ["Jules and Jim", 1962], ["Cléo from 5 to 7", 1962], ["Vivre Sa Vie", 1962], ["Contempt", 1963], ["Band of Outsiders", 1964], ["Pierrot le Fou", 1965]] },
  { name: "Italian Neorealism", years: "1945 to 1952", films: [["Rome, Open City", 1945], ["Paisan", 1946], ["Shoeshine", 1946], ["Bicycle Thieves", 1948], ["La Terra Trema", 1948], ["Germany, Year Zero", 1948], ["Bitter Rice", 1949], ["Umberto D.", 1952]] },
  { name: "German Expressionism", years: "1920 to 1931", films: [["The Cabinet of Dr. Caligari", 1920], ["Dr. Mabuse the Gambler", 1922], ["Nosferatu", 1922], ["The Last Laugh", 1924], ["Faust", 1926], ["Metropolis", 1927], ["Pandora's Box", 1929], ["M", 1931]] },
  { name: "New Hollywood", years: "1967 to 1976", films: [["Bonnie and Clyde", 1967], ["The Graduate", 1967], ["Easy Rider", 1969], ["Midnight Cowboy", 1969], ["Five Easy Pieces", 1970], ["The Godfather", 1972], ["Mean Streets", 1973], ["Chinatown", 1974], ["The Conversation", 1974], ["Taxi Driver", 1976]] },
  { name: "Japanese golden age", years: "1949 to 1957", films: [["Late Spring", 1949], ["Rashomon", 1950], ["Ikiru", 1952], ["Ugetsu", 1953], ["Tokyo Story", 1953], ["Seven Samurai", 1954], ["Sansho the Bailiff", 1954], ["Throne of Blood", 1957]] },
  { name: "Soviet montage", years: "1925 to 1930", films: [["Strike", 1925], ["Battleship Potemkin", 1925], ["Mother", 1926], ["October", 1928, "October: Ten Days That Shook the World"], ["Man with a Movie Camera", 1929], ["Earth", 1930]] },
  { name: "Giallo", years: "1964 to 1982", films: [["Blood and Black Lace", 1964], ["The Bird with the Crystal Plumage", 1970], ["Four Flies on Grey Velvet", 1971], ["Don't Torture a Duckling", 1972], ["Deep Red", 1975], ["Suspiria", 1977], ["Tenebrae", 1982, "Tenebre"]] },
  { name: "Spaghetti western", years: "1964 to 1971", films: [["A Fistful of Dollars", 1964], ["For a Few Dollars More", 1965], ["Django", 1966], ["The Good, the Bad and the Ugly", 1966], ["Once Upon a Time in the West", 1968], ["The Great Silence", 1968], ["Duck, You Sucker!", 1971, "A Fistful of Dynamite"]] },
  { name: "Hong Kong cinema", years: "1985 to 2002", films: [["Police Story", 1985], ["A Better Tomorrow", 1986], ["The Killer", 1989], ["Days of Being Wild", 1990], ["Hard Boiled", 1992], ["Chungking Express", 1994], ["Fallen Angels", 1995], ["In the Mood for Love", 2000], ["Infernal Affairs", 2002]] },
  { name: "Czechoslovak New Wave", years: "1965 to 1970", films: [["The Shop on Main Street", 1965], ["Loves of a Blonde", 1965], ["Closely Watched Trains", 1966], ["Daisies", 1966], ["The Fireman's Ball", 1967, "The Firemen's Ball"], ["Valerie and Her Week of Wonders", 1970]] },
  { name: "Dogme 95", years: "1998 to 2000", films: [["Festen", 1998, "The Celebration"], ["The Idiots", 1998], ["Mifune's Last Song", 1999, "Mifune"], ["Julien Donkey-Boy", 1999], ["Italian for Beginners", 2000]] },
  { name: "Pre-Code Hollywood", years: "1931 to 1934", films: [["Little Caesar", 1931], ["The Public Enemy", 1931], ["Scarface", 1932], ["I Am a Fugitive from a Chain Gang", 1932], ["Trouble in Paradise", 1932], ["Baby Face", 1933]] },
  { name: "British kitchen sink realism", years: "1959 to 1969", films: [["Room at the Top", 1959], ["Saturday Night and Sunday Morning", 1960], ["A Taste of Honey", 1961], ["The Loneliness of the Long Distance Runner", 1962], ["This Sporting Life", 1963], ["Kes", 1969]] },
  { name: "Fifth Generation Chinese cinema", years: "1984 to 1994", films: [["Yellow Earth", 1984], ["Red Sorghum", 1988], ["Ju Dou", 1990], ["Raise the Red Lantern", 1991], ["Farewell My Concubine", 1993], ["To Live", 1994]] },
  { name: "New German Cinema", years: "1972 to 1979", films: [["Aguirre, the Wrath of God", 1972], ["The Bitter Tears of Petra von Kant", 1972], ["Ali: Fear Eats the Soul", 1974], ["Kings of the Road", 1976], ["The Marriage of Maria Braun", 1979]] },
  { name: "Cinema Novo", years: "1963 to 1969", films: [["Vidas Secas", 1963, "Barren Lives"], ["Black God, White Devil", 1964], ["Entranced Earth", 1967], ["Antonio das Mortes", 1969], ["Macunaíma", 1969, "Macunaima"]] },
  { name: "Direct cinema and cinema verite", years: "1960 to 1976", films: [["Primary", 1960], ["Chronicle of a Summer", 1961], ["Salesman", 1969], ["Gimme Shelter", 1970], ["Grey Gardens", 1975], ["Harlan County, USA", 1976]] },
  { name: "Surrealism", years: "1929 to 1972", films: [["Un Chien Andalou", 1929], ["L'Âge d'or", 1930], ["Meshes of the Afternoon", 1943], ["Belle de Jour", 1967], ["The Discreet Charm of the Bourgeoisie", 1972]] },
  { name: "French Poetic Realism", years: "1934 to 1939", films: [["L'Atalante", 1934], ["Pépé le Moko", 1937], ["Grand Illusion", 1937], ["Port of Shadows", 1938, "Le Quai des brumes"], ["La Bête Humaine", 1938], ["Daybreak", 1939, "Le jour se lève"], ["The Rules of the Game", 1939]] },
  { name: "Film noir", years: "1941 to 1958", films: [["The Maltese Falcon", 1941], ["Double Indemnity", 1944], ["Laura", 1944], ["Out of the Past", 1947], ["The Third Man", 1949], ["Sunset Boulevard", 1950], ["Kiss Me Deadly", 1955], ["Touch of Evil", 1958]] },
  { name: "Polish Film School", years: "1955 to 1962", films: [["A Generation", 1955], ["Kanal", 1957], ["Ashes and Diamonds", 1958], ["Eroica", 1958], ["Mother Joan of the Angels", 1961], ["Knife in the Water", 1962]] },
  { name: "Bengali and Indian parallel cinema", years: "1955 to 1964", films: [["Pather Panchali", 1955], ["Aparajito", 1956], ["Pyaasa", 1957], ["Apur Sansar", 1959, "The World of Apu"], ["Meghe Dhaka Tara", 1960, "The Cloud-Capped Star"], ["Charulata", 1964]] },
  { name: "Japanese New Wave", years: "1960 to 1969", films: [["Cruel Story of Youth", 1960], ["Pigs and Battleships", 1961], ["Pitfall", 1962], ["Woman in the Dunes", 1964], ["Branded to Kill", 1967], ["Death by Hanging", 1968], ["Funeral Parade of Roses", 1969]] },
  { name: "Taiwanese New Cinema", years: "1983 to 1991", films: [["That Day, on the Beach", 1983], ["Taipei Story", 1985], ["The Terrorizers", 1986, "Terrorizers"], ["Dust in the Wind", 1986], ["A City of Sadness", 1989], ["A Brighter Summer Day", 1991]] },
  { name: "Korean cinema", years: "1960 to 2019", films: [["The Housemaid", 1960], ["Peppermint Candy", 1999], ["Memories of Murder", 2003], ["Oldboy", 2003], ["Poetry", 2010], ["Burning", 2018], ["Parasite", 2019]] },
  { name: "Romanian New Wave", years: "2005 to 2015", films: [["The Death of Mr. Lazarescu", 2005], ["12:08 East of Bucharest", 2006], ["4 Months, 3 Weeks and 2 Days", 2007], ["Police, Adjective", 2009], ["Aferim!", 2015]] },
  { name: "New Argentine Cinema", years: "1998 to 2008", films: [["Pizza, Beer, and Cigarettes", 1998, "Pizza, birra, faso"], ["Nine Queens", 2000], ["La Ciénaga", 2001], ["The Holy Girl", 2004], ["The Headless Woman", 2008]] },
  { name: "West African cinema", years: "1966 to 1992", films: [["Black Girl", 1966], ["Touki Bouki", 1973], ["Xala", 1975], ["Yeelen", 1987], ["Hyenas", 1992]] },
  { name: "Italian comedy", years: "1958 to 1974", films: [["Big Deal on Madonna Street", 1958], ["Divorce Italian Style", 1961], ["Il Sorpasso", 1962, "The Easy Life"], ["Seduced and Abandoned", 1964], ["We All Loved Each Other So Much", 1974], ["Bread and Chocolate", 1974]] },
  { name: "American independent", years: "1984 to 1994", films: [["Stranger Than Paradise", 1984], ["Blood Simple", 1984], ["She's Gotta Have It", 1986], ["sex, lies, and videotape", 1989], ["Slacker", 1990], ["Reservoir Dogs", 1992], ["Clerks", 1994]] },
  { name: "New Queer Cinema", years: "1990 to 1996", films: [["Paris Is Burning", 1990], ["Poison", 1991], ["My Own Private Idaho", 1991], ["The Living End", 1992], ["Go Fish", 1994], ["The Watermelon Woman", 1996]] },
  { name: "Soviet and Eastern bloc cinema", years: "1957 to 1985", films: [["The Cranes Are Flying", 1957], ["Ballad of a Soldier", 1959], ["Ivan's Childhood", 1962], ["Andrei Rublev", 1966], ["Stalker", 1979], ["Come and See", 1985]] },
  { name: "Hollywood musical", years: "1935 to 1972", films: [["Top Hat", 1935], ["Meet Me in St. Louis", 1944], ["An American in Paris", 1951], ["Singin' in the Rain", 1952], ["The Band Wagon", 1953], ["West Side Story", 1961], ["Cabaret", 1972]] },
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

/** Films and average rating per label (a decade, a genre) over a history. `labelsOf` returns nothing for films it knows nothing about. */
export function tallyBy(history: LbEntry[], labelsOf: (e: LbEntry) => string[]) {
  const t = new Map<string, { n: number; rated: number[] }>()
  for (const e of history) {
    for (const label of new Set(labelsOf(e))) {
      const x = t.get(label) ?? { n: 0, rated: [] }
      x.n++
      if (e[2] != null) x.rated.push(e[2])
      t.set(label, x)
    }
  }
  return [...t].map(([name, x]) => ({ name, n: x.n, avg: x.rated.length ? x.rated.reduce((a, b) => a + b, 0) / x.rated.length : 0, rated: x.rated.length }))
}

export const decadeOf = (year: number) => `${Math.floor(year / 10) * 10}s`

/** The nations someone has seen the least of, fewest first (nations they've never seen come first). */
export function blindspots(counts: { code: string; n: number }[], limit = 6) {
  const n = new Map(counts.map(c => [c.code, c.n]))
  return NATIONS.map(x => ({ ...x, n: n.get(x.code) ?? 0 })).sort((a, b) => a.n - b.n).slice(0, limit)
}

/** Which of a movement's films someone has watched. */
export function movementProgress(history: LbEntry[] | undefined, films: Film[]) {
  const seen = films.filter(([t, y, alt]) => findEntry(history, t, y) || (alt && findEntry(history, alt, y)))
  return { seen: seen.length, total: films.length, missing: films.filter(f => !seen.includes(f)) }
}

/** Movements ordered by how much is left to watch: least completed first, but only ones that aren't finished. */
export const movementBlindspots = (history: LbEntry[] | undefined) =>
  MOVEMENTS.map(m => ({ ...m, ...movementProgress(history, m.films) })).filter(m => m.seen < m.total).sort((a, b) => a.seen / a.total - b.seen / b.total || b.total - a.total)

export const entryKey = (e: LbEntry) => key(e[0], e[1])
